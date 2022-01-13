import { Bot, ControlState } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
import { promisify } from "util";
import { getTargetYaw, movingAt, toRadians } from "../calc/mathUtilts";
import { attack } from "../util";
import { attackSpeeds, MaxDamageOffset } from "./sworddata";
import { CriticalsConfig, defaultConfig, FullConfig, RotateConfig, ShieldConfig, SwingBehaviorConfig } from "./swordconfigs";
import { AABBUtils } from "@nxg-org/mineflayer-util-plugin";
import { EventEmitter } from "stream";
const { getEntityAABB } = AABBUtils;
const sleep = promisify(setTimeout);
const PI = Math.PI;
const TwoPI = Math.PI * 2;
const PIOver3 = Math.PI / 3;
const Degrees_135 = toRadians(135) 

/**
 * The main pvp manager plugin class.
 */
export class SwordPvpTwo extends EventEmitter {
    public timeToNextAttack: number = 0;
    public ticksSinceTargetAttack: number = 0;
    public ticksSinceLastSwitch: number = 0;
    public wasInRange: boolean = false;
    public meleeAttackRate: MaxDamageOffset;
    public target?: Entity;
    public lastTarget?: Entity;
    public weaponOfChoice: string = "sword";
    public updateForTargetShielding: boolean = true;

    public currentStrafeDir?: ControlState;

    constructor(public bot: Bot, public options: FullConfig = defaultConfig) {
        super();
        this.meleeAttackRate = new MaxDamageOffset(this.bot);
        this.bot.on("physicsTick", this.update);
        this.bot.on("entityGone", (e) => {
            if (e === this.target) this.stop();
        });

        this.bot.on("entitySwingArm", (entity: Entity) => {
            if (entity === this.target) {
                this.ticksSinceTargetAttack = 0;
            }
        });
        this.bot._client.on("entity_metadata", this.checkForTargetShield);
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

    checkForTargetShield = async (packet: any) => {
        if (!this.updateForTargetShielding) return;
        if (!packet.entityId || !packet.metadata || packet.metadata.length === 0) return;
        if (!packet.metadata[0].key || packet.metadata[0].key !== 8) return;
        const entity = this.bot.entities[packet.entityId];
        if (!entity || entity !== (!!this.target ? this.target : this.lastTarget)) return;
        const boolState = packet.metadata[0].value === 3 && entity.equipment[1]?.name === "shield"; //is offhand active
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

        this.emit("targetBlockingUpdate", entity, boolState);
    };

    async attack(target: Entity) {
        if (target?.id === this.target?.id) return;
        this.stop();
        this.target = target;
        if (!this.target) return;
        this.timeToNextAttack = 0;
        const itemToChangeTo = await this.checkForWeapon();
        if (itemToChangeTo) await this.equipWeapon(itemToChangeTo);
        this.bot.tracker.trackEntity(target);
        this.emit("startedAttacking", this.target);
    }

    stop() {
        if (!this.target) return;
        this.lastTarget = this.target;
        this.bot.tracker.stopTrackingEntity(this.target);
        this.target = undefined;
        this.emit("stoppedAttacking");
    }

    // per tick.
    update = () => {
        if (!this.target) return;
        this.timeToNextAttack--;
        this.ticksSinceTargetAttack++;
        this.ticksSinceLastSwitch++;
        this.checkRange();
        this.rotate();
        this.doMove();
        this.doStrafe();
        this.causeCritical();
        this.toggleShield();

        if (this.timeToNextAttack === -1) {
            // const health = this.bot.util.entity.getHealth(this.target);

            this.attemptAttack();
            this.sprintTap();
            // this.logHealth(health);
        }
    };

    trueDistance(): number {
        if (!this.target) return 10000;
        return getEntityAABB(this.target).distanceTo(this.bot.entity.position.offset(0, this.bot.entity.height, 0));
    }

    checkRange() {
        if (!this.target) return;
        // if (this.timeToNextAttack < 0) return;
        const dist = this.target.position.distanceTo(this.bot.entity.position);
        if (dist > this.options.viewDistance) return this.stop();
        const inRange = this.trueDistance() <= this.options.attackRange;
        if (!this.wasInRange && inRange && this.options.swingConfig.mode === "killaura") this.timeToNextAttack = 0;
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
        if (!this.options.critConfig.enabled || !this.target) return false;
        switch (this.options.critConfig.mode) {
            case "packet":
                if (this.timeToNextAttack !== -1) return false;
                if (!this.wasInRange) return false;
                // this.bot._client.write("position", { ...this.bot.entity.position, onGround: true });
                this.bot._client.write("position", { ...this.bot.entity.position.offset(0, 0.1625, 0), onGround: false });
                this.bot._client.write("position", { ...this.bot.entity.position.offset(0, 4.0e-6, 0), onGround: false });
                this.bot._client.write("position", { ...this.bot.entity.position.offset(0, 1.1e-6, 0), onGround: false });
                this.bot._client.write("position", { ...this.bot.entity.position, onGround: false });
                return true;
            case "shorthop":
                if (this.timeToNextAttack !== 1) return false;
                if (!this.bot.entity.onGround) return false;
                if (this.trueDistance() > this.options.attackRange + 1) return false;
                this.bot.entity.position = this.bot.entity.position.offset(0, 0.25, 0);

                this.bot.entity.onGround = false;
                await this.bot.waitForTicks(2);
                const { x: dx, y: dy, z: dz } = this.bot.entity.position;
                this.bot.entity.position = this.bot.entity.position.set(dx, Math.floor(dy), dz);
                return true;
            case "hop":
                if (this.timeToNextAttack > 8) return false;
                if (this.timeToNextAttack === 8) {
                    if (!this.bot.entity.onGround) return false;
                    if (this.trueDistance() > this.options.attackRange + 1) return false;
                    this.bot.setControlState("jump", true);
                    this.bot.setControlState("jump", false);
                    if (!this.wasInRange) {
                        this.bot.setControlState("forward", true);
                    }
                } else {
                    if (!this.wasInRange) {
                        this.bot.setControlState("forward", true);
                    }
                }
                return true;
            default:
                return false;
        }
    }

    async doMove() {
        if (!this.target) {
            this.bot.setControlState("forward", false);
            this.bot.setControlState("back", false);
            this.bot.setControlState("left", false);
            this.bot.setControlState("right", false);
            return;
        }

        const truth = this.trueDistance() < 3.0 ? "back" : "forward";
        const falsy = this.trueDistance() > 2.9 ? "back" : "forward";
        this.bot.setControlState(truth, true);
        this.bot.setControlState(falsy, false);
        this.bot.setControlState("sprint", true);
    }

    async doStrafe() {
        if (!this.target) {
            if (this.currentStrafeDir) {
                this.bot.setControlState(this.currentStrafeDir, false)
                this.currentStrafeDir = undefined;
            }
            return false;
        }
        if (!this.options.strafeConfig.enabled) return false;
        const diff = getTargetYaw(this.target.position, this.bot.entity.position) - this.target.yaw;
        const staringDirection = diff < 0 ? "right" : "left";
        const shouldMove = Math.abs(diff) < PIOver3;
        if (staringDirection !== this.currentStrafeDir) {
            if (this.currentStrafeDir) this.bot.setControlState(this.currentStrafeDir, false);
        }
        if (shouldMove) {
            this.currentStrafeDir = staringDirection;
            this.bot.setControlState(staringDirection, true);
        } else {
            this.bot.setControlState(staringDirection, false);
            this.currentStrafeDir = undefined;
        }
    }

    async sprintTap() {
        if (!this.target) return;
        if (!this.bot.entity.onGround) return false;
        if (!this.wasInRange) return false;
        if (!this.options.tapConfig.enabled) return false;
        const forward = this.bot.getControlState("forward")
        const sprint = this.bot.getControlState("sprint")
        switch (this.options.tapConfig.mode) {
            case "wtap":

                this.bot.setControlState("forward", false);
                this.bot.setControlState("sprint", false);
                if (forward) this.bot.setControlState("forward", true);
                if (sprint) this.bot.setControlState("sprint", true);
                break;
            case "stap":
                const back = this.bot.getControlState("forward")
                this.bot.setControlState("forward", false);
                this.bot.setControlState("sprint", false);
                this.bot.setControlState("back", true);

                while (this.trueDistance() < this.options.attackRange + 1) {
                    const test = movingAt(
                        this.target.position,
                        this.bot.entity.position,
                        this.bot.tracker.getEntitySpeed(this.target),
                        PIOver3
                    );
                    if (!test && this.wasInRange) break;
                    await this.bot.waitForTicks(1);
                }
                this.bot.setControlState("back", false);
                if (forward) this.bot.setControlState("forward", true);
                if (sprint) this.bot.setControlState("sprint", true);
                break;
            default:
                console.log("shit" + this.options.tapConfig.mode)
        }
    }

    async toggleShield() {
        if (this.timeToNextAttack !== 0 || !this.target || !this.wasInRange) return false;
        const shield = this.hasShield();
        const wasShieldActive = shield; //&& this.bot.util.entity.isOffHandActive()
        // console.log(wasShieldActive, this.options.shieldConfig.enabled, this.options.shieldConfig.mode === "legit")
        if (wasShieldActive && this.options.shieldConfig.enabled && this.options.shieldConfig.mode === "legit") {
            this.bot.deactivateItem();
        }

        this.once("attackedTarget", async (entity) => {
            await this.bot.waitForTicks(3);
            if (wasShieldActive && this.options.shieldConfig.enabled && this.options.shieldConfig.mode === "legit") {
                this.bot.activateItem(true);
            } else if (!this.bot.util.entity.isOffHandActive() && shield && this.options.shieldConfig.mode === "blatant") {
                this.bot.activateItem(true);
            }
        });
        // await once(this.bot, "attackedTarget");
    }

    rotate() {
        if (!this.options.rotateConfig.enabled || !this.target) return false;
        const pos = this.target.position.offset(0, this.target.height, 0);
        if (this.options.rotateConfig.mode === "constant") {
            // this.bot.lookAt(pos, true);
            //if (this.wasInRange)
             this.bot.util.move.forceLookAt(pos, undefined, true);
            return;
        } else {
            if (this.timeToNextAttack !== -1) return;
            switch (this.options.rotateConfig.mode) {
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
            this.timeToNextAttack = 1; //this.meleeAttackRate.getTicks(this.bot.heldItem!);
            return;
        }

        attack(this.bot, this.target);

        this.emit("attackedTarget", this.target);

        this.timeToNextAttack = this.meleeAttackRate.getTicks(this.bot.heldItem!);
    }

    hasShield() {
        if (this.bot.supportFeature("doesntHaveOffHandSlot")) return false;
        const slot = this.bot.inventory.slots[this.bot.getEquipmentDestSlot("off-hand")];
        if (!slot) return false;
        return slot.name.includes("shield");
    }
}

export class SwordPVPMovement {
    private moving: boolean;
    private currentStrafeDir?: ControlState;
    private target?: Entity;
    constructor(private bot: Bot) {
        this.moving = false;
    }

    //manually called.
    calcStrafe(target: Entity): { [movement: string]: boolean } {
        const diff = getTargetYaw(target.position, this.bot.entity.position) - target.yaw;
        const obj: { [movement: string]: boolean } = {};
        const staringDirection = diff < 0 ? "right" : "left";
        const shouldMove = Math.abs(diff) < PIOver3;
        if (staringDirection !== this.currentStrafeDir) {
            if (this.currentStrafeDir) obj[this.currentStrafeDir] = false;
        }
        if (shouldMove) {
            obj[staringDirection] = true;
            this.currentStrafeDir = staringDirection;
        } else {
            obj[staringDirection] = false;
            this.currentStrafeDir = undefined;
        }

        return obj;
    }

    //manually called.
    async sprintTap(mode: string) {
        if (!this.bot.entity.onGround) return false;
        switch (mode) {
            case "wtap":
                this.bot.setControlState("sprint", false);
                this.bot.setControlState("sprint", true);
                break;
            case "stap":
                this.bot.setControlState("forward", false);
                this.bot.setControlState("sprint", false);
                this.bot.setControlState("back", true);
                this.bot.setControlState("back", false);
                this.bot.setControlState("forward", true);
                this.bot.setControlState("sprint", true);
        }
    }

    //manually called.
    public follow(target: Entity, mode: string) {
        switch (mode) {
            case "lineOfSight":
        }
    }

    public stop() {}
}

export class ShieldControl extends EventEmitter {
    public trackingEntities: { [entityId: number]: [Entity, boolean] } = {};
    constructor(private bot: Bot) {
        super();
    }

    trackEntity(entity: Entity) {
        this.trackingEntities[entity.id] ??= [entity, this.checkIfShielding(entity)];
    }

    stopTrackingEntity(entity: Entity) {
        delete this.trackingEntities[entity.id];
    }

    checkIfShielding(entity: Entity) {
        return entity.equipment[1]?.name === "shield" && (entity.metadata[8] as any).value === 3;
    }

    shieldCheck = async (packet: any) => {
        if (!packet.entityId || !packet.metadata || packet.metadata.length === 0) return;
        if (!packet.metadata[0].key || packet.metadata[0].key !== 8) return;
        const entity = this.bot.entities[packet.entityId];
        if (Object.values(this.trackingEntities).find((info) => info[0] === entity)) return; //this should work.
        if (entity.equipment[1]?.name !== "shield") return;
        const boolState = this.checkIfShielding(entity);
        this.trackingEntities[entity.id][1] = boolState;
        this.emit("targetBlockingUpdate", entity, boolState);
    };

    isShieldEffective(entity: Entity) {
        return Math.abs(getTargetYaw(entity.position, this.bot.entity.position) - entity.yaw) < Degrees_135
    }
}
