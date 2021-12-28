import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { CheckedShot } from "./shotPlanner";
import { EntityTracker } from "./entityTracker";
import { Vec3 } from "vec3";
export declare class BowPVP {
    private bot;
    enabled: boolean;
    weapon: string;
    useOffhand: boolean;
    tracker: EntityTracker;
    private target;
    private shotInit;
    private shotCharging;
    private crossbowLoading;
    private planner;
    private shotInfo;
    private waitTime;
    constructor(bot: Bot);
    private get shotReady();
    /**
     *
     * @param entity
     * @param velocity
     * @returns
     */
    shotToEntity(entity: Entity, velocity?: Vec3): CheckedShot | null;
    /**
     * @function hasWeapon
     * @param {string} weapon
     * @returns
     */
    hasWeapon(weapon?: string): boolean;
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
    hasAmmo(weapon?: string): boolean;
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
    checkForWeapon(weapon?: string): Promise<boolean>;
    fireworkSetup(): Promise<boolean>;
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
    stop(): void;
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
    attack(target: Entity, weapon?: string): Promise<void>;
    /**
     *
     * @param yaw
     * @param grade
     * @param weapon
     * @returns
     */
    shootAt(yaw?: number, grade?: number, weapon?: string): Promise<void>;
    private getShotInfo;
    private chargeHandling;
    private shootCrossbow;
}
