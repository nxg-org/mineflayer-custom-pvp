import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
import md from "minecraft-data";
import { performance } from "perf_hooks";
import { promisify } from "util";
import { CheckedShot, ShotPlanner } from "../newbow/shotPlanner";
import { EntityTracker } from "..";
import { InterceptEquations } from "../calc/intercept";
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

    private set shotReady(shotReady: boolean) {}

    private get shotReady(): boolean {
        return performance.now() - this.shotInit >= this.waitTime;
    }

    public shotToEntity(entity: Entity, velocity?: Vec3) {
        if (!velocity) velocity = this.tracker.getEntitySpeed(entity);
        return this.planner.shotToEntity(entity, velocity);
    }

    public hasWeapon(weapon?: string): boolean {
        weapon = weapon ?? this.weapon;
        return !!this.bot.util.inv.getAllItems().find((item) => weapon && item.name.includes(weapon));
    }

    public hasAmmo(weapon: string): boolean {
        switch (weapon) {
            case "bow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow"));
            case "crossbow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow") || item.name.includes("firework"));
            default:
                return !!this.bot.inventory.items().find((item) => weapon && item.name.includes(weapon));
        }
    }

    public async checkForWeapon(): Promise<boolean> {
        const usedHand = this.bot.util.inv.getHandWithItem(this.useOffhand);
        const otherHand = this.bot.util.inv.getHandWithItem(!this.useOffhand);
        if (!usedHand || !usedHand.name.includes(this.weapon)) {
            const foundItem = [...this.bot.inventory.items(), otherHand].find((item) => item?.name.includes(this.weapon));
            if (!foundItem) return false;
            await this.bot.util.inv.customEquip(foundItem, this.bot.util.inv.getHand(this.useOffhand));
        }
        return true;
    }

    public stop() {
        this.bot.removeListener("physicsTick", this.getShotInfo);
        this.bot.removeListener("physicsTick", this.chargeHandling);
        this.target = null;
        this.shotCharging = false
        this.enabled = false
        if (this.shotCharging && this.shotInfo) this.bot.util.move.forceLook(this.shotInfo.yaw, this.shotInfo.pitch, true);
        this.bot.deactivateItem();
    }

    public async shootAt(yaw?: number, grade?: number, weapon: Item | md.Item | null = null) {
        if (!yaw) yaw = this.bot.player.entity.yaw;
        if (!grade) grade = this.bot.player.entity.pitch;
        await this.bot.look(yaw, grade, true);
        await this.checkForWeapon();
        if (this.shotCharging) return;
        this.shotCharging = true;
        this.shotInit = performance.now();
        this.bot.activateItem();
        while (!this.shotReady) await sleep(0);
        this.bot.deactivateItem();
        this.shotCharging = false;
        this.shotReady = false;
    }

    public async attack(target: Entity, weapon: string = "bow") {
        if (this.target === target) return;
        this.enabled = true;
        this.weapon = weapon
        this.target = target
        const hasWeapon = await this.checkForWeapon();
        if (!hasWeapon) this.stop();
        this.bot.on("physicsTick", this.getShotInfo);
        this.bot.on("physicsTick", this.chargeHandling);
    }

    private getShotInfo = async () => {
        if (!this.target) return;
        this.shotInfo = this.shotToEntity(this.target, this.tracker.getEntitySpeed(this.target));
    };

    private chargeHandling = async () => {
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
        const item = this.bot.util.inv.getHandWithItem(this.useOffhand);
        if (!item || item.name !== this.weapon) {
            const weaponFound = this.bot.inventory.items().find((item) => item.name === this.weapon);
            if (!!weaponFound) {
                const equipped = await this.bot.util.inv.customEquip(weaponFound, "hand");
                if (!equipped) {
                    this.stop();
                    return;
                }
            } else {
                this.stop();
                return;
            }
        }

        if (!this.shotCharging) {
            if (["bow", "crossbow", "trident"].includes(this.weapon)) {
                this.bot.activateItem();
            }
            this.shotCharging = true;
            this.shotInit = performance.now();
        }

        if (this.shotInfo && this.shotInfo.hit) {
            if (this.shotCharging) {
                // this.bot.look(this.infoShot.yaw, this.infoShot.pitch)
                this.bot.util.move.forceLook(this.shotInfo.yaw, this.shotInfo.pitch, true);
                if (["bow", "trident"].includes(this.weapon) && this.shotReady) {
                    // await this.bot.look(this.infoShot.yaw, this.infoShot.pitch, true);
                    this.bot.deactivateItem();
                    this.shotCharging = false;
                }

                if (["snowball", "ender_pearl", "egg", "splash_potion"].includes(this.weapon) && this.shotReady) {
                    this.bot.swingArm(undefined);
                    this.bot.activateItem();
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
            this.bot.activateItem();
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
