import { AABB } from "@nxg-org/mineflayer-util-plugin";
import { Vec3 } from "vec3";
export declare function getEntityAABB(entity: {
    position: Vec3;
    height: number;
    width?: number;
    name?: string;
}): AABB;
