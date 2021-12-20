import { Entity } from "prismarine-entity";
import { Bot } from "mineflayer";
import { promisify } from "util";
import { Vec3 } from "vec3";

const sleep = promisify(setTimeout);
const emptyVec = new Vec3(0, 0, 0);

export type TrackingData = {
    [entityId: number]: { tracking: boolean; info: { avgSpeed: Vec3; tickInfo: { position: Vec3; velocity: Vec3 }[] } };
};

export class EntityTracker {
    public trackingData: TrackingData = {};

    constructor(private bot: Bot) {
        bot.on("physicsTick", this.hawkeyeTracking.bind(this));
    }

    private hawkeyeTracking() {
        for (const entityId in this.trackingData) {
            if (!this.trackingData[entityId].tracking) continue;
            const entity = this.bot.nearestEntity(e => e.id.toString() === entityId); //bot.entities[entityId]
            if (!entity) continue;

            if (this.trackingData[entityId].info.tickInfo.length > 10) {
                this.trackingData[entityId].info.tickInfo.shift();
            }

            // console.log( this.trackingData[entityId].info.tickInfo)

            this.trackingData[entityId].info.tickInfo.push({ position: entity.position.clone(), velocity: entity.velocity.clone() });
            let speed = new Vec3(0, 0, 0);

            for (let i = 1; i < this.trackingData[entityId].info.tickInfo.length; i++) {
                const pos = this.trackingData[entityId].info.tickInfo[i].position;
                const prevPos = this.trackingData[entityId].info.tickInfo[i - 1].position;
                speed.x += pos.x - prevPos.x;
                const yShift = pos.y - prevPos.y
                if (yShift > 0.4 || yShift < -0.5) //accounts for jumping and falling
                speed.y += pos.y - prevPos.y;
                speed.z += pos.z - prevPos.z;
            }

            speed.x = speed.x / this.trackingData[entityId].info.tickInfo.length;
            speed.y = speed.y / this.trackingData[entityId].info.tickInfo.length;
            speed.z = speed.z / this.trackingData[entityId].info.tickInfo.length;

            if (speed !== this.trackingData[entityId].info.avgSpeed) this.trackingData[entityId].info.avgSpeed = speed;
        }
    }

    public trackEntity(entity: Entity) {
        this.trackingData[entity.id] ??= { tracking: true, info: { avgSpeed: emptyVec, tickInfo: [] } };
    }

    public stopTrackingEntity(entity: Entity, clear: boolean = true) {
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
