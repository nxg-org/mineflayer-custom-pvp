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
} from "../calc/mathUtilts";
import { trajectoryInfo, airResistance } from "../calc/constants";
import { getEntityAABB } from "../calc/entityUtils";
import { promisify } from "util";
import { InterceptEquations } from "../calc/intercept";

export type ShotEntity = { position: Vec3; velocity: Vec3; yaw?: number; pitch?: number; heldItem?: Item | null };
export type EntityAABB = { position: Vec3; height: number; width?: number };
export type ProjectileMotion = { position: Vec3; velocity: Vec3; gravity?: number };
export type TrackingData = { [entityId: number]: { tracking: boolean; info: { position: Vec3; velocity: Vec3 }[] } };
const emptyVec = new Vec3(0, 0, 0);

/**
 * TODO: Change hit detection from AABB -> Ray to AABB -> Moving AABB of 0.5h, 0.5w.
 * ! We are "missing" shots due to this miscalculation.
 *
 * TODO: Completely rewrite arrow trajectory calculation. Currently using assumptions, can be much better.
 * ! It is very fast; I will have to optimize even more.
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
    private initialPos: Vec3;
    private initialVel: Vec3;
    private initialYaw: number;
    private initialPitch: number;
    private points: Vec3[];
    private pointVelocities: Vec3[];
    private blockHit = false;
    private gravity: number;
    private interceptCalcs?: InterceptEquations;

    constructor(originVel: Vec3, { position: pPos, velocity: pVel, gravity }: ProjectileMotion, bot?: Bot) {
        const { yaw, pitch } = dirToYawAndPitch(pVel);
        this.initialPos = pPos;
        this.initialVel = pVel.clone().add(originVel);
        this.gravity = gravity!;
        this.initialYaw = yaw;
        this.initialPitch = pitch;
        this.points = [];
        this.pointVelocities = [];
        if (bot) this.interceptCalcs = new InterceptEquations(bot);
    }

    // TODO: With yaw, pitch, and scalar speed, calculate velocity.
    static fromShootingPlayer({ position, yaw, pitch, velocity, heldItem }: ShotEntity, bot?: Bot, weapon?: string) {
        const { v0, g } = trajectoryInfo[weapon! ?? heldItem?.name];
        if (v0 && g) {
            const projVel = yawPitchAndSpeedToDir(yaw!, pitch!, v0);
            return new Shot(velocity, { position: position.offset(0, 1.62, 0), velocity: projVel, gravity: g }, bot);
        } else {
            throw "Invalid weapon";
        }
    }

    static fromWeapon({ position, velocity }: ProjectileMotion, bot?: Bot) {
        return new Shot(emptyVec, { position, velocity, gravity: 0.05 }, bot);
    }

    static fromOther({ position, velocity }: ProjectileMotion, bot?: Bot) {
        return new Shot(emptyVec, { position, velocity, gravity: 0.03 }, bot);
    }

    // private async updateEntityPosition(entity: Entity) {
    //     while (this.trackingData[entity.id].tracking) {
    //         const firstPos = entity.position.clone()
    //         await sleep(50);
    //         if (entity.position !== firstPos) this.trackingData[entity.id].info.push(entity)
    //     }
    // }

    // public trackEntity(entity: Entity) {
    //     this.trackingData[entity.id] ??= { tracking: true, info: [] };
    //     if (!this.trackingData[entity.id].tracking) this.updateEntityPosition(entity);
    // }

    // public stopTrackingEntity(entity: Entity, clear: boolean = false) {
    //     if (!this.trackingData[entity.id]) return;
    //     this.trackingData[entity.id].tracking = false;
    //     if (clear) this.trackingData[entity.id].info = [];
    // }

    public canCollisionDetect(): boolean {
        return !!this.interceptCalcs;
    }

    public loadWorld(bot: Bot) {
        if (!this.interceptCalcs) this.interceptCalcs = new InterceptEquations(bot);
    }

    public XZHitCheck(entity: EntityAABB): boolean {
        return !!this.entityXZInterceptCheck(entity);
    }

    public entityXYZInterceptCheck({ position, height, width }: EntityAABB): Vec3 | null {
        return getEntityAABB({ position, height, width }).intersectsRay(this.initialPos, this.initialVel);
    }

    //TODO: Optimize raycast; change check from 3D to 2D (check only X and Z).
    public entityXZInterceptCheck({ position, height, width }: EntityAABB): { x: number; z: number } | null {
        return getEntityAABB({ position, height, width }).xzIntersectsRay(this.initialPos, this.initialVel);
    }

    public hitEntitiesCheckXZ(...entities: Entity[]): Entity | null {
        let sorted = entities.sort((a, b) => a.position.distanceTo(this.initialPos) - b.position.distanceTo(this.initialPos));
        for (const entity of sorted) {
            const xzGood = this.XZHitCheck(entity);
            if (xzGood) return entity;
        }
        return null;
    }

    public hitEntitiesCheck(...entities: Entity[]): Entity | null {
        const firstEntity = this.hitEntitiesCheckXZ(...entities);
        if (firstEntity) {
            const calcShot = this.calculateShotToEntity(firstEntity.position);
            if (!calcShot) return null;
            const dist = getEntityAABB(firstEntity).distanceTo(calcShot.closestArrowPoint!);
            console.log(dist, calcShot.nearestDistance);
            if (dist < 0.25) {
                return firstEntity;
            }
        }
        return null;
    }

    public hitEntityWithPredictionCheck({ position, height, width }: Entity, avgSpeed: Vec3): boolean {
        //Ignore XZ check as we will check two different XZ coords.
        const calcShot = this.calculateShotToEntity(position.offset(0, height / 2, 0));
        if (calcShot) {
            const { newTarget } = getPremonition(this.initialPos, position.offset(0, height / 2, 0), avgSpeed, calcShot.totalTicks);
            const calcPredictShot = this.calculateShotToEntity(newTarget, true);
            return getEntityAABB({ position: newTarget, height, width }).distanceTo(calcPredictShot.closestArrowPoint!) < 0.25;
        }
        return false;
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

        let blockInTrajectory: Block | undefined;
        let closestArrowPoint: Vec3 | undefined;
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

            const currentArrowPosition = new Vec3(x, y, z);

            if (nearestDistance === currentTickDistance) closestArrowPoint = currentArrowPosition;

            this.points.push(currentArrowPosition);
            this.pointVelocities.push(currentArrowPosition.minus(this.points[this.points.length === 1 ? 0 : this.points.length - 2]));

            if (tryInterceptBlock && this.interceptCalcs) {
                const previusArrowPositionIntercept = this.points[this.points.length === 1 ? 0 : this.points.length - 2];
                blockInTrajectory = this.interceptCalcs.check(previusArrowPositionIntercept, currentArrowPosition)?.block;
            }

            // Arrow passed player || Voy (arrow is going down and passed player) || Detected solid block
            if (Vx > xDestination || (Voy < 0 && yDestination > Vy) || !!blockInTrajectory) break;
        }

        return {
            nearestDistance: nearestDistance,
            totalTicks: totalTicks,
            blockInTrayect: blockInTrajectory,
            closestArrowPoint,
        };
    }
}
