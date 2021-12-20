import { Bot } from "mineflayer";
import { AABBComponents, BasicShotInfo, Shot } from "@nxg-org/mineflayer-trajectories";
import { Entity } from "prismarine-entity";
import { degreesToRadians, getTargetYaw, vectorMagnitude, yawPitchAndSpeedToDir } from "../calc/mathUtilts";
import { EntityTracker } from "./entityTracker";
import { Vec3 } from "vec3";
import { AABB,  InterceptFunctions } from "@nxg-org/mineflayer-util-plugin";
import { getEntityAABB } from "../calc/entityUtils";
import { Item } from "prismarine-item";

const emptyVec = new Vec3(0, 0, 0);
const dv = Math.PI / 360;
const PIOver2 = Math.PI / 2;
const PIOver3 = Math.PI / 3;

type pitchAndTicks = { pitch: number; ticks: number };
type CheckShotInfo = { yaw: number; pitch: number; ticks: number; shift?: boolean };
export type CheckedShot = { hit: boolean; yaw: number; pitch: number; ticks: number; shotInfo: BasicShotInfo | null };
export class ShotPlanner {
    public weapon: string = "bow"
    private intercepter: InterceptFunctions;
    private tracker: EntityTracker;
    constructor(private bot: Bot) {
        this.intercepter = new InterceptFunctions(bot);
        this.tracker = new EntityTracker(bot);
        bot.once("spawn", () => this.tracker.trackEntity(this.bot.entity));
    }

    public get originVel(): Vec3 {
        return this.tracker.getEntitySpeed(this.bot.entity);
    }

    private isShotValid(shotInfo1: CheckedShot | BasicShotInfo, target: Vec3, pitch: number) {
        let shotInfo = (shotInfo1 as CheckedShot).shotInfo;
        if (!shotInfo) shotInfo = shotInfo1 as BasicShotInfo;
        //@ts-expect-error
        if (shotInfo.shotInfo) shotInfo = shotInfo.shotInfo as BasicShotInfo;
        if (!shotInfo) return false;
        if (shotInfo.blockingBlock && pitch > PIOver3) {
            return shotInfo.blockingBlock.position.y <= target.y - 1;
        } else {
            return shotInfo.intersectPos && !shotInfo.blockingBlock;
        }
    }

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
                if (this.isShotValid(correctShot, target.position, pitch)) return correctShot;
                const yawShot = this.getAlternativeYawShots(target, initInfo);
                if (this.isShotValid(yawShot, target.position, pitch)) return yawShot;
            } else {
                const newInfo = this.shiftTargetPositions(target, avgSpeed, initInfo);
                for (const i of newInfo) {
                    const correctShot = this.checkForBlockIntercepts(i.target, ...i.info);
                    if (!correctShot.shotInfo) continue;
                    if (this.isShotValid(correctShot, i.target.position, pitch)) return correctShot;
                    const yawShot = this.getAlternativeYawShots(i.target, initInfo);
                    if (this.isShotValid(yawShot, i.target.position, pitch)) return yawShot;
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
                { position: this.bot.entity.position, yaw, pitch, velocity: this.originVel,  },
                this.intercepter, this.weapon
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true })!;
            if (this.isShotValid(shot, target.position, Number(pitch)))
                return { hit: true, yaw, pitch: Number(pitch), ticks, shotInfo: shot };
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
                { position: this.bot.entity.position, yaw, pitch, velocity: this.originVel,  },
                this.intercepter, this.weapon
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false })!;
            if (!shot.intersectPos) {
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

    public getAlternativeYawShots(target: AABBComponents, ...shots: CheckShotInfo[]): CheckedShot {
        for (const { pitch, yaw: orgYaw } of shots) {
            const yaws = getEntityAABB(target)
                .toVertices()
                .map((p) => getTargetYaw(this.bot.entity.position, p))
                .sort((a, b) => orgYaw - Math.abs(a) - (orgYaw - Math.abs(b)));
            let inbetween = [yaws.pop()!, yaws.pop()!];
            inbetween = inbetween.map((y) => y + Math.sign(orgYaw - y) * 0.02);
            for (const yaw of inbetween) {
                const initShot = Shot.fromShootingPlayer(
                    { position: this.bot.entity.position, yaw, pitch, velocity: this.originVel,  },
                    this.intercepter, this.weapon
                );
                const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true })!;
                if (shot.intersectPos || (pitch > PIOver3 && shot.nearestDistance < 2)) {
                    return { hit: true, yaw, pitch, ticks: shot.totalTicks, shotInfo: shot };
                }
            }
        }
        return { hit: false, yaw: NaN, pitch: NaN, ticks: NaN, shotInfo: null };
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
                { position: this.bot.entity.position, yaw, pitch, velocity: this.originVel,  },
                this.intercepter, this.weapon
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false });
            if (!shot) continue;
            // console.log(yaw, pitch, shot?.nearestDistance)
            if (!shot.intersectPos) {
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
