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
exports.BowPVP = void 0;
const perf_hooks_1 = require("perf_hooks");
const util_1 = require("util");
const shotPlanner_1 = require("./shotPlanner");
const entityTracker_1 = require("./entityTracker");
const vec3_1 = require("vec3");
const sleep = (0, util_1.promisify)(setTimeout);
const emptyVec = new vec3_1.Vec3(0, 0, 0);
class BowPVP {
    constructor(bot) {
        this.bot = bot;
        this.enabled = false;
        this.weapon = "bow";
        this.useOffhand = false;
        this.target = null;
        this.shotInit = perf_hooks_1.performance.now();
        this.shotCharging = false;
        this.crossbowLoading = false;
        this.shotInfo = null;
        this.waitTime = 1200;
        this.getShotInfo = () => __awaiter(this, void 0, void 0, function* () {
            if (!this.target)
                return;
            this.shotInfo = this.shotToEntity(this.target, this.tracker.getEntitySpeed(this.target));
            // console.log(this.shotInfo)
        });
        this.chargeHandling = () => __awaiter(this, void 0, void 0, function* () {
            switch (this.weapon) {
                case "bow":
                case "trident":
                    this.waitTime = 1200;
                    break;
                case "snowball":
                case "egg":
                case "splash_potion":
                    this.waitTime = 150;
                    break;
                case "ender_pearl":
                    this.waitTime = 1000;
                    break;
                case "crossbow":
                case "crossbow_firework":
                    const weaponHand = this.bot.util.inv.getHandWithItem(this.useOffhand);
                    if (!weaponHand)
                        return console.log("cant find a thing");
                    const isEnchanted = weaponHand.enchants.find((enchant) => enchant.name === "quick_charge");
                    this.waitTime = 1250 - (isEnchanted ? isEnchanted.lvl : 0) * 250;
                    break;
                default:
                    this.waitTime = 1200;
            }
            if (!this.shotCharging) {
                if (["bow", "crossbow", "crossbow_firework", "trident"].includes(this.weapon)) {
                    this.bot.activateItem(this.useOffhand);
                }
                this.shotCharging = true;
                this.shotInit = perf_hooks_1.performance.now();
            }
            if (this.shotInfo && this.shotInfo.hit) {
                this.bot.util.move.forceLook(this.shotInfo.yaw, this.shotInfo.pitch, true);
                if (this.shotReady) {
                    if (["bow", "trident"].includes(this.weapon)) {
                        this.bot.deactivateItem();
                        this.shotCharging = false;
                    }
                    if (["snowball", "ender_pearl", "egg", "splash_potion"].includes(this.weapon)) {
                        this.bot.swingArm(undefined);
                        this.bot.activateItem(this.useOffhand);
                        this.bot.deactivateItem();
                        this.shotCharging = false;
                    }
                    if (["crossbow_firework", "crossbow"].includes(this.weapon)) {
                        this.shootCrossbow();
                    }
                }
            }
        });
        this.tracker = new entityTracker_1.EntityTracker(bot);
        this.planner = new shotPlanner_1.ShotPlanner(bot);
        // this.intercepter = new InterceptEquations(bot);
    }
    get shotReady() {
        return perf_hooks_1.performance.now() - this.shotInit >= this.waitTime;
    }
    /**
     *
     * @param entity
     * @param velocity
     * @returns
     */
    shotToEntity(entity, velocity) {
        if (!velocity)
            velocity = this.tracker.getEntitySpeed(entity);
        return this.planner.shotToEntity(entity, velocity);
    }
    /**
     * @function hasWeapon
     * @param {string} weapon
     * @returns
     */
    hasWeapon(weapon) {
        weapon !== null && weapon !== void 0 ? weapon : (weapon = this.weapon);
        return !!this.bot.util.inv.getAllItems().find((item) => weapon && item.name.includes(weapon));
    }
    /**
     * @function hasAmmo
     * @param   {string} [weapon=this.weapon] Optional string name of a weapon. Defaults to this.weapon.
     * @returns {boolean} If the weapon has ammo or not.
     *
     * ### Usage:
     * ```ts
     * // Let us fire!
     * let doWeHaveAmmo = bot.bowpvp.hasAmmo();
     * if (doWeHaveAmmo) {
     * ‍    console.log("cool.")
     * } else {
     * ‍    ocnsole.log("not cool.")
     * }
     * ```
     */
    hasAmmo(weapon) {
        weapon !== null && weapon !== void 0 ? weapon : (weapon = this.weapon);
        switch (weapon) {
            case "bow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow"));
            case "crossbow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow"));
            case "crossbow_firework":
                return !!this.bot.util.inv.getAllItems().find(item => item.name.includes("firework"));
            default:
                return !!this.bot.inventory.items().find((item) => weapon && item.name.includes(weapon));
        }
    }
    /**
     * @function checkForWeapon
     * Checks to see if a weapon exists
     * @param {string} weapon A string name of a weapon to check for
     * @returns {Promise<boolean>} A promise with a boolean
     *
     * ### Usage:
     * ```ts
        // Check for our weapon
        let doWeHaveABow = await bot.bowpvp.checkForWeapon("bow");
        if (doWeHaveABow) {
        ‍    console.log("We have a bow.")
        } else {
        ‍    console.log("God damnit")
        }
        ```
     */
    checkForWeapon(weapon) {
        return __awaiter(this, void 0, void 0, function* () {
            weapon !== null && weapon !== void 0 ? weapon : (weapon = this.weapon);
            const usedHand = this.bot.util.inv.getHandWithItem(this.useOffhand);
            if (!usedHand || !usedHand.name.includes(weapon)) {
                const foundItem = this.bot.util.inv.getAllItems().find((item) => item.name === weapon);
                if (!foundItem)
                    return false;
                yield this.bot.util.inv.customEquip(foundItem, this.bot.util.inv.getHand(this.useOffhand));
            }
            return true;
        });
    }
    fireworkSetup() {
        return __awaiter(this, void 0, void 0, function* () {
            const weapon = this.bot.util.inv.getAllItems().find((item) => item.name.includes("crossbow"));
            if (!this.hasAmmo() || !weapon)
                return false;
            this.useOffhand = false;
            // if (!this.bot.util.inv.getHandWithItem(true)?.name.includes("firework")) {
            const ammo = this.bot.util.inv.getAllItems().find(item => item.name.includes("firework"));
            yield this.bot.util.inv.customEquip(ammo, this.bot.util.inv.getHand(!this.useOffhand));
            yield this.bot.util.inv.customEquip(weapon, this.bot.util.inv.getHand(this.useOffhand));
            return true;
            // } 
        });
    }
    /**
     * @function stop
     * @public
     *
     * ### Usage:
     * ```ts
     * // Stop with the bow!
     * bot.bowpvp.stop()
     * // That's better
     * ```
     */
    stop() {
        this.bot.removeListener("physicsTick", this.getShotInfo);
        this.bot.removeListener("physicsTick", this.chargeHandling);
        if (this.target)
            this.tracker.stopTrackingEntity(this.target);
        this.target = null;
        this.shotCharging = false;
        this.enabled = false;
        if (this.shotCharging && this.shotInfo)
            this.bot.util.move.forceLook(this.shotInfo.yaw, this.shotInfo.pitch, true);
        this.bot.deactivateItem();
    }
    /**
     * Attacks a specified target with a specified weapon.
     * @function attack
     * @public
     * @param   {Entity} target An Entity object.
     * @param   {string} [weapon=this.weapon] An optional string name of an item featured in the bots inventory.
     * @return  {Promise<void>} An empty promise
     *
     * ### Usage:
     * ```ts
     * // Get our target
     * target = bot.nearestEntity((e) => (e.username ?? e.name) === "test_player");
     * // Start the attack!
     * bot.newbowpvp.attack(target, "bow");
     * ```
     */
    attack(target, weapon) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.target === target)
                return;
            this.enabled = true;
            this.target = target;
            if (weapon === "crossbow_firework") {
                const isSetup = this.fireworkSetup();
                if (!isSetup)
                    return this.stop();
            }
            else {
                const hasWeapon = yield this.checkForWeapon(weapon);
                if (!hasWeapon)
                    return this.stop();
            }
            if (weapon)
                this.weapon = weapon;
            this.planner.weapon = this.weapon;
            this.tracker.trackEntity(target);
            this.bot.on("physicsTick", this.getShotInfo);
            this.bot.on("physicsTick", this.chargeHandling);
        });
    }
    /**
     *
     * @param yaw
     * @param grade
     * @param weapon
     * @returns
     */
    shootAt(yaw, grade, weapon) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.shotCharging)
                return;
            const hasWeapon = yield this.checkForWeapon(weapon);
            if (!hasWeapon)
                this.stop();
            if (!yaw)
                yaw = this.bot.player.entity.yaw;
            if (!grade)
                grade = this.bot.player.entity.pitch;
            if (weapon)
                this.weapon = weapon;
            yield this.bot.look(yaw, grade, true);
            this.shotCharging = true;
            this.shotInit = perf_hooks_1.performance.now();
            this.bot.activateItem(this.useOffhand);
            while (!this.shotReady)
                yield sleep(0);
            this.bot.deactivateItem();
            this.shotCharging = false;
        });
    }
    shootCrossbow() {
        // console.log(this.crossbowLoading, this.shotReady, performance.now() - this.shotInit)
        if (this.crossbowLoading) {
            this.bot.activateItem(this.useOffhand);
            this.bot.deactivateItem();
            this.crossbowLoading = false;
            this.shotCharging = false;
            return;
        }
        if (!this.crossbowLoading && this.shotReady) {
            this.bot.deactivateItem();
            this.crossbowLoading = true;
        }
    }
}
exports.BowPVP = BowPVP;
