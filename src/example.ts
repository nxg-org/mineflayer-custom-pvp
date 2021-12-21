import { createBot } from "mineflayer";
import customPVP from "./index";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";

let target: Entity | null = null;

const bot = createBot({
    username: "pvp-testing",
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
});

bot.loadPlugin(customPVP);

bot.once("spawn", () => {
    bot.swordpvp.critConfig.mode = "packet"
    bot.bowpvp.useOffhand = true
});


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
            if (!target) return console.log("no entity")
            bot.bowpvp.attack(target, split[0]);
            break;
        case "sword":
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return console.log("no entity")
            bot.swordpvp.attack(target);
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
    }
});
