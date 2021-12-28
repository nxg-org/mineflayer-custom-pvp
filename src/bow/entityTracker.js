"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityTracker = void 0;
const util_1 = require("util");
const vec3_1 = require("vec3");
const mathUtilts_1 = require("../calc/mathUtilts");
const sleep = (0, util_1.promisify)(setTimeout);
const emptyVec = new vec3_1.Vec3(0, 0, 0);
class EntityTracker {
    constructor(bot) {
        this.bot = bot;
        this.trackingData = {};
        bot.prependListener('physicsTick', this.hawkeyeRewriteTracking.bind(this));
        // bot._client.on("rel_entity_move", this.test.bind(this));
    }
    test(packet) {
        // console.log("rel_entity_move data:                       Vec3 { x:", packet.dX / 8000, " y:", packet.dY / 8000, " z:", packet.dZ / 8000, "}") //notchian velocity calculation
        // console.log("entity's current velocity:                 ", this.bot.entities[packet.entityId].velocity)
        // console.log("entity name:                               ", this.bot.entities[packet.entityId].username)
        var _a;
        const entityId = packet.entityId;
        const testVel = new vec3_1.Vec3(packet.dX / 8000, 0, packet.dZ / 8000);
        if (!((_a = this.trackingData[entityId]) === null || _a === void 0 ? void 0 : _a.tracking))
            return;
        const entity = this.bot.entities[entityId]; //bot.entities[entityId]
        if (!entity)
            return;
        if (this.trackingData[entityId].info.tickInfo.length > 10) {
            this.trackingData[entityId].info.tickInfo.shift();
        }
        this.trackingData[entityId].info.tickInfo.push({ position: entity.position.clone(), velocity: testVel.clone() });
        if (testVel !== this.trackingData[entityId].info.avgSpeed)
            this.trackingData[entityId].info.avgSpeed = testVel;
    }
    hawkeyeRewriteTracking() {
        for (const entityId in this.trackingData) {
            if (!this.trackingData[entityId].tracking)
                continue;
            const entity = this.bot.nearestEntity((e) => e.id.toString() === entityId); //bot.entities[entityId]
            if (!entity)
                continue;
            const currentPos = entity.position.clone();
            if (this.trackingData[entityId].info.tickInfo.length > 0) {
                const shiftPos = currentPos.clone().subtract(this.trackingData[entityId].info.tickInfo[this.trackingData[entityId].info.tickInfo.length - 1].position);
                if (!shiftPos.equals(emptyVec) && !this.trackingData[entityId].info.avgSpeed.equals(emptyVec)) {
                    const oldYaw = (0, mathUtilts_1.dirToYawAndPitch)(this.trackingData[entityId].info.avgSpeed).yaw;
                    const newYaw = (0, mathUtilts_1.dirToYawAndPitch)(shiftPos).yaw;
                    const dif = Math.abs(oldYaw - newYaw);
                    if (dif > Math.PI / 4 && dif < 11 * Math.PI / 4)
                        this.trackingData[entityId].info.tickInfo = [this.trackingData[entityId].info.tickInfo.pop()];
                }
            }
            if (this.trackingData[entityId].info.tickInfo.length > 10) {
                this.trackingData[entityId].info.tickInfo.shift();
            }
            this.trackingData[entityId].info.tickInfo.push({ position: currentPos.clone(), velocity: entity.velocity.clone() });
            let speed = new vec3_1.Vec3(0, 0, 0);
            const length = this.trackingData[entityId].info.tickInfo.length;
            for (let i = 1; i < length; i++) {
                const pos = this.trackingData[entityId].info.tickInfo[i].position;
                const prevPos = this.trackingData[entityId].info.tickInfo[i - 1].position;
                speed.x += pos.x - prevPos.x;
                const yShift = pos.y - prevPos.y;
                if (yShift > 0.42 || yShift < -0.55) //accounts for jumping and falling
                    speed.y += pos.y - prevPos.y;
                speed.z += pos.z - prevPos.z;
            }
            //.scale() is inaccurate? lol
            speed.x = speed.x / length;
            speed.y = speed.y / length;
            speed.z = speed.z / length;
            if (speed !== this.trackingData[entityId].info.avgSpeed)
                this.trackingData[entityId].info.avgSpeed = speed;
        }
    }
    hawkeyeTracking() {
        for (const entityId in this.trackingData) {
            if (!this.trackingData[entityId].tracking)
                continue;
            const entity = this.bot.nearestEntity((e) => e.id.toString() === entityId); //bot.entities[entityId]
            if (!entity)
                continue;
            if (this.trackingData[entityId].info.tickInfo.length > 10) {
                this.trackingData[entityId].info.tickInfo.shift();
            }
            // console.log( this.trackingData[entityId].info.tickInfo)
            this.trackingData[entityId].info.tickInfo.push({ position: entity.position.clone(), velocity: entity.velocity.clone() });
            let speed = new vec3_1.Vec3(0, 0, 0);
            for (let i = 1; i < this.trackingData[entityId].info.tickInfo.length; i++) {
                const pos = this.trackingData[entityId].info.tickInfo[i].position;
                const prevPos = this.trackingData[entityId].info.tickInfo[i - 1].position;
                speed.x += pos.x - prevPos.x;
                const yShift = pos.y - prevPos.y;
                // if (yShift > 0.4 || yShift < -0.5) //accounts for jumping and falling
                speed.y += pos.y - prevPos.y;
                speed.z += pos.z - prevPos.z;
            }
            speed.x = speed.x / this.trackingData[entityId].info.tickInfo.length;
            speed.y = speed.y / this.trackingData[entityId].info.tickInfo.length;
            speed.z = speed.z / this.trackingData[entityId].info.tickInfo.length;
            if (speed !== this.trackingData[entityId].info.avgSpeed)
                this.trackingData[entityId].info.avgSpeed = speed;
        }
    }
    trackEntity(entity) {
        var _a;
        var _b, _c;
        if (this.trackingData[entity.id])
            this.trackingData[entity.id].tracking = true;
        (_a = (_b = this.trackingData)[_c = entity.id]) !== null && _a !== void 0 ? _a : (_b[_c] = { tracking: true, info: { avgSpeed: emptyVec, tickInfo: [] } });
    }
    stopTrackingEntity(entity, clear = false) {
        if (!this.trackingData[entity.id])
            return;
        this.trackingData[entity.id].tracking = false;
        if (clear) {
            delete this.trackingData[entity.id];
            // this.trackingData[entity.id].info.avgSpeed = emptyVec;
            // this.trackingData[entity.id].info.tickInfo = [];
        }
    }
    getEntitySpeed(entity) {
        return this.trackingData[entity.id].info.avgSpeed;
    }
    getEntityPositionInfo(entity) {
        return this.trackingData[entity.id].info.tickInfo;
    }
}
exports.EntityTracker = EntityTracker;
