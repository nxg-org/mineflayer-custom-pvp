<div align="center">

# Mineflayer Advanced PvP

*Enhanced combat capabilities for Mineflayer bots*

[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Minecraft](https://img.shields.io/badge/MC-1.8--1.19-brightgreen.svg)](https://www.minecraft.net/)

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

For complete API documentation including all configuration options, methods, properties, and events, see the [SwordPvP API Docs](src/sword/API.md).


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
const { SwordPvp, BowPvp } = require('mineflayer-advanced-pvp')

// Create your bot
const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'CombatBot'
})

// Load required utility plugin
bot.loadPlugin(require('@nxg-org/mineflayer-util-plugin'))

// Initialize sword PvP with default settings
const swordPvp = new SwordPvp(bot)

// Attack nearby players
bot.on('physicsTick', () => {
  const player = bot.nearestEntity(e => e.type === 'player')
  if (player && player.position.distanceTo(bot.entity.position) < 5) {
    swordPvp.attack(player)
  }
})

// Stop on command
bot.on('chat', (username, message) => {
  if (message === 'stop') {
    swordPvp.stop()
  }
})
```

## Advanced Configuration

```javascript
// Create SwordPvP with custom configuration
const swordPvp = new SwordPvp(bot, {
  genericConfig: {
    attackRange: 3.5,
    viewDistance: 64,
    hitThroughWalls: false
  },
  critConfig: {
    enabled: true,
    mode: 'hop',
    reaction: {
      enabled: true,
      maxWaitTicks: 5
    }
  },
  strafeConfig: {
    enabled: true,
    mode: {
      mode: 'intelligent'
    }
  }
})
```

---

## Future Development

- Expanded shield mechanics with proper movement penalties
- Additional combat styles and strategies
- Further optimization for server-specific combat mechanics

If you're interested in crystal PvP, check out [mineflayer-auto-crystal](https://github.com/nxg-org/mineflayer-auto-crystal).

## Credits

- Based on [mineflayer-pvp](https://github.com/PrismarineJS/mineflayer-pvp) and [minecrafthawkeye](https://github.com/sefirosweb/minecraftHawkEye)
- Critical attack system inspired by modern PvP clients