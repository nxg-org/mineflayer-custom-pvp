import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Block } from "prismarine-block";
import type { Entity } from "prismarine-entity";
import type { Item } from "prismarine-item";
import {
    dirToYawAndPitch,
    yawPitchAndSpeedToDir,
    pointToYawAndPitch,
    vectorMagnitude,
    getVoy,
    degreesToRadians,
    getVox,
    getVo,
    getGrades,
    getTargetDistance,
    getPremonition,
    VoToVox,
    notchianVel,
} from "../calc/mathUtilts";
import { trajectoryInfo, airResistance } from "../calc/constants";
import { getEntityAABB } from "../calc/entityUtils";
import { promisify } from "util";
import { InterceptEquations } from "../calc/intercept";
import { AABB } from "@nxg-org/mineflayer-util-plugin";

export type ShotEntity = { position: Vec3; velocity: Vec3; yaw?: number; pitch?: number; heldItem?: Item | null };
export type AABBComponents = { position: Vec3; height: number; width?: number };
export type ProjectileMotion = { position: Vec3; velocity: Vec3; gravity?: number };
export type BasicShotInfo = {
    nearestDistance: number;
    blockingBlock: Block | null;
    intersectPos: Vec3 | null;
    closestPoint: Vec3 | null;
    totalTicks: number;
};
const emptyVec = new Vec3(0, 0, 0);

/**
 * TODO: Change hit detection from AABB -> Ray to AABB -> Moving AABB of 0.5h, 0.5w.
 * ! We are "missing" shots due to this miscalculation.
 * * DONE! WOOOOOOOOOO
 *
 * TODO: Completely rewrite arrow trajectory calculation. Currently using assumptions, can be much better.
 * ! It is very fast; I will have to optimize even more.
 * * DONE! WOOOOOOOOOO
 *
 * TODO: Work on caching arrow trajectories. This will speed up repeated look-ups and encourage reuse of classes to save RAM/CPU.
 *
 */

/**
 * uses:
 * (a) calculate shot based off current entities yaw and target
 * (b) calculate correct yaw and target
 * (c) better block detection
 * (d) velocity checks
 */

/**
 * Purposely left off prediction.
 * You can handle that outside of the Shot class.
 */

export class Shot {
    readonly initialPos: Vec3;
    readonly initialVel: Vec3;
    readonly initialYaw: number;
    readonly initialPitch: number;
    readonly gravity: number;
    private points: Vec3[];
    private pointVelocities: Vec3[];
    private blockHit = false;
    public interceptCalcs?: InterceptEquations;
    public blockCheck: boolean = false;

    constructor(
        originVel: Vec3,
        { position: pPos, velocity: pVel, gravity }: Required<ProjectileMotion>,
        interceptCalcs?: InterceptEquations
    ) {
        const { yaw, pitch } = dirToYawAndPitch(pVel);
        this.initialPos = pPos.clone();
        this.initialVel = pVel.clone().add(originVel);
        this.gravity = gravity;
        this.initialYaw = yaw;
        this.initialPitch = pitch;
        this.points = [];
        this.pointVelocities = [];
        this.interceptCalcs = interceptCalcs;
    }

    // TODO: With yaw, pitch, and scalar speed, calculate velocity.
    static fromShootingPlayer(
        { position, yaw, pitch, velocity, heldItem }: ShotEntity,
        interceptCalcs: InterceptEquations,
        weapon?: string
    ): Shot {
        const info = trajectoryInfo[weapon! ?? heldItem?.name];
        if (!!info) {
            const projVel = yawPitchAndSpeedToDir(yaw!, pitch!, info.v0);
            return new Shot(velocity, { position: position.offset(0, 1.62, 0), velocity: projVel, gravity: info.g }, interceptCalcs);
        } else {
            throw "Invalid weapon";
        }
    }

    static fromWeapon({ position, velocity }: ProjectileMotion, interceptCalcs: InterceptEquations): Shot {
        return new Shot(emptyVec, { position, velocity, gravity: 0.05 }, interceptCalcs);
    }

    static fromOther({ position, velocity }: ProjectileMotion, interceptCalcs: InterceptEquations): Shot {
        return new Shot(emptyVec, { position, velocity, gravity: 0.03 }, interceptCalcs);
    }

    public canCollisionDetect(): boolean {
        return !!this.interceptCalcs;
    }

    public loadWorld(bot: Bot): void {
        if (!this.interceptCalcs) this.interceptCalcs = new InterceptEquations(bot);
    }

    public HitCheckXZ(entity: AABBComponents): boolean {
        return !!this.entityXZInterceptCheck(entity);
    }

    public entityXYZInterceptCheck({ position, height, width }: AABBComponents): Vec3 | null {
        return getEntityAABB({ position, height, width }).intersectsRay(this.initialPos, this.initialVel);
    }

    //TODO: Optimize raycast; change check from 3D to 2D (check only X and Z).
    public entityXZInterceptCheck({ position, height, width }: AABBComponents): { x: number; z: number } | null {
        return getEntityAABB({ position, height, width }).xzIntersectsRay(this.initialPos, this.initialVel);
    }

    public hitEntitiesCheckXZ(...entities: Entity[]): Entity[] {
        return entities
            .sort((a, b) => a.position.distanceTo(this.initialPos) - b.position.distanceTo(this.initialPos))
            .filter((e) => this.HitCheckXZ(e));
    }

    private aabbHitCheckXZ(...aabbs: AABBComponents[] | AABB[]) {
        if (!(aabbs instanceof AABB)) aabbs = (aabbs as AABBComponents[]).map(getEntityAABB);
        return (aabbs as AABB[])
            .sort((a, b) => a.xzDistanceTo(this.initialPos) - b.xzDistanceTo(this.initialPos))
            .filter((box) => !!box.xzIntersectsRay(this.initialPos, this.initialVel));
    }

    //TODO: Add a check for piercing from crossbows; if so, check multiple entities.
    //* Partially done? Now yields.
    public hitEntitiesCheck(...entities: AABBComponents[]) {
        let shots = [];
        const possibleEntities = this.aabbHitCheckXZ(...entities);
        for (const entity of possibleEntities) {
            if (entity) {
                const shotInfo = this.newCalcToEntity(entity);
                if (shotInfo.intersectPos) shots.push({ entity: entity, shotInfo: shotInfo });
            }
        }
        return shots;
    }

    public hitsEntity(
        entity: AABBComponents,
        extras: { yawChecked: boolean; blockCheck: boolean } = { yawChecked: false, blockCheck: true }
    ): BasicShotInfo | null {
        if (extras.yawChecked) {
            return this.newCalcToEntity(entity, extras.blockCheck);
        } else {
            return this.hitEntitiesCheck(entity)[0].shotInfo ?? null;
        }
    }

    public hitEntityWithPredictionCheck({ position, height, width }: AABBComponents, avgSpeed: Vec3): boolean {
        //Ignore XZ check as we will check two different XZ coords.
        const calcShot = this.newCalcToEntity({ position, height, width });
        if (!calcShot.intersectPos) return false;
        const { newTarget } = getPremonition(
            this.initialPos,
            position.clone().add(avgSpeed.clone().scale(calcShot.totalTicks)),
            avgSpeed,
            calcShot.totalTicks
        );
        const newAABB = getEntityAABB({ position: newTarget, height, width });
        const calcPredictShot = this.newCalcToEntity(newAABB, true);
        return !!calcPredictShot.intersectPos;
    }

    public checkForEntityHitFromSortedPoints(
        { position, height, width }: AABBComponents,
        points: Vec3[],
        notchianPointVecs: Vec3[],
        blockChecking: boolean = false
    ): { closestPoint: Vec3; blockHit: Block | null } {
        if (points.length === 0 || notchianPointVecs.length === 0) throw "Not enough points.";
        if (points.length !== notchianPointVecs.length) throw "Invalid positions or velocities: Different amount of inputs.";
        const entityAABB = getEntityAABB({ position, height, width });
        let nearestDistance = entityAABB.distanceTo(points[0]);
        let currentDistance: number;
        let closestPoint = points[0];
        let intersect: Vec3 | null = null;
        let block: Block | null = null;

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            currentDistance = entityAABB.distanceTo(point);
            if (nearestDistance > currentDistance) break;
            nearestDistance = currentDistance;
            closestPoint = point;

            const nextPoint = point.clone().add(notchianPointVecs[i]);
            if (blockChecking && this.interceptCalcs) {
                block = this.interceptCalcs.check(point, nextPoint)?.block;
                if (block) break;
            }
            intersect = entityAABB.intersectsSegment(point, nextPoint);
            if (intersect) break;
        }

        return { closestPoint: intersect ?? closestPoint, blockHit: block };
    }

    static calculateShotForCollision(
        origin: Vec3,
        rawVelocity: Vec3,
        gravity: number,
        blockChecker?: InterceptEquations,
        blockChecking: boolean = false
    ): { positions: Vec3[]; velocities: Vec3[]; blockHit: Block | null } {
        // rawVelocity = notchianVel(rawVelocity).vel
        let points: Vec3[] = [];
        let pointVelocities: Vec3[] = [];
        let block: Block | null = null;
        let tickVelocity = rawVelocity.clone();
        let nextPosition = origin.clone().add(rawVelocity);
        let totalTicks = 0;
        let offsetX: number = -tickVelocity.x * airResistance.h;
        let offsetY: number = gravity - tickVelocity.y * airResistance.y;
        let offsetZ: number = -tickVelocity.z * airResistance.h;

        while (totalTicks < 150) {
            points.push(origin.clone());
            pointVelocities.push(rawVelocity.clone());

            offsetX = -tickVelocity.x * airResistance.h;
            offsetY = -tickVelocity.y * airResistance.y - gravity;
            offsetZ = -tickVelocity.z * airResistance.h;

            if (blockChecking && blockChecker) {
                block = blockChecker.check(origin, nextPosition)?.block;
                if (block) break;
            }

            if (rawVelocity.y < 0 && origin.y < 0) break;

            origin.add(rawVelocity);
            rawVelocity.translate(offsetX, offsetY, offsetZ);
            if (totalTicks % 1 === 0) tickVelocity = rawVelocity;
            nextPosition.add(rawVelocity);
        }

        return { positions: points, velocities: pointVelocities, blockHit: block };
    }

    static calculateShotForPoints(
        origin: Vec3,
        rawVelocity: Vec3,
        gravity: number,
        blockChecker?: InterceptEquations,
        blockChecking: boolean = false
    ): { positions: Vec3[]; velocities: Vec3[]; blockHit: Block | null } {
        // rawVelocity = notchianVel(rawVelocity).vel;
        let points: Vec3[] = [];
        let pointVelocities: Vec3[] = [];
        let block: Block | null = null;
        let tickVelocity = rawVelocity.clone();
        let nextPosition = origin.clone().add(rawVelocity);
        let totalTicks = 0;
        let offsetX: number = -tickVelocity.x * airResistance.h;
        let offsetY: number = gravity - tickVelocity.y * airResistance.y;
        let offsetZ: number = -tickVelocity.z * airResistance.h;

        while (totalTicks < 150) {
            points.push(origin.clone());
            pointVelocities.push(rawVelocity.clone());

            offsetX = -tickVelocity.x * airResistance.h;
            offsetY = -tickVelocity.y * airResistance.y - gravity;
            offsetZ = -tickVelocity.z * airResistance.h;

            if (blockChecking && blockChecker) {
                block = blockChecker.check(origin, nextPosition)?.block;
                if (block) break;
            }

            if (rawVelocity.y < 0 && origin.y < 0) break;

            origin.add(rawVelocity);
            rawVelocity.translate(offsetX, offsetY, offsetZ);
            if (totalTicks % 1 === 0) tickVelocity = rawVelocity;
            nextPosition.add(rawVelocity);
        }

        return { positions: points, velocities: pointVelocities, blockHit: block };
    }

    //TODO: Optimize. More accurate than hawkeye's, but anywhere from 1.5x to 7x as expensive.
    public newCalcToEntity(target: AABBComponents | AABB, blockChecking: boolean = false): BasicShotInfo {
        if (!(target instanceof AABB)) target = getEntityAABB(target);
        // height = height = 1.62 ? height + 0.18 : 0;
        const entityAABB = target;
        let currentPosition = this.initialPos.clone();
        let currentVelocity = this.initialVel.clone();
        let perTickVel = currentVelocity.clone();
        let nearestDistance = entityAABB.distanceTo(currentPosition);
        let nextPosition = currentPosition.clone().add(currentVelocity);
        let currentDist = currentPosition.xzDistanceTo(currentPosition);
        let intersectPos: Vec3 | null = null;
        let blockingBlock: Block | null = null;
        let closestPoint: Vec3 | null = null;

        let totalTicks = 0;
        let gravity = this.gravity;
        let offsetX: number = -perTickVel.x * airResistance.h;
        let offsetY: number = -perTickVel.y * airResistance.y - gravity;
        let offsetZ: number = -perTickVel.z * airResistance.h;

        const entityDist = target.xzDistanceTo(this.initialPos);
        while (totalTicks < 150) {
            const testDist = entityAABB.distanceTo(currentPosition);
            if (nearestDistance !== testDist) {
                if (nearestDistance > 6) {
                    totalTicks += 1;
                    gravity = this.gravity;
                    offsetX = -perTickVel.x * airResistance.h;
                    offsetY = -perTickVel.y * airResistance.y - gravity;
                    offsetZ = -perTickVel.z * airResistance.h;
                } else {
                    totalTicks += 0.2;
                    gravity = this.gravity * 0.2;
                    offsetX = -perTickVel.x * (airResistance.h * 0.2);
                    offsetY = -perTickVel.y * (airResistance.y * 0.2) - gravity;
                    offsetZ = -perTickVel.z * (airResistance.h * 0.2);
                }
            }

            if (nearestDistance > testDist) {
                nearestDistance = testDist;
                closestPoint = currentPosition;
            }

            if (blockChecking && this.interceptCalcs) {
                blockingBlock = this.interceptCalcs.check(currentPosition, nextPosition)?.block;
            }

            intersectPos = entityAABB.intersectsSegment(currentPosition, nextPosition);
            if (intersectPos) {
                nearestDistance = 0;
                closestPoint = intersectPos;
                break;
            }

            if (blockingBlock) break;

            currentDist = currentPosition.xzDistanceTo(this.initialPos);
            if (currentDist > entityDist || (currentVelocity.y < 0 && currentPosition.y - target.minY < 0)) break;

            currentPosition.add(currentVelocity);
            currentVelocity.translate(offsetX, offsetY, offsetZ);
            if (totalTicks % 1 === 0) perTickVel = currentVelocity;
            nextPosition.add(currentVelocity);
        }

        return {
            nearestDistance,
            blockingBlock,
            intersectPos,
            closestPoint,
            totalTicks,
        };
    }

    public calculateShotToEntity(position: Vec3, tryInterceptBlock = false) {
        const { hDistance: xDestination, yDistance: yDestination } = getTargetDistance(this.initialPos, position);
        let precisionFactor = 1;
        let Vo = vectorMagnitude(this.initialVel);
        let gravity = this.gravity / precisionFactor;
        let factorY = airResistance.y / precisionFactor;
        let factorH = airResistance.h / precisionFactor;

        // Vo => Vector total velocity (X,Y,Z)
        let Voy = getVoy(Vo, this.initialPitch);
        let Vox = getVox(Vo, this.initialPitch);
        let Vy = Voy / precisionFactor;
        let Vx = Vox / precisionFactor;
        let ProjectileGrade: number;
        let nearestDistance = Math.sqrt(Math.pow(Vy - yDestination, 2) + Math.pow(Vx - xDestination, 2));
        let totalTicks = 0;

        let blockInTrajectory: Block | null = null;
        let closestArrowPoint: Vec3 | null = null;
        let arrowPoints: Vec3[] = [];
        let arrowPointVels: Vec3[] = [];
        const startPosition = this.initialPos;
        while (totalTicks < 150) {
            const currentTickDistance = Math.sqrt(Math.pow(Vy - yDestination, 2) + Math.pow(Vx - xDestination, 2));

            if (currentTickDistance < nearestDistance) nearestDistance = currentTickDistance;
            if (nearestDistance < 4) precisionFactor = 5;
            if (nearestDistance > 4) precisionFactor = 1;

            totalTicks += 1 / precisionFactor;
            gravity = this.gravity / precisionFactor;
            factorY = airResistance.y / precisionFactor;
            factorH = airResistance.h / precisionFactor;

            Vo = getVo(Vox, Voy, gravity);
            ProjectileGrade = getGrades(Vo, Voy, gravity);

            Voy = getVoy(Vo, degreesToRadians(ProjectileGrade), Voy * factorY);
            Vox = getVox(Vo, degreesToRadians(ProjectileGrade), Vox * factorH);

            Vy += Voy / precisionFactor;
            Vx += Vox / precisionFactor;

            const x = startPosition.x - Math.sin(this.initialYaw) * Vx;
            const z = startPosition.z - (Math.sin(this.initialYaw) * Vx) / Math.tan(this.initialYaw);
            const y = startPosition.y + Vy;
            // console.log("OLD INFO:", Vo, y, Vy)
            const currentArrowPosition = new Vec3(x, y, z);

            if (nearestDistance === currentTickDistance) closestArrowPoint = currentArrowPosition;

            arrowPoints.push(currentArrowPosition);
            arrowPointVels.push(currentArrowPosition.minus(arrowPoints[arrowPoints.length === 1 ? 0 : arrowPoints.length - 2]));

            if (tryInterceptBlock && this.interceptCalcs) {
                const previusArrowPositionIntercept = arrowPoints[arrowPoints.length === 1 ? 0 : arrowPoints.length - 2];
                blockInTrajectory = this.interceptCalcs.check(previusArrowPositionIntercept, currentArrowPosition)?.block;
            }

            // Arrow passed player || Voy (arrow is going down and passed player) || Detected solid block
            if (Vx > xDestination || (Voy < 0 && yDestination > Vy) || !!blockInTrajectory) break;
        }
        this.points = arrowPoints;
        this.pointVelocities = arrowPointVels;

        return {
            nearestDistance: nearestDistance,
            totalTicks: totalTicks,
            blockInTrayect: blockInTrajectory,
            closestArrowPoint,
        };
    }
}
