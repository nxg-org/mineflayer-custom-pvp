import { AABB } from "../../../utilplugin";
import {Vec3} from "vec3"

export function getEntityAABB(entity: { position: Vec3; height: number, width?: number}): AABB {
    const w = entity.width ?? (entity.height / 2);
    const { x, y, z } = entity.position;
    return new AABB(-w, 0, -w, w, entity.height, w).offset(x, y, z);
}