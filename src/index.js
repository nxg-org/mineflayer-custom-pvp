"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityTracker = exports.Shot = void 0;
const mineflayer_trajectories_1 = require("@nxg-org/mineflayer-trajectories");
Object.defineProperty(exports, "Shot", { enumerable: true, get: function () { return mineflayer_trajectories_1.Shot; } });
const mineflayer_util_plugin_1 = __importDefault(require("@nxg-org/mineflayer-util-plugin"));
const entityTracker_1 = require("./bow/entityTracker");
Object.defineProperty(exports, "EntityTracker", { enumerable: true, get: function () { return entityTracker_1.EntityTracker; } });
const swordpvp_1 = require("./sword/swordpvp");
const bowpvp_1 = require("./bow/bowpvp");
function plugin(bot) {
    if (!bot.util)
        bot.loadPlugin(mineflayer_util_plugin_1.default);
    const swordpvp = new swordpvp_1.SwordPvp(bot);
    const bowpvp = new bowpvp_1.BowPVP(bot);
    bot.swordpvp = swordpvp;
    bot.bowpvp = bowpvp;
}
exports.default = plugin;
