import { Bot } from "mineflayer";
import { BasicShotInfo, projectileGravity, ShotFactory, trajectoryInfo } from "@nxg-org/mineflayer-trajectories";
import { InterceptFunctions, AABB } from "@nxg-org/mineflayer-util-plugin";
import { getEntityAABB } from "../calc/aabbUtils";
import { Entity } from "prismarine-entity";
import { Block } from "prismarine-block";
import { Vec3 } from "vec3";

type InfoBoundToEntity = { entity: Entity; info: BasicShotInfo };

export class ProjectileTracker {
    private intercepter: InterceptFunctions;

    constructor(private bot: Bot) {
        this.intercepter = new InterceptFunctions(bot);
    }

    getIncomingArrow(): InfoBoundToEntity | null {
        const arrowInfos = this.getIncomingArrows();
        return arrowInfos.sort((a, b) => a.info.totalTicks - b.info.totalTicks)[0] ?? null
    }

    getIncomingArrows(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.3 };
        for (const entity of Object.values(this.bot.entities).filter((e) => e.name?.includes("arrow"))) {
            const init = ShotFactory.fromEntity(entity, this.intercepter);
            const info = init.hitsEntity(aabbComponents);
            if (!!info) hittingArrows.push({ entity, info });
        }
        return hittingArrows;
    }

    getIncomingProjectiles(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.3 };
        const knownProjectiles = Object.keys(projectileGravity);
        for (const entity of Object.values(this.bot.entities).filter((e) => knownProjectiles.includes(e.name ?? "nope"))) {
            const init = ShotFactory.fromEntity(entity, this.intercepter);
            const info = init.hitsEntity(aabbComponents);
            if (!!info) hittingArrows.push({ entity, info });
        }
        return hittingArrows;
    }

    getHighestPriorityProjectile(): InfoBoundToEntity {
        return this.getIncomingProjectiles().sort((a, b) => a.info.totalTicks - b.info.totalTicks)[0] ?? null
    }

    allProjectileInfo(): { entity: Entity; info: { block: Block | null; hitPos: Vec3 | null; totalTicks: number } }[] {
        const hittingArrows = [];
        const entities = Object.values(this.bot.entities);
        const knownProjectiles = Object.keys(projectileGravity);
        for (const entity of Object.values(this.bot.entities).filter((e) => knownProjectiles.includes(e.name ?? "nope"))) {
            const init = ShotFactory.fromEntity(entity, this.intercepter);
            const info = init.calcToIntercept(true, entities);
            hittingArrows.push({ entity, info });
        }
        return hittingArrows;
    }


    getAimingMobs(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.3 };
        for (const entity of Object.values(this.bot.entities).filter((e) => e.name === "skeleton" || e.name === "piglin" && e.heldItem?.name.includes("bow"))) {
            const init = ShotFactory.fromMob(entity, this.intercepter);
            const info = init.hitsEntity(aabbComponents)
            if (!!info) hittingArrows.push({ entity, info });
        }
        return hittingArrows;
    }

    //TODO: Make aim dynamic by reading heldItem metadata.
    getAimingPlayers(): InfoBoundToEntity[] {
        const hittingArrows = [];
        const aabbComponents = { position: this.bot.entity.position, height: this.bot.entity.height + 0.18, width: 0.3 };
        const knownWeapons = Object.keys(trajectoryInfo);
        for (const entity of Object.values(this.bot.entities).filter(e => e.type === "player" && e !== this.bot.entity)) {
            if (knownWeapons.includes(entity.heldItem?.name ?? entity.equipment[1]?.name)) {
                const init = ShotFactory.fromPlayer(entity, this.intercepter);
                const info = init.hitsEntity(aabbComponents)
                if (!!info) hittingArrows.push({ entity, info });
            }
        }
        return hittingArrows;
    }

    getAimingEntities(): InfoBoundToEntity[] {
        return this.getAimingMobs().concat(this.getAimingPlayers())
    }

    getHighestPriorityEntity(): InfoBoundToEntity | null {
        return this.getAimingEntities().sort((a, b) => a.info.totalTicks - b.info.totalTicks)[0] ?? null
    }

}
