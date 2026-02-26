# CLAUDE.md — guote-module

Custom FoundryVTT module for game-specific tweaks that don't belong in `animabf-guote` (the system). Lives at `Data/modules/guote-module/`.

---

## Purpose

This module holds game-table-specific automation that is too opinionated for the base system:
- Automatic condition management during combat (surprise, on fire, maintenance triggers)
- Per-character macro dialogs for Ki/Zeon accumulation and rest
- Simple Calendar + SmallTime visual integration
- Standalone utility scripts run as Foundry macros

---

## File Structure

```
guote-module/
  module.json                          # Module manifest — only guote-module.js is registered
  guote-module.js                      # Entry point: all hooks live here
  helpers.js                           # Color interpolation helpers (not loaded by module.json)
  module-manipulation/
    simpleCalendar-smallTime.js        # Isolated color sync utility
  scripts/                             # Macro scripts — NOT auto-loaded, run manually from macro bar
    AcumulacionKi.js                   # Ki accumulation dialog
    AcumulacionZeon.js                 # Zeon accumulation dialog
    Combate.js                         # Damage calculator dialog
    Descanso.js                        # Rest/recovery macro
    EnLLamas.js                        # "On Fire" condition effect
    PotencialPsiquico.js               # Psychic potential roll
    AemiSangre.js                      # Character-specific (Aemi)
    RaenerDevorador.js                 # Character-specific (Raener)
    clearActiveEffects.js              # GM utility: clear all active effects
    getFoundryDataFromExcel.js         # Data import from Excel
    AcumulacionKi_2.js                 # Alternative Ki accumulation (WIP)
    AcumulacionKi_unfinishedGPT.js     # Unfinished/experimental
```

**Only `guote-module.js` is loaded automatically** (declared in `module.json`). All `scripts/` files must be pasted into Foundry's macro editor and saved as macros.

---

## Hook Architecture (`guote-module.js`)

### `updateCombat`
Fires every time combat advances (turn or round change). Handles:
1. **Surprise** — calls `applySurprise()`: any combatant whose initiative is ≥150 lower than the current combatant gets the "Sorpresa" condition (unless they have "Preveer Sorpresa"). Runs on round 1 and on every turn change.
2. **Maintenance macros** — calls `triggerMaintenanceMacro()` on round start: if a token has "Usando Ki" or "Usando Zeon" conditions, triggers the named macros "Mantenimiento: Ki" / "Mantenimiento: Zeon" for the owner.
3. **En Llamas** — if the current combatant has the "En Llamas" condition, triggers the "En Llamas" macro for the token owner.

### `updateCombatant`
Fires when a combatant is updated (e.g., initiative rolled). Re-evaluates surprise when all combatants have initiative.

### `updateWorldTime`
Fires when in-game time changes. Calculates a color from `COLOR_STOPS` (time-of-day palette) and applies it to the Simple Calendar header background.

---

## Dependency: Combat Utility Belt (`game.cub`)

All condition management uses `game.cub` from the **Combat Utility Belt** module:

```js
game.cub.hasCondition("Sorpresa", token)    // check
game.cub.addCondition("Sorpresa", token)    // apply
game.cub.removeCondition("Sorpresa", token) // remove
```

Condition names are in Spanish: `"Sorpresa"`, `"Preveer Sorpresa"`, `"Usando Ki"`, `"Usando Zeon"`, `"En Llamas"`.

**If `game.cub` is not available, all condition logic silently fails.** Always check before adding new condition logic.

---

## `macroCookies` Pattern

Scripts persist user selections between runs by storing state on the actor:

```js
// Reading
const macroCookies = actor.system?.macroCookies?.accumulationMacro;
const lastMode = macroCookies?.updateMode;

// Writing (save current selections for next time)
actor.update({
  "system.macroCookies.accumulationMacro.upkeep": upkeepKi,
  "system.macroCookies.accumulationMacro.updateMode": mode,
  "system.macroCookies.accumulationMacro.AGI": true,
});
```

Cookie namespaces currently in use:
- `system.macroCookies.accumulationMacro.*` — Ki accumulation dialog state
- `system.macroCookies.zeonAccumulation.*` — Zeon accumulation dialog state
- `system.macroCookies.combat.*` — Combat calculator (ATK, DEF, TA, BDMG)

`macroCookies` must exist in `template.json` of `animabf-guote`. If adding a new namespace, verify it's declared there.

---

## Actor Resolution Pattern in Scripts

All scripts use this standard block at the top to resolve the current actor:

```js
let currentToken, currentActor;

if (typeof token !== "undefined") {
  // Called from module with token injected into scope
  currentToken = token;
  currentActor = token.actor;
} else if (canvas.tokens.controlled?.[0]) {
  // User has a token selected
  currentToken = canvas.tokens.controlled[0];
  currentActor = currentToken.document.actor;
} else {
  // Fall back to user's default character
  let defaultActorId = game.users.get(game.userId)._source.character;
  currentActor = game.actors.get(defaultActorId);
}

if (!currentActor) throw new Error("Selecciona un token");
```

Use this exact pattern when writing new scripts.

---

## Script Summaries

| Script | What it does |
|--------|-------------|
| `AcumulacionKi.js` | Dialog for ki maintenance phase: choose accumulation mode (full/partial/stop), select characteristics, fatigue bonus, upkeep cost, cast cost. Updates `system.domine.kiAccumulation.*`. |
| `AcumulacionZeon.js` | Same pattern as Ki but for zeon. Updates `system.mystic.zeon.*`. |
| `Combate.js` | Simple damage calculator dialog: ATK, DEF, TA, BDMG → final damage or counter-attack bonus. Posts result to GM chat. |
| `Descanso.js` | Rest dialog: input number of days, auto-calculates HP/Fatigue/Ki/Zeon/CV recovery based on regeneration stats. **Note: uses legacy `data.*` API — needs updating to `system.*`.** |
| `EnLLamas.js` | Applies burn damage each turn for a token with "En Llamas" condition. |
| `PotencialPsiquico.js` | Psychic potential roll dialog with modifiers. |
| `clearActiveEffects.js` | GM utility to remove all active effects from selected tokens. |

---

## Known Issues / TODOs

- `Descanso.js` uses the v9-era `actor.update({ data: { ... } })` API. Should be `actor.update({ system: { ... } })`.
- `helpers.js` contains color utilities but is **not loaded** by `module.json`. Its code is duplicated in `guote-module.js`. Either register it or delete it.
- `PotencialPsiquico.js` has a `TODO` comment to export `getFormula` from the module instead of duplicating it.
- `AcumulacionKi_2.js` and `AcumulacionKi_unfinishedGPT.js` are unfinished alternatives — don't use them as reference.
