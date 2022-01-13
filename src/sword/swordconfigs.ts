export interface FullConfig {
    viewDistance: number;
    attackRange: number;
    tapConfig: TapConfig
    kbCancelConfig: KBConfig
    strafeConfig: StrafeConfig
    swingConfig: SwingBehaviorConfig;
    critConfig: CriticalsConfig;
    shieldConfig: ShieldConfig;
    rotateConfig: RotateConfig;
}


export const defaultConfig: FullConfig = {
    viewDistance: 128,
    attackRange: 3,
    tapConfig: {
        enabled: true,
        mode: "stap",
        delay: 0,
    },
    strafeConfig: {
        enabled: true,
        mode: {
            name: "circle",
            maxOffset: Math.PI / 3
        }
    },
    critConfig: {
        enabled: true,
        mode: "hop"
    },
    kbCancelConfig: {
        enabled: true,
        mode: "shift"
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


export interface SwingBehaviorConfig {
    mode: "killaura" | "fullswing";
}

export interface StrafeModeConfig {
    name: "circle"
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
    mode: "packet" | "shift"
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
