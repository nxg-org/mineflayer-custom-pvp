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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var mineflayer_1 = require("mineflayer");
var index_1 = require("../src/index");
var mineflayer_trajectories_1 = require("@nxg-org/mineflayer-trajectories");
var mineflayer_pathfinder_1 = require("mineflayer-pathfinder");
var target = null;
var defend = false;
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     prompt: "Text here: ",
// });
var KillBot = /** @class */ (function () {
    function KillBot(num) {
        var _this = this;
        var _a;
        this.fight = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                target = this.bot.nearestEntity(function (e) { var _a; return e.type === "player" && !((_a = e.username) === null || _a === void 0 ? void 0 : _a.includes("pvp-testing")); });
                if (!target)
                    return [2 /*return*/, console.log("no target")];
                this.equipShield();
                this.bot.swordpvp.attack(target);
                return [2 /*return*/];
            });
        }); };
        this.handler = function (username, message) { return __awaiter(_this, void 0, void 0, function () {
            var split;
            var _this = this;
            return __generator(this, function (_a) {
                split = message.split(" ");
                switch (split[0]) {
                    case "partyme":
                        this.bot.chat("/party join " + username);
                        break;
                    case "distance":
                        target = this.bot.nearestEntity(function (e) { var _a; return ((_a = e.username) !== null && _a !== void 0 ? _a : e.name) === split[1]; });
                        if (!target)
                            return [2 /*return*/];
                        (function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!true) return [3 /*break*/, 2];
                                        console.log(this.bot.util.entity.eyeDistanceToEntity(target));
                                        return [4 /*yield*/, this.bot.waitForTicks(1)];
                                    case 1:
                                        _a.sent();
                                        return [3 /*break*/, 0];
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); })();
                        break;
                    case "acceptduel":
                        this.bot.chat("/duel accept ".concat(split[1]));
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
                        target = this.bot.nearestEntity(function (e) { var _a; return ((_a = e.username) !== null && _a !== void 0 ? _a : e.name) === split[1]; });
                        if (!target)
                            return [2 /*return*/];
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
                                this.bot.swordpvp.options.critConfig.mode = split[1];
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
                                this.bot.swordpvp.options.shieldConfig.mode = split[1];
                                break;
                        }
                        break;
                    case "pos":
                        this.bot.chat("".concat(this.bot.entity.position));
                        break;
                    case "dist":
                        target = this.bot.nearestEntity(function (e) { var _a, _b; return ((_a = e.username) !== null && _a !== void 0 ? _a : e.name) === split[1] || ((_b = e.username) !== null && _b !== void 0 ? _b : e.name) === username; });
                        if (!target)
                            return [2 /*return*/];
                        this.bot.chat("".concat(this.bot.entity.position.distanceTo(target.position)));
                        break;
                }
                return [2 /*return*/];
            });
        }); };
        this.bot = (0, mineflayer_1.createBot)({
            username: "pvp-testing" + num,
            host: process.argv[2],
            port: (_a = Number(process.argv[3])) !== null && _a !== void 0 ? _a : 25565,
            version: "1.18.2"
        });
        this.bot.loadPlugin(index_1["default"]);
        this.bot.loadPlugin(mineflayer_pathfinder_1.pathfinder);
        this.bot.jumpPather.searchDepth = 10;
        var moves = new mineflayer_pathfinder_1.Movements(this.bot, this.bot.registry);
        moves.allowFreeMotion = true;
        moves.allowParkour = true;
        moves.allowSprinting = true;
        this.bot.pathfinder.setMovements(moves);
        this.bot.physics.yawSpeed = 50;
        this.bot.once("spawn", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // this.bot.swordpvp.options.followConfig.mode = "jump"
                        // this.bot.swordpvp.options.critConfig.mode = "packet";
                        // this.bot.swordpvp.options.tapConfig.enabled = false
                        this.bot.bowpvp.useOffhand = false;
                        this.bot.setControlState("forward", true);
                        return [4 /*yield*/, this.bot.waitForTicks(20)];
                    case 1:
                        _a.sent();
                        this.bot.setControlState("forward", false);
                        return [2 /*return*/];
                }
            });
        }); });
        var checkedEntities = {};
        this.bot.on("physicsTick", function () {
            if (!defend)
                return;
            var info = _this.bot.projectiles.isAimedAt;
            if (info) {
                _this.bot.lookAt(info.entity.position.offset(0, 1.6, 0), true);
                if (!_this.bot.util.entity.isOffHandActive())
                    _this.bot.activateItem(true);
            }
            else {
                // this.bot.deactivateItem();
            }
        });
        this.bot.on("entityMoved", function (entity) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!defend)
                    return [2 /*return*/];
                if (!Object.keys(mineflayer_trajectories_1.projectileGravity).includes(entity.name))
                    return [2 /*return*/];
                // console.log(Object.values(this.bot.entities))
                if (this.bot.projectiles.projectileAtMe) {
                    this.bot.lookAt(this.bot.projectiles.projectileAtMe.entity.position, true);
                    // equipShield();
                    if (!this.bot.util.entity.isOffHandActive())
                        this.bot.activateItem(true);
                }
                else if (!this.bot.projectiles.isAimedAt) {
                    this.bot.deactivateItem();
                }
                return [2 /*return*/];
            });
        }); });
        // this.bot.on("entityMoved", async (entity) => {
        //     if (checkedEntities[entity.id]) return;
        //     checkedEntities[entity.id] = entity;
        //     if (["arrow", "firework_rocket", "ender_pearl"].includes(entity.name!)) {
        //         console.log(this.bot.tracker.getIncomingArrows())
        //     }
        // });
        this.bot.on("kicked", console.log);
        this.bot.on("end", console.log);
        this.bot.on("message", function (message) { return __awaiter(_this, void 0, void 0, function () {
            var raw;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (message.json.translate === "chat.type.text")
                            return [2 /*return*/];
                        raw = JSON.stringify(message).toLowerCase();
                        if (!(raw.includes("duel") && raw.includes("from"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.bot.waitForTicks(5)];
                    case 1:
                        _a.sent();
                        this.bot.chat("/duel accept ".concat("Generel_Schwerz"));
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        // rl.on("line", this.bot.chat)
        var time = performance.now();
        this.bot.swordpvp.on("attackedTarget", function (target, reason, ticks) {
            var now = performance.now();
            console.log("attacking", now - time, reason, ticks, _this.bot.entity.velocity.y);
            time = now;
        });
        this.bot.on("message", function (jsonMsg, position) {
            var _a = jsonMsg.getText(0).split(':'), prefix = _a[0], message = _a[1];
            if (!message)
                return;
            var prefixSplit = prefix.split(' ');
            var username = prefixSplit[prefixSplit.length - 1];
            _this.handler(username, message);
        });
        this.bot.on("chat", this.handler);
    }
    KillBot.prototype.equipShield = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var shield;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (((_a = this.bot.entity.equipment[1]) === null || _a === void 0 ? void 0 : _a.name) === "shield")
                            return [2 /*return*/];
                        shield = this.bot.util.inv.getAllItemsExceptCurrent("off-hand").find(function (e) { return e.name === "shield"; });
                        if (!shield) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.bot.util.inv.customEquip(shield, "off-hand")];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return KillBot;
}());
for (var i = 0; i < 1; i++) {
    new KillBot(i);
}
