type ProjectileInfo = { v0: number; g: number };
type ProjectileInfos = { [name: string]: ProjectileInfo };


export const trajectoryInfo: ProjectileInfos = {
    bow: { v0: 3, g: 0.05 },
    crossbow: { v0: 3.15, g: 0.05 },
    trident: { v0: 2.5, g: 0.05 },
    ender_pearl: { v0: 1.5, g: 0.03 },
    splash_potion: { v0: 0.4, g: 0.03 },
};


export const airResistance = {
    y: 0.01,
    h: 0.01
}
