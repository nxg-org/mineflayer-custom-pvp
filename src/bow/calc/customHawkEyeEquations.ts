import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import {Block} from "prismarine-block"
import { Vec3 } from "vec3";
import { InterceptEquations } from "./intercept";

// Physics factors
let BaseVo: number; // Power of shot
let GRAVITY = 0.05; // Arrow Gravity // Only for arrow for other entities have different gravity
let FACTOR_Y = 0.01; // Arrow "Air resistance" // In water must be changed
let FACTOR_H = 0.01; // Arrow "Air resistance" // In water must be changed

function getTargetDistance(origin: Vec3, destination: Vec3) {
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

function getTargetYaw(origin: Vec3, destination: Vec3) {
    const xDistance = destination.x - origin.x;
    const zDistance = destination.z - origin.z;
    const yaw = Math.atan2(xDistance, zDistance) + Math.PI;
    return yaw;
}

function degreesToRadians(degrees: number) {
    const pi = Math.PI;
    return degrees * (pi / 180);
}

function radiansToDegrees(radians: number) {
    const pi = Math.PI;
    return radians * (180 / pi);
}

function getVox(Vo: number, Alfa: number, Resistance = 0) {
    return Vo * Math.cos(Alfa) - Resistance;
}

function getVoy(Vo: number, Alfa: number, Resistance = 0) {
    return Vo * Math.sin(Alfa) - Resistance;
}

function getVo(Vox: number, Voy: number, G: number) {
    return Math.sqrt(Math.pow(Vox, 2) + Math.pow(Voy - G, 2)); // New Total Velocity - Gravity
}

function getGrades(Vo: number, Voy: number, Gravity: number) {
    return radiansToDegrees(Math.asin((Voy - Gravity) / Vo));
}

export class CustomHawkEyeEquations {
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
    tryGrade(startPosition: Vec3, yaw: number, grade: number, xDestination: number, yDestination: number, VoIn: number, tryInterceptBlock = false) {
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
        let ProjectileGrade: number;
        let nearestDistance = Math.sqrt(Math.pow(Vy - yDestination, 2) + Math.pow(Vx - xDestination, 2));
        let totalTicks = 0;

        let blockInTrajectory: Block | undefined;
        let closestArrowPoint: Vec3 | undefined;
        const arrowTrajectoryPoints = [];

        while (totalTicks < 150) {
            const currentTickDistance = Math.sqrt(Math.pow(Vy - yDestination, 2) + Math.pow(Vx - xDestination, 2));

            if (currentTickDistance < nearestDistance) nearestDistance = currentTickDistance;

            // Increse precission when arrow is near over target,
            // Dynamic Precission, when arrow is near target increse * the precission !Danger with this number
            if (nearestDistance < 4) precisionFactor = 5;
            if (nearestDistance > 4) precisionFactor = 1;

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
            
            if (nearestDistance === currentTickDistance) closestArrowPoint = currentArrowPosition;
        

            arrowTrajectoryPoints.push(currentArrowPosition);
            const previusArrowPositionIntercept = arrowTrajectoryPoints[arrowTrajectoryPoints.length === 1 ? 0 : arrowTrajectoryPoints.length - 2];
            
            if (tryInterceptBlock) {
                blockInTrajectory = this.intercept.check(previusArrowPositionIntercept, currentArrowPosition)?.block;
            }



            // Arrow passed player || Voy (arrow is going down and passed player) || Detected solid block
            if (Vx > xDestination || (Voy < 0 && yDestination > Vy) || !!blockInTrajectory) break;
        }

        return {
            nearestDistance: nearestDistance,
            totalTicks: totalTicks,
            blockInTrayect: blockInTrajectory,
            grade: 0,
            arrowTrajectoryPoints,
            closestArrowPoint
        };
    }



    // Get more precision on shot
    getPrecisionShotYaw(startPosition: Vec3, yaw: number, grade: number, xDestination: number, yDestination: number, decimals: number) {
        let nearestDistance: any = false;
        let nearestGrade: any = false;
        let arrowTrajectoryPoints, blockInTrayect;
        decimals = Math.pow(10, decimals);

        for (let iGrade = grade * 10 - 10; iGrade <= grade * 10 + 10; iGrade += 1) {
            const distance = this.tryGrade(startPosition, yaw, iGrade / decimals, xDestination, yDestination, BaseVo, true);
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
    getFirstGradeAproax(startPosition: Vec3, yaw: number, xDestination: number, yDestination: number) {
        let firstFound: boolean = false;
        let nearestGradeFirst: ReturnType<typeof this.tryGrade> | undefined;
        let nearestGradeSecond: ReturnType<typeof this.tryGrade> | undefined;

        // const nearGrades = []

        for (let grade = -89; grade < 80; grade++) {
            const tryGradeShot = this.tryGrade(startPosition, yaw, grade, xDestination, yDestination, BaseVo);
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

            if (!!nearestGradeSecond?.nearestDistance && nearestGradeSecond?.nearestDistance > tryGradeShot.nearestDistance && firstFound) {
                nearestGradeSecond = tryGradeShot;
            }
        }

        return {
            nearestGradeFirst,
            nearestGradeSecond,
        };
    }


    predictShotBetweenTwoEntities(entityFiring: Entity, entityTarget: Entity, speedIn: { x: number; y: number; z: number }, weapon: string = "bow") {
        const validWeapons = ["bow", "crossbow", "snowball", "ender_pearl", "egg", "splash_potion", "trident"];
        if (!validWeapons.includes(weapon)) {
            return false
            // throw new Error(`${weapon} is not valid weapon for calculate the grade!`);
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
        let speed: { x: number; y: number; z: number };
        if (speedIn == null) {
            speed = {
                x: 0,
                y: 0,
                z: 0,
            };
        } else 
            speed = speedIn;

        let startPosition = entityFiring.position.offset(0, 1.6, 0); // Bow offset position
        let targetPosition = entityTarget.position.offset(0, 0.8, 0);

        // Check the first best trayectory
        let distances = getTargetDistance(startPosition, targetPosition);
        // let yaw = getTargetYaw(startPosition, targetPosition);
        let yaw = entityFiring.yaw

        let shotCalculation = this.tryGrade(startPosition, yaw, radiansToDegrees(entityFiring.pitch), distances.hDistance, distances.yDistance, BaseVo, true);
        if (!shotCalculation) {
            return false;
        }

        const premonition = this.getPremonition(startPosition, shotCalculation.totalTicks, speed);
        distances = premonition.distances;
        const newTarget = premonition.newTarget;

        // Recalculate the new target based on speed + first trayectory


        // Recalculate the trayectory based on new target location
        shotCalculation = this.tryGrade(startPosition, yaw, radiansToDegrees(entityFiring.pitch), distances.hDistance, distances.yDistance, BaseVo, true);
        if (!shotCalculation) {
            return false;
        }

        const {grade, nearestDistance, blockInTrayect, arrowTrajectoryPoints, closestArrowPoint} = shotCalculation
  
        yaw = getTargetYaw(startPosition, newTarget);

        if (!shotCalculation.nearestDistance || shotCalculation.nearestDistance > 4) {
            return false;
        } // Too far


        return {
            pitch: degreesToRadians(grade),
            yaw: yaw,
            grade,
            nearestDistance,
            target: newTarget,
            arrowTrajectoryPoints,
            blockInTrayect,
            closestArrowPoint
        };
    }

    getPremonition(startPosition: Vec3, totalTicks: number, speed: { x: number; y: number; z: number }) {
        totalTicks = totalTicks + Math.ceil(totalTicks / 10);
        const velocity = new Vec3(speed.x, speed.y, speed.z);
        const newTarget = this.bot.entity.position.clone();
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
    getBaseCalculation(startPosition: Vec3, yaw: number, xDestination: any, yDestination: any) {
        const grade = this.getFirstGradeAproax(startPosition, yaw, xDestination, yDestination);
        let gradeShot;

        if (!grade.nearestGradeFirst) {
            return false;
        } // No aviable trayectory

        // Check blocks in trayectory
        let check = this.tryGrade(startPosition, yaw, grade.nearestGradeFirst.grade, xDestination, yDestination, BaseVo, true);

        if (!check.blockInTrayect && check.nearestDistance < 4) {
            gradeShot = grade.nearestGradeFirst;
        } else {
            if (!grade.nearestGradeSecond) {
                return false; // No aviable trayectory
            }
            check = this.tryGrade(startPosition, yaw, grade.nearestGradeSecond.grade, xDestination, yDestination, BaseVo, true);
            if (check.blockInTrayect) {
                return false; // No aviable trayectory
            }
            gradeShot = grade.nearestGradeSecond;
        }

        return gradeShot;
    }
}