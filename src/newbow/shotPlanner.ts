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

type pitchAndTicks = { pitch: number; ticks: number };
type CheckShotInfo = { yaw: number; pitch: number; ticks: number, shift?: boolean};
export class ShotPlanner {
    constructor(private bot: Bot, private tempTracker: EntityTracker, private intercepter: InterceptEquations) {}

    shotToEntity(entity: AABBComponents, avgSpeed: Vec3 = emptyVec) {
        const aabb = getEntityAABB(entity);
        let yaw = getTargetYaw(this.bot.entity.position, entity.position);
        const info = this.getPitchesNoBlockCheck(entity, yaw);
        if (avgSpeed.equals(emptyVec)) {
            const correctShot = this.checkPitchesBlockCheck(entity, info);
            if (!correctShot || !correctShot.shotInfo) return null;
            if (correctShot.shotInfo.intersectPos || (correctShot.pitch > Math.PI / 3 && correctShot.shotInfo.nearestDistance < 1)) return correctShot;
        } else {
            const predictiveInfo = this.shiftTargetPositions(entity, avgSpeed, info);
            for (const {target, info} of predictiveInfo) {
                const correctShot = this.checkPitchesBlockCheck(target, info);
                // console.log("distance:", target.position.distanceTo(entity.position), correctShot.ticks);

                if (correctShot.shotInfo?.intersectPos) return correctShot;
            }
        }

        return null;
    }

    shiftTargetPositions(target: AABBComponents, avgSpeed: Vec3, shotInfo: CheckShotInfo[]) {
        const newPossibleTargetPositions = shotInfo.map((info) => info.shift ? target.position.clone().add(avgSpeed.clone().scale(info.ticks + 5)) : target.position); //why... did this work?
        const allInfo: { target: AABBComponents; info: CheckShotInfo[] }[] = [];
        for (const position of newPossibleTargetPositions) {
            const yaw = getTargetYaw(this.bot.entity.position, position);
            const res = this.getPitchesNoBlockCheck({ position, height: target.height, width: target.width }, yaw);
            const info = res.map((i) => {
                return { yaw, pitch: i.pitch, ticks: i.ticks };
            });
            allInfo.push({ target: { position, height: target.height, width: target.width }, info });
        }
        return allInfo;
    }

    checkPitchesBlockCheck(
        target: AABBComponents,
        shots: CheckShotInfo[]
    ): { yaw: number; pitch: number; ticks: number; shotInfo: BasicShotInfo | null } {
        // console.log("There are", Object.keys(shots).length, "pitches to select from.");
        for (const { pitch, ticks, yaw } of shots) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            // console.log("block checking",yaw, pitch, shot?.nearestDistance)
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true });
            if (!shot) continue;
            if (shot.intersectPos || (pitch > Math.PI / 3 && shot.nearestDistance < 1)) return { shotInfo: shot, yaw, ticks, pitch: Number(pitch) };
            // else console.log(shot);
        }
        return { yaw: NaN, pitch: NaN, ticks: NaN, shotInfo: null };
    }

    //TODO: This is too expensive. Will aim at offset off foot instead of calc'ing all hits and averaging.
    getPitchesNoBlockCheck(target: AABBComponents, yaw: number) {
        let possibleShotData: CheckShotInfo[] = [];
        let isHitting: boolean = false;
        let initHit: boolean = false;
        let shiftPos: boolean = true;
        let hittingData: pitchAndTicks[] = [];

        const dv = Math.PI / 1440;
        const MathPiOver4 = Math.PI / 2;
        const PIOver3 = Math.PI / 3;
        for (let pitch = -MathPiOver4; pitch < MathPiOver4; pitch += dv) {
            const initShot = Shot.fromShootingPlayer(
                { position: this.bot.entity.position, yaw, pitch, velocity: emptyVec, heldItem: this.bot.entity.heldItem },
                this.bot
            );
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false });
            if (!shot) continue;
            // console.log(yaw, pitch, shot?.nearestDistance)
            if (!shot.intersectPos || (pitch > PIOver3 && shot.nearestDistance < 1)) {
                isHitting = false;
                if (hittingData.length !== 0) {
                    const avgPitch = hittingData.map((e) => e.pitch).reduce((a, b) => a + b) / hittingData.length; //monkeypatch to hit feet.
                    const avgTicks = hittingData.map((e) => e.ticks).reduce((a, b) => a + b) / hittingData.length;
                    possibleShotData.push({ yaw, pitch: avgPitch, ticks: Math.floor(avgTicks), shift: shiftPos });
                    hittingData = [];
                    shiftPos = true
                } else if (pitch > PIOver3 && shot.nearestDistance < 1) {
                    // console.log(pitch, shot.nearestDistance)
                    shiftPos = false
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
