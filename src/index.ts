import { HawkEye } from "./old/bowpvp";
import { Shot } from "./newbow/shot";
import { EntityTracker } from "./newbow/entityTracker";
import { SwordPvp } from "./sword/SwordPvp";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import utilPlugin from "@nxg-org/mineflayer-util-plugin";
import { BowPVP } from "./bow/newbowpvp";

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
    const swordpvp = new SwordPvp(bot);
    const bowpvp = new BowPVP(bot);
    bot.swordpvp = swordpvp;
    bot.bowpvp = bowpvp
}

export { Shot };
export { EntityTracker };
