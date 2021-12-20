type ProjectileInfo = { v0: number; g: number };
type ProjectileInfos = { [name: string]: ProjectileInfo };


export const trajectoryInfo: ProjectileInfos = {
    bow: { v0: 3, g: 0.05 },
    crossbow: { v0: 3.15, g: 0.05 },
    crossbow_firework: {v0: 1.6, g: 0.00 },
    trident: { v0: 2.5, g: 0.05 },
    snowball: {v0: 1.5, g: 0.04 },
    egg: {v0: 1.5, g: 0.04 },
    ender_pearl: { v0: 1.5, g: 0.04 },
    splash_potion: { v0: 0.4, g: 0.03 },

};


export const airResistance = {
    y: 0.01,
    h: 0.01
}
