import { Vec3 } from "vec3";

import type { Bot } from "mineflayer";
import type { Block } from "prismarine-block";
import { dirToYawAndPitch, yawPitchAndSpeedToDir, pointToYawAndPitch } from "./calc/mathUtilts";
import { trajectoryInfo } from "./calc/constants";
import { Item } from "prismarine-item";
import { getEntityAABB } from "./calc/entityUtils";
import { Entity } from "prismarine-entity";


function getTargetYaw(origin: Vec3, destination: Vec3) {
    const xDistance = destination.x - origin.x;
    const zDistance = destination.z - origin.z;
    const yaw = Math.atan2(xDistance, zDistance) + Math.PI;
    return yaw;
}

/**
 * uses:
 * (a) calculate shot based off current entities yaw and target
 * (b) calculate correct yaw and target
 * (c) better block detection
 * (d) velocity checks
 */

export type World = { blockAt(pos: Vec3): Block | null };
export type ShotEntity = { position: Vec3; velocity: Vec3; yaw?: number; pitch?: number; heldItem?: Item | null };
export type EntityAABB = {position: Vec3, height: number, width?: number}
export type Projectile = { position: Vec3; velocity: Vec3 };

export class Shot {
    private originPos: Vec3
    private originVel: Vec3
    private initialVel: Vec3
    private initialYaw: number;
    private initialPitch: number;
    private points: Vec3[] = [];
    private pointVelocities: Vec3[] = [];
    private blockHit = false;

    constructor(private world: World, originVel: Vec3, { position: pPos, velocity: pVel }: Projectile) {
        const { yaw, pitch } = dirToYawAndPitch(pVel);
        this.originPos = pPos
        this.originVel = originVel
        this.initialVel = pVel
        this.initialYaw = yaw;
        this.initialPitch = pitch;
        this.points[0] = pPos.clone();
        this.pointVelocities[0] = pVel.clone();
    }

    // TODO: With yaw, pitch, and scalar speed, calculate velocity.
    static fromShootingPlayer(world: World, { position, yaw, pitch, velocity, heldItem }: ShotEntity, weapon: string) {
        const speed = trajectoryInfo[weapon ?? heldItem?.name]?.v0 ?? 3.0;
        const projVel = yawPitchAndSpeedToDir(yaw!, pitch!, speed);
        return new Shot(world, velocity, { position: position.offset(0, 1.5, 0), velocity: projVel });
    }

    public checkIfXZHit({position, height, width}: EntityAABB): boolean {
        console.log(this.initialPitch)
        if (!getEntityAABB({position, height, width}).intersectsRay(this.originPos, this.initialVel)) return false;
        return true;
    }


    //TODO: Optimize raycast; change check from 3D to 2D (check only X and Z).
    public initialRaycast({position, height, width}: EntityAABB): Vec3 | null {
        const aabb = getEntityAABB({position, height, width})
        return aabb.intersectsRay(this.originPos, this.initialVel)
    }

    public getHitPosition(distance: number): Vec3 | null {
        // more stuff here
        return null;
    }

    private getIndex(position: Vec3): number | null {
        let lastDistance = position.distanceTo(this.originPos);
        let distance;
        if (this.blockHit) {
            for (let i = 0; i < this.points.length; i++) {
                distance = position.distanceTo(this.points[i]);
                if (lastDistance <= distance) return i;
                lastDistance = distance;
            }
            return this.points.length - 1;
        }
        return null;
    }

}


export enum BlockFace {
    UNKNOWN = -999,
    BOTTOM = 0,
    TOP = 1,
    NORTH = 2,
    SOUTH = 3,
    WEST = 4,
    EAST = 5,
}

export class RaycastIterator {
    block: { x: number; y: number; z: number; face: number };
    blockVec: Vec3;
    pos: Vec3;
    dir: Vec3;
    invDirX: number;
    invDirY: number;
    invDirZ: number;
    stepX: number;
    stepY: number;
    stepZ: number;
    tDeltaX: number;
    tDeltaY: number;
    tDeltaZ: number;
    tMaxX: number;
    tMaxY: number;
    tMaxZ: number;
    maxDistance: number;
    constructor(pos: Vec3, dir: Vec3, maxDistance: number) {
        this.block = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z),
            face: BlockFace.UNKNOWN,
        };

        this.blockVec = new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));

        this.pos = pos;
        this.dir = dir;

        this.invDirX = dir.x === 0 ? Number.MAX_VALUE : 1 / dir.x;
        this.invDirY = dir.y === 0 ? Number.MAX_VALUE : 1 / dir.y;
        this.invDirZ = dir.z === 0 ? Number.MAX_VALUE : 1 / dir.z;

        this.stepX = Math.sign(dir.x);
        this.stepY = Math.sign(dir.y);
        this.stepZ = Math.sign(dir.z);

        this.tDeltaX = dir.x === 0 ? Number.MAX_VALUE : Math.abs(1 / dir.x);
        this.tDeltaY = dir.y === 0 ? Number.MAX_VALUE : Math.abs(1 / dir.y);
        this.tDeltaZ = dir.z === 0 ? Number.MAX_VALUE : Math.abs(1 / dir.z);

        this.tMaxX = dir.x === 0 ? Number.MAX_VALUE : Math.abs((this.block.x + (dir.x > 0 ? 1 : 0) - pos.x) / dir.x);
        this.tMaxY = dir.y === 0 ? Number.MAX_VALUE : Math.abs((this.block.y + (dir.y > 0 ? 1 : 0) - pos.y) / dir.y);
        this.tMaxZ = dir.z === 0 ? Number.MAX_VALUE : Math.abs((this.block.z + (dir.z > 0 ? 1 : 0) - pos.z) / dir.z);

        this.maxDistance = maxDistance;
    }

    // Returns null if none of the shapes is intersected, otherwise returns intersect pos and face
    // shapes are translated by offset
    //[x0: number,y0: number,z0: number,x1:number,y1:number,z1:number][]
    intersect(shapes: [x0: BlockFace, y0: BlockFace, z0: BlockFace, x1: BlockFace, y1: BlockFace, z1: BlockFace][], offset: Vec3) {
        // Shapes is an array of shapes, each in the form of: [x0, y0, z0, x1, y1, z1]
        let t = Number.MAX_VALUE;
        let f = BlockFace.UNKNOWN;
        const p = this.pos.minus(offset);
        for (const shape of shapes) {
            let tmin = (shape[this.invDirX > 0 ? 0 : 3] - p.x) * this.invDirX;
            let tmax = (shape[this.invDirX > 0 ? 3 : 0] - p.x) * this.invDirX;
            const tymin = (shape[this.invDirY > 0 ? 1 : 4] - p.y) * this.invDirY;
            const tymax = (shape[this.invDirY > 0 ? 4 : 1] - p.y) * this.invDirY;

            let face = this.stepX > 0 ? BlockFace.WEST : BlockFace.EAST;

            if (tmin > tymax || tymin > tmax) continue;
            if (tymin > tmin) {
                tmin = tymin;
                face = this.stepY > 0 ? BlockFace.BOTTOM : BlockFace.TOP;
            }
            if (tymax < tmax) tmax = tymax;

            const tzmin = (shape[this.invDirZ > 0 ? 2 : 5] - p.z) * this.invDirZ;
            const tzmax = (shape[this.invDirZ > 0 ? 5 : 2] - p.z) * this.invDirZ;

            if (tmin > tzmax || tzmin > tmax) continue;
            if (tzmin > tmin) {
                tmin = tzmin;
                face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
            if (tzmax < tmax) tmax = tzmax;

            if (tmin < t) {
                t = tmin;
                f = face;
            }
        }
        if (t === Number.MAX_VALUE) return null;
        return { pos: this.pos.plus(this.dir.scaled(t)), face: f };
    }

    next() {
        if (Math.min(Math.min(this.tMaxX, this.tMaxY), this.tMaxZ) > this.maxDistance) {
            return null;
        }

        if (this.tMaxX < this.tMaxY) {
            if (this.tMaxX < this.tMaxZ) {
                this.block.x += this.stepX;
                this.tMaxX += this.tDeltaX;
                this.block.face = this.stepX > 0 ? BlockFace.WEST : BlockFace.EAST;
            } else {
                this.block.z += this.stepZ;
                this.tMaxZ += this.tDeltaZ;
                this.block.face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
        } else {
            if (this.tMaxY < this.tMaxZ) {
                this.block.y += this.stepY;
                this.tMaxY += this.tDeltaY;
                this.block.face = this.stepY > 0 ? BlockFace.BOTTOM : BlockFace.TOP;
            } else {
                this.block.z += this.stepZ;
                this.tMaxZ += this.tDeltaZ;
                this.block.face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
        }
        if (isNaN(this.block.x) || isNaN(this.block.y) || isNaN(this.block.z)) return null;
        return this.block;
    }
}
