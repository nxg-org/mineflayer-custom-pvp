import { createBot } from "mineflayer";
import customPVP from "./index";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { vectorMagnitude } from "./calc/mathUtilts";
import { projectileGravity, ShotFactory } from "@nxg-org/mineflayer-trajectories";

let target: Entity | null = null;
let defend = false;

const bot = createBot({
    username: "pvp-testing",
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
    version: "1.17.1"
});

bot.loadPlugin(customPVP);

bot.once("spawn", () => {
    bot.swordpvp.critConfig.mode = "hop";
    bot.bowpvp.useOffhand = false;
});

const checkedEntities: { [id: number]: Entity } = {};
function equipShield() {
    const shield = bot.util.inv.getAllItemsExceptCurrent("off-hand").find((e) => e.name === "shield");
    if (shield) {
        bot.util.inv.customEquip(shield, "off-hand");
    }
}

bot.on("physicsTick", () => {
    if (!defend) return;
    const entity = bot.tracker.getHighestPriorityEntity();
    if (entity) {
        bot.lookAt(entity.entity.position.offset(0, 1.6, 0), true);
        // if (!bot.util.entity.isOffHandActive()) bot.activateItem(true);
    } else {
        // bot.deactivateItem();
    }
});

bot.on("entityMoved", async (entity) => {
    if (!defend) return;
    if (!Object.keys(projectileGravity).includes(entity.name!)) return;
    const pos = bot.tracker.getHighestPriorityProjectile()?.entity?.position;
    if (pos) {
        bot.lookAt(pos, true);
        equipShield();
        if (!bot.util.entity.isOffHandActive()) bot.activateItem(true);
    } else {
        bot.deactivateItem();
    }
});

// bot.on("entityMoved", async (entity) => {
//     if (checkedEntities[entity.id]) return;
//     checkedEntities[entity.id] = entity;
//     if (["arrow", "firework_rocket", "ender_pearl"].includes(entity.name!)) {
//         console.log(bot.tracker.getIncomingArrows())
//     }
// });

bot.on("chat", async (username, message) => {
    const split = message.split(" ");
    switch (split[0]) {
        case "bow":
        case "crossbow":
        case "trident":
        case "ender_pearl":
        case "splash_potion":
        case "snowball":
        case "egg":
        case "crossbow_firework":
            bot.bowpvp.stop();
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return console.log("no entity");
            bot.bowpvp.attack(target, split[0]);
            break;
        case "sword":
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return console.log("no entity");
            bot.swordpvp.attack(target);
            bot.util.move.followEntityWithRespectRange(target, 2)
            break;
        case "rangestop":
            bot.bowpvp.stop();
            break;
        case "swordstop":
            bot.swordpvp.stop();
            break;
        case "clear":
            console.clear();
            break;
        case "defend":
            defend = true;
            break;
        case "defendstop":
            defend = false;
            break;
        case "packetmode":
            bot.swordpvp.critConfig.mode = split[1] as any
            break;
        case "shieldmode":
            bot.swordpvp.shieldConfig.mode = split[1] as any
            break;
    }
});
