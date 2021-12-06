import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { HawkEyeEquations } from "./calc/hawkEyeEquations";
import { promisify } from "util";
import { CustomHawkEyeEquations } from "./calc/customHawkEyeEquations";
import { toNotchianPitch, toNotchianYaw } from "../calc/conversions";
const sleep = promisify(setTimeout);

export class HawkEye {
    target: Entity | null = null;
    lastTarget: Entity | null = null;
    stopped: boolean;
    bot: Bot;
    preparingShot: boolean;
    preparingShotTime: number;
    prevPlayerPositions: any[] = [];
    prevBotPositions: any[] = [];
    oneShot: boolean;
    chargingArrow: boolean;
    weapon: string = "bow";
    infoShot: any;
    equations: HawkEyeEquations;
    customEquations: CustomHawkEyeEquations;
    detectIncomingShot: boolean;
    isAimedAt: boolean;
    private isOffHand: boolean;
    constructor(bot: Bot) {
        this.bot = bot;
        this.stopped = false;
        this.preparingShot = false;
        this.preparingShotTime = Date.now();
        this.oneShot = false;
        this.chargingArrow = false;
        this.equations = new HawkEyeEquations(this.bot);
        this.customEquations = new CustomHawkEyeEquations(this.bot);
        this.detectIncomingShot = true;
        this.isAimedAt = false;
        this.isOffHand = false;
        this.bot.on("physicsTick", this.detectIncomingShotCalc.bind(this));
    }

    hasWeapon(weapon?: string) {
        weapon = weapon ?? this.weapon;
        return !!this.bot.util.inv.getAllItems().find((item) => item?.name.includes(weapon ?? ""));
    }

    hasAmmo(weapon?: string) {
        weapon = weapon ?? this.weapon;
        switch (weapon) {
            case "bow":
                return !!this.bot.inventory.items().find((item) => item.name.includes("arrow"));
            case "crossbow":
                return !!this.bot.inventory.items().find((item) => item.name?.includes("arrow") || item.name?.includes("firework"));
            default:
                return !!this.bot.inventory.items().find((item) => item.name.includes(weapon!));
        }
    }

    useHand = (hand?: boolean) => {
        return hand ?? this.isOffHand ? "off-hand" : "hand";
    };

    getPlayer(bot: any, playername = null) {
        const playerEntity = Object.keys(bot.entities)
            .map((id) => bot.entities[id])
            .find(function (entity) {
                if (entity.type === "player") {
                    if (playername === null) {
                        return true;
                    }
                    if (entity.username === playername) {
                        return true;
                    }
                }
                return false;
            });
        return playerEntity;
    }

    async simplyShot(yaw?: number, grade?: number, weapon?: string) {
        if (!yaw) yaw = this.bot.player.entity.yaw;
        if (!grade) grade = this.bot.player.entity.pitch;
        if (weapon) this.weapon = weapon;
        await this.checkForWeapon();
        this.preparingShotTime = Date.now();
        await this.bot.look(yaw, grade, true);
        if (this.preparingShot) return;
        this.preparingShot = true;
        this.bot.activateItem();
        console.log("charging");
        while (Date.now() - this.preparingShotTime < 1200) await sleep(0);
        console.log("firing");
        this.bot.deactivateItem();
        this.preparingShot = false;
    }

    async checkForWeapon() {
        const usedHand = this.useHand();
        const otherHand = this.useHand(!this.isOffHand);
        const slot = this.bot.inventory.slots[this.bot.getEquipmentDestSlot(usedHand)];
        if (!!slot && !slot.name.includes(this.weapon)) {
            const foundItem = [...this.bot.inventory.items(), this.bot.inventory.slots[this.bot.getEquipmentDestSlot(otherHand)]].find(
                (item) => item?.name.includes(this.weapon)
            );
            if (!foundItem) return;
            // await this.bot.unequip(usedHand);
            await this.bot.util.inv.customEquip(foundItem, usedHand);
        }
    }

    attack(targetToAttack: Entity, offhand = false, inputWeapon = "bow", isOneShot = false) {
        if (this.target?.id === targetToAttack.id) return false;
        this.checkForWeapon();
        this.stopped = false;
        this.target = targetToAttack;
        this.oneShot = isOneShot;

        this.preparingShot = false;
        this.prevPlayerPositions = [];
        this.prevBotPositions = [];
        this.weapon = inputWeapon;
        this.isOffHand = offhand;
        this.bot.on("physicsTick", this.getGrades);
        this.bot.on("physicsTick", this.autoCalc);
        return true;
    }

    stop() {
        if (this.stopped) return;
        this.stopped = true;
        this.preparingShot = false;
        this.lastTarget = this.target;
        this.target = null;
        this.bot.removeListener("physicsTick", this.getGrades);
        this.bot.removeListener("physicsTick", this.autoCalc);
        if (this.preparingShot) this.bot.util.move.forceLook(this.infoShot.yaw, this.infoShot.pitch)
        this.bot.deactivateItem();
    }

    getGrades = () => {
        if (!this.target || !this.target.isValid || !this.hasAmmo(this.weapon) || !this.hasWeapon(this.weapon)) {
            this.stop();
            return;
        }

        // const speed = this.target.velocity

        if (this.prevPlayerPositions.length > 10) {
            this.prevPlayerPositions.shift();
        }

        const position = this.target.position.clone();

        this.prevPlayerPositions.push(position);

        const speed = {
            x: 0,
            y: 0,
            z: 0,
        };

        for (let i = 1; i < this.prevPlayerPositions.length; i++) {
            const pos = this.prevPlayerPositions[i];
            const prevPos = this.prevPlayerPositions[i - 1];
            speed.x += pos.x - prevPos.x;
            speed.y += pos.y - prevPos.y;
            speed.z += pos.z - prevPos.z;
        }

        speed.x = speed.x / this.prevPlayerPositions.length;
        speed.y = speed.y / this.prevPlayerPositions.length;
        speed.z = speed.z / this.prevPlayerPositions.length;

        this.infoShot = this.equations.getMasterGrade(this.target, speed, this.weapon);
    };

    getIncomingTrajectory = (entity: Entity | null) => {
        if (!entity || !entity.isValid) return false;

        if (this.prevBotPositions.length > 10) this.prevBotPositions.shift();

        const position = this.bot.entity.position.clone();

        this.prevBotPositions.push(position);

        const speed = { x: 0, y: 0, z: 0 };

        for (let i = 1; i < this.prevBotPositions.length; i++) {
            const pos = this.prevBotPositions[i];
            const prevPos = this.prevBotPositions[i - 1];
            speed.x += pos.x - prevPos.x;
            speed.y += pos.y - prevPos.y;
            speed.z += pos.z - prevPos.z;
        }

        speed.x = speed.x / this.prevBotPositions.length;
        speed.y = speed.y / this.prevBotPositions.length;
        speed.z = speed.z / this.prevBotPositions.length;
        return this.customEquations.predictShotBetweenTwoEntities(entity, this.bot.entity, speed, entity.heldItem?.name);
    };

    autoCalc = async () => {

        let waitTime;
        switch (this.weapon) {
            case "bow":
            case "trident":
                waitTime = 1200;
                break;
            case "snowball":
            case "ender_pearl":
            case "egg":
            case "splash_potion":
                waitTime = 150;
                break;
            default:
                waitTime = 1200;
        }
        const item = this.bot.inventory.slots[this.bot.getEquipmentDestSlot(this.useHand())];
        if (!item || item.name !== this.weapon) {
            const weaponFound = this.bot.inventory.items().find((item) => item.name === this.weapon);
            if (!!weaponFound) {
                try {
                    await this.bot.equip(weaponFound, "hand");
                    return;
                } catch (err) {
                    await sleep(500);
                    return;
                }
            } else {
                this.stop();
                return;
            }
        }



        if (!this.preparingShot) {
            if (["bow", "crossbow", "trident"].includes(this.weapon)) {
                this.bot.activateItem();
            }
            this.preparingShot = true;
            this.preparingShotTime = Date.now();
        }

        if (this.infoShot) {


            if (this.preparingShot) {
                this.bot.util.move.forceLook(this.infoShot.yaw, this.infoShot.pitch)
                if (["bow", "trident"].includes(this.weapon) && Date.now() - this.preparingShotTime > waitTime) {                    
                    this.bot.util.move.forceLook(this.infoShot.yaw, this.infoShot.pitch)
                    // await this.bot.look(this.infoShot.yaw, this.infoShot.pitch, true);
                    this.bot.deactivateItem();
                    this.preparingShot = false;
                    if (this.oneShot) {
                        this.stop();
                    }
                }

                if (
                    ["snowball", "ender_pearl", "egg", "splash_potion"].includes(this.weapon) &&
                    Date.now() - this.preparingShotTime > waitTime
                ) {
                    this.bot.swingArm(undefined);
                    this.bot.activateItem();
                    this.bot.deactivateItem();
                    this.preparingShot = false;
                    if (this.oneShot) {
                        this.stop();
                    }
                }

                if (this.weapon === "crossbow") {
                    this.shotCrossbow();
                }
            }
        }
    };

    detectIncomingShotCalc() {

        //check if entity is holding a bow + aiming at entity
        let buffer = 0;
        // console.log(`AIMED AT?: ${this.isAimedAt}`)
        const entity = this.target ?? this.lastTarget;
        if (!entity || !this.detectIncomingShot) {
            this.isAimedAt = false;
            return;
        }
        const info = this.getIncomingTrajectory(entity);
        if (!!info) {
            const { pitch, yaw, blockInTrayect, nearestDistance, closestArrowPoint } = info;
            // if (debug) console.log(func(entity.pitch, pitch), func(entity.yaw, yaw), nearestDistance, target, !blockInTrayect, isAimed, buffer);
            if (
                nearestDistance < 3 &&
                !blockInTrayect &&
                !!closestArrowPoint &&
                [0, 1].some((hand) => entity.equipment[hand]?.name === "bow")
            ) {
                // if (!isAimed) kill.bot.chat(`Bow aimed at me! Distance is: ${Math.round(nearestDistance * 100) / 100}`);
                this.isAimedAt = true;
                buffer = 0;
            } else if (++buffer > 20) this.isAimedAt = false;
        } else this.isAimedAt = false;
    }

    shotCrossbow() {
        if (this.chargingArrow) {
            this.bot.activateItem();
            this.bot.deactivateItem();
            this.chargingArrow = false;
            this.preparingShot = false;
            if (this.oneShot) {
                this.stop();
            }
            return;
        }
        const hand = this.bot.inventory.slots[this.bot.getEquipmentDestSlot(this.useHand())];
        if (!hand) {
            this.stop();
            return;
        }

        const isEnchanted = hand.enchants ? hand.enchants.find((enchant) => enchant.name === "quick_charge") : undefined;
        const shotIn = 1250 - (isEnchanted ? isEnchanted.lvl : 0) * 250;

        if (this.weapon === "crossbow" && !this.chargingArrow && Date.now() - this.preparingShotTime > shotIn) {
            this.bot.deactivateItem();
            this.chargingArrow = true;
        }
    }
}
