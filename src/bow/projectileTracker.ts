import { Bot } from "mineflayer";
import { BasicShotInfo, projectileGravity, ShotFactory, trajectoryInfo, InterceptFunctions } from "@nxg-org/mineflayer-trajectories";
import type { Entity } from "prismarine-entity";
import type { Block } from "prismarine-block";
import type { Vec3 } from "vec3";

type InfoBoundToEntity = { entity: Entity; info: BasicShotInfo };
const knownProjectiles = Object.keys(projectileGravity);
const knownWeapons = Object.keys(trajectoryInfo);

export class ProjectileTracker {
    private intercepter: InterceptFunctions;

    constructor(private bot: Bot) {
        this.intercepter = new InterceptFunctions(bot);
    }

    getIncomingArrow(): InfoBoundToEntity | null {
        const arrowInfos = this.getIncomingArrows();
        return arrowInfos.sort((a, b) => a.entity.position.distanceTo(this.bot.entity.position) - b.entity.position.distanceTo(this.bot.entity.position))[0] ?? null;
    }

    getIncomingArrows(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.6 };
        for (const entity of Object.values(this.bot.entities).filter((e) => e.name?.includes("arrow"))) {
            // assuming stopped.
            const init = ShotFactory.fromEntity(entity, this.intercepter);
            const info = init.hitsEntity(aabbComponents);
            if (!!info) hittingArrows.push({ entity, info: info.shotInfo });
        }
        return hittingArrows;
    }

    getIncomingProjectiles(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.6 };
        for (const entity of Object.values(this.bot.entities).filter((e) => knownProjectiles.includes(e.name!))) {
            // assuming stopped.
            const init = ShotFactory.fromEntity(entity, this.intercepter);
            const info = init.hitsEntity(aabbComponents);
            if (!!info && info.shotInfo.nearestDistance === 0) hittingArrows.push({ entity, info: info.shotInfo });
        }
        return hittingArrows;
    }

    getHighestPriorityProjectile(doesDamage: boolean = true): InfoBoundToEntity | null {
        const projs = this.getIncomingProjectiles();
        if (doesDamage) {
            return (
                projs
                    .filter((p) => ["arrow", "firework_rocket", "trident"].includes(p.entity.name!))
                    .sort((a, b) => a.entity.position.distanceTo(this.bot.entity.position) - b.entity.position.distanceTo(this.bot.entity.position))[0] ?? null
            );
        } else {
            return projs.sort((a, b) => a.entity.position.distanceTo(this.bot.entity.position) - b.entity.position.distanceTo(this.bot.entity.position))[0] ?? null;
        }
    }

    allProjectileInfo(): { entity: Entity; info: { block: Block | null; hitPos: Vec3 | null; totalTicks: number } }[] {
        const hittingArrows = [];
        const entities = Object.values(this.bot.entities);
        for (const entity of Object.values(this.bot.entities).filter((e) => knownProjectiles.includes(e.name!) && !e.onGround)) {
            // assuming stopped.
            const init = ShotFactory.fromEntity(entity, this.intercepter);
            const info = init.calcToIntercept(true, entities);
            hittingArrows.push({ entity, info });
        }
        return hittingArrows;
    }

    getMobsAimingAtBot(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.6 };
        for (const entity of Object.values(this.bot.entities).filter(
            (e) => e.name === ("skeleton" || e.name === "piglin") && e.heldItem?.name.includes("bow")
        )) {
            const init = ShotFactory.fromMob(entity, this.intercepter);
            const info = init.hitsEntity(aabbComponents);
            if (!!info) hittingArrows.push({ entity, info: info.shotInfo });
        }
        return hittingArrows;
    }

    //TODO: Make aim dynamic by reading heldItem metadata.
    getPlayersAimingAtBot(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.6 };
        for (const entity of Object.values(this.bot.entities).filter((e) => e.type === "player" && e !== this.bot.entity)) {
            if (knownWeapons.includes(entity.heldItem?.name)) {
                const init = ShotFactory.fromPlayer(entity, this.intercepter);
                const info = init.hitsEntity(aabbComponents);
                if (!!info) hittingArrows.push({ entity, info: info.shotInfo });
            }
        }
        return hittingArrows;
    }

    getAimingEntities(): InfoBoundToEntity[] {
        return this.getMobsAimingAtBot().concat(this.getPlayersAimingAtBot());
    }

    getHighestPriorityEntity(): InfoBoundToEntity | null {
        return this.getAimingEntities().sort((a, b) => a.info.totalTicks - b.info.totalTicks)[0] ?? null;
    }

    getShotDestination(entity: Entity): { entity: Entity; shotInfo: BasicShotInfo }[] | null {
        if (knownWeapons.includes(entity.heldItem?.name ?? entity.equipment[1]?.name)) {
            let shot;
            switch (entity.type) {
                case "player":
                    shot = ShotFactory.fromPlayer(entity, this.intercepter);
                    break;
                case "mob":
                    shot = ShotFactory.fromMob(entity, this.intercepter);
                    break;
                default:
                    throw `Invalid entity type: ${entity.type}`;
            }
            const info = shot.hitsEntities(
                true,
                ...Object.values(this.bot.entities).filter((e) => (e.type === "player" || e.type === "mob") && entity !== e)
            );
            return info as { entity: Entity; shotInfo: BasicShotInfo }[];
        }
        return null;
    }

    getProjectileDestination(entity: Entity): { entity: Entity; shotInfo: BasicShotInfo }[] | null {
        if (entity.name! in knownProjectiles) {
            let shot = ShotFactory.fromEntity(entity, this.intercepter);
            const info = shot.hitsEntities(
                true,
                ...Object.values(this.bot.entities).filter((e) => e.type === "player" || e.type === "mob")
            );
            return info as { entity: Entity; shotInfo: BasicShotInfo }[];
        }
        return null;
    }
}
