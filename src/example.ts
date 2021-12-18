import { createBot } from "mineflayer";
import customPVP from "./index";
import { Shot } from "./newbow/shot";
import { EntityTracker } from "./newbow/entityTracker";
import { promisify } from "util";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { yawPitchAndSpeedToDir } from "./calc/mathUtilts";
import { InterceptEquations } from "./calc/intercept";
import { ShotPlanner } from "./newbow/shotPlanner";
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

setInterval(function () {
    getUsage(function (startTime: number) {
        setTimeout(function () {
            getUsage(function (endTime: number) {
                var delta = endTime - startTime;
                var percentage = 100 * (delta / 10000);

                console.log("percentage:", percentage);
            });
        }, 1000);
    });
}, 100);

const emptyVec = new Vec3(0, 0, 0);
const bot = createBot({
    username: "pvp-testing",
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
});

bot.loadPlugin(customPVP);

bot.once("spawn", () => {
    console.log("fuck");
});

let intercepter = new InterceptEquations(bot);

//awkward handling due to lack of velocity support from entities.
bot.on("entitySpawn", async (orgEntityData) => {
    if (orgEntityData.name === "arrow" && target) {
        let updated;
        for (let i = 0; i < 3; i++) {
            updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
            await bot.waitForTicks(1);
        }
        let lastPos = orgEntityData.position;
        let velocity = orgEntityData.velocity;
        do {
            updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
            lastPos = updated.position.clone();
            await bot.waitForTicks(1);
            velocity = updated.position.minus(lastPos);
        } while (velocity.equals(emptyVec) && !orgEntityData.position.equals(lastPos));
        const speed = bot.newbowpvp.tracker.getEntitySpeed(target)
        const hit = Shot.fromWeapon({ position: updated.position, velocity }, intercepter).hitEntityWithPredictionCheck(target, speed);
        console.log(velocity, hit)
    }
});


bot.on("chat", async (username, message) => {
    const split = message.split(" ");
    switch (split[0]) {
        case "bowtest":
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return;
            bot.bowpvp.attack(target);
            break;
        case "swordtest":
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return;
            bot.swordpvp.attack(target);
            break;
        case "bowstop":
            bot.newbowpvp.stop();
            shootAtPlayer = false
            break;
        case "swordstop":
            bot.swordpvp.stop();
            break;
        case "newbowtest":
            shootAtPlayer = true
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return;
            bot.newbowpvp.tracker.trackEntity(target)
            bot.newbowpvp.attack(target, "crossbow");
            break;
        case "arrowtest":
            listenToArrowSpawns = true;
            break;
        case "arrowstop":
            listenToArrowSpawns = false;
            break;
    }
});
