import { Shot } from "@nxg-org/mineflayer-trajectories";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import trackerPlugin from "@nxg-org/mineflayer-tracker";
import jumpPathing from "@nxg-org/mineflayer-jump-pathing";
import { SwordPvp } from "./sword/swordpvp";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";

import { BowPVP } from "./bow/bowpvp";

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

export default function plugin(bot: Bot) {
    if (!bot.util) bot.loadPlugin(utilPlugin);
    if (!bot.tracker || !bot.projectiles) bot.loadPlugin(trackerPlugin)
    if (!bot.jumpPather) bot.loadPlugin(jumpPathing)
    bot.swordpvp = new SwordPvp(bot);
    bot.bowpvp = new BowPVP(bot);
}

export { Shot };