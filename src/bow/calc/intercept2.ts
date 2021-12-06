const { iterators } = require("prismarine-world");
const { RaycastIterator } = iterators;
import { Bot } from "mineflayer";
import { Block } from "prismarine-block";
import { Vec3 } from "vec3";

export class InterceptEquations {
    constructor(public bot: Bot) {}

    check(from: Vec3, to: Vec3) {
        const range = from.distanceTo(to);
        const direction = to.minus(from).normalize();
        return this.raycast(from, direction, range < 20 ? range : 20);
    }

    checkMultiplePositions(positions: Vec3[]) {
        let iterations: Vec3[] = [];
        if (positions.length < 2) {
            return false;
        }

        let to: Vec3;
        let from: Vec3;
        let checkIterations: any;
        from = positions[0];

        for (let i = 1; i <= positions.length; i++) {
            to = positions[i];
            checkIterations = this.check(from, to);
            if (!checkIterations.block) {
                iterations = iterations.concat(checkIterations.iterations);
            }
            from = to.clone();
        }

        return iterations;
    }

    raycast(from: Vec3, direction: Vec3, range: number) {
        const iterations: Vec3[] = [];
        const iter = new RaycastIterator(from, direction, range);
        let pos = iter.next();
        while (pos) {
            iterations.push(pos);
            const block = this.bot.blockAt(pos);
            if (block) {
                const intersect = iter.intersect(block.shapes, pos);
                if (intersect) {
                    return {
                        block,
                        iterations,
                    };
                }
            }
            pos = iter.next();
        }

        return {
            block: undefined,
            iterations,
        };
    }
}
