import { Bot } from "mineflayer";
import { Block } from "prismarine-block";
import { Vec3 } from "vec3";

export class InterceptEquations {
    constructor(public bot: Bot) {}

    //Old ver grabs range between the two + direction from... from to... to.
    //calls raycast.
    check(from: Vec3, to: Vec3) {
        //old code:
        const range = from.distanceTo(to);
        const direction = to.minus(from).normalize();
        if (isNaN(range)) return {block: null, iterations: []};
        return this.raycast(from, direction, range);
    }
    raycast(from: Vec3, direction: Vec3, range: number) {
        const iterations: (typeof pos)[] = [];
        const iter = new RaycastIterator(from, direction, range);
        let pos = iter.next();
        while (pos) {
            iterations.push(pos);
            const position = new Vec3(pos.x, pos.y, pos.z);
            const block = this.bot.blockAt(position);
            if (block) {
                const intersect = iter.intersect(block.shapes as any, position);
                if (intersect) {
                    return {
                        block,
                        iterations,
                    };
                }
            }
            pos = iter.next();
            if (range > 20 || (iterations.length >= 1000 && iterations.length % 1000 === 0)){
                // console.trace("too much");
                console.log(from, direction, range, iterations, block, position, pos);
            }
            // console.log(range, iterations.length);
        }

        return {
            block: null,
            iterations,
        };
    }
}
enum BlockFace {
    UNKNOWN = -999,
    BOTTOM = 0,
    TOP = 1,
    NORTH = 2,
    SOUTH = 3,
    WEST = 4,
    EAST = 5,
}

class RaycastIterator {
    block: { x: number; y: number; z: number; face: number };
    blockVec: Vec3;
    pos: Vec3;
    dir: Vec3;
    invDirX: number;
    invDirY: number
    invDirZ: number;
    stepX: number;
    stepY: number;
    stepZ: number;
    tDeltaX: number;
    tDeltaY: number;
    tDeltaZ: number;
    tMaxX: number;
    tMaxY: number;
    tMaxZ: number;
    maxDistance: number;
    constructor(pos: Vec3, dir: Vec3, maxDistance: number) {
        this.block = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z),
            face: BlockFace.UNKNOWN,
        };

        this.blockVec = new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))

    
        this.pos = pos;
        this.dir = dir;

        this.invDirX = dir.x === 0 ? Number.MAX_VALUE : 1 / dir.x;
        this.invDirY = dir.y === 0 ? Number.MAX_VALUE : 1 / dir.y;
        this.invDirZ = dir.z === 0 ? Number.MAX_VALUE : 1 / dir.z;

        this.stepX = Math.sign(dir.x);
        this.stepY = Math.sign(dir.y);
        this.stepZ = Math.sign(dir.z);

        this.tDeltaX = dir.x === 0 ? Number.MAX_VALUE : Math.abs(1 / dir.x);
        this.tDeltaY = dir.y === 0 ? Number.MAX_VALUE : Math.abs(1 / dir.y);
        this.tDeltaZ = dir.z === 0 ? Number.MAX_VALUE : Math.abs(1 / dir.z);

        this.tMaxX = dir.x === 0 ? Number.MAX_VALUE : Math.abs((this.block.x + (dir.x > 0 ? 1 : 0) - pos.x) / dir.x);
        this.tMaxY = dir.y === 0 ? Number.MAX_VALUE : Math.abs((this.block.y + (dir.y > 0 ? 1 : 0) - pos.y) / dir.y);
        this.tMaxZ = dir.z === 0 ? Number.MAX_VALUE : Math.abs((this.block.z + (dir.z > 0 ? 1 : 0) - pos.z) / dir.z);

        this.maxDistance = maxDistance;
    }

    // Returns null if none of the shapes is intersected, otherwise returns intersect pos and face
    // shapes are translated by offset
    //[x0: number,y0: number,z0: number,x1:number,y1:number,z1:number][]
    intersect(shapes: [x0: BlockFace,y0: BlockFace,z0: BlockFace,x1:BlockFace,y1:BlockFace,z1:BlockFace][], offset: Vec3) {
        // Shapes is an array of shapes, each in the form of: [x0, y0, z0, x1, y1, z1]
        let t = Number.MAX_VALUE;
        let f = BlockFace.UNKNOWN;
        const p = this.pos.minus(offset);
        for (const shape of shapes) {
            let tmin = (shape[this.invDirX > 0 ? 0 : 3] - p.x) * this.invDirX;
            let tmax = (shape[this.invDirX > 0 ? 3 : 0] - p.x) * this.invDirX;
            const tymin = (shape[this.invDirY > 0 ? 1 : 4] - p.y) * this.invDirY;
            const tymax = (shape[this.invDirY > 0 ? 4 : 1] - p.y) * this.invDirY;

            let face = this.stepX > 0 ? BlockFace.WEST : BlockFace.EAST;

            if (tmin > tymax || tymin > tmax) continue;
            if (tymin > tmin) {
                tmin = tymin;
                face = this.stepY > 0 ? BlockFace.BOTTOM : BlockFace.TOP;
            }
            if (tymax < tmax) tmax = tymax;

            const tzmin = (shape[this.invDirZ > 0 ? 2 : 5] - p.z) * this.invDirZ;
            const tzmax = (shape[this.invDirZ > 0 ? 5 : 2] - p.z) * this.invDirZ;

            if (tmin > tzmax || tzmin > tmax) continue;
            if (tzmin > tmin) {
                tmin = tzmin;
                face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
            if (tzmax < tmax) tmax = tzmax;

            if (tmin < t) {
                t = tmin;
                f = face;
            }
        }
        if (t === Number.MAX_VALUE) return null;
        return { pos: this.pos.plus(this.dir.scaled(t)), face: f };
    }

    next() {
        if (Math.min(Math.min(this.tMaxX, this.tMaxY), this.tMaxZ) > this.maxDistance) {
            return null;
        }

        if (this.tMaxX < this.tMaxY) {
            if (this.tMaxX < this.tMaxZ) {
                this.block.x += this.stepX;
                this.tMaxX += this.tDeltaX;
                this.block.face = this.stepX > 0 ? BlockFace.WEST : BlockFace.EAST;
            } else {
                this.block.z += this.stepZ;
                this.tMaxZ += this.tDeltaZ;
                this.block.face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
        } else {
            if (this.tMaxY < this.tMaxZ) {
                this.block.y += this.stepY;
                this.tMaxY += this.tDeltaY;
                this.block.face = this.stepY > 0 ? BlockFace.BOTTOM : BlockFace.TOP;
            } else {
                this.block.z += this.stepZ;
                this.tMaxZ += this.tDeltaZ;
                this.block.face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
        }
        if (isNaN(this.block.x) || isNaN(this.block.y) || isNaN(this.block.z)) return null;
        return this.block;
    }
}
