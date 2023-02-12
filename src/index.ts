import { Shot } from "@nxg-org/mineflayer-trajectories";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import trackerPlugin from "@nxg-org/mineflayer-tracker";
import jumpPathing from "@nxg-org/mineflayer-jump-pathing";
import { SwordPvp } from "./sword/swordPvp";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";

import { BowFullConfig, BowPVP, defaultBowConfig } from "./bow/bowpvp";
import { defaultSwordConfig, SwordFullConfig } from "./sword/swordconfigs";

// performance is global in Node >= 16 
// if (typeof performance !== 'undefined') {
//     global.performance = performance;
// }

declare module "mineflayer" {
    interface Bot {
        swordpvp: SwordPvp;
        bowpvp: BowPVP;
    }
    interface BotEvents {
        attackedTarget: (target: Entity) => void;
        stoppedAttacking: () => void;
        startedAttacking: (target: Entity) => void;
        targetBlockingUpdate: (target: Entity, blocking: boolean) => void;
    }
}


export function getPlugin(swordConfig: Partial<SwordFullConfig> = {}, bowConfig: Partial<BowFullConfig> = {}) {
    let sConfig = Object.assign(defaultSwordConfig, swordConfig)
    let bConfig = Object.assign(defaultBowConfig, bowConfig)
    return (bot: Bot) => {
        if (!bot.hasPlugin(utilPlugin)) bot.loadPlugin(utilPlugin);
        if (!bot.hasPlugin(trackerPlugin)) bot.loadPlugin(trackerPlugin)
        if (!bot.hasPlugin(jumpPathing)) bot.loadPlugin(jumpPathing)
        bot.swordpvp = new SwordPvp(bot, sConfig);
        bot.bowpvp = new BowPVP(bot, bConfig);
    }
}

export function defaultPlugin(bot: Bot) {
    if (!bot.hasPlugin(utilPlugin)) bot.loadPlugin(utilPlugin);
    if (!bot.hasPlugin(trackerPlugin)) bot.loadPlugin(trackerPlugin)
    if (!bot.hasPlugin(jumpPathing)) bot.loadPlugin(jumpPathing)
    bot.swordpvp = new SwordPvp(bot);
    bot.bowpvp = new BowPVP(bot);


}

export { Shot };