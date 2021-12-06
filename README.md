# Custom PVP.

This plugin is separated into two interfaces: bowpvp and swordpvp.

This is more of an extension of two separate plugins; minecrafthawkeye and mineflayer-pvp, respectively (for the time being).

This plugin provides the same functionality as either of those plugins, but also has:
### Swordpvp:
    - Better AABB hit range detection.
      - Projection from eye height to AABB of player entity, accurate to real MC hit detection. The original does a calc between foot pos of both entities, meaning its range is shorter.
    - provides crits, both legit and blatant. 
      - The packet crit module is based off of rusherhack's packet crit, let me know if there are better alternatives. (There shouldn't be, I looked. They all have the same functionality, just different numbers.)
    - Legit and blatant shielding.
      - "Legit" is a misnomer: the speed of the bot is not reduced when shielding. 
      - Have not bothered to implement; go ahead and make a pull request if you want that added.
    - Improved entity tracking.
      - As mineflayer-pathfinder sends position_look packets, I cannot truly "lock" onto a player as some hack clients do.
      - However, I did implement a forceLook in my util plugin that snaps the bot to the player's pos. 
    - Know when the target is shielding
      - Detects when an entity is shielding, then switch to axe to disable it.
      - I was operating under the assumption that one had to crit in order to disable a shield. I was mistaken, lol. 
      - I'll change this so that the bot hits with the axe and then immediately switches back later.

    Overall, expect a 80% crit rate if both bot and entity are moving INTELLIGENTLY. 95-100% crit rate otherwise.

### Bowpvp:
    - *Slightly* better aim.
      - The target for the bot was at it's head, aim at the body instead for more chance of hitting. Other than that, no major changes.
    - Predict shot between any two entities
      - Can accurately determine the trajectory and endpoint of a shot fired from any loaded entity's current yaw and pitch.
    - Know when the bot is aimed at
      - Exposes a boolean value displaying whether or not the bot is currently aimed at by the entity it's targeting. (All entities may be too expensive to maintain constantly.)


I will add further functionality later. If you are looking for crystal pvp, go ahead and check out https://github.com/nxg-org/mineflayer-auto-crystal.