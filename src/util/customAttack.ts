import { Bot } from "mineflayer"
import { Entity } from "prismarine-entity"


export function attack (bot: Bot, target: Entity, swing = true) {
    // arm animation comes before the use_entity packet
    useEntity(bot, target, 1)
    if (swing) {
      swingArm(bot)
    }

  }


  function useEntity (bot: Bot, target: Entity, leftClick: 0 | 1, x?: number, y?: number, z?: number) {
    if (x && y && z) {
      bot._client.write('use_entity', {
        target: target.id,
        mouse: leftClick,
        x,
        y,
        z,
        sneaking: false
      })
    } else {
      bot._client.write('use_entity', {
        target: target.id,
        mouse: leftClick,
        sneaking: false
      })
    }
  }


  function swingArm (bot: Bot, arm = 'right', showHand = true) {
    const hand = arm === 'right' ? 0 : 1
    const packet = {}
    if (showHand) Object.assign(packet, hand)
    bot._client.write('arm_animation', packet)
  }
