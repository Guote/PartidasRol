# Characteristics (Stats)

## Summary
Primary characteristics (AGI, CON, DES, FUE, INT, PER, POD, VOL) are stored as raw values (1–20 typical). Rolls use `data-roll="1d100xa10TO100"` which triggers special 10TO100 conversion in `_onRoll`. The effective roll value depends on humanidad (human/inhumano/zen) and includes a level bonus.

## 10TO100 Formula

Applied whenever `dataset.roll` includes `"10TO100"`:

```js
statVal = stat.value           // 13
statRaw = stat.value * 10        // e.g. VOL 13 → 130

// Effective bonus (humanidad-capped):
human:   Math.min(statVal, 10) * 10     // cap at 10 → max 100
inhumano: Math.min(statVal, 13) * 10    // cap at 13 → max 130
zen:     statRaw (uncapped)

// Extra bonus:
inhumano AND statVal > 10  → +40 (Inhumanidad)
zen      AND statVal > 13  → +80 (Zen)

// Level bonus:
+ level * 10 (where level = system.general.level.value)

// Total: effectiveBonus + level*10 + extra
```

Example: VOL 13, inhumano, level 8
- effectiveBonus = min(13,13)*10 = 130
- extra = +40 (inhumanidad, statVal > 10)
- level bonus = 8*10 = 80
- Total = 130 + 40 + 80 = **250**

## Data Paths

```
system.characteristics.primaries
  .agility.value     (AGI)
  .constitution.value (CON)
  .dexterity.value   (DES)
  .strength.value    (FUE)
  .intelligence.value (INT)
  .perception.value  (PER)
  .power.value       (POD)
  .willPower.value   (VOL)

  Each stat also exposes (set by mutatePrimaryModifiers):
  .X.final.value    → base + temporal (stat used for rolls and caps)
  .X.mod            → attribute modifier (for secondary skill derivation)
  .X.rollBase.value → 10TO100 result excluding the d100 (shown in sheet UI)

system.flags.humanidad    → "human" | "inhumano" | "zen"
system.general.level.value → total level (direct field, NOT sum of categories)
```

## Humanidad caps

| humanidad | stat cap | extra bonus |
|-----------|---------|-------------|
| human | 10 | none |
| inhumano | 13 | +40 if stat > 10 |
| zen | uncapped | +80 if stat > 13 |

Same caps apply to TM (AGI), IP (FUE), Regen (CON).

## Combined roll with stats

When a characteristic is included in a combined roll, the full 10TO100 value (including level bonus and inhumanidad/zen extra) is divided by N (number of selected skills), then rounded down to the nearest multiple of 5.

The characteristic checkbox has `data-is-characteristic="true"` so the handler can distinguish it from secondary skills.

## Capacidades Físicas

Secondary characteristics derived from primary stats, shown in the Capacidades Físicas card in the skills tab. All three use the same humanidad caps as primary stat rolls. The card header hosts the humanidad toggle (human / inhumano / zen).

### TM — Tipo de Movimiento

Derived from **AGI** (`agility.final.value`).

```
base TM  = capped(AGI final, humanidad)   // e.g. AGI 15 human → base TM 10
final TM = base + mod + generalMod + armorPenalty
```

`generalMod = floor(modFinal.general.final / 20)`, capped at 0 (penalty only).
`armorPenalty` = sum of equipped armor movement restrictions, minus wearArmor slack.

User may add extra movement modes (swimming, flying, etc.) — each has its own base + mod editable pair. All modes share the same hidden modifiers (armor, effects, general).

Implemented in `mutateMovementType.js`.

### IP — Índice de Peso

Derived from **FUE** (`strength.final.value`).

```
base IP  = capped(FUE final, humanidad)   // same cap table as TM
final IP = base + mod + generalMod
```

`generalMod` same as TM (floor(modFinal.general.final / 20), ≤ 0).

The final IP value maps to weight thresholds: `max = IP*5 kg` (IP ≤ 10), with a non-linear table above 10.

Implemented in `mutateWeightIndex.js`. Uses `strength.final.value` (not bare `.value`) so temporal FUE modifiers are included.

### Regeneración

Derived from **CON** (`constitution.final.value`). Uses humanidad caps to get a `regenType` (1–20 scale), then maps that to HP recovery and wound penalty recovery rates. Not affected by generalMod or armor. Implemented in `mutateRegenerationType.js`.

## Implementation — base-to-final-input-small

All Capacidades Físicas rows use the shared partial `base-to-final-input-small.hbs` with these parameters:

```hbs
{{> "systems/animabf-guote/templates/actor-v2/components/base-to-final-input-small.hbs"
    baseReadonly=true
    baseValue=system.characteristics.secondaries.<stat>.base.value
    temporalName="system.characteristics.secondaries.<stat>.mod.value"
    temporalValue=system.characteristics.secondaries.<stat>.mod.value
    finalValue=system.characteristics.secondaries.<stat>.final.value
    width=70
}}
```

- `baseReadonly=true` renders the base as a read-only span (computed from the primary stat).
- The `mod` field is user-editable (temporal column).
- `finalValue` is computed server-side in the relevant `mutate*.js` function.
- `width=70` (narrower than the 80px used for primary stat rows).

The same component is used for primary characteristic rows (`characteristic-row.hbs`) with `baseReadonly=false` (editable base) and `width=80`.

## Related files
- `module/actor/ABFActorSheetV2.js` — `_onRoll()`, `toggle-combine-mode` handler
- `module/actor/utils/prepareActor/calculations/actor/general/mutateMovementType.js`
- `module/actor/utils/prepareActor/calculations/actor/general/mutateWeightIndex.js`
- `module/actor/utils/prepareActor/calculations/actor/general/mutateRegenerationType.js`
- `templates/actor-v2/components/characteristic-row.hbs`
- `templates/actor-v2/components/base-to-final-input-small.hbs`
- `templates/actor-v2/parts/tabs/skills.hbs` — Capacidades Físicas card
