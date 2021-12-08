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
const emptyVec = new Vec3(0, 0, 0)

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
        return new Shot(world, velocity, { position: position.offset(0, 1.64, 0), velocity: projVel });
    }

    static fromArrow(world: World, { position, velocity }: Projectile) {
        return new Shot(world, emptyVec, {position, velocity})
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