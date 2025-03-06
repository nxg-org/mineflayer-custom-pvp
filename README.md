<div align="center">

# Mineflayer Advanced PvP

*Enhanced combat capabilities for Mineflayer bots*

[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Minecraft](https://img.shields.io/badge/MC-1.8--1.19-brightgreen.svg)](https://www.minecraft.net/)
[![Discord](https://img.shields.io/badge/chat-on%20discord-7289da.svg)](https://discord.gg/ytKSJPbUX6)

</div>

---

## Overview

This plugin enhances Mineflayer bots with advanced PvP capabilities through two specialized modules:

- **SwordPvP**: Melee combat with intelligent criticals, strafing, and shield management
- **BowPvP**: Ranged combat with improved projectile prediction and tactical awareness

Both modules extend existing plugins (mineflayer-pvp and minecrafthawkeye) with significant improvements and new features.

---

<h2 align="center">🗡️ SwordPvP Module</h2>

The SwordPvP module delivers accurate melee combat with features designed to match the effectiveness of modern PvP clients.

### Key Features

- **MC-Accurate Hit Detection**
  - Precise AABB collision models with eye-height projection
  - Matches Minecraft's actual hit detection mechanics
  - Improved hit registration compared to foot-position calculations

- **Advanced Critical Attacks**
  - Achieves 80-100% critical hit rate depending on movement patterns
  - Multiple critical modes: hop, packet, and reactive timing
  - Packet-based criticals use optimized parameters based on popular clients

- **Intelligent Shield Handling**
  - Automatic shield detection and countering
  - Weapon switching to axes when opponents shield
  - Both "legit" and "blatant" shielding modes

- **Tactical Movement**
  - Multiple strafing patterns: circle, random, and intelligent
  - Sprint-tapping techniques for knockback manipulation
  - Automatic distance management

- **Enhanced Tracking**
  - Precision target following with direct look commands
  - Multiple rotation modes: constant, silent, and instant
  - Option to predict target movement

### Effectiveness

- 80-95% critical hit rate during active combat
- Near 100% critical success against stationary targets
- Automatic tactical adaptation based on opponent behavior

---

<h2 align="center">🏹 BowPvP Module</h2>

The BowPvP module enhances ranged combat with improved targeting and tactical awareness features.

### Key Features

- **Optimized Targeting**
  - Body-centered aim for higher hit probability
  - Improved projectile physics models

- **Shot Prediction**
  - Calculate trajectory between any two entities
  - Accurately predict endpoints of shots from any loaded entity
  - Determine hit probability for tactical decisions

- **Combat Awareness**
  - Detection when the bot is being aimed at
  - Real-time threat assessment

---

## Installation

```bash
npm install mineflayer-advanced-pvp
```

## Basic Usage

```javascript
const mineflayer = require('mineflayer')
const customPVP = require('mineflayer-advanced-pvp')
const { pathfinder, Movements } = require('mineflayer-pathfinder')

// Create your bot
const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'CombatBot'
})

// Load plugins
bot.loadPlugin(customPVP)
bot.loadPlugin(pathfinder)

// Configure pathfinder movements
const moves = new Movements(bot)
moves.allowFreeMotion = true
moves.allowParkour = true
moves.allowSprinting = true
bot.pathfinder.setMovements(moves)

// The plugin adds bot.swordpvp and bot.bowpvp
bot.once('spawn', () => {
  // Configure combat options
  bot.swordpvp.options.cps = 20
  bot.swordpvp.options.critConfig.reaction.enabled = false
  bot.swordpvp.options.rotateConfig.smooth = true
  
  // Configure bow combat
  bot.bowpvp.useOffhand = false
  
  // Track attacks
  bot.swordpvp.on('attackedTarget', (target, reason, ticks) => {
    console.log(`Attack: ${reason}, next attack in ${ticks} ticks`)
  })
})

// Function to start fighting
const fight = () => {
  const target = bot.nearestEntity(e => e.type === 'player')
  if (target) {
    // Equip shield if available
    equipShield()
    // Start attacking
    bot.swordpvp.attack(target)
  }
}

// Helper to equip shield
async function equipShield() {
  if (bot.supportFeature('doesntHaveOffHandSlot')) return
  const shield = bot.util.inv.getAllItemsExceptCurrent('off-hand').find(e => e.name === 'shield')
  if (shield) {
    await bot.util.inv.customEquip(shield, 'off-hand')
  }
}

// Command handler
bot.on('chat', (username, message) => {
  switch (message) {
    case 'sword':
      bot.on('physicsTick', fight)
      break
    
    case 'stop':
      bot.removeListener('physicsTick', fight)
      bot.swordpvp.stop()
      break
      
    case 'packetmode':
      bot.swordpvp.options.critConfig.mode = 'packet'
      break
  }
})
```

## Advanced Configuration

```javascript
// Configure SwordPvP options
bot.once('spawn', () => {
  // Attack speed
  bot.swordpvp.options.cps = 20
  
  // Critical hit configuration
  bot.swordpvp.options.critConfig.enabled = true
  bot.swordpvp.options.critConfig.mode = 'packet'
  bot.swordpvp.options.critConfig.reaction.enabled = false
  
  // Follow configuration
  bot.swordpvp.options.followConfig.mode = 'jump'
  
  // Strafing configuration
  bot.swordpvp.options.strafeConfig.enabled = true
  bot.swordpvp.options.strafeConfig.mode.mode = 'intelligent'
  
  // Tap configuration for knockback
  bot.swordpvp.options.tapConfig.enabled = true
  bot.swordpvp.options.tapConfig.mode = 'wtap'
  
  // Look behavior
  bot.swordpvp.options.rotateConfig.smooth = true
  bot.swordpvp.options.rotateConfig.mode = 'constant'
})
```

For complete API documentation including all configuration options, methods, properties, and events, see the [SwordPvP API Documentation](src/swordpvp/API.md).

---

## Future Development

- Expanded shield mechanics with proper movement penalties
- Additional combat styles and strategies
- Further optimization for server-specific combat mechanics

If you're interested in crystal PvP, check out [mineflayer-auto-crystal](https://github.com/nxg-org/mineflayer-auto-crystal).

## Support

Need help? Join our [Discord community](https://discord.gg/ytKSJPbUX6) for support, discussions, and updates.

## Credits

- Based on [mineflayer-pvp](https://github.com/PrismarineJS/mineflayer-pvp) and [minecrafthawkeye](https://github.com/sefirosweb/minecraftHawkEye)
- Critical attack system inspired by modern PvP clients