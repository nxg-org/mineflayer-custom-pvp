"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const mineflayer_1 = require("mineflayer");
const index_1 = __importDefault(require("./index"));
let target = null;
const bot = (0, mineflayer_1.createBot)({
    username: "pvp-testing",
    host: (_a = process.argv[2]) !== null && _a !== void 0 ? _a : "localhost",
    port: (_b = Number(process.argv[3])) !== null && _b !== void 0 ? _b : 25565,
});
bot.loadPlugin(index_1.default);
bot.once("spawn", () => {
    bot.swordpvp.critConfig.mode = "packet";
    bot.bowpvp.useOffhand = false;
});
bot.on("chat", (username, message) => __awaiter(void 0, void 0, void 0, function* () {
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
            target = bot.nearestEntity((e) => { var _a; return ((_a = e.username) !== null && _a !== void 0 ? _a : e.name) === split[1]; });
            if (!target)
                return console.log("no entity");
            bot.bowpvp.attack(target, split[0]);
            break;
        case "sword":
            target = bot.nearestEntity((e) => { var _a; return ((_a = e.username) !== null && _a !== void 0 ? _a : e.name) === split[1]; });
            if (!target)
                return console.log("no entity");
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
}));
