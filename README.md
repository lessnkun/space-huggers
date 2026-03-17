# SpaceHuggers

**Version:** 1.1.0 (March 2026) — JS13k 2021 entry, continued development  
**Engine:** [LittleJS](https://github.com/KilledByAPixel/LittleJS) (WebGL-accelerated)  
**Author:** Frank Force  
**License:** See [LICENSE](LICENSE)

---

## Gameplay Summary

SpaceHuggers is a 2D side-scrolling action platformer for up to **4 players** in local co-op. Every level is **procedurally generated** — unique terrain, multi-story enemy bases, canyons, and cave complexes are created fresh each run.

**Goal:** Eliminate every enemy on the level. Once the last enemy falls, players earn bonus lives and the next (larger) level begins. The game continues indefinitely, scaling difficulty until all shared lives are exhausted.

**Lives system:** All players share a pool of **16 lives**. Clearing a level rewards **+3 lives**. When a player dies they respawn at the last activated **checkpoint flag**. If no lives remain, the game restarts from the beginning.

**Progression:** Each new level grows in width (capped at 400 tiles) and spawns significantly more enemies — starting at 15 and growing by 30 per level, up to 300 enemies per level.

---

## Controls

| Action        | Player 1 (keyboard)              | Player 2 (keyboard)       | Gamepad (any player) |
|---------------|----------------------------------|---------------------------|----------------------|
| Move          | `W A S D`                        | Arrow Keys                | Left stick           |
| Jump          | `W`                              | `↑`                       | Button 0             |
| Shoot         | Mouse left / `Q`                 | `/`                       | Button 2             |
| Throw grenade | Mouse right / `E`                | `.`                       | Button 1             |
| Dodge / Roll  | Mouse middle / `Shift`           | `,`                       | Button 3             |
| Shield (P2)   | —                                | `Space`                   | —                    |
| Climb ladder  | `W` / `S` (near ladder)         | `↑` / `↓` (near ladder)  | Stick up/down        |

Players 3 and 4 use gamepads only.

---

## Features

### Core Mechanics
- **Variable-height jump** — hold jump longer to jump higher
- **Dodge / Roll** — brief invincibility window; damages enemies on contact; 2-second recharge (visual flash indicator)
- **Ladder climbing** — grab ladders at head or feet height
- **Wall climbing** — strong and elite enemies can scale walls; players can grab wall edges
- **Checkpoints** — flag poles scattered across each level; activate by walking past; red flag = active

### Weapons & Combat
- **Auto-fire weapon** — all characters carry one; shell casings are ejected as particles
- **Grenade** (Player 1) — bounces, beeps, explodes after 3 seconds; alerts nearby enemies
- **TNT Grenade** (Player 2) — green block variant with pulsing glow and wider blast radius
- **Super Laser Weapon** (Player 2 special) — thick laser beam
- **Rocket Tracking Weapon** (Player 1 special) — homing rocket that seeks the nearest enemy
- **Shield** (Player 2) — hold `Space` to block incoming projectiles
- Bullets can **partially destroy tiles** (dirt, glass) on impact

### Enemy Types
| Type         | Color  | Health | Special ability                          |
|--------------|--------|--------|------------------------------------------|
| Weak         | Green  | 1      | Smaller size, slower reaction            |
| Normal       | Blue   | 1      | Standard                                 |
| Strong       | Red    | 2      | Can wall-climb                           |
| Elite        | White  | 4      | Dodges, wider vision, reacts faster      |
| Grenade      | Purple | 4      | Throws grenades                          |
| Big variant  | Any    | ×2     | 5% chance, larger, more grenades, tougher|

Enemies use line-of-sight checks, react with a surprise delay, alert nearby allies, pursue last known player position, and retreat/search when the player is lost.

### Destructible Environment
- **Terrain tiles:** dirt, solid, glass, pipes, base panels — bullets and explosions can carve holes
- **Crates:** wood (flammable), metal (sturdy), explosive (chain-detonates nearby objects)
- **Barrels:** explosive, high-explosive (red — detonates quickly), water (splashes), metal
- **Rocks:** heavy; crushes characters beneath them; lava-rock variant sets targets on fire

### Fire System
- Objects marked `canBurn` catch fire when hit by flame or lava
- Fire **spreads** to nearby combustible objects over time
- Players can be **extinguished** by performing a dodge roll
- Burning enemies panic and move erratically

### Procedural Level Generation
- Randomised rolling terrain with hills, slopes, and canyons
- Enemy bases: surface towers (up to 6 floors) or underground cave complexes with basements
- Floors connected by internal ladders; windows and back-panels vary per floor
- Props and enemies distributed across each floor of every base
- Checkpoints placed at randomised intervals along the level

### Visual & Audio Effects
- WebGL sprite rendering with additive blending for fire/glow effects
- Particle systems: blood splatter, explosions, water, fire, shell casings, debris
- Persistent particles stamped onto the tile layer (blood stains remain on terrain)
- Procedural sky gradient with dynamic rain and wind particle effects
- Programmatic sound effects via ZzFX (no audio assets — all sound is synthesised)
- Screen fade transitions between levels

### Technical
- Built with **[LittleJS](https://github.com/KilledByAPixel/LittleJS)** — a tiny JavaScript game engine
- WebGL rendering with a canvas 2D fallback for non-Chromium browsers
- All assets (graphics, audio) generated at runtime — no external files required
- Originally shipped under the **13 KB** limit for [JS13k Games 2021](https://js13kgames.com/)

---

## Running the Game

Open `index.html` in a Chromium-based browser (Chrome, Edge) for the best experience. Firefox and other browsers fall back to canvas 2D rendering with reduced visual quality.

No build step required for development. The `build.bat` script packages the game for submission/distribution.
