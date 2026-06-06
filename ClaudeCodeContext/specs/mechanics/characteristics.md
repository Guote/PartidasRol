# Characteristics (Stats)

## Summary
Primary characteristics (AGI, CON, DES, FUE, INT, PER, POD, VOL) are stored as raw values (1–20 typical). Rolls use `data-roll="1d100xa10TO100"` which triggers special 10TO100 conversion in `_onRoll`. The effective roll value depends on humanidad (human/inhumano/zen) and includes a level bonus.

## 10TO100 Formula

Applied whenever `dataset.roll` includes `"10TO100"`:

```js
statRaw = stat.value * 10        // e.g. VOL 13 → 130
statVal = statRaw / 10           // 13

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

## Related files
- `module/actor/ABFActorSheetV2.js` — `_onRoll()`, `toggle-combine-mode` handler
- `module/actor/utils/prepareActor/calculations/actor/general/mutateMovementType.js`
- `templates/actor-v2/components/characteristic-row.hbs`
