const { createBot } = require("mineflayer");
const {default: customPVP} = require("../lib");
const { Movements, pathfinder } = require("mineflayer-pathfinder");

let target = null;

const bot = createBot({
  username: `pvp_testing`,
  host: process.argv[2],
  port: Number(process.argv[3]) || 25565,
  version: process.argv[4],
});


bot.once("spawn", async () => {
  bot.physics.yawSpeed = 50;
  bot.loadPlugin(customPVP);
  bot.loadPlugin(pathfinder);

  const moves = new Movements(bot);
  moves.allowFreeMotion = true;
  moves.allowParkour = true;
  moves.allowSprinting = true;
  bot.pathfinder.setMovements(moves);

  bot.bowpvp.useOffhand = false;

  await bot.waitForTicks(20);
  bot.chat('/register rocky1928 rocky1928')
});


bot._client.on("end", console.log)
bot._client.on("error", console.log)
bot.on("kicked", console.log);
bot.on("error", console.log);
bot.on("chat", handleChat);


async function equipItem(item, offhand=false) {
  const handPos =  offhand ? "off-hand" : "hand"
  const itemToEquip = bot.util.inv.getAllItemsExceptCurrent(handPos).find((e) => e.name === item);
  if (itemToEquip) {
    await bot.util.inv.customEquip(itemToEquip,handPos);
  }

}

async function fight() {
  target = bot.nearestEntity((e) => e.type === "player" && !e.username?.includes("pvp-testing"));
  if (!target) return console.log("no target");
  await equipItem("shield", true);
  bot.swordpvp.attack(target);
}

async function handleChat(username, message) {

  if (username === bot.username) return;

  const args = message.split(" ");
  switch (args[0]) {

    // all of these shoot the named projectile.
    case "bow":
    case "crossbow":
    case "trident":
    case "ender_pearl":
    case "splash_potion":
    case "snowball":
    case "egg":
    case "crossbow_firework":
      bot.bowpvp.stop();
      target = bot.nearestEntity((e) => (e.username || e.name).startsWith(args[1]));
      if (!target) return;
      bot.bowpvp.attack(target, args[0]);
      break;

    case "sword":
      bot.on("physicsTick", fight);
      break;

    case "rangestop":
      bot.bowpvp.stop();
      break;

    case "swordstop":
      bot.removeListener("physicsTick", fight);
      bot.swordpvp.stop();
      break;

    case "clear":
      console.clear();
      break;

    case "defend":
      defend = true;
      await equipShield();
      break;

    case "defendstop":
      defend = false;
      break;

    case "packetmode":
      bot.swordpvp.options.critConfig.enabled = args[1] === "enable";
      bot.swordpvp.options.critConfig.mode = args[1] === "enable" ? "packet" : "manual";
      break;

    case "shieldmode":
      bot.swordpvp.options.shieldConfig.enabled = args[1] === "enable";
      bot.swordpvp.options.shieldConfig.mode = args[1] === "enable" ? "packet" : "manual";
      break;

    case "pos":
      bot.chat(`${bot.entity.position}`);
      break;
  }
}

