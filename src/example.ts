import { createBot } from "mineflayer";
import customPVP from "./index";
import { Shot } from "@nxg-org/mineflayer-trajectories";
import { EntityTracker } from "./bow/entityTracker";
import { promisify } from "util";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { vectorMagnitude, yawPitchAndSpeedToDir } from "./calc/mathUtilts";
import { InterceptFunctions } from "@nxg-org/mineflayer-util-plugin";

const sleep = promisify(setTimeout);

let listenToArrowSpawns = false;
let shootAtPlayer = false
let target: Entity | null = null;
let val = 0;

var fs = require("fs");

var getUsage = function (cb: any) {
    fs.readFile("/proc/" + process.pid + "/stat", function (err: any, data: any) {
        var elems = data.toString().split(" ");
        var utime = parseInt(elems[13]);
        var stime = parseInt(elems[14]);

        cb(utime + stime);
    });
};

// setInterval(function () {
//     getUsage(function (startTime: number) {
//         setTimeout(function () {
//             getUsage(function (endTime: number) {
//                 var delta = endTime - startTime;
//                 var percentage = 100 * (delta / 10000);

//                 console.log("percentage:", percentage);
//             });
//         }, 1000);
//     });
// }, 100);

const emptyVec = new Vec3(0, 0, 0);
const bot = createBot({
    username: "pvp-testing",
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
});

bot.loadPlugin(customPVP);


bot.once("spawn", () => {
    console.log("fuck");
    bot.swordpvp.critConfig.mode = "packet"
    bot.bowpvp.useOffhand = true
});

let intercepter = new InterceptFunctions(bot);

//awkward handling due to lack of velocity support from entities.
// bot.on("entitySpawn", async (orgEntityData) => {
//     if (orgEntityData.type === "object" && target && listenToArrowSpawns) {
//         let updated;
//         for (let i = 0; i < 3; i++) {
//             updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
//             await bot.waitForTicks(1);
//         }
//         let lastPos = orgEntityData.position;
//         let velocity = orgEntityData.velocity;
//         do {
//             updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
//             lastPos = updated.position.clone();
//             await bot.waitForTicks(1);
//             velocity = updated.position.minus(lastPos);
//         } while (velocity.equals(emptyVec) && !orgEntityData.position.equals(lastPos));
//         const speed = bot.bowpvp.tracker.getEntitySpeed(target)
//         const hit = Shot.fromWeapon({ position: updated.position, velocity }, intercepter).hitEntityWithPredictionCheck(target, speed);
//         console.log(velocity, hit)
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
    }
});
