import { Shot } from "@nxg-org/mineflayer-trajectories";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import { EntityTracker } from "./tracker/entityTracker";
import { ProjectileTracker } from "./tracker/projectileTracker";
import { SwordPvp } from "./sword/swordpvp";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";

import { BowPVP } from "./bow/bowpvp";
import { SwordPvpTwo } from "./sword/swordpvpTwo";
declare module "mineflayer" {
    interface Bot {
        swordpvp: SwordPvpTwo;
        bowpvp: BowPVP;
        tracker: EntityTracker
        projectiles: ProjectileTracker;

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
    bot.swordpvp = new SwordPvpTwo(bot);
    bot.bowpvp = new BowPVP(bot);
    bot.tracker = new EntityTracker(bot);
    bot.projectiles = new ProjectileTracker(bot);
}

export { Shot };
export { EntityTracker };
