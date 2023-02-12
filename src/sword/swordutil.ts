import { Entity } from "prismarine-entity";
import {goals} from "mineflayer-pathfinder"
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { FollowConfig, SwordFullConfig } from "./swordconfigs";
import { GoalFactory } from "@nxg-org/mineflayer-jump-pathing";



class PredictiveGoal extends goals.GoalFollow {
    public readonly bot: Bot;
    public predictTicks: number;
    constructor(bot: Bot, entity: Entity, range: number, predictTicks: number) {
        super(entity, range);
        this.bot = bot;
        this.predictTicks = predictTicks;
        this.bot.tracker.trackEntity(entity);

    }

    heuristic(node: { x: number; y: number; z: number }) {
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        const dz = this.z - node.z;
        return this.distanceXZ(dx, dz) + Math.abs(dy);
    }

    isEnd(node: { x: number; y: number; z: number }) {
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        const dz = this.z - node.z;
        return dx * dx + dy * dy + dz * dz <= this.rangeSq;
    }

    hasChanged() {
        const pos = this.entity.position.floored();
        const p = this.predictiveFunction(
            this.entity.position.minus(this.bot.entity.position),
            this.entity.position,
            this.bot.tracker.getEntitySpeed(this.entity) || new Vec3(0, 0, 0)
        );

        const dx = this.x - p.x;
        const dy = this.y - p.y;
        const dz = this.z - p.z;
        if (dx * dx + dy * dy + dz * dz > this.rangeSq) {
            this.x = p.x;
            this.y = p.y;
            this.z = p.z;
            return true;
        }
        return false;
    }

    public predictiveFunction(delta: Vec3, pos: Vec3, vel: Vec3) {
        const base = Math.round(Math.sqrt(delta.x ** 2 + delta.y ** 2 + delta.z ** 2));
        const tickCount = Math.round((base * this.predictTicks) / Math.sqrt(base));
        return pos.plus(vel.scaled(isNaN(tickCount) ? 0 : tickCount));
    }

    distanceXZ(dx: number, dz: number) {
        dx = Math.abs(dx);
        dz = Math.abs(dz);
        return Math.abs(dx - dz) + Math.min(dx, dz) * Math.SQRT2;
    }
}


export function followEntity(bot: Bot, entity: Entity, options: SwordFullConfig, predictTicks: number) {
    switch (options.followConfig.mode) {
        case "jump":
            const tmp1 = GoalFactory.predictEntity(bot, entity, options.followConfig.distance, predictTicks)
            bot.jumpPather.goto(tmp1);
            return tmp1
        case "standard":
            // const tmp2 = new goals.GoalFollow(entity, options.followConfig.distance);
            const tmp2 = new PredictiveGoal(bot, entity, options.followConfig.distance, predictTicks);
            bot.pathfinder.setGoal(tmp2, true);
            return tmp2;
    }
}

export function stopFollow(bot: Bot, mode: FollowConfig["mode"]) {
    switch (mode) {
        case "jump":
            bot.jumpPather.stop();
            break;
        case "standard":
            bot.pathfinder.setGoal(null);
            break;
    }
}