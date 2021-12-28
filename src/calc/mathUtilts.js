"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyVec3Gravity = exports.notchianVel = exports.yawPitchAndSpeedToDir = exports.VoToVox = exports.vectorMagnitude = exports.getGrades = exports.getVo = exports.getVoy = exports.getVox = exports.radiansToDegrees = exports.degreesToRadians = exports.getPremonition = exports.getTargetYaw = exports.getTargetDistance = exports.dirToYawAndPitch = exports.pointToYawAndPitch = exports.fromNotchVelocity = exports.fromNotchianPitch = exports.fromNotchianYaw = exports.toDegrees = exports.toRadians = exports.euclideanMod = exports.fromNotchianPitchByte = exports.fromNotchianYawByte = exports.toNotchianPitch = exports.toNotchianYaw = void 0;
const vec3_1 = require("vec3");
const PI = Math.PI;
const PI_2 = Math.PI * 2;
const TO_RAD = PI / 180;
const TO_DEG = 1 / TO_RAD;
const FROM_NOTCH_BYTE = 360 / 256;
// From wiki.vg: Velocity is believed to be in units of 1/8000 of a block per server tick (50ms)
const FROM_NOTCH_VEL = 1 / 8000;
const toNotchianYaw = (yaw) => toDegrees(PI - yaw);
exports.toNotchianYaw = toNotchianYaw;
const toNotchianPitch = (pitch) => toDegrees(-pitch);
exports.toNotchianPitch = toNotchianPitch;
const fromNotchianYawByte = (yaw) => fromNotchianYaw(yaw * FROM_NOTCH_BYTE);
exports.fromNotchianYawByte = fromNotchianYawByte;
const fromNotchianPitchByte = (pitch) => fromNotchianPitch(pitch * FROM_NOTCH_BYTE);
exports.fromNotchianPitchByte = fromNotchianPitchByte;
function euclideanMod(numerator, denominator) {
    const result = numerator % denominator;
    return result < 0 ? result + denominator : result;
}
exports.euclideanMod = euclideanMod;
function toRadians(degrees) {
    return TO_RAD * degrees;
}
exports.toRadians = toRadians;
function toDegrees(radians) {
    return TO_DEG * radians;
}
exports.toDegrees = toDegrees;
function fromNotchianYaw(yaw) {
    return euclideanMod(PI - toRadians(yaw), PI_2);
}
exports.fromNotchianYaw = fromNotchianYaw;
function fromNotchianPitch(pitch) {
    return euclideanMod(toRadians(-pitch) + PI, PI_2) - PI;
}
exports.fromNotchianPitch = fromNotchianPitch;
function fromNotchVelocity(vel) {
    return new vec3_1.Vec3(vel.x * FROM_NOTCH_VEL, vel.y * FROM_NOTCH_VEL, vel.z * FROM_NOTCH_VEL);
}
exports.fromNotchVelocity = fromNotchVelocity;
function pointToYawAndPitch(org, point) {
    const delta = point.minus(org);
    return dirToYawAndPitch(delta);
}
exports.pointToYawAndPitch = pointToYawAndPitch;
function dirToYawAndPitch(dir) {
    const yaw = Math.atan2(dir.x, dir.z) + Math.PI;
    const groundDistance = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const pitch = Math.atan2(dir.y, groundDistance);
    return { yaw: yaw, pitch: pitch };
}
exports.dirToYawAndPitch = dirToYawAndPitch;
function getTargetDistance(origin, destination) {
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
exports.getTargetDistance = getTargetDistance;
function getTargetYaw(origin, destination) {
    const xDistance = destination.x - origin.x;
    const zDistance = destination.z - origin.z;
    const yaw = Math.atan2(xDistance, zDistance) + Math.PI;
    return yaw;
}
exports.getTargetYaw = getTargetYaw;
function getPremonition(startPosition, targetPosition, speed, totalTicks) {
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
exports.getPremonition = getPremonition;
function degreesToRadians(degrees) {
    const pi = Math.PI;
    return degrees * (pi / 180);
}
exports.degreesToRadians = degreesToRadians;
function radiansToDegrees(radians) {
    const pi = Math.PI;
    return radians * (180 / pi);
}
exports.radiansToDegrees = radiansToDegrees;
function getVox(Vo, Alfa, Resistance = 0) {
    return Vo * Math.cos(Alfa) - Resistance;
}
exports.getVox = getVox;
function getVoy(Vo, Alfa, Resistance = 0) {
    return Vo * Math.sin(Alfa) - Resistance;
}
exports.getVoy = getVoy;
function getVo(Vox, Voy, G) {
    return Math.sqrt(Math.pow(Vox, 2) + Math.pow(Voy - G, 2)); // New Total Velocity - Gravity
}
exports.getVo = getVo;
function getGrades(Vo, Voy, Gravity) {
    return radiansToDegrees(Math.asin((Voy - Gravity) / Vo));
}
exports.getGrades = getGrades;
function vectorMagnitude(vec) {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
}
exports.vectorMagnitude = vectorMagnitude;
function VoToVox(vec, mag) {
    return mag ? Math.sqrt(mag * mag - vec.y * vec.y) : Math.sqrt(Math.pow(vectorMagnitude(vec), 2) - vec.y * vec.y);
}
exports.VoToVox = VoToVox;
//Scuffed.
function yawPitchAndSpeedToDir(yaw, pitch, speed) {
    const thetaY = Math.PI + yaw;
    const thetaP = pitch;
    const x = speed * Math.sin(thetaY);
    const y = speed * Math.sin(thetaP);
    const z = speed * Math.cos(thetaY);
    const VxMag = Math.sqrt(x * x + z * z);
    const VxRatio = Math.sqrt(VxMag * VxMag - y * y);
    const allRatio = VxRatio / VxMag;
    return new vec3_1.Vec3(x * allRatio, y, z * allRatio);
}
exports.yawPitchAndSpeedToDir = yawPitchAndSpeedToDir;
// TODO: make it not throw NaN.
function notchianVel(vec, Vo, Vox) {
    if (Vo && Vox) {
        return { Vo, Vox, vel: new vec3_1.Vec3(vec.x * (Vox / Vo), vec.y, vec.z * (Vox / Vo)) };
    }
    else if (Vo) {
        const Vox = VoToVox(vec, Vo);
        return { Vo, Vox, vel: new vec3_1.Vec3(vec.x * (Vox / Vo), vec.y, vec.z * (Vox / Vo)) };
    }
    else {
        // console.log(vec)
        const Vo = vectorMagnitude(vec);
        const Vox = VoToVox(vec);
        // console.log(Math.pow(Vo, 2), vec.y * vec.y)
        return { Vo, Vox, vel: new vec3_1.Vec3(vec.x * (Vox / Vo), vec.y, vec.z * (Vox / Vo)) };
    }
}
exports.notchianVel = notchianVel;
function applyVec3Gravity(currentVel, gravity) {
    return currentVel.plus(gravity);
}
exports.applyVec3Gravity = applyVec3Gravity;
