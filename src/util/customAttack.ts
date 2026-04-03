import { Bot } from "mineflayer"
import { Entity } from "prismarine-entity"


export function attack (bot: Bot, target: Entity, swing = true) {
    // Vanilla sends the attack interaction first, then the swing packet.
    useEntity(bot, target, 1)
    if (swing) {
      swingArm(bot)
    }

  }


  function useEntity (bot: Bot, target: Entity, leftClick: 0 | 1, x?: number, y?: number, z?: number) {
    const sneaking = bot.getControlState('sneak')
    if (x && y && z) {
      bot._client.write('use_entity', {
        target: target.id,
        mouse: leftClick,
        x,
        y,
        z,
        sneaking
      })
    } else {
      bot._client.write('use_entity', {
        target: target.id,
        mouse: leftClick,
        sneaking
      })
    }
  }


  function swingArm (bot: Bot, arm = 'right', showHand = true) {
    const hand = arm === 'right' ? 0 : 1
    const packet = {} as Record<string, any>
    if (showHand) packet.hand = hand
    bot._client.write('arm_animation', packet)
  }
