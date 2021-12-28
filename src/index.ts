import { Shot } from "@nxg-org/mineflayer-trajectories";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import { EntityTracker } from "./bow/entityTracker";
import { ProjectileTracker } from "./bow/projectileTracker";
import { SwordPvp } from "./sword/swordpvp";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";

import { BowPVP } from "./bow/bowpvp";
declare module "mineflayer" {
    interface Bot {
        swordpvp: SwordPvp;
        bowpvp: BowPVP;
        tracker: ProjectileTracker;

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
    bot.swordpvp = new SwordPvp(bot);
    bot.bowpvp = new BowPVP(bot);
    bot.tracker = new ProjectileTracker(bot);
}

export { Shot };
export { EntityTracker };
