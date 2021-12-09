import { Bot } from "mineflayer";
import { Vec3 } from "vec3";

const PI = Math.PI;
const PI_2 = Math.PI * 2;
const TO_RAD = PI / 180;
const TO_DEG = 1 / TO_RAD;
const FROM_NOTCH_BYTE = 360 / 256;
// From wiki.vg: Velocity is believed to be in units of 1/8000 of a block per server tick (50ms)
const FROM_NOTCH_VEL = 1 / 8000;

export const toNotchianYaw = (yaw: number) => toDegrees(PI - yaw);
export const toNotchianPitch = (pitch: number) => toDegrees(-pitch);
export const fromNotchianYawByte = (yaw: number) => fromNotchianYaw(yaw * FROM_NOTCH_BYTE);
export const fromNotchianPitchByte = (pitch: number) => fromNotchianPitch(pitch * FROM_NOTCH_BYTE);

export function euclideanMod(numerator: number, denominator: number) {
    const result = numerator % denominator;
    return result < 0 ? result + denominator : result;
}

export function toRadians(degrees: number) {
    return TO_RAD * degrees;
}

export function toDegrees(radians: number) {
    return TO_DEG * radians;
}

export function fromNotchianYaw(yaw: number) {
    return euclideanMod(PI - toRadians(yaw), PI_2);
}

export function fromNotchianPitch(pitch: number) {
    return euclideanMod(toRadians(-pitch) + PI, PI_2) - PI;
}

export function fromNotchVelocity(vel: Vec3) {
    return new Vec3(vel.x * FROM_NOTCH_VEL, vel.y * FROM_NOTCH_VEL, vel.z * FROM_NOTCH_VEL);
}

export function pointToYawAndPitch(org: Vec3, point: Vec3) {
    const delta = point.minus(org);
    return dirToYawAndPitch(delta);
}

export function dirToYawAndPitch(dir: Vec3) {
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
    const groundDistance = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const pitch = Math.atan2(dir.y, groundDistance);
    return { yaw: yaw, pitch: pitch };
}

export function yawPitchAndSpeedToDir(yaw: number, pitch: number, speed: number) {
    const thetaY = Math.PI + yaw;
    const thetaP = pitch;
    return new Vec3(speed * Math.sin(thetaY), speed * Math.sin(thetaP), speed * Math.cos(thetaY));
}

export function getTargetDistance(origin: Vec3, destination: Vec3) {
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

export function getTargetYaw(origin: Vec3, destination: Vec3) {
    const xDistance = destination.x - origin.x;
    const zDistance = destination.z - origin.z;
    const yaw = Math.atan2(xDistance, zDistance) + Math.PI;
    return yaw;
}

export function getPremonition(startPosition: Vec3, targetPosition: Vec3, speed: Vec3, totalTicks: number) {
    totalTicks = totalTicks + Math.ceil(totalTicks / 10);
    const newTarget = targetPosition;
    for (let i = 0; i < totalTicks; i++) {
        newTarget.add(speed);
    }
    const distances = getTargetDistance(startPosition, newTarget);
    return {
        distances,
        newTarget,
    };
}

export function degreesToRadians(degrees: number) {
    const pi = Math.PI;
    return degrees * (pi / 180);
}

export function radiansToDegrees(radians: number) {
    const pi = Math.PI;
    return radians * (180 / pi);
}

export function getVox(Vo: number, Alfa: number, Resistance = 0) {
    return Vo * Math.cos(Alfa) - Resistance;
}

export function getVoy(Vo: number, Alfa: number, Resistance = 0) {
    return Vo * Math.sin(Alfa) - Resistance;
}

export function getVo(Vox: number, Voy: number, G: number) {
    return Math.sqrt(Math.pow(Vox, 2) + Math.pow(Voy - G, 2)); // New Total Velocity - Gravity
}

export function getGrades(Vo: number, Voy: number, Gravity: number) {
    return radiansToDegrees(Math.asin((Voy - Gravity) / Vo));
}

export function vectorMagnitude(vec: Vec3) {
    return Math.sqrt(vec.x * vec.x + vec.z * vec.z);
}
