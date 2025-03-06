<div align="center">
  
# SwordPvp Module

*Advanced PvP combat system for Mineflayer bots*

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/project)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Table of Contents

- [SwordPvp Module](#swordpvp-module)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Methods](#methods)
    - [▸ **attack(`entity: Entity`): `void`**](#-attackentity-entity-void)
    - [▸ **stop(): `void`**](#-stop-void)
    - [▸ **changeWeaponState(`weapon: string`): `Item | null`**](#-changeweaponstateweapon-string-item--null)
    - [▸ **checkForWeapon(`weapon?: string`): `Item | null`**](#-checkforweaponweapon-string-item--null)
    - [▸ **equipWeapon(`weapon: Item`): `Promise<boolean>`**](#-equipweaponweapon-item-promiseboolean)
    - [▸ **entityWeapon(`entity?: Entity`): `Item`**](#-entityweaponentity-entity-item)
    - [▸ **entityShieldStatus(`entity?: Entity`): `boolean`**](#-entityshieldstatusentity-entity-boolean)
  - [Properties](#properties)
  - [Generic Config](#generic-config)
  - [Tap Config](#tap-config)
  - [Strafe Config](#strafe-config)
  - [Criticals Config](#criticals-config)
  - [On Hit Config](#on-hit-config)
  - [Rotate Config](#rotate-config)
  - [Shield Config](#shield-config)
  - [Shield Disable Config](#shield-disable-config)
  - [Swing Config](#swing-config)
  - [Follow Config](#follow-config)
  - [startedAttacking](#startedattacking)
    - [Parameters](#parameters)
    - [Example](#example)
  - [stoppedAttacking](#stoppedattacking)
    - [Example](#example-1)
  - [attackedTarget](#attackedtarget)
    - [Parameters](#parameters-1)
    - [Example](#example-2)
  - [Examples](#examples)

---

## Overview

The SwordPvp module provides advanced combat functionality for Mineflayer bots. It implements various PvP strategies including sprint-tapping, strafing, criticals, shield usage, and more. The system is highly configurable to adapt to different PvP styles and server configurations.

---

<h1 align="center">SwordPvp</h1>

<p align="center"><i>The main class that manages PvP functionality for your bot.</i></p>

## Methods

### ▸ **attack(`entity: Entity`): `void`**

Initiates combat with the specified entity. This will set the entity as the current target and begin the attack sequence.

### ▸ **stop(): `void`**

Stops combat with the current target. This clears all control states and stops tracking the entity.

### ▸ **changeWeaponState(`weapon: string`): `Item | null`**

Changes the preferred weapon type and returns the weapon item if available, or null if not found.

### ▸ **checkForWeapon(`weapon?: string`): `Item | null`**

Checks if the bot has the specified weapon type (defaults to current weaponOfChoice if not specified).

### ▸ **equipWeapon(`weapon: Item`): `Promise<boolean>`**

Equips the specified weapon item and returns whether it was successful.

### ▸ **entityWeapon(`entity?: Entity`): `Item`**

Returns the weapon currently held by the specified entity (or the bot if not specified).

### ▸ **entityShieldStatus(`entity?: Entity`): `boolean`**

Returns whether the specified entity (or the bot if not specified) has an active shield.

## Properties

| Property | Type | Description |
|:---------|:-----|:------------|
| `target` | `Entity \| undefined` | The entity currently being attacked. |
| `lastTarget` | `Entity \| undefined` | The previous target that was attacked. |
| `weaponOfChoice` | `string` | The preferred weapon type (default: "sword"). |
| `meleeAttackRate` | `MaxDamageOffset` | The timing manager for attack cooldowns. |
| `ticksToNextAttack` | `number` | Countdown ticks until the next attack can occur. |
| `ticksSinceTargetAttack` | `number` | Ticks elapsed since the target last attacked. |
| `ticksSinceLastHurt` | `number` | Ticks elapsed since the bot was last damaged. |
| `ticksSinceLastTargetHit` | `number` | Ticks elapsed since the bot last hit the target. |
| `wasInRange` | `boolean` | Whether the target was in attack range during the last tick. |
| `wasVisible` | `boolean` | Whether the target was visible during the last tick. |

---

<h1 align="center">Configuration</h1>

<p align="center"><i>Customize the PvP behavior with these extensive configuration options.</i></p>

## Generic Config

Basic settings that affect all PvP behavior.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `viewDistance` | `number` | Maximum distance before losing target. | `128` |
| `attackRange` | `number` | Maximum distance for attacks. | `3` |
| `tooCloseRange` | `number` | Distance at which the bot will stop approaching. | `2.5` |
| `missChancePerTick` | `number` | Probability of missing an attack (0.0-1.0). | `0.0` |
| `enemyReach` | `number` | Estimated reach of enemy players. | `3` |
| `hitThroughWalls` | `boolean` | Whether to allow attacks through walls. | `false` |

## Tap Config

Settings for sprint-tapping techniques that reset knockback.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether sprint-tapping is enabled. | `true` |
| `mode` | `"wtap" \| "stap" \| "sprintcancel"` | The sprint-tapping technique to use. | `"wtap"` |
| `delay` | `number` | Delay in ticks for the sprint-tap. | `0` |

## Strafe Config

Settings for circular and random movement during combat.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether strafing is enabled. | `true` |
| `mode.mode` | `"circle" \| "random" \| "intelligent"` | Strafing pattern to use. | `"intelligent"` |
| `mode.maxOffset` | `number` | Maximum angle offset for strafing (radians). | `Math.PI / 2` |

## Criticals Config

Settings for performing critical hits.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether criticals are enabled. | `true` |
| `mode` | `"hop" \| "shorthop" \| "packet"` | Method for performing criticals. | `"hop"` |
| `attemptRange` | `number` | Range within which to attempt criticals. | `2` |
| `reaction.enabled` | `boolean` | Whether to use reactive criticals. | `true` |
| `reaction.maxPreemptiveTicks` | `number` | Ticks to preemptively initiate critical. | `1` |
| `reaction.maxWaitTicks` | `number` | Maximum ticks to wait for falling. | `5` |
| `reaction.maxWaitDistance` | `number` | Maximum distance to wait for falling. | `5` |

## On Hit Config

Behavior when the bot is hit by an opponent.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether on-hit behaviors are enabled. | `true` |
| `mode` | `"backoff"` | Behavior mode when hit. | `"backoff"` |
| `kbCancel.enabled` | `boolean` | Whether to attempt knockback cancellation. | `true` |
| `kbCancel.mode` | `"jump" \| "velocity" \| "shift" \| "jumpshift"` | Knockback cancellation method. | `"jump"` |

## Rotate Config

Settings for how the bot aims at the target.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether automatic rotation is enabled. | `true` |
| `smooth` | `boolean` | Whether to use smooth rotation. | `false` |
| `lookAtHidden` | `boolean` | Whether to look at targets even when not visible. | `true` |
| `mode` | `"legit" \| "instant" \| "constant" \| "silent" \| "ignore"` | Rotation behavior mode. | `"constant"` |

## Shield Config

Settings for shield usage.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether shield usage is enabled. | `true` |
| `mode` | `"legit" \| "blatant"` | Shield usage behavior. | `"legit"` |

## Shield Disable Config

Settings for disabling opponent shields.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `enabled` | `boolean` | Whether shield disabling is enabled. | `true` |
| `mode` | `"single" \| "double"` | Shield disabling attack pattern. | `"single"` |

## Swing Config

Settings for attack swing behavior.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `mode` | `"killaura" \| "fullswing"` | Attack swing behavior mode. | `"fullswing"` |

## Follow Config

Settings for following entities during combat.

| Property | Type | Description | Default |
|:---------|:-----|:------------|:--------|
| `mode` | `"jump" \| "standard"` | Method used for following targets. | `"standard"` |
| `distance` | `number` | Distance to maintain when following. | `3` |
| `predict` | `boolean` | Whether to predict target movement. | `true` |
| `predictTicks` | `number` | Number of ticks to predict ahead (if predict is true). | `undefined` |

---

<h1 align="center">Events</h1>

<p align="center"><i>Subscribe to these events to respond to combat state changes.</i></p>

## startedAttacking

Fired when the bot begins attacking a new target.

### Parameters

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `target` | `Entity` | The entity that the bot has started attacking. |

### Example

```js
bot.pvp.on('startedAttacking', (target) => {
  console.log(`Started attacking: ${target.name || target.username || 'Unknown entity'}`)
})
```

## stoppedAttacking

Fired when the bot disengages from its current target.

### Example

```js
bot.pvp.on('stoppedAttacking', () => {
  console.log(`Combat ended - no longer attacking`)
})
```

## attackedTarget

Fired each time the bot performs an attack against its target.

### Parameters

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `target` | `Entity` | The entity that was attacked. |
| `reason` | `string` | The reason for the attack (e.g., "normal", "reaction", "disableshield"). |
| `ticksToNextAttack` | `number` | The number of ticks until the next attack is possible. |

### Example

```js
bot.pvp.on('attackedTarget', (target, reason, ticksToNextAttack) => {
  console.log(`Attacked target: ${target.name || target.username}`)
  console.log(`Attack reason: ${reason}`)
  console.log(`Next attack in: ${ticksToNextAttack} ticks`)
})
```

---

## Examples

Here's a basic example showing how to use the SwordPvp module:

```js
// Import the module
const { SwordPvp } = require('mineflayer-sword-pvp')

// Create your bot
const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'Fighter'
})

// Initialize the pvp instance with custom config
bot.loadPlugin(require('@nxg-org/mineflayer-util-plugin'))
const pvp = new SwordPvp(bot, {
  genericConfig: {
    attackRange: 3.5,
    viewDistance: 100
  },
  critConfig: {
    enabled: true,
    mode: 'packet'
  }
})

// Attack the nearest player
bot.on('physicsTick', () => {
  const player = bot.nearestEntity(entity => 
    entity.type === 'player' && 
    entity.position.distanceTo(bot.entity.position) < 6
  )
  
  if (player && !pvp.target) {
    pvp.attack(player)
  }
})

// Listen for pvp events
pvp.on('startedAttacking', (target) => {
  bot.chat(`Engaging ${target.username || target.name}!`)
})

pvp.on('stoppedAttacking', () => {
  bot.chat('Combat complete')
})

// Stop attacking on command
bot.on('chat', (username, message) => {
  if (message === 'stop' && username === bot.username) {
    pvp.stop()
  }
})
```

Advanced example with weapon switching and shield control:

```js
// Enable shield disabling for newer versions of Minecraft
if (!bot.supportFeature('doesntHaveOffHandSlot')) {
  // Auto-switch to axe when target is shielding
  pvp.on('attackedTarget', async (target, reason) => {
    if (reason === 'disableshield') {
      bot.chat('Breaking shield!')
    }
  })
  
  // Place shield in offhand if available
  const shield = bot.inventory.items().find(item => item.name.includes('shield'))
  if (shield) {
    await bot.equip(shield, 'off-hand')
  }
}
```