import { HawkEye } from "./bow/bowpvp";
import { Shot } from "./newbow/bow";
import { SwordPvp } from "./sword/SwordPvp";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";

declare module "mineflayer" {
    interface Bot {
        swordpvp: SwordPvp;
        bowpvp: HawkEye;
    }
    interface BotEvents {
        attackedTarget: (target: Entity) => void
        stoppedAttacking: () => void
        startedAttacking: (target: Entity) => void
        targetBlockingUpdate: (target: Entity, blocking: boolean) => void
    }
}

export default function plugin(bot: Bot) {
    const swordpvp = new SwordPvp(bot);
    const bowpvp = new HawkEye(bot);
    bot.swordpvp = swordpvp;
    bot.bowpvp = bowpvp;
}

export {Shot}