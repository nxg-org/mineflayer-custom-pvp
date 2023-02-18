export interface FullConfig {
    genericConfig: GenericConfig
    tapConfig: TapConfig
    kbCancelConfig: KBConfig
    strafeConfig: StrafeConfig
    swingConfig: SwingBehaviorConfig;
    critConfig: CriticalsConfig;
    shieldConfig: ShieldConfig;
    shieldDisableConfig: ShieldDisableConfig;
    rotateConfig: RotateConfig;
    followConfig: FollowConfig;
}

export const defaultConfig: FullConfig = {
    genericConfig: {
        viewDistance: 128,
        attackRange: 3,
        tooCloseRange: 1.5,
        missChancePerTick: 0.0,
        enemyReach: 3,
    },
    tapConfig: {
        enabled: true,
        mode: "stap",
        delay: 0,
    },
    strafeConfig: {
        enabled: true,
        mode: {
            name: "intelligent",
            maxOffset: Math.PI / 2
        }
    },
    critConfig: {
        enabled: true,
        mode: "hop"
    },
    kbCancelConfig: {
        enabled: true,
        // mode: {
        //     name: "velocity",
        //     hRatio: 0,
        //     yRatio: 0,
        // }
        mode: {
            name: "jump",
            delay: 5
        }
    },
    rotateConfig: {
        enabled: true,
        mode: "constant"
    },
    shieldConfig: {
        enabled: true,
        mode: "legit"
    },
    shieldDisableConfig: {
        enabled: true,
        mode: "single" // not used rn
    },
    swingConfig: {
        mode: "fullswing"
    },
    followConfig: {
        mode: "standard",
        distance: 3
    }


}

export interface ShieldDisableConfig {
    enabled: boolean,
    mode: "single" | "double"
}

export interface GenericConfig {
    viewDistance: number;
    attackRange: number;
    tooCloseRange: number;
    missChancePerTick: number;
    enemyReach: number;
}


export interface SwingBehaviorConfig {
    mode: "killaura" | "fullswing";
}

export interface StrafeModeConfig {
    name: "circle" | "random" | "intelligent"
    maxOffset?: number
}

export interface StrafeConfig {
    enabled: boolean
    mode: StrafeModeConfig
}

export interface TapConfig {
    enabled: boolean
    mode: "wtap" | "stap" | "sprintcancel"
    delay: number
}

export interface KBConfig {
    enabled: boolean,
    mode: KBModeConfig
}

export interface KBModeConfig {
    name: "jump" | "shift" | "jumpshift" | "velocity",
    delay?: number
    hRatio?: number
    yRatio?: number
}
export type CriticalsConfig = {
    enabled: boolean;
    mode: "hop" | "shorthop";
} | {enabled: boolean, mode: "packet", bypass?: boolean}

export interface ShieldConfig {
    enabled: boolean;
    mode: "legit" | "blatant";
}

export interface RotateConfig {
    enabled: boolean;
    mode: "legit" | "instant" | "constant" | "silent" | "ignore";
}

export interface FollowConfig {
    mode: "jump" | "standard",
    distance: number;
}

