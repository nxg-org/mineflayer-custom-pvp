"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEntityAABB = void 0;
const mineflayer_util_plugin_1 = require("@nxg-org/mineflayer-util-plugin");
function getEntityAABB(entity) {
    var _a;
    let h, w;
    if (entity.name === "player") {
        h = 1.8;
        w = 0.3;
    }
    else {
        h = entity.height;
        w = (_a = entity.width) !== null && _a !== void 0 ? _a : (entity.height / 2);
    }
    const { x, y, z } = entity.position;
    return new mineflayer_util_plugin_1.AABB(-w, 0, -w, w, h, w).offset(x, y, z);
}
exports.getEntityAABB = getEntityAABB;
