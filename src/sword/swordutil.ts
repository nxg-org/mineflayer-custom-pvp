import { Entity } from "prismarine-entity";
import { goals } from "mineflayer-pathfinder";
import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { FollowConfig, FullConfig } from "./swordconfigs";
// import { GoalFactory } from "@nxg-org/mineflayer-jump-pathing";

class PredictiveGoal extends goals.GoalFollow {
  public readonly bot: Bot;
  public predictTicks: number;
  constructor(bot: Bot, entity: Entity, range: number, predictTicks: number) {
    super(entity, range);
    this.bot = bot;
    this.predictTicks = predictTicks;
    this.bot.tracker.trackEntity(entity);
  }

  heuristic(node: { x: number; y: number; z: number }) {
    const dx = this.x - node.x;
    const dy = this.y - node.y;
    const dz = this.z - node.z;
    return this.distanceXZ(dx, dz) + Math.abs(dy);
  }

  isEnd(node: { x: number; y: number; z: number }) {
    const dx = this.x - node.x;
    const dy = this.y - node.y;
    const dz = this.z - node.z;
    return dx * dx + dy * dy + dz * dz <= this.rangeSq;
  }

  hasChanged() {
    const pos = this.entity.position.floored();
    const p = this.predictiveFunction(
      this.entity.position.minus(this.bot.entity.position),
      this.entity.position,
      this.bot.tracker.getEntitySpeed(this.entity) || new Vec3(0, 0, 0)
    );
    const dx = this.x - p.x;
    const dy = this.y - p.y;
    const dz = this.z - p.z;
    if (dx * dx + dy * dy + dz * dz > this.rangeSq) {
      this.x = p.x;
      this.y = p.y;
      this.z = p.z;
      return true;
    }
    return false;
  }

  public predictiveFunction(delta: Vec3, pos: Vec3, vel: Vec3) {
    const base = Math.round(Math.sqrt(delta.x ** 2 + delta.y ** 2 + delta.z ** 2));
    const tickCount = Math.round((base * this.predictTicks) / Math.sqrt(base));
    return pos.plus(vel.scaled(isNaN(tickCount) ? 0 : tickCount));
  }

  distanceXZ(dx: number, dz: number) {
    dx = Math.abs(dx);
    dz = Math.abs(dz);
    return Math.abs(dx - dz) + Math.min(dx, dz) * Math.SQRT2;
  }
}

export function generateGoal(bot: Bot, entity: Entity, options: FullConfig) {
  switch (options.followConfig.mode) {
    case "jump": {
      // const tmp1 = GoalFactory.predictEntity(
      //   bot,
      //   entity,
      //   options.followConfig.distance,
      //   options.followConfig.predict ? options.followConfig.predictTicks ?? 4 : 0
      // );
      // bot.jumpPather.goto(tmp1);
      // return tmp1;
      break
    }

    case "standard": {
      const tmp = options.followConfig as FollowConfig
      const tmp2 = new PredictiveGoal(
        bot,
        entity,
        options.followConfig.distance,
        options.followConfig.predictTicks ?? 0
      );
      return tmp2;
    }
    case "custom": {
      return options.followConfig.goal(bot, entity, options);
    }
  }
}


export function goalEquals(bot: Bot, currentGoal: any, goal: any, options: FullConfig) {
  switch (options.followConfig.mode) {
    case "jump": {
      return true;
    }

    case "standard": {
      const oGoal1 = currentGoal as goals.Goal
      const goal1 = goal as goals.Goal;
      if (oGoal1 instanceof goals.GoalFollow || oGoal1 instanceof PredictiveGoal) {
        return oGoal1.entity === goal.entity && oGoal1.x === goal.x && oGoal1.z === goal.z && oGoal1.y === goal.y && oGoal1.rangeSq === goal.rangeSq
      } else {
        return oGoal1 === goal
      }

    }
    case "custom": {
      const oGoal1 = currentGoal as goals.Goal
      const goal1 = goal as goals.Goal;
      if (oGoal1 instanceof goals.GoalFollow || oGoal1 instanceof PredictiveGoal) {
        return oGoal1.entity === goal.entity && oGoal1.x === goal.x && oGoal1.z === goal.z && oGoal1.y === goal.y && oGoal1.rangeSq === goal.rangeSq
      } else {
        return oGoal1 === goal
      }

    }
  }
}

export function followEntity(bot: Bot, goal: any, options: FullConfig) {
  switch (options.followConfig.mode) {
    case "jump": {
      break
    }

    case "standard": {
      bot.pathfinder.setGoal(goal, true);
      break
    }

    case "custom": {
      bot.pathfinder.setGoal(goal, true);
      break
    }
  }
  
  return goal;
}

export function stopFollow(bot: Bot, mode: FollowConfig["mode"]) {
  // bot.jumpPather.stop();
  bot.pathfinder.stop();
}
