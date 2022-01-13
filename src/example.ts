import { createBot } from "mineflayer";
import customPVP from "./index";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { vectorMagnitude } from "./calc/mathUtilts";
import { projectileGravity, ShotFactory } from "@nxg-org/mineflayer-trajectories";

import readline from "readline"
let target: Entity | null = null;
let defend = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "Text here: ",
});
const bot = createBot({
    username: "perfecthamburger5@gmail.com",
    password: "Silentnight76",
    host: "play.pvplegacy.net",
    port: 25565,
    // username: process.argv[2] ?? "pvp-testing",
    // host: process.argv[3] ?? "localhost",
    // port: Number(process.argv[4]) ?? 25565,
    version: "1.17.1",
});

bot.loadPlugin(customPVP);

bot.once("spawn", async () => {
    // bot.swordpvp.options.critConfig.mode = "packet";
    bot.bowpvp.useOffhand = false;
    bot.setControlState("forward", true)
    await bot.waitForTicks(20)
    bot.setControlState("forward", false)
});

const checkedEntities: { [id: number]: Entity } = {};
async function equipShield() {
    if (bot.entity.equipment[1]?.name === "shield") return;
    const shield = bot.util.inv.getAllItemsExceptCurrent("off-hand").find((e) => e.name === "shield");
    if (shield) {
        await bot.util.inv.customEquip(shield, "off-hand")
    }
}

bot.on("physicsTick", () => {
    if (!defend) return;
    const info = bot.projectiles.isAimedAt
    if (info) {
        bot.lookAt(info.entity.position.offset(0, 1.6, 0), true);
        if (!bot.util.entity.isOffHandActive()) bot.activateItem(true);
    } else {
        // bot.deactivateItem();
    }
});

bot.on("entityMoved", async (entity) => {
    if (!defend) return;
    if (!Object.keys(projectileGravity).includes(entity.name!)) return;

    // console.log(Object.values(bot.entities))

    if (bot.projectiles.projectileAtMe) {
    
        bot.lookAt(bot.projectiles.projectileAtMe.entity.position, true);
        // equipShield();
        if (!bot.util.entity.isOffHandActive()) bot.activateItem(true);
    } else if (!bot.projectiles.isAimedAt) {
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

bot.on("kicked", console.log)
bot.on("end", console.log)
bot.on("message", (message) => {
    console.log(message)
    if (message.json.extra?.[3]?.text.includes("wants to duel you in")) {
        bot.chat("/duel accept")
    }
})

bot._client.on("packet", (packet) => {
    if (packet) console.log(packet)
})

rl.on("line", bot.chat)

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
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]) ?? bot.nearestEntity((e) => e.type === "player");
            if (!target) return console.log("no entity");
            equipShield();
            bot.swordpvp.attack(target);
            // bot.util.move.followEntityWithRespectRange(target, 2);
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
            equipShield();
            break;
        case "defendstop":
            defend = false;
            break;
        case "packetmode":
            switch (split[1]) {
                case "enable":
                    bot.swordpvp.options.critConfig.enabled = true
                    break
                case "disable":
                    bot.swordpvp.options.critConfig.enabled = false
                    break;
                default:
                    bot.swordpvp.options.critConfig.mode = split[1] as any;
                    break;
            }
            break;
        case "shieldmode":
            switch (split[1]) {
                case "enable":
                    bot.swordpvp.options.shieldConfig.enabled = true
                    break
                case "disable":
                    bot.swordpvp.options.shieldConfig.enabled = false
                    break;
                default:
                    bot.swordpvp.options.shieldConfig.mode = split[1] as any;
                    break;
            }
            break;
        case "pos":
            bot.chat(`${bot.entity.position}`)
            break;
        case "dist":
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1] || (e.username ?? e.name) === username );
            if (!target) return console.log("no entity");
            bot.chat(`${bot.entity.position.distanceTo(target.position)}`)
            bot.chat(`${bot.swordpvp.trueDistance()}`)
            break
    }
});
