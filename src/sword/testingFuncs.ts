import { getTargetYaw } from "../calc/mathUtilts";

async function doStrafe(this: any) {
    if (!this.target) return false;
    this.bot.util.move.forceLookAt(this.target.position.offset(0, 1.6, 0), undefined, true);
    const truth = this.trueDistance() < 3.0 ? "back" : "forward";
    const falsy = this.trueDistance() > 2.9 ? "back" : "forward";
    this.bot.setControlState(truth, true); // keep in range
    this.bot.setControlState(falsy, false); // keep in range
    this.bot.setControlState("sprint", true);
    const test = getTargetYaw(this.target.position, this.bot.entity.position); // yaw target SHOULD be looking to hit bot.
    const diff = test - this.target.yaw; // difference between wanted and actual.

    const staringDirection = diff < 0 ? "right" : "left";
    const shouldMove = Math.abs(diff) < Math.PI / 3;
    if (staringDirection !== this.currentStrafeDir) {
        if (this.currentStrafeDir) this.bot.setControlState(this.currentStrafeDir, false);
    }
    if (shouldMove) {
        this.currentStrafeDir = staringDirection;
        this.bot.setControlState(staringDirection, true);
    } else {
        this.bot.setControlState(staringDirection, false);
        this.currentStrafeDir = undefined;
    }
}
