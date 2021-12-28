import { Vec3 } from "vec3";
export declare const toNotchianYaw: (yaw: number) => number;
export declare const toNotchianPitch: (pitch: number) => number;
export declare const fromNotchianYawByte: (yaw: number) => number;
export declare const fromNotchianPitchByte: (pitch: number) => number;
export declare function euclideanMod(numerator: number, denominator: number): number;
export declare function toRadians(degrees: number): number;
export declare function toDegrees(radians: number): number;
export declare function fromNotchianYaw(yaw: number): number;
export declare function fromNotchianPitch(pitch: number): number;
export declare function fromNotchVelocity(vel: Vec3): Vec3;
export declare function pointToYawAndPitch(org: Vec3, point: Vec3): {
    yaw: number;
    pitch: number;
};
export declare function dirToYawAndPitch(dir: Vec3): {
    yaw: number;
    pitch: number;
};
export declare function getTargetDistance(origin: Vec3, destination: Vec3): {
    distance: number;
    hDistance: number;
    yDistance: number;
};
export declare function getTargetYaw(origin: Vec3, destination: Vec3): number;
export declare function getPremonition(startPosition: Vec3, targetPosition: Vec3, speed: Vec3, totalTicks: number): {
    distances: {
        distance: number;
        hDistance: number;
        yDistance: number;
    };
    newTarget: Vec3;
};
export declare function degreesToRadians(degrees: number): number;
export declare function radiansToDegrees(radians: number): number;
export declare function getVox(Vo: number, Alfa: number, Resistance?: number): number;
export declare function getVoy(Vo: number, Alfa: number, Resistance?: number): number;
export declare function getVo(Vox: number, Voy: number, G: number): number;
export declare function getGrades(Vo: number, Voy: number, Gravity: number): number;
export declare function vectorMagnitude(vec: Vec3): number;
export declare function VoToVox(vec: Vec3, mag?: number): number;
export declare function yawPitchAndSpeedToDir(yaw: number, pitch: number, speed: number): Vec3;
export declare function notchianVel(vec: Vec3, Vo?: number, Vox?: number): {
    Vo: number;
    Vox: number;
    vel: Vec3;
};
export declare function applyVec3Gravity(currentVel: Vec3, gravity: Vec3): Vec3;
