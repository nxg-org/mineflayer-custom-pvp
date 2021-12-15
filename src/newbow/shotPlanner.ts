import { Bot } from "mineflayer";
import { AABBComponents, BasicShotInfo, Shot } from "./shot";
import { Entity } from "prismarine-entity";
import { degreesToRadians, getTargetYaw, yawPitchAndSpeedToDir } from "../calc/mathUtilts";
import { EntityTracker } from "./entityTracker";
import { Vec3 } from "vec3";
import { InterceptEquations } from "../calc/intercept";
import { AABB } from "@nxg-org/mineflayer-util-plugin";
import { getEntityAABB } from "../calc/entityUtils";

const emptyVec = new Vec3(0, 0, 0);

type pitchAndTicks = { pitch: number; ticks: number };
type pitchAndTicksAndYaw = {yaw: number, pitch: number, ticks: number}
export class ShotPlanner {
    constructor(private bot: Bot, private tempTracker: EntityTracker, private intercepter: InterceptEquations) {}

    shotToEntity(entity: AABBComponents, avgSpeed: Vec3 = emptyVec) {
        const aabb = getEntityAABB(entity);
        let yaw = getTargetYaw(this.bot.entity.position, entity.position);
        const info = this.getPitchesNoBlockCheck(entity, yaw);
        if (avgSpeed.equals(emptyVec)) {
            const correctShot = this.checkPitchesBlockCheck(entity, info);
            if (correctShot.shotInfo?.intersectPos) return correctShot;
        }
        const predictiveInfo = this.shiftTargetPositions(entity, avgSpeed, info);
        for (const predictShot of predictiveInfo) {
            const correctShot = this.checkPitchesBlockCheck(predictShot.target, predictShot.info);
            // console.log("distance:", predictShot.target.position.distanceTo(entity.position), correctShot.ticks);

            if (correctShot.shotInfo?.intersectPos) return correctShot;
        }
    }

    shiftTargetPositions(target: AABBComponents, avgSpeed: Vec3, shotInfo: pitchAndTicks[]) {
        const newPossibleTargetPositions = shotInfo.map((info) => target.position.clone().add(avgSpeed.clone().scale(info.ticks + 5))); //why... did this work?
        const allInfo: { target: AABBComponents; info: pitchAndTicksAndYaw[] }[] = [];
        for (const position of newPossibleTargetPositions) {
            const yaw = getTargetYaw(this.bot.entity.position, position)
            const res = this.getPitchesNoBlockCheck({ position, height: target.height, width: target.width }, yaw);
            const info = res.map(i => { return {yaw, pitch: i.pitch, ticks: i.ticks}})
            allInfo.push({ target: { position, height: target.height, width: target.width }, info });
        }
        return allInfo;
    }

    checkPitchesBlockCheck(
        target: AABBComponents,
        shots: pitchAndTicksAndYaw[]
    ): { yaw: number; pitch: number; ticks: number; shotInfo: BasicShotInfo | null } {
        // console.log("There are", Object.keys(shots).length, "pitches to select from.");
        for (const { pitch, ticks, yaw } of shots) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            // console.log("block checking",yaw, pitch, shot?.nearestDistance)
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true });
            if (shot?.intersectPos) return { shotInfo: shot, yaw, ticks, pitch: Number(pitch) };
            // else console.log(shot);
        }
        return { yaw: NaN, pitch: NaN, ticks: NaN, shotInfo: null };
    }

    //TODO: This is too expensive. Will aim at offset off foot instead of calc'ing all hits and averaging.
    getPitchesNoBlockCheck(target: AABBComponents, yaw: number) {
        let possibleShotData: pitchAndTicksAndYaw[] = [];
        let isHitting: boolean = false;
        let initHit: boolean = false;
        let hittingData: pitchAndTicks[] = [];

        const dv = Math.PI / 360;
        const MathPiOver4 = Math.PI / 2;
        for (let pitch = -MathPiOver4; pitch < MathPiOver4; pitch += dv) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false });
            if (!shot) continue;
            // console.log(yaw, pitch, shot?.nearestDistance)
            if (!shot.intersectPos) {
                isHitting = false;
                if (hittingData.length !== 0) {
                    const avgPitch = hittingData.map((e) => e.pitch).reduce((a, b) => a + b) / (hittingData.length * 1.33); //monkeypatch to hit feet.
                    const avgTicks = hittingData.map((e) => e.ticks).reduce((a, b) => a + b) / hittingData.length;
                    possibleShotData.push({ yaw, pitch: avgPitch, ticks: Math.floor(avgTicks) });
                    hittingData = [];
                }
                continue;
            }
            initHit = hittingData.length === 0;
            hittingData.push({ pitch, ticks: shot.totalTicks });
            if (initHit) isHitting = true;
            if (isHitting) continue;
        }

        return possibleShotData;
    }
}
