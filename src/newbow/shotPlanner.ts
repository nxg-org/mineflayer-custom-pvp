import { Bot } from "mineflayer";
import { Shot } from "./shot";
import { Entity } from "prismarine-entity";
import { getTargetYaw } from "../calc/mathUtilts";

export class ShotPlanner {
    constructor(private bot: Bot) {}

    shotToEntity(entity: Entity) {
        getTargetYaw(this.bot.entity.position, entity.position)
    }
}
