declare type ProjectileInfo = {
    v0: number;
    g: number;
};
declare type ProjectileInfos = {
    [name: string]: ProjectileInfo;
};
export declare const trajectoryInfo: ProjectileInfos;
export declare const airResistance: {
    y: number;
    h: number;
};
export {};
