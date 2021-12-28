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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaxDamageOffset = exports.Cooldown = exports.SwordPvp = exports.attackSpeeds = void 0;
const util_1 = require("util");
const sleep = (0, util_1.promisify)(setTimeout);
/**
 * The main pvp manager plugin class.
 */
exports.attackSpeeds = {
    wooden_sword: 1.7,
    golden_sword: 1.7,
    stone_sword: 1.7,
    iron_sword: 1.7,
    diamond_sword: 1.7,
    netherite_sword: 1.7,
    trident: 1.1,
    wooden_shovel: 1.1,
    golden_shovel: 1.1,
    stone_shovel: 1.1,
    iron_shovel: 1.1,
    diamond_shovel: 1.1,
    netherite_shovel: 1.1,
    wooden_pickaxe: 1.2,
    golden_pickaxe: 1.2,
    stone_pickaxe: 1.2,
    iron_pickaxe: 1.2,
    diamond_pickaxe: 1.2,
    netherite_pickaxe: 1.2,
    wooden_axe: 0.8,
    golden_axe: 1.1,
    stone_axe: 0.8,
    iron_axe: 0.9,
    diamond_axe: 1.0,
    netherite_axe: 1.1,
    wooden_hoe: 1.1,
    golden_hoe: 1.1,
    stone_hoe: 2.0,
    iron_hoe: 3.0,
    diamond_hoe: 4.0,
    netherite_hoe: 4.0,
    other: 4.0,
};
class SwordPvp {
    constructor(bot) {
        this.bot = bot;
        this.timeToNextAttack = 0;
        this.ticksSinceTargetAttack = 0;
        this.ticksSinceLastSwitch = 0;
        this.wasInRange = false;
        this.viewDistance = 128;
        this.attackRange = 3;
        this.critConfig = {
            enabled: true,
            mode: "hop",
        };
        this.shieldConfig = {
            enabled: true,
            mode: "legit",
        };
        this.rotateConfig = {
            enabled: true,
            mode: "constant",
        };
        this.weaponOfChoice = "sword";
        this.metadataSlot = 0;
        this.updateForTargetShielding = true;
        this.meleeAttackRate = new MaxDamageOffset(this.bot);
        this.bot.once("spawn", () => {
            this.metadataSlot = this.bot.entity.metadata.findIndex((data) => Number(data) === 20);
        });
        this.bot.on("physicsTick", () => this.update());
        this.bot.on("entityGone", (e) => {
            if (e === this.target)
                this.stop();
        });
        this.bot.on("entitySwingArm", (entity) => {
            if (entity === this.target) {
                this.ticksSinceTargetAttack = 0;
            }
        });
        this.bot._client.on("entity_metadata", this.checkForTargetShield.bind(this));
    }
    changeWeaponState(weapon) {
        const hasWeapon = this.checkForWeapon(weapon);
        if (hasWeapon) {
            this.weaponOfChoice = weapon;
            return hasWeapon;
        }
        return null;
    }
    checkForWeapon(weapon) {
        if (!weapon)
            weapon = this.weaponOfChoice;
        const heldItem = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("hand")];
        if (heldItem === null || heldItem === void 0 ? void 0 : heldItem.name.includes(weapon)) {
            return heldItem;
        }
        else {
            const item = this.bot.inventory.items().find((item) => item === null || item === void 0 ? void 0 : item.name.includes(weapon));
            if (item) {
                return item;
            }
            return null;
        }
    }
    equipWeapon(weapon) {
        return __awaiter(this, void 0, void 0, function* () {
            const heldItem = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("hand")];
            if ((heldItem === null || heldItem === void 0 ? void 0 : heldItem.name) === weapon.name) {
                return false;
            }
            else {
                return yield this.bot.util.inv.customEquip(weapon, "hand");
                // await this.bot.util.builtInsPriority({group: "inventory", priority: 1, returnIfRunning: false}, this.bot.equip, weapon, "hand");
            }
        });
    }
    getWeaponOfEntity(entity) {
        var _a;
        return (_a = (entity !== null && entity !== void 0 ? entity : this.bot.entity)) === null || _a === void 0 ? void 0 : _a.heldItem;
    }
    getShieldStatusOfEntity(entity) {
        entity = entity !== null && entity !== void 0 ? entity : this.bot.entity;
        const shieldSlot = entity.equipment[1];
        return (shieldSlot === null || shieldSlot === void 0 ? void 0 : shieldSlot.name) === "shield" && this.bot.util.entity.isOffHandActive(entity);
    }
    checkForTargetShield(packet) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.updateForTargetShielding)
                return;
            //key: 8 = shielding, 9 = regen for 1.17. VERY INTERESTING.
            if (!packet.entityId || !packet.metadata || packet.metadata.length === 0)
                return;
            if (!packet.metadata[0].key || packet.metadata[0].key !== 8)
                return;
            const entity = this.bot.entities[packet.entityId];
            if (!entity || entity !== (!!this.target ? this.target : this.lastTarget))
                return;
            if (((_a = entity.equipment[1]) === null || _a === void 0 ? void 0 : _a.name) !== "shield")
                return;
            const boolState = packet.metadata[0].value === 3; //is offhand active
            const state = boolState ? "_axe" : "sword";
            if (!!this.target && this.ticksSinceTargetAttack >= 3 && this.ticksSinceLastSwitch >= 3) {
                const itemToChangeTo = yield this.checkForWeapon(state);
                if (itemToChangeTo) {
                    // await sleep(this.timeToNextAttack + 100)
                    // await this.attemptAttack();
                    const switched = yield this.equipWeapon(itemToChangeTo);
                    this.weaponOfChoice = state;
                    if (switched)
                        this.timeToNextAttack = this.meleeAttackRate.getTicks(this.getWeaponOfEntity(this.bot.entity));
                }
            }
            // } else {
            //     this.weaponOfChoice = state;
            // }
            this.bot.emit("targetBlockingUpdate", entity, boolState);
        });
    }
    attack(target) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if ((target === null || target === void 0 ? void 0 : target.id) === ((_a = this.target) === null || _a === void 0 ? void 0 : _a.id))
                return;
            this.stop();
            this.target = target;
            if (!this.target)
                return;
            this.timeToNextAttack = 0;
            const itemToChangeTo = yield this.checkForWeapon();
            if (itemToChangeTo) {
                const switched = yield this.equipWeapon(itemToChangeTo);
            }
            this.bot.emit("startedAttacking", this.target);
        });
    }
    stop() {
        if (!this.target)
            return;
        this.lastTarget = this.target;
        this.target = undefined;
        this.bot.emit("stoppedAttacking");
    }
    // per tick.
    update() {
        if (!this.target)
            return;
        this.timeToNextAttack--;
        this.ticksSinceTargetAttack++;
        this.ticksSinceLastSwitch++;
        this.checkRange();
        this.causeCritical();
        this.toggleShield();
        this.rotate();
        if (this.timeToNextAttack === -1)
            this.attemptAttack();
    }
    trueDistance() {
        if (!this.target)
            return 10000;
        const { x, y, z } = this.bot.entity.position.offset(0, this.bot.entity.height, 0);
        const aabb = this.bot.util.entity.getEntityAABB({ position: this.target.position, height: this.target.height, width: 0.3 });
        let dx = Math.max(aabb.minX - x, 0, x - aabb.maxX);
        let dy = Math.max(aabb.minY - y, 0, y - aabb.maxY);
        let dz = Math.max(aabb.minZ - z, 0, z - aabb.maxZ);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    checkRange() {
        if (!this.target)
            return;
        if (this.timeToNextAttack < 0)
            return;
        const dist = this.target.position.distanceTo(this.bot.entity.position);
        if (dist > this.viewDistance)
            return this.stop();
        const inRange = this.trueDistance() <= this.attackRange;
        if (!this.wasInRange && inRange)
            this.timeToNextAttack = 0;
        this.wasInRange = inRange;
    }
    getHealth(metadata) {
        var _a;
        if (!metadata)
            return 0;
        let slot = metadata[this.metadataSlot] ? this.metadataSlot : metadata.findIndex((met) => Number(met) > 1 && Number(met) <= 20);
        return Number(metadata[slot]) + ((_a = Number(metadata[slot + 4])) !== null && _a !== void 0 ? _a : 0);
    }
    logHealth(health) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.target)
                return;
            const newHealth = yield new Promise((resolve, reject) => {
                const listener = (entity) => {
                    if (entity === this.target) {
                        resolve(this.getHealth(entity.metadata));
                    }
                    this.bot.off("entityUpdate", listener);
                };
                setTimeout(() => {
                    this.bot.off("entityUpdate", listener);
                    resolve(health);
                }, 500); // reject after 200ms
                this.bot.on("entityUpdate", listener);
            });
            health = Math.round((health - newHealth) * 100) / 100;
            // if (!isNaN(health))
            // console.log(
            //     `Dealt ${health} damage. Target ${this.target?.username} has ${
            //         Math.round(this.getHealth(this.target?.metadata) * 100) / 100
            //     } health left.`
            // );
        });
    }
    causeCritical() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.critConfig.enabled || !this.target)
                return false;
            switch (this.critConfig.mode) {
                case "packet":
                    if (this.timeToNextAttack >= 0)
                        return false;
                    if (!this.wasInRange)
                        return false;
                    // this.bot._client.write("position", { ...this.bot.entity.position, onGround: true });
                    this.bot._client.write("position", Object.assign(Object.assign({}, this.bot.entity.position.offset(0, 0.1625, 0)), { onGround: false }));
                    this.bot._client.write("position", Object.assign(Object.assign({}, this.bot.entity.position), { onGround: false }));
                    this.bot._client.write("position", Object.assign(Object.assign({}, this.bot.entity.position.offset(0, 1.1e-6, 0)), { onGround: false }));
                    this.bot._client.write("position", Object.assign(Object.assign({}, this.bot.entity.position), { onGround: false }));
                    return true;
                case "shorthop":
                    if (this.timeToNextAttack !== 1)
                        return false;
                    if (!this.bot.entity.onGround)
                        return false;
                    if (this.target.position.distanceTo(this.bot.entity.position) > this.attackRange + 1)
                        return false;
                    this.bot.entity.position = this.bot.entity.position.offset(0, 0.25, 0);
                    this.bot.entity.onGround = false;
                    yield this.bot.waitForTicks(2);
                    const { x: dx, y: dy, z: dz } = this.bot.entity.position;
                    this.bot.entity.position = this.bot.entity.position.set(dx, Math.floor(dy), dz);
                    return true;
                case "hop":
                    if (this.timeToNextAttack !== 7)
                        return false;
                    if (!this.bot.entity.onGround)
                        return false;
                    if (this.target.position.distanceTo(this.bot.entity.position) > this.attackRange + 1)
                        return false;
                    console.log("jump");
                    this.bot.setControlState("jump", true);
                    this.bot.setControlState("jump", false);
                    return true;
                default:
                    return false;
            }
        });
    }
    toggleShield() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.timeToNextAttack !== 1 || !this.target || !this.wasInRange)
                return false;
            const shield = this.hasShield();
            const wasShieldActive = shield; //&& this.bot.util.entity.isOffHandActive()
            if (wasShieldActive && this.shieldConfig.enabled && this.shieldConfig.mode === "legit") {
                this.bot.deactivateItem();
            }
            this.bot.once("attackedTarget", (entity) => __awaiter(this, void 0, void 0, function* () {
                yield this.bot.waitForTicks(2);
                if (wasShieldActive && this.shieldConfig.enabled && this.shieldConfig.mode === "legit") {
                    this.bot.activateItem(true);
                }
                else if (!this.bot.util.entity.isOffHandActive() && shield && this.shieldConfig.mode === "blatant") {
                    this.bot.activateItem(true);
                }
            }));
            // await once(this.bot, "attackedTarget");
        });
    }
    rotate() {
        if (!this.rotateConfig.enabled || !this.target)
            return false;
        const pos = this.target.position.offset(0, this.target.height, 0);
        if (this.rotateConfig.mode === "constant") {
            // this.bot.lookAt(pos, true);
            if (this.wasInRange)
                this.bot.util.move.forceLookAt(pos, true);
            return;
        }
        else {
            if (this.timeToNextAttack !== -1)
                return;
            switch (this.rotateConfig.mode) {
                case "legit":
                    this.bot.lookAt(pos);
                    break;
                case "instant":
                    this.bot.lookAt(pos, true);
                    break;
                case "silent":
                    this.bot.util.move.forceLookAt(pos);
                    break;
                case "ignore":
                    break;
                default:
                    break;
            }
        }
    }
    attemptAttack() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.target)
                return;
            if (!this.wasInRange) {
                this.timeToNextAttack = this.meleeAttackRate.getTicks(this.bot.heldItem);
                return;
            }
            const target = this.target;
            if (target !== this.target)
                throw "Target changed!";
            let health = this.getHealth(this.target.metadata);
            this.bot.attack(target);
            this.logHealth(health);
            this.bot.emit("attackedTarget", target);
            this.timeToNextAttack = this.meleeAttackRate.getTicks(this.bot.heldItem);
        });
    }
    hasShield() {
        if (this.bot.supportFeature("doesntHaveOffHandSlot"))
            return false;
        const slot = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("off-hand")];
        if (!slot)
            return false;
        return slot.name.includes("shield");
    }
}
exports.SwordPvp = SwordPvp;
class Cooldown {
    constructor(weaponName, x, min, max) {
        this.weaponName = weaponName;
        this.x = x;
        this.min = min;
        this.max = max;
    }
    getAttackSpeed(weaponName) {
        if (!weaponName)
            return exports.attackSpeeds.other;
        // @ts-expect-error
        return exports.attackSpeeds[weaponName] || exports.attackSpeeds.other;
    }
    clamp(x, min, max) {
        if (x < min)
            return min;
        if (x > max)
            return max;
        return x;
    }
    getCooldown(weaponName) {
        const speed = this.getAttackSpeed(weaponName);
        return Math.floor((1 / speed) * 20);
    }
    getDamageMultiplier(weaponName) {
        const speed = this.getAttackSpeed(weaponName);
        const damageMul = 0.2 + Math.pow((speed + 0.5) / ((1 / speed) * 20), 2) * 0.8;
        return this.clamp(damageMul, 0.2, 1.0);
    }
}
exports.Cooldown = Cooldown;
class MaxDamageOffset {
    constructor(bot, min = 0, max = 0) {
        this.bot = bot;
        this.min = min;
        this.max = max;
    }
    getTicks(item) {
        const heldItem = item;
        const cooldown = Cooldown.prototype.getCooldown(!!heldItem ? heldItem.name : "other");
        const ticks = Math.floor(Math.random() * (this.max - this.min) + this.min) + cooldown;
        return Math.max(1, ticks);
    }
}
exports.MaxDamageOffset = MaxDamageOffset;
