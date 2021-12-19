import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
import md from "minecraft-data";
import { performance } from "perf_hooks";
import { promisify } from "util";
import { CheckedShot, ShotPlanner } from "../newbow/shotPlanner";
import { EntityTracker } from "../newbow/entityTracker";

import { Vec3 } from "vec3";
const sleep = promisify(setTimeout);
const emptyVec = new Vec3(0, 0, 0);

export class BowPVP {
    public enabled: boolean = false;
    public weapon: string = "bow";
    public useOffhand: boolean = false;
    public tracker: EntityTracker;

    private target: Entity | null = null;
    private shotInit: number = performance.now();
    private shotCharging: boolean = false;
    private crossbowLoading: boolean = false;
    private planner: ShotPlanner;
    private shotInfo: CheckedShot | null = null;
    private waitTime: number = 1200;

    constructor(private bot: Bot) {
        this.tracker = new EntityTracker(bot);
        this.planner = new ShotPlanner(bot);
        // this.intercepter = new InterceptEquations(bot);
    }

    private get shotReady(): boolean {
        return performance.now() - this.shotInit >= this.waitTime;
    }

    /**
     * 
     * @param entity 
     * @param velocity 
     * @returns 
     */
    public shotToEntity(entity: Entity, velocity?: Vec3) {
        if (!velocity) velocity = this.tracker.getEntitySpeed(entity);
        return this.planner.shotToEntity(entity, velocity);
    }

    /**
     * @function hasWeapon
     * @param {string} weapon 
     * @returns 
     */
    public hasWeapon(weapon?: string): boolean {
        weapon ??= this.weapon;
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
    public hasAmmo(weapon?: string): boolean {
        weapon ??= this.weapon
        switch (weapon) {
            case "bow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow"));
            case "crossbow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow") || item.name.includes("firework"));
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
    public async checkForWeapon(weapon?: string): Promise<boolean> {
        weapon ??= this.weapon
        const usedHand = this.bot.util.inv.getHandWithItem(this.useOffhand);
        if (!usedHand || !usedHand.name.includes(weapon)) {
            const foundItem = this.bot.util.inv.getAllItems().find((item) => item.name === weapon);
            if (!foundItem) return false;
            await this.bot.util.inv.customEquip(foundItem, this.bot.util.inv.getHand(this.useOffhand));
        }
        return true;
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
    public stop() {
        this.bot.removeListener("physicsTick", this.getShotInfo);
        this.bot.removeListener("physicsTick", this.chargeHandling);
        if (this.target) this.tracker.stopTrackingEntity(this.target);
        this.target = null;
        this.shotCharging = false;
        this.enabled = false;
        if (this.shotCharging && this.shotInfo) this.bot.util.move.forceLook(this.shotInfo.yaw, this.shotInfo.pitch, true);
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
    public async attack(target: Entity, weapon?: string): Promise<void> {
        if (this.target === target) return;
        this.enabled = true;
        this.target = target;
        const hasWeapon = await this.checkForWeapon(weapon);
        if (!hasWeapon) this.stop();
        if (weapon) this.weapon = weapon
        this.planner.weapon = this.weapon
        this.tracker.trackEntity(target);
        this.bot.on("physicsTick", this.getShotInfo);
        this.bot.on("physicsTick", this.chargeHandling);
    }
    
    /**
     * 
     * @param yaw 
     * @param grade 
     * @param weapon 
     * @returns 
     */
    public async shootAt(yaw?: number, grade?: number, weapon?: string) {
        if (this.shotCharging) return;
        const hasWeapon = await this.checkForWeapon(weapon);
        if (!hasWeapon) this.stop();
        if (!yaw) yaw = this.bot.player.entity.yaw;
        if (!grade) grade = this.bot.player.entity.pitch;
        if (weapon) this.weapon = weapon
        await this.bot.look(yaw, grade, true);
        this.shotCharging = true;
        this.shotInit = performance.now();
        
        this.bot.activateItem(this.useOffhand);
        while (!this.shotReady) await sleep(0);
        this.bot.deactivateItem();
        
        this.shotCharging = false;
    }

    private getShotInfo = async () => {
        if (!this.target) return;
        this.shotInfo = this.shotToEntity(this.target, this.tracker.getEntitySpeed(this.target));
    };


    private chargeHandling = async () => {
        const item = this.bot.util.inv.getHandWithItem(this.useOffhand);
        if (!item || item.name !== this.weapon) {
            const weaponFound = this.bot.util.inv.getAllItems().find((item) => item.name === this.weapon);
            if (!!weaponFound) {
                const equipped = await this.bot.util.inv.customEquip(weaponFound, this.bot.util.inv.getHand(this.useOffhand));
                if (!equipped) {
                    this.stop();
                    return;
                }
            } else {
                this.stop();
                return;
            }
        }
        switch (this.weapon) {
            case "bow":
            case "trident":
                this.waitTime = 1200;
                break;
            case "snowball":
            case "ender_pearl":
            case "egg":
            case "splash_potion":
                this.waitTime = 150;
                break;
            default:
                this.waitTime = 1200;
        }


        if (!this.shotCharging) {
            if (["bow", "crossbow", "trident"].includes(this.weapon)) {
                this.bot.activateItem(this.useOffhand);
            }
            this.shotCharging = true;
            this.shotInit = performance.now();
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

                if (this.weapon === "crossbow") {
                    this.shootCrossbow();
                }
            }
        }
    };

    private shootCrossbow() {
        if (this.crossbowLoading) {
            this.bot.activateItem(this.useOffhand);
            this.bot.deactivateItem();
            this.crossbowLoading = false;
            this.shotCharging = false;
            return;
        }

        const hand = this.bot.util.inv.getHandWithItem(this.useOffhand);
        if (hand?.name !== "crossbow") {
            this.stop();
            return;
        }

        const isEnchanted = hand.enchants ? hand.enchants.find((enchant) => enchant.name === "quick_charge") : undefined;
        const shotIn = 1250 - (isEnchanted ? isEnchanted.lvl : 0) * 250;

        if (this.weapon === "crossbow" && !this.crossbowLoading && performance.now() - this.shotInit > shotIn) {
            this.bot.deactivateItem();
            this.crossbowLoading = true;
        }
    }
}
