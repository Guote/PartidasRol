# Modifiers

## Motivation

Every stat is comprised of: **base value + modifiers = final value**.

There are several types of modifiers a roll or value can have:

- **Físico** — from physical sources (cansancio, críticos, vuelo, etc.)
- **Sobrenatural** — from supernatural sources
- **Maniobras voluntarias** — only apply to attack or defense; these **stack** (two -20 attack maniobras = -40 attack)

### General Modifier Calculation

Físico and Sobrenatural combine into a single **General modifier**:

> general = worst(físico maluses) + worst(sobrenatural maluses) + best(físico bonuses) + best(sobrenatural bonuses)

Example: if a character has físico maluses of -40 and -80, only the -80 counts toward general.

### Rounding Rules

- **÷ 20** (capacidades físicas, TM, Índice de Peso, Ki acum): `Math.floor(general / 20)` — integer, rounded down.
- **÷ 2** (Turno, ACT, Psychic Potential): `Math.floor(general / 10) * 5` — rounded down to nearest multiple of 5. Example: general = -47 → floor(-4.7) × 5 = **-25**.

### How General Modifiers Apply

| Stat / Roll                                             | Application                                   | Formula                               |
| ------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| Skill and stat rolls                                    | Full general modifier                         | `general`                             |
| Tipo de Movimiento                                      | ÷ 20, both signs                              | `floor(general / 20)`                 |
| Índice de Peso                                          | ÷ 20, both signs                              | `floor(general / 20)`                 |
| Turno                                                   | ÷ 2, both signs                               | `floor(general / 10) * 5`             |
| Regeneración                                            | Not applied                                   | —                                     |
| Resistances                                             | Not applied                                   | —                                     |
| Physical HA / HD                                        | Full general + maniobras (both signs)         | `general + maniobras`                 |
| Magic projection (HA/HD)                                | Only if general < 0; maniobras only if < 0    | `min(0, general) + min(0, maniobras)` |
| Psychic projection (HA/HD)                              | Only if general < 0; maniobras only if < 0    | `min(0, general) + min(0, maniobras)` |
| Summon HA / HD                                          | Only if general < 0; no maniobras             | `min(0, general)`                     |
| Ki accumulation per stat per turn                       | ÷ 20, only if general < 0; result minimum = 1 | `min(0, floor(general / 20))`         |
| Zeon ACT                                                | ÷ 2, only if general < 0                      | `min(0, floor(general / 10) * 5)`     |
| Summoning skills (convocar, atar, dominar, desconvocar) | Only if general < 0                           | `min(0, general)`                     |
| Psychic Potential                                       | ÷ 2, only if general < 0                      | `min(0, floor(general / 10) * 5)`     |

### Other Modifier Types

- **Instant modifiers** — ad-hoc per-roll modifiers entered via a quick dialog before/after pressing roll. These are already implemented.
- **Temporal modifiers** — temporary stat adjustments (e.g. a +3 Destreza effect). Stored separately from base so the base is never lost. ✅ Schema + pipeline implemented for all rollable stats and resistances. HBS inputs deferred.

---

## Implementation

### Storage

Physical, sobrenatural, and maniobras modifiers from all sources (cansancio, críticos, vuelo, etc.) are managed via Foundry conditions. Each source contributes one element to `modFisArray`, `modSobArray`, etc. The user-facing manual bonus/malus inputs (`modFisico.bonus.value`, `modFisico.malus.value`) are also elements of those arrays.

### Single Source of Truth Rule

The specific application rates and conditions in the table above are **subject to change** and must be defined in one central place. There should be a shared method always called to determine which modifier applies to a given roll — never hardcoded per-roll logic.

### Instant Modifiers

An extra dialog is shown when clicking to roll anything in the sheet. That dialog adds an instant modifier to the roll. ✅ Implemented.

### Temporal Modifiers

✅ Schema + pipeline implemented. `temporal: { value: 0 }` exists on all rollable stats and resistances. `mutateData.js` computes `final = base + temporal + activeEffectMod + callerModifier` for all stats that go through the pipeline. Resistances use `mutateResistancesData.js` (`final = base + temporal`, no general mod). Old actors default to 0 via `mergeObject({ overwrite: false })` + `?? 0` guard. HBS inputs deferred to the "Input layout" task below.

---

## Data Paths

```
system.general.modifiers
  .modFisico                   ← physical modifier group
    .bonus.value               ← user-entered bonus (positive)
    .malus.value               ← user-entered (positive = penalty; internally negated by -Math.abs())
    .final.value               ← computed: getMaxAndMin(modFisArray).min + .max
    .attack.conditionPen / .conditionBon   ← applied by CUB conditions
    .defense.conditionPen / .conditionBon  ← applied by CUB conditions
  .modSobrenatural             ← same structure as modFisico
  .modManiobras
    .ha                        ← manual attack maneuver modifier
    .hd                        ← manual defense maneuver modifier
  .modFinal
    .general.final.value       ← fis.pen + fis.bon + sob.pen + sob.bon
    .attack.final.value        ← general + ha + attack-specific conditionPen/Bon
    .attack.fis                ← fis contribution to attack final
    .attack.sob                ← sob contribution to attack final
    .defense.final.value       ← general + hd + defense-specific conditionPen/Bon
    .defense.fis               ← fis contribution to defense final
    .defense.sob               ← sob contribution to defense final
  .defenseCounter.value        ← current Ha Defendido stack count (0–3)
```

---

## getModifierTerms() types

Defined in `module/rolls/utils/getModifierTerms.js`:

| Type                      | What it returns                                        | Used for                                                         |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `"attack"`                | modFinal.attack.fis, .sob, .maniobras                  | combat attack rolls                                              |
| `"defense"`               | modFinal.defense.fis, .sob, .maniobras                 | combat defense rolls                                             |
| `"general"`               | modFisico.final, modSobrenatural.final (both signs)    | general skill rolls                                              |
| `"general-negative"`      | min(0, modFisico.final), min(0, modSobrenatural.final) | mystic/psychic/summon rolls                                      |
| `"general-negative-half"` | min(0, floor((modFis+modSob) / 10) × 5)                | psychic potential                                                |
| `"none"`                  | []                                                     | summon HA/HD (no character modifiers) — kept for discoverability |
| `"initiative"`            | floor(modFinal.general.final / 10) × 5                 | initiative rolls                                                 |

---

## Per-tab modifier rules (combat dialogs)

| Tab                   | Modifier type             | Note                         |
| --------------------- | ------------------------- | ---------------------------- |
| Combat (attack)       | `"attack"`                | full, both signs             |
| Combat (defense)      | `"defense"`               | full, both signs             |
| Mystic                | `"general-negative"`      | penalties only               |
| Psychic projection    | `"general-negative"`      | penalties only               |
| Psychic potential     | `"general-negative-half"` | penalties only, halved       |
| Summon HA/HD (dialog) | `"general-negative"`      | penalties only; no maniobras |

**Known issue:** The current `attack` modifier type (`general + maniobras`) is only correct for physical HA. For magic and psychic projection, maniobras should only apply when < 0 — there is currently no modifier type for this distinction.

---

## Ha Defendido penalty

Defense counter penalty is applied separately via `mutatePenalties.js`:

```js
const DEFENSE_COUNTER_PENALTIES = [0, -25, -50, -75];
const penalty = DEFENSE_COUNTER_PENALTIES[Math.min(3, defenseCounter.value)];
// Added to modDefenseFisArray and modDefenseSobArray
```

This flows into `modFinal.defense.final.value` automatically — no manual term needed.

---

## Current Sheet State (v2)

What is displayed (base / temporal / final) and whether the roll has an instant modifier dialog:

| Section                                       | Display                                                                | Instant mod dialog |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------ |
| Resistances                                   | final only (roll uses base — temporal in pipeline but not yet in roll) | ✅                 |
| Resources                                     | current + final (no temporal)                                          | — (not rollable)   |
| Combat — ataque, parada, turno natural        | base + temporal + final                                                | ✅                 |
| Habilidades — primary stats                   | base + temporal + final + stat-level mod                               | —                  |
| Habilidades — secundarias                     | base + temporal + final                                                | ✅                 |
| Habilidades — special skills                  | base + temporal + final                                                | ✅                 |
| Habilidades — capacidades físicas             | temporal + final                                                       | — (not rollable)   |
| Summoning — convocar/atar/dominar/desconvocar | base + temporal + final                                                | ✅                 |
| Domine — ki acum per stat                     | base + temporal + final                                                | ✅                 |
| Psychic — proy ofensiva/defensiva/potencial   | base + temporal + final                                                | ✅                 |
| Grimorio — proy ofensiva/defensiva            | base only (mystic tab wraps v1; temporal deferred)                     | ✅                 |
| Grimorio — ACT                                | base + final (mystic tab wraps v1; temporal deferred)                  | ✅                 |
| Attack/defense dialogs                        | final values + inline instant mod options                              | ✅                 |

**Roll formula principle (desired):** `base + temporal + applicable_general_mod + instant_mod`. The correct general mod depends on the roll type (see the application table above).

---

## Related files

- `module/actor/utils/prepareActor/calculations/actor/modifiers/mutatePenalties.js`
- `module/actor/utils/prepareActor/utils/mutateData.js` — central derive utility; computes `final = base + temporal + activeEffectMod + callerModifier`
- `module/actor/utils/prepareActor/calculations/actor/general/mutateResistancesData.js` — derives resistance finals (`final = base + temporal`)
- `module/rolls/utils/getModifierTerms.js`
- `templates/actor-v2/parts/tabs/effects.hbs`
- `templates/actor-v2/parts/header/resistances-compact.hbs` — displays `final.value` for resistances in header
