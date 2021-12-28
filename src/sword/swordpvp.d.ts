import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Item } from "prismarine-item";
/**
 * The main pvp manager plugin class.
 */
export declare const attackSpeeds: {
    wooden_sword: number;
    golden_sword: number;
    stone_sword: number;
    iron_sword: number;
    diamond_sword: number;
    netherite_sword: number;
    trident: number;
    wooden_shovel: number;
    golden_shovel: number;
    stone_shovel: number;
    iron_shovel: number;
    diamond_shovel: number;
    netherite_shovel: number;
    wooden_pickaxe: number;
    golden_pickaxe: number;
    stone_pickaxe: number;
    iron_pickaxe: number;
    diamond_pickaxe: number;
    netherite_pickaxe: number;
    wooden_axe: number;
    golden_axe: number;
    stone_axe: number;
    iron_axe: number;
    diamond_axe: number;
    netherite_axe: number;
    wooden_hoe: number;
    golden_hoe: number;
    stone_hoe: number;
    iron_hoe: number;
    diamond_hoe: number;
    netherite_hoe: number;
    other: number;
};
export interface CriticalsConfig {
    enabled: boolean;
    mode: "packet" | "shorthop" | "hop";
}
export interface ShieldConfig {
    enabled: boolean;
    mode: "legit" | "blatant";
}
export interface RotateConfig {
    enabled: boolean;
    mode: "legit" | "instant" | "constant" | "silent" | "ignore";
}
export declare class SwordPvp {
    bot: Bot;
    timeToNextAttack: number;
    ticksSinceTargetAttack: number;
    ticksSinceLastSwitch: number;
    wasInRange: boolean;
    viewDistance: number;
    attackRange: number;
    meleeAttackRate: MaxDamageOffset;
    critConfig: CriticalsConfig;
    shieldConfig: ShieldConfig;
    rotateConfig: RotateConfig;
    target?: Entity;
    lastTarget?: Entity;
    weaponOfChoice: string;
    metadataSlot: number;
    updateForTargetShielding: boolean;
    constructor(bot: Bot);
    changeWeaponState(weapon: string): Item | null;
    checkForWeapon(weapon?: string): Item | null;
    equipWeapon(weapon: Item): Promise<boolean>;
    getWeaponOfEntity(entity?: Entity): Item;
    getShieldStatusOfEntity(entity?: Entity): boolean;
    checkForTargetShield(packet: any): Promise<void>;
    attack(target: Entity): Promise<void>;
    stop(): void;
    update(): void;
    trueDistance(): number;
    checkRange(): void;
    getHealth(metadata: object[]): number;
    logHealth(health: number): Promise<void>;
    causeCritical(): Promise<boolean>;
    toggleShield(): Promise<false | undefined>;
    rotate(): false | undefined;
    attemptAttack(): Promise<void>;
    hasShield(): boolean;
}
export declare class Cooldown {
    weaponName: string;
    x: number;
    min: number;
    max: number;
    constructor(weaponName: string, x: number, min: number, max: number);
    getAttackSpeed(weaponName: string): any;
    clamp(x: number, min: number, max: number): number;
    getCooldown(weaponName: string): number;
    getDamageMultiplier(weaponName: string): number;
}
export declare class MaxDamageOffset {
    min: number;
    max: number;
    bot: Bot;
    constructor(bot: Bot, min?: number, max?: number);
    getTicks(item: Item): number;
}
