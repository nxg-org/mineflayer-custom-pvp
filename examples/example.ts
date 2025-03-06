import { Bot, createBot } from "mineflayer";
import customPVP from "../src/index";
import { Vec3 } from "vec3";
import { Entity } from "prismarine-entity";
import { vectorMagnitude } from "../src/calc/mathUtils";
import { projectileGravity, ShotFactory } from "@nxg-org/mineflayer-trajectories";
import { Movements, pathfinder } from "mineflayer-pathfinder";
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
      host: process.argv[2],
      port: Number(process.argv[3]) ?? 25565,
    });





  
    this.bot.once("spawn", async () => {

      this.bot.physics.yawSpeed = 50;
      (this.bot.physics as any).pitchSpeed = 50;
      this.bot.loadPlugin(customPVP);
      this.bot.loadPlugin(pathfinder);
      // this.bot.jumpPather.searchDepth = 10;
  
      const moves = new Movements(this.bot);
      moves.allowFreeMotion = true;
      moves.allowParkour = true;
      moves.allowSprinting = true;
      this.bot.pathfinder.setMovements(moves);

      // this.bot.swordpvp.options.followConfig.mode = "jump"
      // this.bot.swordpvp.options.critConfig.mode = "packet";
      // this.bot.swordpvp.options.tapConfig.enabled = false
      this.bot.swordpvp.options.cps = 20
      this.bot.swordpvp.options.critConfig.reaction.enabled = false;
      this.bot.swordpvp.options.rotateConfig.smooth = true

      this.bot.bowpvp.useOffhand = false;
      this.bot.setControlState("forward", true);
      await this.bot.waitForTicks(20);
      this.bot.setControlState("forward", false);

      let time = performance.now();
      this.bot.swordpvp.on("attackedTarget", (target, reason, ticks) => {
        const now = performance.now();
        console.log("attacking", now - time, reason, ticks, this.bot.entity.velocity.y);
        time = now;
      });
  
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

    this.bot.on("kicked", console.log);
    this.bot.on("end", console.log);
    this.bot.on("message", async (message) => {
      if (message.json.translate === "chat.type.text") return;
      const raw = JSON.stringify(message).toLowerCase();
      if (raw.includes("duel") && raw.includes("from")) {
        await this.bot.waitForTicks(5);
        this.bot.chat(`/duel accept ${"Generel_Schwerz"}`);
      }
    });

    // rl.on("line", this.bot.chat)
  

    this.bot.on("messagestr", (msg, position) => {
      const [prefix, message] = msg.split(':');
      if (!message) return;
      const prefixSplit = prefix.split(' ');
      const username = prefixSplit[prefixSplit.length - 1];
      this.handler(username, message.trim());
    })

    this.bot.on("chat", this.handler);


   
  }

  async equipShield() {
    if (this.bot.supportFeature("doesntHaveOffHandSlot")) return;
    if (this.bot.util.inv.getHandWithItem(true)?.name === "shield") return;
    const shield = this.bot.util.inv.getAllItemsExceptCurrent("off-hand").find((e) => e.name === "shield");
    if (shield) {
      await this.bot.util.inv.customEquip(shield, "off-hand");
    }
  }

  fight = async () => {
    target = this.bot.nearestEntity((e) => e.type === "player" && !e.username?.includes("pvp-testing"));
    if (!target) return console.log("no target");
    this.equipShield();
    this.bot.swordpvp.attack(target);
  };

  handler = async (username: string, message: string) => {
    const split = message.split(" ");
    switch (split[0]) {

      case "settings": 
      console.log(this.bot.swordpvp.options)
      break;
      case "partyme":
        this.bot.chat("/party join " + username);
        break;

      case "distance":
        target = this.bot.nearestEntity((e) => (e.username ?? e.name) === split[1]);
        if (!target) return;
        (async () => {
          while (true) {
            console.log(this.bot.util.entity.eyeDistanceToEntity(target!));
            await this.bot.waitForTicks(1);
          }
        })();
        break;
      case "acceptduel":
          this.bot.chat(`/duel accept ${split[1]}`)
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
        break;
      case "rangestop":
        this.bot.bowpvp.stop();
        break;
      case "swordstop":
        this.bot.removeListener("physicsTick", this.fight);
        this.bot.swordpvp.stop();
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
        target = this.bot.nearestEntity(
          (e) => (e.username ?? e.name) === split[1] || (e.username ?? e.name) === username
        );
        if (!target) return;
        this.bot.chat(`${this.bot.entity.position.distanceTo(target.position)}`);
        break;
    }
  }
}

for (let i = 0; i < 1; i++) {
  new KillBot(i);
}
