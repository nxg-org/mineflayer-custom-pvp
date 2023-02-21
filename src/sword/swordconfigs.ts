export interface FullConfig {
  genericConfig: GenericConfig;
  tapConfig: TapConfig;
  onHitConfig: OnHitConfig;
  strafeConfig: StrafeConfig;
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
    tooCloseRange: 1,
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
      mode: "intelligent",
      maxOffset: Math.PI / 2,
    },
  },
  critConfig: {
    enabled: true,
    mode: "hop",
    attemptRange: 5,
    reaction: {
      enabled: true,
      maxPreemptiveTicks: 1,
      maxWaitTicks: 5,
      maxWaitDistance: 5,
    },
  },
  onHitConfig: {
    enabled: false,
    mode: "backoff",
    kbCancel: {
      enabled: true,
      mode: "jump",
    },
  },
  rotateConfig: {
    enabled: true,
    mode: "constant",
  },
  shieldConfig: {
    enabled: true,
    mode: "legit",
  },
  shieldDisableConfig: {
    enabled: true,
    mode: "single", // not used rn
  },
  swingConfig: {
    mode: "fullswing",
  },
  followConfig: {
    mode: "standard",
    distance: 3,
    predict: false
  },
};

export type ShieldDisableConfig = {
  enabled: boolean;
  mode: "single" | "double";
};

export type GenericConfig = {
  viewDistance: number;
  attackRange: number;
  tooCloseRange: number;
  missChancePerTick: number;
  enemyReach: number;
};

export type SwingBehaviorConfig = {
  mode: "killaura" | "fullswing";
};

export type StrafeModeConfig = {
  mode: "circle" | "random" | "intelligent";
  maxOffset?: number;
};

export type StrafeConfig = {
  enabled: boolean;
  mode: StrafeModeConfig;
};

export type TapConfig = {
  enabled: boolean;
  mode: "wtap" | "stap" | "sprintcancel";
  delay: number;
};

export type KBConfig =
  | {
      enabled: boolean;
      mode: "jump";
    }
  | { enabled: boolean; mode: "velocity"; hRatio?: number; yRatio: number }
  | { enabled: boolean; mode: "shift" | "jumpshift"; delay?: number };

export type OnHitConfig = {
  enabled: boolean;
  mode: "backoff";
  kbCancel: KBConfig;
  tickCount?: number;
};

export type ReactionCritConfig =
  | {
      enabled: false;
    }
  | { enabled: true; maxWaitTicks?: number; maxWaitDistance?: number; maxPreemptiveTicks?: number };

export type CriticalsConfig = {
  enabled: boolean;
  reaction: ReactionCritConfig;
} & (
  | {
      mode: "hop" | "shorthop";
      attemptRange?: number;
    }
  | { enabled: boolean; mode: "packet"; bypass?: boolean }
);

export type ShieldConfig = {
  enabled: boolean;
  mode: "legit" | "blatant";
};

export type RotateConfig = {
  enabled: boolean;
  mode: "legit" | "instant" | "constant" | "silent" | "ignore";
};

export type FollowConfig = {
  mode: "jump" | "standard";
  distance: number;
} & ({ predict: false } | { predict: true, predictTicks?: number})
