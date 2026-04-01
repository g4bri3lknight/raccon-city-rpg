---
Task ID: 4 - Visual Overhaul + UI Redesign
Agent: Main
Task: Complete visual overhaul with RE-style HP bars, character/enemy images, inventory redesign, combat visual representations

Work Log:
- Generated 9 AI images: 3 character portraits (tank, healer, dps) + 6 enemy sprites (zombie, cerbero, licker, hunter, tyrant, nemesis) stored in public/images/
- Added ENEMY_IMAGES and CHARACTER_IMAGES mappings to enemies.ts
- Completely rewrote HpBar.tsx with RE-style ECG effect: SVG heartbeat line animation, color states (hp-green, hp-yellow, hp-red, hp-poison), scanning light effect, bleed drip animation, critical flash heartbeat
- Added ECG CSS animations to globals.css: ecg-scan, heartbeat, ecg-line, ecg-pulse, combat-sprite-hit, sprite-hit keyframes
- Redesigned InventoryPanel.tsx: icon-only 6-column grid, selected item detail panel slides up from bottom, rarity colors/borders, item actions (equip/use/combine), compact character stats bar
- Rewrote CombatScreen.tsx with visual battle scene: enemy sprites with HP overlays in top section, character sprites with HP bars in bottom section, hit/heal sprite animations (combat-sprite-hit class), active turn indicator, atmospheric scanline overlay
- Updated ExplorationScreen.tsx to use character images in party cards and new ECG HP bar
- Fixed lint error: replaced setState-in-useEffect with derived values from combat log

Stage Summary:
- All 9 images generated and stored in /public/images/characters/ and /public/images/enemies/
- HP bars now have RE-style ECG heartbeat animation with color transitions (green→yellow→red→purple for poison)
- Inventory now uses RE-style briefcase grid (icons only) with detail panel at bottom
- Combat screen shows visual character and enemy sprites with hit/heal animations
- Zero lint errors, dev server compiles successfully
---
### Work Task
Create all 9 React UI components for the Raccoon City turn-based RPG game, plus update the main page.tsx and globals.css with horror theme styling.

### Work Summary
Successfully created all required game UI components under `/home/z/my-project/src/components/game/`:

1. **TitleScreen.tsx** - Full-screen horror title with background image, glitch/flicker text effects via framer-motion, floating blood particles, "INIZIA" button, Umbrella Corporation branding, and corner decorations.

2. **CharacterSelect.tsx** - 3 archetype cards (Tank/Healer/DPS) with toggle selection (1-3), stat bars (HP/ATK/DEF/SPD), special ability info, passive descriptions, starting items, and "INIZIA L'AVVENTURA" confirmation button.

3. **ExplorationScreen.tsx** - 3-column responsive layout (location info + message log + action panel), location image with overlay, party HP bars, story event modal with choices, travel buttons, search/explore actions, boss fight button.

4. **CombatScreen.tsx** - Full combat UI with enemy display (HP bars, status effects, boss badges), scrollable combat log with color-coded entries, dynamic action panel (Attack/Special/Use Item/Defend/Flee), target selection with crosshair indicators, shake/flash animations on hit, enemy turn indicator with loading animation.

5. **InventoryPanel.tsx** - Full-screen modal overlay with character tabs, item grid with rarity-colored borders, equip/use actions per item, character stats summary, weapon display, inventory slot counter.

6. **GameOverScreen.tsx** - Dark red-tinted screen with glitch "GAME OVER" text, blood drip animations, floating skull decorations, stats summary (turns survived, characters used), "Riprova" restart button.

7. **VictoryScreen.tsx** - Golden/amber themed screen with glow effects, trophy icon, golden particles, celebration text, final party stats with HP bars, "GIOCA ANCORA" button.

8. **HpBar.tsx** - Reusable HP bar with animated width transitions, color coding (green >60%, yellow 30-60%, red <30%), size variants (sm/md/lg), percentage display, and status effect icons.

9. **StatBar.tsx** - Reusable stat display bar for character selection with label, animated fill bar, and value display.

**Additional work:**
- Added comprehensive horror CSS theme to globals.css: `.game-horror`, `.horror-text`, `.horror-border`, `.horror-btn`, `.horror-card`, `.horror-panel`, custom scrollbar, glitch/flicker/pulse-red/scanline animations, rarity color classes.
- Updated page.tsx to wire all components together using `useGameStore` phase-based rendering with AnimatePresence transitions.
- Fixed import paths in store.ts (`../` → `./`) that were preventing module resolution for game/engine/combat, game/types, and game/data files.
- All components pass ESLint with zero errors/warnings.
- Dev server compiles and serves page successfully (GET / 200).

---
Task ID: 5
Agent: Main Agent
Task: Transform HP bars into full RE-style health panels + verify inventory detail panel always visible

Work Log:
- Completely rewrote HpBar.tsx as RE-style health panel with condition system (FINE/CAUTION/DANGER/AVVELENATO/MORTO)
- Panel features: colored 2px border, glow effects, CRT scanline overlay, ECG heartbeat line, 12-segment health bar, faint grid overlay, character portrait support
- Three size variants: sm (compact), md (standard), lg (large)
- Dead state shows "NESSUN SEGNALE" flatline display
- Critical health (≤15%) triggers pulse animation on entire panel
- Rewrote EnemyHpBar to also use the panel style with same condition system
- Updated CombatScreen.tsx: removed inline HP bars from under character sprites, added dedicated "Stato Gruppo" section between sprites and combat log
- Updated InventoryPanel.tsx: changed character stats to use md-size health panel with portrait
- Verified inventory detail panel already always visible with empty state message

Stage Summary:
- HP display is now a full RE-style panel (boxed container with condition text, ECG, segmented bar) instead of a thin bar
- Combat screen shows 3 health panels in dedicated grid section below party sprites
- Inventory shows larger health panel with character portrait
- Inventory detail panel always visible (shows "Seleziona un oggetto per visualizzarne i dettagli" when empty)
- Zero build/lint errors
---
Task ID: 6 - Battle Arena Visual Overhaul
Agent: Main
Task: Replace bad pixel-art sprites with proper visuals + multi-layered animation system

Work Log:
- Removed all bad pixel-art sprites from /public/sprites/ and /public/spritesheets/
- Generated 6 AI enemy images in RE horror style (zombie, cerbero, licker, hunter, tyrant, nemesis) saved to /public/images/enemies/
- Updated ENEMY_IMAGES in enemies.ts to point to new AI-generated images
- Removed CHARACTER_SHEETS and ENEMY_SHEETS from enemies.ts (no longer needed)
- Removed AnimatedSprite.tsx component (sprite sheet system replaced)
- Created new BattleEntity.tsx component with multi-layered CSS animation system:
  - Circular portrait with inner vignette and breathing highlight
  - Player idle: gentle floating breathing animation
  - Enemy idle: menacing sway animation
  - Damage: red flash overlay + shake + burst particles + floating damage number
  - Heal: green glow overlay + rising particles + floating heal number
  - Defend: cyan pulsing ring + box-shadow aura
  - Dead: grayscale + slow fade + rotation + scale down
  - Active turn: bright red border + pulsing indicator dot
  - Boss: menacing red aura pulsing
  - Ground shadow: colored radial gradient (blue for allies, red for enemies) with breathing
  - Ambient particles: 6 floating dots per entity with randomized positions/timing
- Added comprehensive CSS animations to globals.css
- Rewrote CombatScreen.tsx arena section to use BattleEntity
- Character portraits in arena use CHARACTER_IMAGES (same as HP panels - consistent)
- Enemy portraits in arena use new AI-generated ENEMY_IMAGES
- Added atmospheric fog layer at bottom of arena

Stage Summary:
- Battle arena shows circular portraits with multi-layered animations
- All visuals coherent with profile images
- No more pixel art or static images with CSS transforms
- Each entity: idle animation, ground shadow, ambient particles, state effects
- Boss enemies larger with menacing aura
- Dead entities fade, grayscale, and tilt
- Zero lint errors, dev server OK
---
Task ID: 1
Agent: Main
Task: Fix item quantity bug, First Aid Kit, and create Debug Panel

Work Log:
- Fixed item consumption bug: items with qty>1 were being removed entirely instead of decreasing quantity (both in consumeItemOutsideCombat and executeCombatTurn)
- Updated First Aid Kit to restore full HP (9999 clamped to maxHp) and cure poison/bleeding
- Fixed heal message to show actual HP restored instead of raw value
- Added bleeding visual effect: blood streak on left side, dripping particles, red pulsing overlay
- Added poison visual effect: green sickly tint, floating bubbles rising
- Added CSS animations for all status effects
- Created comprehensive DebugPanel component with 7 sections
- Added 11 debug store actions
- Integrated F2 keyboard shortcut for debug toggle

Stage Summary:
- Items now correctly decrease quantity instead of disappearing
- Kit di Pronto Soccorso heals to full HP + cures status
- Visual status effects render on character portraits in combat
- Debug Panel accessible via F2 key with: heal all, god mode, give items/keys/ammo, apply/remove status, set level, spawn enemies, teleport to locations, kill enemies
---
Task ID: 2
Agent: Main
Task: Status effects visible in exploration phase + realistic blood drops

Work Log:
- Updated blood drip drops in CombatScreen.tsx: replaced simple rounded-bottom circles with realistic teardrop shape using border-radius: 50% 0 50% 50%
- Added 3 varied drops with different sizes (5x14, 6x16, 4x12px), positions, delays and durations for natural feel
- Updated blood-drip-fall CSS animation in globals.css: added rotate(-45deg) to all keyframes for teardrop orientation, with slight rotation shift during fall (-45deg to -25deg) for realism, scale transition from 0.6→1.1→0.4
- Added status effect overlays to ExplorationScreen.tsx character portraits:
  - Bleeding: red pulsing overlay + blood streak + 2 teardrop-shaped blood drips (smaller than combat due to portrait size)
  - Poison: purple/violet tint overlay (same poison-overlay class as combat)
- Made portrait container relative-positioned for overlay support

Stage Summary:
- Blood drops now have realistic teardrop shape (pointed top, round bottom) with rotation during fall
- Status effects (poison purple halo, bleeding blood drips) are now visible on character portraits during exploration phase
- Same CSS classes reused: bleeding-overlay, blood-streak, blood-drip, poison-overlay
- Drops scaled down for smaller exploration portraits (3-4px wide vs 4-6px in combat)
- Zero lint errors, dev server compiles successfully
---
Task ID: 3
Agent: Main
Task: Add second special ability per archetype (Immolazione, Cura Gruppo, Raffica)

Work Log:
- Added special2Name, special2Description, special2Cost to CharacterArchetype type
- Added 'special2' to CombatAction union type
- Added special2Cooldowns and tauntTargetId to CombatState
- Defined second specials in characters.ts:
  - Tank: Immolazione (taunt - all enemies target tank, CD 3 turns)
  - Healer: Cura Gruppo (heal all allies 35 HP each, CD 3 turns)
  - DPS: Raffica (primary target + 60% splash to other enemies, CD 3 turns)
- Implemented executePlayerSpecial2 in combat.ts with taunt, group heal, and area attack logic
- Modified executeEnemyAttack to accept forcedTargetId parameter for taunt mechanic
- Added special2 case handling in store.ts executeCombatTurn
- Added special2Cooldowns decrement in advanceToNextActor
- Added tauntTargetId clearing at new turn start
- Updated auto-combat AI to strategically use both specials
- Updated CombatScreen UI: two special buttons (amber + orange), cooldown badges
- Updated CharacterSelect to show both special abilities

Stage Summary:
- Each character now has 2 special abilities with independent cooldowns
- Tank: Barricata (CD2) + Immolazione/taunt (CD3)
- Healer: Pronto Soccorso single-target (CD2) + Cura Gruppo (CD3)
- DPS: Colpo Mortale single-target (CD2) + Raffica area attack (CD3)
- Taunt mechanic: enemies forced to attack tank for 1 turn, cleared at new turn
- Zero lint errors, compiles successfully
---
## Task ID: 7 - Audio Engine
### Work Task
Create a Web Audio API synthetic sound engine (`/home/z/my-project/src/game/engine/sounds.ts`) for the RE-style RPG game with 19 procedurally generated horror-themed sounds, singleton pattern, and lazy AudioContext initialization.

### Work Summary
Created `/home/z/my-project/src/game/engine/sounds.ts` (433 lines) — a production-quality TypeScript audio engine with the following architecture:

**Singleton `AudioEngine` class:**
- Lazy `AudioContext` initialization on first user interaction (browser autoplay policy compliant)
- Pre-generated 2-second white noise `AudioBuffer` for noise-based sounds
- Master `GainNode` for global volume control
- Context resume handling for suspended states
- Graceful fallback when Web Audio API unavailable

**Helper methods for sound synthesis:**
- `envelope()` — simple attack-decay ADSR via `GainNode` linear ramps
- `envelopeASR()` — attack-sustain-release for sustained tones
- `filter()` — `BiquadFilterNode` shorthand (lowpass/highpass/bandpass)
- `playTone()` — oscillator with frequency sweep + gain envelope
- `playNoise()` — filtered noise burst with configurable filter/gain/duration

**19 synthesized sounds implemented:**
| Sound | Technique | Duration |
|---|---|---|
| `playAttack()` | Bandpass noise + sine thud | ~150ms |
| `playRangedAttack()` | Highpass crack noise + exponential sine thump | ~200ms |
| `playEnemyHit()` | Lowpass noise + deep sine thud | ~180ms |
| `playPlayerHit()` | Bandpass noise + layered sine/triangle thud | ~200ms |
| `playHeal()` | Ascending sine + harmonic overtone + triangle shimmer | ~300ms |
| `playSpecial()` | Sawtooth sweep + sine shimmer + highpass noise sparkle | ~400ms |
| `playEncounter()` | Dissonant sawtooth tritone chord + noise sting | ~500ms |
| `playVictory()` | Four ascending triangle notes (C5→E5→G5→C6) + sparkle | ~600ms |
| `playDefeat()` | Descending sawtooth + sub-bass drone + dissonant noise | ~800ms |
| `playItemPickup()` | Sine + triangle bright ping | ~200ms |
| `playMenuOpen()` | Bandpass noise click + sine blip (880Hz) | ~50ms |
| `playMenuClose()` | Softer bandpass noise click + sine blip (660Hz) | ~50ms |
| `playMiss()` | Sweeping bandpass noise (4kHz→500Hz) whoosh | ~200ms |
| `playCritical()` | Bright bandpass slash + highpass crack + square buzz | ~200ms |
| `playDefend()` | Square metallic clang + sine ringing overtone + noise hit | ~200ms |
| `playPoisonTick()` | Wobbling sine (vibrato) + bubbly bandpass noise | ~250ms |
| `playBleedTick()` | Deep sine throb + sub-harmonic triangle + filtered noise | ~200ms |
| `playExplosion()` | Highpass crack + lowpass rumble + sine sub-bass + debris noise | ~350ms |
| `playTaunt()` | Sawtooth war horn + square harmonic + guttural noise | ~400ms |

**Exports:**
- `audio` — singleton `AudioEngine` instance
- `AudioEngine` type export
- 19 individual helper functions (`playAttack`, `playHeal`, etc.)
- `setMasterVolume(vol)` — global volume control (0-1, default 0.5)

**Volume/muting API on instance:** `setVolume()`, `toggleMute()`, `setMuted()`, `masterVolume`, `muted`, `isInitialized`

- Zero ESLint errors, dev server compiles successfully
---
Task ID: 4
Agent: Main
Task: Horror-styled notifications + Web Audio combat sounds

Work Log:
- Rewrote GameNotification.tsx with unified RE horror theme:
  - Created THEMES config object with 5 types (encounter, victory, defeat, item_found, bag_expand)
  - Each theme has: overlay gradient, card bg/border/shadow, scanline color, title color/glow
  - item_found: dark green card with sparkle particles and "TROVATO" label
  - encounter: blood red with warning flash borders and screen shake
  - All use Courier New monospace font for RE terminal feel
- Created /src/game/engine/sounds.ts (733 lines) - complete Web Audio API sound engine:
  - AudioEngine singleton with lazy AudioContext initialization
  - 19 synthetic sounds generated from oscillators + noise buffers
  - Combat: attack, rangedAttack, enemyHit, playerHit, miss, critical, defend, explosion
  - Status: poisonTick, bleedTick, heal
  - Ability: special, taunt
  - Events: encounter, victory, defeat, itemPickup
  - UI: menuOpen, menuClose
  - Master volume control with setMasterVolume()
- Wired sounds into CombatScreen via log-watching useEffect:
  - Detects new log entries and plays appropriate sound
  - Player attacks: melee slash vs gunshot based on weapon name
  - Specials: unique sound per ability (explosion for Raffica, taunt for Immolation, etc.)
  - Status ticks: poison/bleeding have distinct sounds
  - Victory/defeat/encounter/item sounds triggered by notification type

Stage Summary:
- All notifications now use consistent dark horror aesthetic with red/green/gold color coding
- 19 synthetic sound effects generated entirely via Web Audio API (no external files)
- Combat is now fully sonified: attacks, specials, heals, damage, status effects all have audio
- Zero lint errors, compiles successfully
---
Task ID: 8
Agent: BGM Audio Engine Rewrite
Task: Complete rewrite of BGM system with cinematic audio and location-specific ambient tracks

Work Log:
- Added ConvolverNode-based reverb system with synthesized 3s impulse response (decay 2.0)
- Expanded BgmType to include 6 location-specific ambient types: city_outskirts, rpd_station, hospital, sewers, laboratory, clock_tower
- Added 5 new helper methods for richer synthesis: createBgmFilteredNoiseWithLFO, createBgmPeriodicBlip, createBgmHarmonicDrone, createBgmStereoPad, createBgmRhythmicNoise
- Added createImpulseResponse() method for generating reverb impulse buffers
- Added bgmReverbSend() shortcut for connecting audio nodes to the reverb chain
- Added _periodicTimers array for tracking setInterval-based periodic blips
- Updated stopAllBgmNodes() to clear all periodic timers on track switch
- Built 8 unique cinematic BGM tracks:
  1. Title: Deep sub-bass drones (30Hz+50Hz), LFO wind sweep, thunder rumble, tension ping
  2. City Outskirts: Wind gusting, distant emergency sirens (dual bandpass LFO), urban rumble, metallic creak
  3. RPD Station: Fluorescent hum harmonics, empty hallway reverb noise, creaking metal, dissonant minor-2nd, footsteps
  4. Hospital: Heart monitor beep (periodic blip), fluorescent buzz, IV drip, breathing noise, eerie choir pad
  5. Sewers: Water flow, dripping water, underground rumble, tunnel wind, echoing metallic, claustrophobic drone pair
  6. Laboratory: Machine hum harmonics, server fan noise, data clicks, tritone tension, ventilation, warning alarm
  7. Clock Tower: Grand wind, clock ticking, deep bell resonance, epic tension chord, sub-bass rumble
  8. Combat (improved): 140bpm heartbeat, menacing sawtooth drone, aggressive noise, tritone chord, fast tremolo
- Improved Victory track: relieved perfect-5th drones, stereo A minor choir pad, subtle shimmer
- Improved Game Over track: extreme sub-bass, dying heartbeat, fading drone, maximum reverb
- Updated page.tsx with location-specific BGM mapping during exploration and interaction handler
- Exported BgmType type for use in page.tsx
- Zero lint errors, dev server compiles successfully

Stage Summary:
- BGM now sounds cinematic with convolver reverb, evolving LFO textures, and location-specific atmospheres
- Each of 6 game locations has a unique ambient soundscape with 5-7 layers each
- All BGM layers use reverb send for spatial depth and cinematic feel
- Periodic blip system enables heart monitors, dripping, ticking, and alarm sounds
- Harmonic drone system enables rich timbres for machine hums and electrical atmospheres
- Stereo pad system with StereoPanner enables wide choir-like pads for emotional moments
- Combat and victory/gameover tracks significantly improved with more layers and reverb
---
Task ID: 8
Agent: Main + BGM Rewrite Agent
Task: Complete rewrite of BGM system with cinematic audio and location-specific ambient tracks

Work Log:
- Added ConvolverNode-based reverb system with 3s synthesized impulse response (stereo, exponential decay)
- Expanded BgmType from 5 to 10 types: title, city_outskirts, rpd_station, hospital, sewers, laboratory, clock_tower, combat, victory, gameover
- Added 5 new synthesis helper methods: createBgmFilteredNoiseWithLFO, createBgmPeriodicBlip, createBgmHarmonicDrone, createBgmStereoPad, createBgmRhythmicNoise
- Built 8 unique cinematic BGM tracks:
  - Title: Sub-bass drones, wind sweep noise, distant thunder rumble, high tension ping
  - City Outskirts: Wind gusting, dual emergency sirens (LFO-modulated bandpass), urban rumble, metallic creak
  - RPD Station: Fluorescent harmonics (60/120/180Hz), empty hallway reverb, creaking metal, dissonant drone, footstep pulses
  - Hospital: Heart monitor beep (periodic 1040Hz blips), IV drips, breathing noise, clinical drone, eerie choir pad
  - Sewers: Water flow, dripping water blips, underground rumble (25Hz), tunnel wind, echoing metallic, claustrophobic beats
  - Laboratory: Machine harmonics (60Hz series), server fan noise, data processing clicks, tritone tension, ventilation, warning alarm
  - Clock Tower: Grand wind, metallic clock ticking, bell resonance, epic dissonant chord (110/155/165Hz), sub-bass
  - Combat: 140bpm heartbeat, menacing sawtooth through LFO-modulated lowpass, aggressive noise, tritone chord
- Improved Victory and GameOver tracks with reverb sends and stereo pads
- Updated page.tsx with location-to-BGM mapping during exploration phase
- All BGM layers use reverb send (bgmReverbSend) for cinematic spatial depth
- Zero lint errors, dev server compiles successfully

Stage Summary:
- BGM file grew from 1624 to 2488 lines (net +864 lines of new BGM code)
- All 19 SFX methods preserved unchanged
- Each of 6 game locations now has unique ambient soundscape
- Convolver reverb adds cinematic spatial quality to all BGM
- Combat, title, victory, gameover tracks all improved with richer layering
---
## Task ID: 4 - Audio File Size Reduction
### Work Task
Drastically reduce audio file sizes (sounds.ts + bgm.ts) to prevent Turbopack crash. Total was 2540 lines (1251 + 1289), target under 1600 total.

### Work Summary

**Results:**
- `sounds.ts`: 1251 → 537 lines (57% reduction)
- `bgm.ts`: 1289 → 380 lines (71% reduction)
- **Total: 2540 → 917 lines (64% reduction)**

**sounds.ts changes:**
- Stripped all verbose comments (JSDoc blocks, section separators, inline layer descriptions)
- Removed `playTone()` private helper (only 1 usage, inlined in `playEnemyHit()`)
- Removed `Waveform` type (no longer needed)
- Renamed private helpers for compactness: `envelope`→`env`, `filter`→`flt`, `playNoise`→`nz`, `createNoiseBuffer`→`makeNoise`
- Added `init()` helper returning `{ctx, t, d}` to reduce boilerplate in every SFX method (saves 2 lines × 19 methods)
- Reduced SFX layers from 4-5 to 2-3 per sound while preserving dark horror character
- Preserved all 19 public SFX methods, all BGM stubs, volume/muting API, and all exports

**bgm.ts changes:**
- Replaced 8 verbose helper functions with compact versions: `bgmOsc()`, `bgmTremolo()`, `bgmNoise()`, `bgmNoiseLfo()`, `bgmDrone()`, `bgmHarmonic()`, `bgmPulse()`, `bgmBlip()`, `bgmRhythm()`, `bgmStereoPad()`
- Each helper optionally connects to reverb send, eliminating most inline oscillator code in track builders
- Reduced track builders from 5-7 layers to 3-6 layers each (weighted by importance)
- Kept all 10 track builders with distinct character per location
- Preserved convolver reverb, install/monkey-patch logic, dynamic import mechanism
- All public API unchanged: same exports, same method signatures, same BgmType/BgmLayer types

**Public API preserved (zero breaking changes):**
- `audio` singleton, `AudioEngine` type, `BgmType` type
- All 19 SFX convenience functions
- All BGM convenience functions (playBgm, stopBgm, pauseBgm, resumeBgm, setBgmVolume)
- `setMasterVolume()`, `createLfo()`, `master()`, `ensureContext()`, `resume()`
- Dynamic import of bgm.ts via `import('./bgm')` in sounds.ts

- Zero ESLint errors, dev server compiles and runs stably
---
Task ID: 2 - Dark Glass UI Redesign
Agent: Frontend Styling Expert
Task: Apply dark glass aesthetic with transparent black panels and backdrop blur effects

Work Log:
- Added CSS custom properties to globals.css (.game-root class): --glass-bg, --glass-blur, --glass-border, --glass-border-active, --glass-shadow, --glass-inner-light
- Restyled InventoryPanel.tsx: dialog panel → bg-black/70 backdrop-blur-xl with border-white/[0.08], tabs → bg-white/[0.03] with active bg-white/[0.08], item slots → bg-white/[0.04]/[0.02], rarity badges → bg-white/10, buttons → border-white/10, transfer picker → same glass treatment
- Restyled ExplorationScreen.tsx: action buttons → bg-white/[0.06] with glass borders, party cards → bg-white/[0.03], message log → bg-white/[0.03], story event modal → dark glass, travel buttons → glass style, location header gradient → darker overlay
- Restyled CombatScreen.tsx: action context menu → bg-black/70 backdrop-blur-xl, item select → glass, combat log → bg-white/[0.03], auto-combat bar → glass, turn indicator badge → glass, bottom hint bar → glass
- Restyled DebugPanel.tsx: sidebar → rgba(0,0,0,0.8) with backdrop-blur(40px), section borders → white/[0.08], buttons → glass ghost style, level/spawn/teleport buttons → glass
- Restyled SaveLoadPanel.tsx: dialog → bg-black/70 backdrop-blur-xl, slot cards → bg-white/[0.03], buttons → glass ghost style
- Restyled GameMap.tsx: overlay → backdrop-blur-xl, panel → dark glass, danger node colors → glass base, key inventory → glass panel
- Restyled HpBar.tsx: all 4 HP panel variants → backdrop-blur(40px), border → rgba(255,255,255,0.08) (subtle white glow)
- Zero lint errors

Stage Summary:
- All overlay panels now use bg-black/70 backdrop-blur-xl with border-white/[0.08] and shadow-[0_8px_32px_rgba(0,0,0,0.5)]
- Borders use white/[0.06]-[0.08] instead of gray/red borders
- Text colors: white for primary, white/60 for secondary, white/40 for muted
- Buttons use ghost style: border-white/10 text-white/70 hover:bg-white/10 hover:text-white
- Badges use bg-white/10 text-white/70 border-0
- Tabs active: bg-white/[0.08] text-white border-white/20; inactive: text-white/40 hover:text-white/60
- RE red accent preserved for danger/boss/combat elements: border-red-500/30, text-red-400, bg-red-500/10
- HP bar panels use stronger backdrop-blur (40px) and subtle white borders
- All Framer Motion animations preserved unchanged
