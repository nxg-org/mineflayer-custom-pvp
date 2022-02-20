import { Bot, createBot } from "mineflayer";
import customPVP from "./index";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { vectorMagnitude } from "./calc/mathUtilts";
import { projectileGravity, ShotFactory } from "@nxg-org/mineflayer-trajectories";
import {Movements} from "mineflayer-pathfinder"
import md from "minecraft-data"
import readline from "readline";
let target: Entity | null = null;
let defend = false;

// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     prompt: "Text here: ",
// });

class KillBot {
    public bot: Bot;
    constructor(num: number) {
        this.bot = createBot({
            username: "pvp-testing" + num,
            host: process.argv[3] ?? "minecraft.next-gen.dev",
            port: Number(process.argv[4]) ?? 25565,
            version: "1.17.1",
        });
        this.bot.loadPlugin(customPVP);
        this.bot.jumpPather.searchDepth = 10
        const moves = new Movements(this.bot, md(this.bot.version))
        moves.allowFreeMotion = true;
        moves.allowParkour = true
        moves.allowSprinting = true
        this.bot.pathfinder.setMovements(moves);

    

        this.bot.physics.yawSpeed = 50
        this.bot.once("spawn", async () => {
            // this.bot.swordpvp.options.critConfig.mode = "packet";
            this.bot.bowpvp.useOffhand = false;
            this.bot.setControlState("forward", true);
            await this.bot.waitForTicks(20);
            this.bot.setControlState("forward", false);
        });

        const checkedEntities: { [id: number]: Entity } = {};

        this.bot.on("physicsTick", () => {
            if (!defend) return;
            const info = this.bot.projectiles.isAimedAt;
            if (info) {
                this.bot.lookAt(info.entity.position.offset(0, 1.6, 0), true);
                if (!this.bot.util.entity.isOffHandActive()) this.bot.activateItem(true);
            } else {
                // this.bot.deactivateItem();
            }
        });

        this.bot.on("entityMoved", async (entity) => {
            if (!defend) return;
            if (!Object.keys(projectileGravity).includes(entity.name!)) return;

            // console.log(Object.values(this.bot.entities))

            if (this.bot.projectiles.projectileAtMe) {
                this.bot.lookAt(this.bot.projectiles.projectileAtMe.entity.position, true);
                // equipShield();
                if (!this.bot.util.entity.isOffHandActive()) this.bot.activateItem(true);
            } else if (!this.bot.projectiles.isAimedAt) {
                this.bot.deactivateItem();
            }
        });

        // this.bot.on("entityMoved", async (entity) => {
        //     if (checkedEntities[entity.id]) return;
        //     checkedEntities[entity.id] = entity;
        //     if (["arrow", "firework_rocket", "ender_pearl"].includes(entity.name!)) {
        //         console.log(this.bot.tracker.getIncomingArrows())
        //     }
        // });

        this.bot.setMaxListeners(100);

        this.bot.on("kicked", console.log);
        this.bot.on("end", console.log);
        this.bot.on("message", (message) => {
            if (message.json.translate === "chat.type.text") return;
            if (message.json.extra?.[3]?.text.includes("wants to duel you in")) {
                this.bot.chat("/duel accept");
            }
        });

        // rl.on("line", this.bot.chat)

        this.bot.on("chat", async (username, message) => {
            const split = message.split(" ");
            switch (split[0]) {
                case "partyme":
                    this.bot.chat("/party join " + username);
                    break;
                case "bow":
                case "crossbow":
                case "trident":
                case "ender_pearl":
                case "splash_potion":
                case "snowball":
                case "egg":
                case "crossbow_firework":
                    this.bot.bowpvp.stop();
                    target = this.bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
                    if (!target) return;
                    this.bot.bowpvp.attack(target, split[0]);
                    break;
                case "sword":
                    this.bot.on("physicsTick", this.fight);
                    // target = this.bot.nearestEntity((e) => (e.username ?? e.name) === split[1]) ?? this.bot.nearestEntity((e) => e.type === "player" && !e.username?.includes("pvp-testing"));

                    // this.bot.util.move.followEntityWithRespectRange(target, 2);
                    break;
                case "rangestop":
                    this.bot.bowpvp.stop();
                    break;
                case "swordstop":
                    this.bot.swordpvp.stop();
                    this.bot.removeListener("physicsTick", this.fight);
                    break;
                case "clear":
                    console.clear();
                    break;
                case "defend":
                    defend = true;
                    this.equipShield();
                    break;
                case "defendstop":
                    defend = false;
                    break;
                case "packetmode":
                    switch (split[1]) {
                        case "enable":
                            this.bot.swordpvp.options.critConfig.enabled = true;
                            break;
                        case "disable":
                            this.bot.swordpvp.options.critConfig.enabled = false;
                            break;
                        default:
                            this.bot.swordpvp.options.critConfig.mode = split[1] as any;
                            break;
                    }
                    break;
                case "shieldmode":
                    switch (split[1]) {
                        case "enable":
                            this.bot.swordpvp.options.shieldConfig.enabled = true;
                            break;
                        case "disable":
                            this.bot.swordpvp.options.shieldConfig.enabled = false;
                            break;
                        default:
                            this.bot.swordpvp.options.shieldConfig.mode = split[1] as any;
                            break;
                    }
                    break;
                case "pos":
                    this.bot.chat(`${this.bot.entity.position}`);
                    break;
                case "dist":
                    target = this.bot.nearestEntity((e) => (e.username ?? e.name) === split[1] || (e.username ?? e.name) === username);
                    if (!target) return;
                    this.bot.chat(`${this.bot.entity.position.distanceTo(target.position)}`);
                    break;
            }
        });
    }

    async equipShield() {
        if (this.bot.entity.equipment[1]?.name === "shield") return;
        const shield = this.bot.util.inv.getAllItemsExceptCurrent("off-hand").find((e) => e.name === "shield");
        if (shield) {
            await this.bot.util.inv.customEquip(shield, "off-hand");
        }
    }

    fight = async () => {
        target = this.bot.nearestEntity((e) => e.type === "player" && !e.username?.includes("pvp-testing"));
        if (!target) return;
        this.equipShield();
        this.bot.swordpvp.attack(target);
    };
}

for (let i = 0; i < 1; i++) {
    new KillBot(i);
}
