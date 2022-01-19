export interface FullConfig {
    genericConfig: GenericConfig
    tapConfig: TapConfig
    kbCancelConfig: KBConfig
    strafeConfig: StrafeConfig
    swingConfig: SwingBehaviorConfig;
    critConfig: CriticalsConfig;
    shieldConfig: ShieldConfig;
    rotateConfig: RotateConfig;
}


export const defaultConfig: FullConfig = {
    genericConfig: {
        viewDistance: 128,
        attackRange: 2.8,
        missChancePerTick: 0.2,
        enemyReach: 3,
        updateForShielding: true
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
        //     // hRatio: 2,
        //     // yRatio: 2,
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
    swingConfig: {
        mode: "fullswing"
    }


}

export interface GenericConfig {
    viewDistance: number;
    attackRange: number;
    missChancePerTick: number;
    enemyReach: number;
    updateForShielding: boolean;
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
export interface CriticalsConfig {
    enabled: boolean;
    mode: "packet" | "shorthop" | "hop";
}

export interface ShieldConfig {
    enabled: boolean;
    mode: "legit" | "blatant";
}

export interface RotateConfig {
    enabled: boolean;
    mode: "legit" | "instant" | "constant" | "silent" | "ignore";
}
