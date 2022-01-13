import { Entity } from "prismarine-entity";
import { Bot } from "mineflayer";
import { promisify } from "util";
import { Vec3 } from "vec3";
import { dirToYawAndPitch, pointToYawAndPitch } from "../calc/mathUtilts";

const sleep = promisify(setTimeout);
const emptyVec = new Vec3(0, 0, 0);

export type TrackingData = {
    [entityId: number]: { tracking: boolean; info: { avgSpeed: Vec3; tickInfo: { position: Vec3; velocity: Vec3 }[] } };
};

export class EntityTracker {
    public trackingData: TrackingData = {};

    constructor(private bot: Bot) {
        bot.prependListener('physicsTick', this.hawkeyeRewriteTracking.bind(this));
        // bot._client.on("rel_entity_move", this.test.bind(this));
    }

    private test(packet: any) {
        // console.log("rel_entity_move data:                       Vec3 { x:", packet.dX / 8000, " y:", packet.dY / 8000, " z:", packet.dZ / 8000, "}") //notchian velocity calculation
        // console.log("entity's current velocity:                 ", this.bot.entities[packet.entityId].velocity)
        // console.log("entity name:                               ", this.bot.entities[packet.entityId].username)

        const entityId = packet.entityId;
        const testVel = new Vec3(packet.dX / 8000, 0, packet.dZ / 8000);
        if (!this.trackingData[entityId]?.tracking) return;

        const entity = this.bot.entities[entityId]; //bot.entities[entityId]
        if (!entity) return;

        if (this.trackingData[entityId].info.tickInfo.length > 10) {
            this.trackingData[entityId].info.tickInfo.shift();
        }

        this.trackingData[entityId].info.tickInfo.push({ position: entity.position.clone(), velocity: testVel.clone() });

        if (testVel !== this.trackingData[entityId].info.avgSpeed) this.trackingData[entityId].info.avgSpeed = testVel;
    }


    private hawkeyeRewriteTracking() {
        for (const entityId in this.trackingData) {
            if (!this.trackingData[entityId].tracking) continue;
            const entity = this.bot.nearestEntity((e) => e.id.toString() === entityId); //bot.entities[entityId]
            if (!entity) continue;
  

            const currentPos = entity.position.clone()
            if (this.trackingData[entityId].info.tickInfo.length > 0) {

                const shiftPos = currentPos.clone().subtract(this.trackingData[entityId].info.tickInfo[this.trackingData[entityId].info.tickInfo.length- 1].position)
                if (shiftPos.equals(emptyVec)) {
                    this.trackingData[entityId].info.tickInfo = []; //clear all entries.
                }
                else if (!shiftPos.equals(emptyVec) && !this.trackingData[entityId].info.avgSpeed.equals(emptyVec)) {
                    const oldYaw = dirToYawAndPitch(this.trackingData[entityId].info.avgSpeed).yaw
                    const newYaw = dirToYawAndPitch(shiftPos).yaw
                    const dif = Math.abs(oldYaw - newYaw)
                    if (dif > Math.PI / 4 && dif < 11 * Math.PI / 4) this.trackingData[entityId].info.tickInfo = [this.trackingData[entityId].info.tickInfo.pop()!];
                }
      
            }

            if (this.trackingData[entityId].info.tickInfo.length > 10) {
                this.trackingData[entityId].info.tickInfo.shift();
            }

            this.trackingData[entityId].info.tickInfo.push({ position: currentPos.clone(), velocity: entity.velocity.clone() });
            let speed = new Vec3(0, 0, 0);
            const length = this.trackingData[entityId].info.tickInfo.length

            for (let i = 1; i < length; i++) {
                const pos = this.trackingData[entityId].info.tickInfo[i].position;
                const prevPos = this.trackingData[entityId].info.tickInfo[i - 1].position;
                speed.x += pos.x - prevPos.x;
                const yShift = pos.y - prevPos.y;
                if (yShift > 0.5 || yShift < -0.55) //accounts for jumping and falling
                speed.y += pos.y - prevPos.y;
                speed.z += pos.z - prevPos.z;
            }

            //.scale() is inaccurate? lol
            speed.x = speed.x / length;
            speed.y = speed.y / length;
            speed.z = speed.z / length;

            if (speed !== this.trackingData[entityId].info.avgSpeed) this.trackingData[entityId].info.avgSpeed = speed;
        }
    }

    public trackEntity(entity: Entity) {
        if (this.trackingData[entity.id]) this.trackingData[entity.id].tracking = true;
        this.trackingData[entity.id] ??= { tracking: true, info: { avgSpeed: emptyVec, tickInfo: [] } };
    }

    public stopTrackingEntity(entity: Entity, clear: boolean = false) {
        if (!this.trackingData[entity.id]) return;
        this.trackingData[entity.id].tracking = false;
        if (clear) {
            delete this.trackingData[entity.id];
            // this.trackingData[entity.id].info.avgSpeed = emptyVec;
            // this.trackingData[entity.id].info.tickInfo = [];
        }
    }

    public getEntitySpeed(entity: Entity): Vec3 {
        return this.trackingData[entity.id].info.avgSpeed;
    }

    public getEntityPositionInfo(entity: Entity) {
        return this.trackingData[entity.id].info.tickInfo;
    }
}
