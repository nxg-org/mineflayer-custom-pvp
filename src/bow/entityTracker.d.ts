import { Entity } from "prismarine-entity";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
export declare type TrackingData = {
    [entityId: number]: {
        tracking: boolean;
        info: {
            avgSpeed: Vec3;
            tickInfo: {
                position: Vec3;
                velocity: Vec3;
            }[];
        };
    };
};
export declare class EntityTracker {
    private bot;
    trackingData: TrackingData;
    constructor(bot: Bot);
    private test;
    private hawkeyeRewriteTracking;
    private hawkeyeTracking;
    trackEntity(entity: Entity): void;
    stopTrackingEntity(entity: Entity, clear?: boolean): void;
    getEntitySpeed(entity: Entity): Vec3;
    getEntityPositionInfo(entity: Entity): {
        position: Vec3;
        velocity: Vec3;
    }[];
}
