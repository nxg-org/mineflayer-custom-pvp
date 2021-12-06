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
    return dirToYawAndPitch(delta)

}

export function dirToYawAndPitch(dir: Vec3) {
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
    const groundDistance = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const pitch = Math.atan2(dir.y, groundDistance);
    return { yaw: yaw, pitch: pitch };

}


export function yawPitchAndSpeedToDir(yaw: number, pitch: number, speed: number) {
    const thetaY = Math.PI + yaw
    const thetaP = pitch
    return new Vec3(speed * Math.sin(thetaY), speed * Math.sin(thetaP), speed * Math.cos(thetaY))
}