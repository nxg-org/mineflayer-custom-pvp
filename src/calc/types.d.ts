import type { Block } from "prismarine-block";
import type { Item } from "prismarine-item";
import type { Vec3 } from "vec3";
export declare type ShotEntity = {
    position: Vec3;
    velocity: Vec3;
    yaw?: number;
    pitch?: number;
    heldItem?: Item | null;
};
export declare type AABBComponents = {
    position: Vec3;
    height: number;
    width?: number;
};
export declare type ProjectileMotion = {
    position: Vec3;
    velocity: Vec3;
    gravity?: number;
};
export declare type BasicShotInfo = {
    nearestDistance: number;
    blockingBlock: Block | null;
    intersectPos: Vec3 | null;
    closestPoint: Vec3 | null;
    totalTicks: number;
};
