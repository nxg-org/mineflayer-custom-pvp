import { Bot } from "mineflayer";
import { AABBComponents, BasicShotInfo } from "@nxg-org/mineflayer-trajectories";
import { Vec3 } from "vec3";
declare type CheckShotInfo = {
    yaw: number;
    pitch: number;
    ticks: number;
    shift?: boolean;
};
export declare type CheckedShot = {
    hit: boolean;
    yaw: number;
    pitch: number;
    ticks: number;
    shotInfo: BasicShotInfo | null;
};
export declare class ShotPlanner {
    private bot;
    weapon: string;
    private intercepter;
    private tracker;
    constructor(bot: Bot);
    get originVel(): Vec3;
    private isShotValid;
    /**
     * Better optimization. Still about 5x more expensive than hawkeye (no clue what I did) but its more accurate so whatever.
     *
     * Note: The increased cost comes from the increased checks made (1440 vs 100). This will be fixed.
     *
     * @param target
     * @param avgSpeed
     * @param pitch
     * @returns {CheckedShot} the shot.
     */
    shotToEntity(target: AABBComponents, avgSpeed?: Vec3, pitch?: number): CheckedShot | null;
    private shiftTargetPositions;
    checkForBlockIntercepts(target: AABBComponents, ...shots: CheckShotInfo[]): CheckedShot;
    getNextShot(target: AABBComponents, yaw: number, minPitch?: number): CheckShotInfo;
    getAlternativeYawShots(target: AABBComponents, ...shots: CheckShotInfo[]): CheckedShot;
    getAllPossibleShots(target: AABBComponents, yaw: number): CheckShotInfo[];
}
export {};
