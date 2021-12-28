"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShotPlanner = void 0;
const mineflayer_trajectories_1 = require("@nxg-org/mineflayer-trajectories");
const mathUtilts_1 = require("../calc/mathUtilts");
const entityTracker_1 = require("./entityTracker");
const vec3_1 = require("vec3");
const mineflayer_util_plugin_1 = require("@nxg-org/mineflayer-util-plugin");
const aabbUtils_1 = require("../calc/aabbUtils");
const emptyVec = new vec3_1.Vec3(0, 0, 0);
const dv = Math.PI / 360;
const PIOver2 = Math.PI / 2;
const PIOver3 = Math.PI / 3;
class ShotPlanner {
    constructor(bot) {
        this.bot = bot;
        this.weapon = "bow";
        this.intercepter = new mineflayer_util_plugin_1.InterceptFunctions(bot);
        this.tracker = new entityTracker_1.EntityTracker(bot);
        bot.once("spawn", () => this.tracker.trackEntity(this.bot.entity));
    }
    get originVel() {
        return this.tracker.getEntitySpeed(this.bot.entity);
    }
    isShotValid(shotInfo1, target, pitch) {
        let shotInfo = shotInfo1.shotInfo;
        if (!shotInfo)
            shotInfo = shotInfo1;
        //@ts-expect-error
        if (shotInfo.shotInfo)
            shotInfo = shotInfo.shotInfo;
        if (!shotInfo)
            return false;
        if (shotInfo.blockingBlock && pitch > PIOver3) {
            return shotInfo.blockingBlock.position.y <= target.y - 1;
        }
        else {
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
    shotToEntity(target, avgSpeed = emptyVec, pitch = -PIOver2) {
        const yaw = (0, mathUtilts_1.getTargetYaw)(this.bot.entity.position, target.position);
        while (pitch < PIOver2) {
            const initInfo = this.getNextShot(target, yaw, pitch);
            pitch = initInfo.pitch;
            if (avgSpeed.equals(emptyVec)) {
                const correctShot = this.checkForBlockIntercepts(target, initInfo);
                if (this.isShotValid(correctShot, target.position, pitch))
                    return correctShot;
                const yawShot = this.getAlternativeYawShots(target, initInfo);
                if (this.isShotValid(yawShot, target.position, pitch))
                    return yawShot;
            }
            else {
                const newInfo = this.shiftTargetPositions(target, avgSpeed, initInfo);
                for (const i of newInfo) {
                    const correctShot = this.checkForBlockIntercepts(i.target, ...i.info);
                    if (!correctShot.shotInfo)
                        continue;
                    if (this.isShotValid(correctShot, i.target.position, pitch))
                        return correctShot;
                    const yawShot = this.getAlternativeYawShots(i.target, initInfo);
                    if (this.isShotValid(yawShot, i.target.position, pitch))
                        return yawShot;
                }
            }
        }
        return null;
    }
    shiftTargetPositions(target, avgSpeed, ...shotInfo) {
        const newInfo = shotInfo.map((i) => i.shift ? target.position.clone().add(avgSpeed.clone().scale(Math.ceil(i.ticks) + 5)) : target.position); //weird monkey patch.
        const allInfo = [];
        for (const position of newInfo) {
            const yaw = (0, mathUtilts_1.getTargetYaw)(this.bot.entity.position, position);
            const res = this.getAllPossibleShots({ position, height: target.height, width: target.width }, yaw);
            const info = res.map((i) => {
                return { yaw, pitch: i.pitch, ticks: i.ticks };
            });
            allInfo.push({ target: { position, height: target.height, width: target.width }, info });
        }
        return allInfo;
    }
    checkForBlockIntercepts(target, ...shots) {
        for (const { pitch, ticks, yaw } of shots) {
            const initShot = mineflayer_trajectories_1.ShotFactory.fromShootingPlayer({ position: this.bot.entity.position, yaw, pitch, velocity: this.originVel }, this.intercepter, this.weapon);
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true });
            if (this.isShotValid(shot, target.position, Number(pitch)))
                return { hit: true, yaw, pitch: Number(pitch), ticks, shotInfo: shot };
        }
        return { hit: false, yaw: NaN, pitch: NaN, ticks: NaN, shotInfo: null };
    }
    getNextShot(target, yaw, minPitch = -PIOver2) {
        let shift = true;
        let hittingData = [];
        for (let pitch = minPitch + dv; pitch < PIOver2; pitch += dv) {
            if (pitch > PIOver3)
                shift = true;
            const initShot = mineflayer_trajectories_1.ShotFactory.fromShootingPlayer({ position: this.bot.entity.position, yaw, pitch, velocity: this.originVel }, this.intercepter, this.weapon);
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false });
            if (!shot.intersectPos) {
                if (hittingData.length !== 0) {
                    const pitch = hittingData.map((e) => e.pitch).reduce((a, b) => a + b) / hittingData.length; //monkeypatch to hit feet.
                    const ticks = Math.ceil(hittingData.map((e) => e.ticks).reduce((a, b) => a + b) / hittingData.length);
                    return { yaw, pitch, ticks, shift };
                }
                else if (pitch > PIOver3 && shot.nearestDistance < 1) {
                    hittingData.push({ pitch, ticks: shot.totalTicks });
                }
                continue;
            }
            hittingData.push({ pitch, ticks: shot.totalTicks });
        }
        return { yaw: NaN, pitch: NaN, ticks: NaN };
    }
    getAlternativeYawShots(target, ...shots) {
        for (const { pitch, yaw: orgYaw } of shots) {
            const yaws = (0, aabbUtils_1.getEntityAABB)(target)
                .toVertices()
                .map((p) => (0, mathUtilts_1.getTargetYaw)(this.bot.entity.position, p))
                .sort((a, b) => orgYaw - Math.abs(a) - (orgYaw - Math.abs(b)));
            let inbetween = [yaws.pop(), yaws.pop()];
            inbetween = inbetween.map((y) => y + Math.sign(orgYaw - y) * 0.02);
            for (const yaw of inbetween) {
                const initShot = mineflayer_trajectories_1.ShotFactory.fromShootingPlayer({ position: this.bot.entity.position, yaw, pitch, velocity: this.originVel }, this.intercepter, this.weapon);
                const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: true });
                if (shot.intersectPos || (pitch > PIOver3 && shot.nearestDistance < 1)) {
                    return { hit: true, yaw, pitch, ticks: shot.totalTicks, shotInfo: shot };
                }
            }
        }
        return { hit: false, yaw: NaN, pitch: NaN, ticks: NaN, shotInfo: null };
    }
    //TODO: This is too expensive. Will aim at offset off foot instead of calc'ing all hits and averaging.
    getAllPossibleShots(target, yaw) {
        let possibleShotData = [];
        let shift = true;
        let hittingData = [];
        for (let pitch = -PIOver2; pitch < PIOver2; pitch += dv) {
            if (pitch > PIOver3)
                shift = true;
            const initShot = mineflayer_trajectories_1.ShotFactory.fromShootingPlayer({ position: this.bot.entity.position, yaw, pitch, velocity: this.originVel }, this.intercepter, this.weapon);
            const shot = initShot.hitsEntity(target, { yawChecked: true, blockCheck: false });
            if (!shot.intersectPos) {
                if (hittingData.length !== 0) {
                    const avgPitch = hittingData.map((e) => e.pitch).reduce((a, b) => a + b) / hittingData.length; //monkeypatch to hit feet.
                    const avgTicks = hittingData.map((e) => e.ticks).reduce((a, b) => a + b) / hittingData.length;
                    possibleShotData.push({ yaw, pitch: avgPitch, ticks: Math.ceil(avgTicks), shift });
                    hittingData = [];
                }
                else if (pitch > PIOver3 && shot.nearestDistance < 1) {
                    hittingData.push({ pitch, ticks: shot.totalTicks });
                }
                continue;
            }
            hittingData.push({ pitch, ticks: shot.totalTicks });
        }
        return possibleShotData;
    }
}
exports.ShotPlanner = ShotPlanner;
