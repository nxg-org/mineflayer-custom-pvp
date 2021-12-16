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
let tracker: EntityTracker | undefined;
let planner: ShotPlanner | undefined;
let intercepter: InterceptEquations | undefined;
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
                // if (percentage > 20){
                //     console.log("CPU Usage Over 20%!");
                // }
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
    tracker = new EntityTracker(bot);
    intercepter = new InterceptEquations(bot);
    planner = new ShotPlanner(bot);
    console.log("fuck");
});

bot.on("entitySpawn", async (orgEntityData) => {
    if (orgEntityData.name === "arrow" && target) {
        let updated;
        // for (let i = 0; i < 3; i++) {
        //     updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
        //     console.log(updated?.position, updated?.velocity)
        //     await bot.waitForTicks(1);
        // }
        // let lastPos = orgEntityData.position;
        // let velocity = orgEntityData.velocity;
        // do {
        //     updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
        //     lastPos = updated.position.clone();
        //     await bot.waitForTicks(1);
        //     velocity = updated.position.minus(lastPos);
        // } while (velocity.equals(emptyVec) && !orgEntityData.position.equals(lastPos));
        // const speed = tracker!.getEntitySpeed(target)
        // console.log(velocity)
        // const hit = Shot.fromWeapon({ position: updated.position, velocity }, bot).hitEntityWithPredictionCheck(target, speed);
        // console.log(hit)
    }
});

async function serve() {
    while (true) {
        await sleep(1000);
        console.log("Called val", val, "times");
    }
}

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
            bot.bowpvp.stop();
            shootAtPlayer = false
            break;
        case "swordstop":
            bot.swordpvp.stop();
            break;
        case "newbowtest":
            shootAtPlayer = true
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return;
            tracker!.trackEntity(target)
            // bot.bowpvp.attack(target);
            serve();
            while (shootAtPlayer) {
                await sleep(50);
                val++;

                // console.log("Called hawkeye", bot.bowpvp.equations.val, "times")
                const shot = planner?.shotToEntity(target, tracker?.getEntitySpeed(target));
                // for (const entity of Object.values(bot.entities)) {
                //     planner?.shotToEntity(entity)
                // }
                if (shot) {
                    // console.log(shot.yaw, shot.pitch)
                    bot.look(shot.yaw, shot.pitch);
                    if (!bot.bowpvp.preparingShot) {
                        bot.bowpvp.simplyShot(shot.yaw, shot.pitch)
                    }
                }
            }
            break;
        case "arrowtest":
            listenToArrowSpawns = true;
            break;
        case "arrowstop":
            listenToArrowSpawns = false;
            break;
    }
});
