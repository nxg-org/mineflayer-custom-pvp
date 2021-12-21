import { AABB } from "@nxg-org/mineflayer-util-plugin"
import {Vec3} from "vec3"

export function getEntityAABB(entity: { position: Vec3; height: number, width?: number, name?: string}): AABB {
    let h, w;
    if (entity.name === "player") {
        h = 1.8
        w = 0.3
    } else {
        h = entity.height
        w = entity.width ?? (entity.height / 2);
    }
    const { x, y, z } = entity.position;
    return new AABB(-w, 0, -w, w, h, w).offset(x, y, z);
}