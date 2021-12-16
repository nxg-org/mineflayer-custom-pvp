import { Bot } from "mineflayer";
import { AABBComponents, BasicShotInfo, Shot } from "./shot";
import { Entity } from "prismarine-entity";
import { degreesToRadians, getTargetYaw, yawPitchAndSpeedToDir } from "../calc/mathUtilts";
import { EntityTracker } from "./entityTracker";
import { Vec3 } from "vec3";
import { InterceptEquations } from "../calc/intercept";
import { AABB } from "../../../utilplugin";
import { getEntityAABB } from "../calc/entityUtils";

const emptyVec = new Vec3(0, 0, 0);
const dv = Math.PI / 360;
const PIOver2 = Math.PI / 2;
const PIOver3 = Math.PI / 3;

type pitchAndTicks = { pitch: number; ticks: number };
type CheckShotInfo = { yaw: number; pitch: number; ticks: number; shift?: boolean };
type CheckedShot = { hit: boolean; yaw: number; pitch: number; ticks: number; shotInfo: BasicShotInfo | null };
export class ShotPlanner {
    constructor(private bot: Bot) {}

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
    shotToEntity(target: AABBComponents, avgSpeed: Vec3 = emptyVec, pitch: number = -PIOver2): CheckedShot | null {
        const yaw = getTargetYaw(this.bot.entity.position, target.position);
        while (pitch < PIOver2) {
            const initInfo = this.getNextShot(target, yaw, pitch);
            pitch = initInfo.pitch;
            if (avgSpeed.equals(emptyVec)) {
                const correctShot = this.checkForBlockIntercepts(target, initInfo);
                if (!correctShot.shotInfo) continue;
                if (correctShot.shotInfo.nearestDistance < 2) return correctShot;
            } else {
                const newInfo = this.shiftTargetPositions(target, avgSpeed, initInfo);
                for (const i of newInfo) {
                    const correctShot = this.checkForBlockIntercepts(i.target, ...i.info);
                    if (!correctShot.shotInfo) continue;
                    if (correctShot.shotInfo.nearestDistance < 2) return correctShot;
                }
            }
        }
        return null;
    }

    private shiftTargetPositions(target: AABBComponents, avgSpeed: Vec3, ...shotInfo: CheckShotInfo[]) {
        const newInfo = shotInfo.map((i) => (i.shift ? target.position.clone().add(avgSpeed.clone().scale(i.ticks + 5)) : target.position)); //weird monkey patch.
        const allInfo: { target: AABBComponents; info: CheckShotInfo[] }[] = [];
        for (const position of newInfo) {
            const yaw = getTargetYaw(this.bot.entity.position, position);
            const res = this.getAllPossibleShots({ position, height: target.height, width: target.width }, yaw);
            const info = res.map((i) => {
                return { yaw, pitch: i.pitch, ticks: i.ticks };
            });
            allInfo.push({ target: { position, height: target.height, width: target.width }, info });
        }
        return allInfo;
    }

    public checkForBlockIntercepts(target: AABBComponents, ...shots: CheckShotInfo[]): CheckedShot {
        for (const { pitch, ticks, yaw } of shots) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true })!;
            if (shot.intersectPos || (pitch > PIOver3 && shot.nearestDistance < 2))
                return { hit: true, shotInfo: shot, yaw, ticks, pitch: Number(pitch) };
        }
        return { hit: false, yaw: NaN, pitch: NaN, ticks: NaN, shotInfo: null };
    }

    public getNextShot(target: AABBComponents, yaw: number, minPitch: number = -PIOver2): CheckShotInfo {
        let isHitting: boolean = false;
        let initHit: boolean = false;
        let shiftPos: boolean = true;
        let hittingData: pitchAndTicks[] = [];

        for (let pitch = minPitch + dv; pitch < PIOver2; pitch += dv) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false })!;
            if (!shot.intersectPos || (pitch > PIOver3 && shot.nearestDistance < 2)) {
                isHitting = false;
                if (hittingData.length !== 0) {
                    const avgPitch = hittingData.map((e) => e.pitch).reduce((a, b) => a + b) / hittingData.length; //monkeypatch to hit feet.
                    const avgTicks = hittingData.map((e) => e.ticks).reduce((a, b) => a + b) / hittingData.length;
                    return { yaw, pitch: avgPitch, ticks: Math.floor(avgTicks), shift: shiftPos };
                } else if (pitch > PIOver3 && shot.nearestDistance < 2) {
                    shiftPos = false;
                    hittingData.push({ pitch, ticks: shot.totalTicks });
                }
                continue;
            }
            initHit = hittingData.length === 0;
            hittingData.push({ pitch, ticks: shot.totalTicks });
            if (initHit) isHitting = true;
            if (isHitting) continue;
        }
        return { yaw: NaN, pitch: NaN, ticks: NaN };
    }

    //TODO: This is too expensive. Will aim at offset off foot instead of calc'ing all hits and averaging.
    public getAllPossibleShots(target: AABBComponents, yaw: number) {
        let possibleShotData: CheckShotInfo[] = [];
        let isHitting: boolean = false;
        let initHit: boolean = false;
        let shiftPos: boolean = true;
        let hittingData: pitchAndTicks[] = [];

        for (let pitch = -PIOver2; pitch < PIOver2; pitch += dv) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false });
            if (!shot) continue;
            // console.log(yaw, pitch, shot?.nearestDistance)
            if (!shot.intersectPos || (pitch > PIOver3 && shot.nearestDistance < 2)) {
                isHitting = false;
                if (hittingData.length !== 0) {
                    const avgPitch = hittingData.map((e) => e.pitch).reduce((a, b) => a + b) / hittingData.length; //monkeypatch to hit feet.
                    const avgTicks = hittingData.map((e) => e.ticks).reduce((a, b) => a + b) / hittingData.length;
                    possibleShotData.push({ yaw, pitch: avgPitch, ticks: Math.floor(avgTicks), shift: shiftPos });
                    hittingData = [];
                    shiftPos = true;
                } else if (pitch > PIOver3 && shot.nearestDistance < 2) {
                    // console.log(pitch, shot.nearestDistance)
                    shiftPos = false;
                    hittingData.push({ pitch, ticks: shot.totalTicks });
                    // possibleShotData.push({ yaw, pitch, ticks: shot.totalTicks, shift: true });
                }
                continue;
            }

            initHit = hittingData.length === 0;
            hittingData.push({ pitch, ticks: shot.totalTicks });
            if (initHit) isHitting = true;
            if (isHitting) continue;
        }

        // console.log(possibleShotData)
        return possibleShotData;
    }
}
