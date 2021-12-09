import { createBot } from "mineflayer";
import customPVP from "./index";
import { Shot } from "./newbow/shot";
import { EntityTracker } from "./newbow/entityTracker";
import { promisify } from "util";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
const sleep = promisify(setTimeout);

let listenToArrowSpawns = false;
let target: Entity | null = null;
let tracker: EntityTracker | undefined;


const emptyVec = new Vec3(0, 0, 0);
const bot = createBot({
    username: "pvp-testing",
    host: process.argv[2] ?? "localhost",
    port: Number(process.argv[3]) ?? 25565,
});

bot.loadPlugin(customPVP);

bot.once("spawn", () => {
    tracker = new EntityTracker(bot);
    console.log("fuck");
});

bot.on("entitySpawn", async (orgEntityData) => {
    if (orgEntityData.name === "arrow" && target) {
        console.log(orgEntityData)
        let lastPos = orgEntityData.position;
        let velocity = orgEntityData.velocity;
        let updated;
        do {
            updated = bot.nearestEntity((e) => e.id === orgEntityData.id)!;
            lastPos = updated.position.clone();
            await bot.waitForTicks(1);
            velocity = updated.position.minus(lastPos);
        } while (velocity.equals(emptyVec) && !orgEntityData.position.equals(lastPos));
        const speed = tracker!.getEntitySpeed(target)
        // console.log(velocity)
        // const hit = Shot.fromWeapon({ position: updated.position, velocity }, bot).hitEntityWithPredictionCheck(target, speed);
        // console.log(hit)
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
            bot.bowpvp.stop();
            break;
        case "swordstop":
            bot.swordpvp.stop();
            break;
        case "newbowtest":
            target = bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
            if (!target) return;
            tracker!.trackEntity(target)
            bot.bowpvp.attack(target);
            while (true) {
                await sleep(1200);
                console.log(Shot.fromShootingPlayer(bot.entity, bot).hitEntitiesCheck(target)?.username)
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
