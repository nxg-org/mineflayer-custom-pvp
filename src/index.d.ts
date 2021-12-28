import { Shot } from "@nxg-org/mineflayer-trajectories";
import { EntityTracker } from "./bow/entityTracker";
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
export default function plugin(bot: Bot): void;
export { Shot };
export { EntityTracker };
