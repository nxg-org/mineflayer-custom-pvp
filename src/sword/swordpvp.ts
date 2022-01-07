import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
import { promisify } from "util";
import { attack } from "../util";
import { attackSpeeds, CriticalsConfig, RotateConfig, ShieldConfig, SwingBehaviorConfig } from "./sworddata";
const sleep = promisify(setTimeout);

/**
 * The main pvp manager plugin class.
 */
export class SwordPvp {
    public timeToNextAttack: number = 0;
    public ticksSinceTargetAttack: number = 0;
    public ticksSinceLastSwitch: number = 0;
    public wasInRange: boolean = false;
    public viewDistance: number = 128;
    public attackRange: number = 3;
    public meleeAttackRate: MaxDamageOffset;
    public swingConfig: SwingBehaviorConfig = {
        mode: "fullswing"
    }
    public critConfig: CriticalsConfig = {
        enabled: true,
        mode: "hop",
    };

    public shieldConfig: ShieldConfig = {
        enabled: true,
        mode: "legit",
    };

    public rotateConfig: RotateConfig = {
        enabled: true,
        mode: "constant",
    };
    public target?: Entity;
    public lastTarget?: Entity;
    public weaponOfChoice: string = "sword";
    public updateForTargetShielding: boolean = true;

    constructor(public bot: Bot) {
        this.meleeAttackRate = new MaxDamageOffset(this.bot);
        this.bot.on("physicsTick", () => this.update());
        this.bot.on("entityGone", (e) => {
            if (e === this.target) this.stop();
        });

        this.bot.on("entitySwingArm", (entity: Entity) => {
            if (entity === this.target) {
                this.ticksSinceTargetAttack = 0;
            }
        });
        this.bot._client.on("entity_metadata", this.checkForTargetShield.bind(this));
    }

    changeWeaponState(weapon: string): Item | null {
        const hasWeapon = this.checkForWeapon(weapon);
        if (hasWeapon) {
            this.weaponOfChoice = weapon;
            return hasWeapon;
        }
        return null;
    }

    checkForWeapon(weapon?: string): Item | null {
        if (!weapon) weapon = this.weaponOfChoice;
        const heldItem = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("hand")];
        if (heldItem?.name.includes(weapon)) {
            return heldItem;
        } else {
            const item = this.bot.util.inv.getAllItems().find((item) => item?.name.includes(weapon!));
            if (item) {
                return item;
            }
            return null;
        }
    }

    async equipWeapon(weapon: Item): Promise<boolean> {
        const heldItem = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("hand")];
        if (heldItem?.name === weapon.name) {
            return false;
        } else {
            return await this.bot.util.inv.customEquip(weapon, "hand");
            // await this.bot.util.builtInsPriority({group: "inventory", priority: 1, returnIfRunning: false}, this.bot.equip, weapon, "hand");
        }
    }

    getWeaponOfEntity(entity?: Entity): Item {
        return (entity ?? this.bot.entity)?.heldItem;
    }

    getShieldStatusOfEntity(entity?: Entity): boolean {
        entity = entity ?? this.bot.entity;
        const shieldSlot = entity.equipment[1];
        return shieldSlot?.name === "shield" && this.bot.util.entity.isOffHandActive(entity);
    }

    async checkForTargetShield(packet: any) {
        if (!this.updateForTargetShielding) return;
        if (!packet.entityId || !packet.metadata || packet.metadata.length === 0) return;
        if (!packet.metadata[0].key || packet.metadata[0].key !== 8) return;
        const entity = this.bot.entities[packet.entityId];
        if (!entity || entity !== (!!this.target ? this.target : this.lastTarget)) return;
        if (entity.equipment[1]?.name !== "shield") return;
        const boolState = packet.metadata[0].value === 3; //is offhand active
        const state = boolState ? "_axe" : "sword";
        if (!!this.target && this.ticksSinceTargetAttack >= 3 && this.ticksSinceLastSwitch >= 3) {
            const itemToChangeTo = await this.checkForWeapon(state);
            if (itemToChangeTo) {
                // await sleep(this.timeToNextAttack + 100)
                // await this.attemptAttack();
                const switched = await this.equipWeapon(itemToChangeTo);
                this.weaponOfChoice = state;
                if (switched) this.timeToNextAttack = this.meleeAttackRate.getTicks(this.getWeaponOfEntity(this.bot.entity));
            }
        }

        this.bot.emit("targetBlockingUpdate", entity, boolState);
    }

    async attack(target: Entity) {
        if (target?.id === this.target?.id) return;
        this.stop();
        this.target = target;
        if (!this.target) return;
        this.timeToNextAttack = 0;
        const itemToChangeTo = await this.checkForWeapon();
        if (itemToChangeTo) {
            const switched = await this.equipWeapon(itemToChangeTo);
        }
        this.bot.emit("startedAttacking", this.target);
    }

    stop() {
        if (!this.target) return;
        this.lastTarget = this.target;
        this.target = undefined;
        this.bot.emit("stoppedAttacking");
    }

    // per tick.
    update() {
        if (!this.target) return;
    
        this.timeToNextAttack--;
        this.ticksSinceTargetAttack++;
        this.ticksSinceLastSwitch++;
        this.checkRange();
        this.rotate();
        this.causeCritical();
        this.toggleShield();

        if (this.timeToNextAttack === -1) this.attemptAttack();
    }

    trueDistance(): number {
        if (!this.target) return 10000;
        const { x, y, z } = this.bot.entity.position.offset(0, this.bot.entity.height, 0);
        const aabb = this.bot.util.entity.getEntityAABB(this.target);
        let dx = Math.max(aabb.minX - x, 0, x - aabb.maxX);
        let dy = Math.max(aabb.minY - y, 0, y - aabb.maxY);
        let dz = Math.max(aabb.minZ - z, 0, z - aabb.maxZ);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    checkRange() {
        if (!this.target) return;
        // if (this.timeToNextAttack < 0) return;
        const dist = this.target.position.distanceTo(this.bot.entity.position);
        if (dist > this.viewDistance) return this.stop();
        const inRange = this.trueDistance() <= this.attackRange;
        if (!this.wasInRange && inRange && this.swingConfig.mode === "killaura") this.timeToNextAttack = 0;
        this.wasInRange = inRange;
    }


    async logHealth(health: number) {
        if (!this.target) return;
        const newHealth: number = await new Promise((resolve, reject) => {
            const listener = (packet: any) => {
                const entityId = packet.entityId;
                const entity = this.bot.entities[entityId];
                if (entity !== this.target) return;
                if ((packet.metadata as any[]).find((md) => md.key === 7) === -1) return;
                resolve(this.bot.util.entity.getHealthChange(packet.metadata, entity));
            };
            this.bot._client.removeListener("entity_metadata", listener);
            setTimeout(() => {
                this.bot._client.removeListener("entity_metadata", listener);
                resolve(0);
            }, 500);

            this.bot._client.prependListener("entity_metadata", listener);
        });

        health = Math.round((health + newHealth) * 100) / 100;
        if (!isNaN(health)) console.log(`Dealt ${newHealth} damage. Target ${this.target?.username} has ${health} health left.`);
    }

    async causeCritical(): Promise<boolean> {
        if (!this.critConfig.enabled || !this.target) return false;
        switch (this.critConfig.mode) {
            case "packet":
                if (this.timeToNextAttack !== -1) return false;
                if (!this.wasInRange) return false;
                // this.bot._client.write("position", { ...this.bot.entity.position, onGround: true });
                this.bot._client.write("position", { ...this.bot.entity.position.offset(0, 0.1625, 0), onGround: false });
                this.bot._client.write("position", { ...this.bot.entity.position.offset(0, 4.0e-6, 0), onGround: false });
                this.bot._client.write("position", { ...this.bot.entity.position.offset(0, 1.1e-6, 0), onGround: false });
                this.bot._client.write("position", { ...this.bot.entity.position, onGround: false });
                this.bot.entity.onGround = false;
                return true;
            case "shorthop":
                if (this.timeToNextAttack !== 1) return false;
                if (!this.bot.entity.onGround) return false;
                if (this.target.position.distanceTo(this.bot.entity.position) > this.attackRange + 1) return false;
                this.bot.entity.position = this.bot.entity.position.offset(0, 0.25, 0);
                this.bot.entity.onGround = false;
                await this.bot.waitForTicks(2);
                const { x: dx, y: dy, z: dz } = this.bot.entity.position;
                this.bot.entity.position = this.bot.entity.position.set(dx, Math.floor(dy), dz);
                return true;
            case "hop":
                if (this.timeToNextAttack !== 8) return false;
                if (!this.bot.entity.onGround) return false;
                if (this.target.position.distanceTo(this.bot.entity.position) > this.attackRange + 1) return false;
                this.bot.setControlState("jump", true);
                this.bot.setControlState("jump", false);
                return true;
            default:
                return false;
        }
    }

    async toggleShield() {
        if (this.timeToNextAttack !== 1 || !this.target || !this.wasInRange) return false;
        const shield = this.hasShield();
        const wasShieldActive = shield; //&& this.bot.util.entity.isOffHandActive()
        if (wasShieldActive && this.shieldConfig.enabled && this.shieldConfig.mode === "legit") {
            this.bot.deactivateItem();
        }

        this.bot.once("attackedTarget", async (entity) => {
            await this.bot.waitForTicks(2);
            if (wasShieldActive && this.shieldConfig.enabled && this.shieldConfig.mode === "legit") {
                this.bot.activateItem(true);
            } else if (!this.bot.util.entity.isOffHandActive() && shield && this.shieldConfig.mode === "blatant") {
                this.bot.activateItem(true);
            }
        });
        // await once(this.bot, "attackedTarget");
    }

    rotate() {
        if (!this.rotateConfig.enabled || !this.target) return false;
        const pos = this.target.position.offset(0, this.target.height, 0);
        if (this.rotateConfig.mode === "constant") {
            // this.bot.lookAt(pos, true);
            if (this.wasInRange) this.bot.util.move.forceLookAt(pos, undefined, true);
            return;
        } else {
            if (this.timeToNextAttack !== -1) return;
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

    async attemptAttack() {
        if (!this.target) return;
        if (!this.wasInRange) {
            this.timeToNextAttack = 1//this.meleeAttackRate.getTicks(this.bot.heldItem!);
            return;
        }
        let health = this.bot.util.entity.getHealth(this.target);
        console.log(health)
        attack(this.bot, this.target);
        this.logHealth(health);

        this.bot.emit("attackedTarget", this.target);

        this.timeToNextAttack = this.meleeAttackRate.getTicks(this.bot.heldItem!);
    }

    hasShield() {
        if (this.bot.supportFeature("doesntHaveOffHandSlot")) return false;
        const slot = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("off-hand")];
        if (!slot) return false;
        return slot.name.includes("shield");
    }
}

export class Cooldown {
    weaponName: string;
    x: number;
    min: number;
    max: number;
    constructor(weaponName: string, x: number, min: number, max: number) {
        this.weaponName = weaponName;
        this.x = x;
        this.min = min;
        this.max = max;
    }

    getAttackSpeed(weaponName: string) {
        if (!weaponName) return attackSpeeds.other;
        // @ts-expect-error
        return attackSpeeds[weaponName] || attackSpeeds.other;
    }

    clamp(x: number, min: number, max: number) {
        if (x < min) return min;
        if (x > max) return max;
        return x;
    }
    getCooldown(weaponName: string) {
        const speed = this.getAttackSpeed(weaponName);
        return Math.floor((1 / speed) * 20);
    }

    getDamageMultiplier(weaponName: string) {
        const speed = this.getAttackSpeed(weaponName);
        const damageMul = 0.2 + Math.pow((speed + 0.5) / ((1 / speed) * 20), 2) * 0.8;
        return this.clamp(damageMul, 0.2, 1.0);
    }
}

export class MaxDamageOffset {
    min: number;
    max: number;
    bot: Bot;
    constructor(bot: Bot, min = 0, max = 0) {
        this.bot = bot;
        this.min = min;
        this.max = max;
    }

    getTicks(item: Item) {
        const heldItem = item;
        const cooldown = Cooldown.prototype.getCooldown(!!heldItem ? heldItem.name : "other");
        const ticks = Math.floor(Math.random() * (this.max - this.min) + this.min) + cooldown;
        return Math.max(1, ticks);
    }
}
