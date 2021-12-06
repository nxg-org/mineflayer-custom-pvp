import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import {Vec3} from "vec3";
import { InterceptEquations } from "./intercept";

// Physics factors
let BaseVo: number; // Power of shot
let GRAVITY = 0.05; // Arrow Gravity // Only for arrow for other entities have different gravity
let FACTOR_Y = 0.01; // Arrow "Air resistance" // In water must be changed
let FACTOR_H = 0.01; // Arrow "Air resistance" // In water must be changed

function getTargetDistance(origin: any, destination: any) {
    const xDistance = Math.pow(origin.x - destination.x, 2);
    const zDistance = Math.pow(origin.z - destination.z, 2);
    const hDistance = Math.sqrt(xDistance + zDistance);

    const yDistance = destination.y - origin.y;

    const distance = Math.sqrt(Math.pow(yDistance, 2) + xDistance + zDistance);

    return {
        distance,
        hDistance,
        yDistance,
    };
}

function getTargetYaw(origin: any, destination: any) {
    const xDistance = destination.x - origin.x;
    const zDistance = destination.z - origin.z;
    const yaw = Math.atan2(xDistance, zDistance) + Math.PI;
    return yaw;
}

function degreesToRadians(degrees: any) {
    const pi = Math.PI;
    return degrees * (pi / 180);
}

function radiansToDegrees(radians: any) {
    const pi = Math.PI;
    return radians * (180 / pi);
}

function getVox(Vo: any, Alfa: any, Resistance = 0) {
    return Vo * Math.cos(Alfa) - Resistance;
}

function getVoy(Vo: any, Alfa: any, Resistance = 0) {
    return Vo * Math.sin(Alfa) - Resistance;
}

function getVo(Vox: any, Voy: any, G: any) {
    return Math.sqrt(Math.pow(Vox, 2) + Math.pow(Voy - G, 2)); // New Total Velocity - Gravity
}

function getGrades(Vo: any, Voy: any, Gravity: any) {
    return radiansToDegrees(Math.asin((Voy - Gravity) / Vo));
}

export class HawkEyeEquations {
    bot: Bot;
    target?: Entity;
    speed: any;
    startPosition?: Vec3;
    targetPosition?: Vec3;
    intercept: InterceptEquations;

    constructor(bot: Bot) {
        this.bot = bot;
        this.intercept = new InterceptEquations(this.bot)
    }




    // Simulate Arrow Trayectory
    tryGrade(startPosition: Vec3, targetPosition: Vec3, grade: any, xDestination: any, yDestination: any, VoIn: any, tryIntercetpBlock = false) {
        let precisionFactor = 1; // !Danger More precision increse the calc! =>  !More Slower!

        let Vo = VoIn;
        let gravity = GRAVITY / precisionFactor;
        let factorY = FACTOR_Y / precisionFactor;
        let factorH = FACTOR_H / precisionFactor;

        // Vo => Vector total velocity (X,Y,Z)
        // For arrow trayectory only need the horizontal discante (X,Z) and verticla (Y)
        let Voy = getVoy(Vo, degreesToRadians(grade)); // Vector Y
        let Vox = getVox(Vo, degreesToRadians(grade)); // Vector X
        let Vy = Voy / precisionFactor;
        let Vx = Vox / precisionFactor;
        let ProjectileGrade;

        let nearestDistance: any = false;
        let totalTicks = 0;

        let blockInTrayect = false;
        const arrowTrajectoryPoints = [];
        const yaw = getTargetYaw(startPosition, targetPosition);

        while (true) {
            const firstDistance = Math.sqrt(Math.pow(Vy - yDestination, 2) + Math.pow(Vx - xDestination, 2));

            if (nearestDistance === false) {
                nearestDistance = firstDistance;
            }

            if (firstDistance < nearestDistance) {
                nearestDistance = firstDistance;
            }

            // Increse precission when arrow is near over target,
            // Dynamic Precission, when arrow is near target increse * the precission !Danger with this number
            if (nearestDistance < 4) {
                precisionFactor = 5;
            }
            if (nearestDistance > 4) {
                precisionFactor = 1;
            }

            totalTicks += 1 / precisionFactor;
            gravity = GRAVITY / precisionFactor;
            factorY = FACTOR_Y / precisionFactor;
            factorH = FACTOR_H / precisionFactor;

            Vo = getVo(Vox, Voy, gravity);
            ProjectileGrade = getGrades(Vo, Voy, gravity);

            Voy = getVoy(Vo, degreesToRadians(ProjectileGrade), Voy * factorY);
            Vox = getVox(Vo, degreesToRadians(ProjectileGrade), Vox * factorH);

            Vy += Voy / precisionFactor;
            Vx += Vox / precisionFactor;

            const x = startPosition.x - Math.sin(yaw) * Vx;
            const z = startPosition.z - (Math.sin(yaw) * Vx) / Math.tan(yaw);
            const y = startPosition.y + Vy;

            const currentArrowPosition = new Vec3(x, y, z);
            arrowTrajectoryPoints.push(currentArrowPosition);
            const previusArrowPositionIntercept =
                arrowTrajectoryPoints[arrowTrajectoryPoints.length === 1 ? 0 : arrowTrajectoryPoints.length - 2];
            if (tryIntercetpBlock) {
                blockInTrayect = !!this.intercept.check(previusArrowPositionIntercept, currentArrowPosition)?.block;
            }

            // Arrow passed player || Voy (arrow is going down and passed player) || Detected solid block
            if (Vx > xDestination || (Voy < 0 && yDestination > Vy) || blockInTrayect !== false) {
                return {
                    nearestDistance: nearestDistance,
                    totalTicks: totalTicks,
                    blockInTrayect: blockInTrayect,
                    grade: 0,
                    arrowTrajectoryPoints,
                };
            }
        }
    }

    // Get more precision on shot
    getPrecisionShot(startPosition: Vec3, targetPosition: Vec3, grade: any, xDestination: any, yDestination: any, decimals: any) {
        let nearestDistance: any = false;
        let nearestGrade: any = false;
        let arrowTrajectoryPoints, blockInTrayect;
        decimals = Math.pow(10, decimals);

        for (let iGrade = grade * 10 - 10; iGrade <= grade * 10 + 10; iGrade += 1) {
            const distance = this.tryGrade(startPosition, targetPosition, iGrade / decimals, xDestination, yDestination, BaseVo, true);
            if (distance.nearestDistance < nearestDistance || nearestDistance === false) {
                nearestDistance = distance.nearestDistance;
                nearestGrade = iGrade;
                arrowTrajectoryPoints = distance.arrowTrajectoryPoints;
                blockInTrayect = distance.blockInTrayect;
            }
        }

        return {
            nearestGrade,
            nearestDistance,
            arrowTrajectoryPoints,
            blockInTrayect,
        };
    }

    // Calculate all 180º first grades
    // Calculate the 2 most aproax shots
    // https://es.qwe.wiki/wiki/Trajectory
    getFirstGradeAproax(startPosition: Vec3, targetPosition: Vec3, xDestination: any, yDestination: any) {
        let firstFound = false;
        type calcs = {
            nearestDistance: number,
            totalTicks: number,
            blockInTrayect: boolean,
            grade: number;
            arrowTrajectoryPoints: Vec3[],
        };
        let nearestGradeFirst: calcs | undefined;
        let nearestGradeSecond: calcs | undefined;

        // const nearGrades = []

        for (let grade = -89; grade < 90; grade++) {
            const tryGradeShot = this.tryGrade(startPosition, targetPosition, grade, xDestination, yDestination, BaseVo);

            tryGradeShot.grade = grade;
            if (tryGradeShot.nearestDistance > 4) {
                continue;
            }

            if (!nearestGradeFirst) {
                nearestGradeFirst = tryGradeShot;
            }

            if (tryGradeShot.grade - nearestGradeFirst.grade > 10 && !firstFound) {
                firstFound = true;
                nearestGradeSecond = tryGradeShot;
            }

            if (nearestGradeFirst.nearestDistance > tryGradeShot.nearestDistance && !firstFound) {
                nearestGradeFirst = tryGradeShot;
            }

            if (!nearestGradeSecond || nearestGradeSecond!.nearestDistance > tryGradeShot.nearestDistance && firstFound) {
                nearestGradeSecond = tryGradeShot;
            }
        }

        return {
            nearestGradeFirst,
            nearestGradeSecond,
        };
    }


    getMasterGrade(targetIn: Entity, speedIn: any, weapon: string) {
        const validWeapons = ["bow", "crossbow", "snowball", "ender_pearl", "egg", "splash_potion", "trident"];
        if (!validWeapons.includes(weapon)) {
            throw new Error(`${weapon} is not valid weapon for calculate the grade!`);
        }

        switch (weapon) {
            case "bow":
                BaseVo = 3;
                break;
            case "crossbow":
                BaseVo = 3.15;
                break;
            case "trident":
                BaseVo = 2.5;
                break;
            case "ender_pearl":
            case "snowball":
            case "egg":
                BaseVo = 1.5;
                GRAVITY = 0.03;
                break;
            case "splash_potion":
                BaseVo = 0.4;
                GRAVITY = 0.03;
                break;
        }
        this.target = targetIn;
        if (speedIn == null) {
            this.speed = {
                x: 0,
                y: 0,
                z: 0,
            };
        } else {
            this.speed = speedIn;
        }

        let startPosition = this.bot.entity.position.offset(0, 1.6, 0); // Bow offset position

        // Calculate target Height, for shot in the heart  =P
        let targetHeight = 0;
        if (this.target?.type === "player") {
            targetHeight = 1.6;
        }
        if (this.target?.type === "mob") {
            targetHeight = this.target.height;
        }
        let targetPosition = this.target.position.offset(0, targetHeight, 0);

        // Check the first best trayectory
        let distances = getTargetDistance(startPosition, targetPosition);
        let shotCalculation = this.getBaseCalculation(startPosition, targetPosition, distances.hDistance, distances.yDistance);
        if (!shotCalculation) {
            return false;
        }

        // Recalculate the new target based on speed + first trayectory
        const premonition = this.getPremonition(startPosition, targetPosition, shotCalculation.totalTicks, this.speed);
        distances = premonition.distances;
        const newTarget = premonition.newTarget;

        // Recalculate the trayectory based on new target location
        shotCalculation = this.getBaseCalculation(startPosition, targetPosition, distances.hDistance, distances.yDistance);
        if (!shotCalculation) {
            return false;
        }
        

        // Get more precision on shot
        const precisionShot = this.getPrecisionShot(startPosition, targetPosition, shotCalculation.grade, distances.hDistance, distances.yDistance, 1);
        const { arrowTrajectoryPoints, blockInTrayect, nearestDistance, nearestGrade } = precisionShot;

        // Calculate yaw
        const yaw = getTargetYaw(startPosition, newTarget);

        if (nearestDistance > 4) {
            return false;
        } // Too far
        // console.log("bot to player shot",shotCalculation.grade, "nearest distance",nearestDistance)
        return {
            pitch: degreesToRadians(nearestGrade / 10),
            yaw: yaw,
            grade: nearestGrade / 10,
            nearestDistance,
            target: newTarget,
            arrowTrajectoryPoints,
            blockInTrayect,
        };
    }

    getPremonition(startPosition: Vec3, targetPosition: Vec3, totalTicks: any, speed: {x: number, y: number, z: number}) {
        totalTicks = totalTicks + Math.ceil(totalTicks / 10);
        const velocity = new Vec3(speed.x, speed.y, speed.z);
        const newTarget = targetPosition
        for (let i = 1; i <= totalTicks; i++) {
            newTarget.add(velocity);
        }
        const distances = getTargetDistance(startPosition, newTarget);

        return {
            distances,
            newTarget,
        };
    }

    // For parabola of Y you have 2 times for found the Y position if Y original are downside of Y destination
    getBaseCalculation(startPosition: Vec3, targetPosition: Vec3, xDestination: any, yDestination: any) {
        const grade = this.getFirstGradeAproax(startPosition, targetPosition, xDestination, yDestination);
        let gradeShot;

        if (!grade.nearestGradeFirst) {
            return false;
        } // No aviable trayectory

        // Check blocks in trayectory
        let check = this.tryGrade(startPosition, targetPosition, grade.nearestGradeFirst.grade, xDestination, yDestination, BaseVo, true);

        if (!check.blockInTrayect && check.nearestDistance < 4) {
            gradeShot = grade.nearestGradeFirst;
        } else {
            if (!grade.nearestGradeSecond) {
                return false; // No aviable trayectory
            }
            check = this.tryGrade(startPosition, targetPosition, grade.nearestGradeSecond.grade, xDestination, yDestination, BaseVo, true);
            if (check.blockInTrayect) {
                return false; // No aviable trayectory
            }
            gradeShot = grade.nearestGradeSecond;
        }

        return gradeShot;
    }
}
