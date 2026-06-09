# Secondary Skills

## Scoring (regular secondary skills)

Each secondary skill stores `base.value` (user-assigned points) and `temporal.value` (temporary bonus). The final value is computed in `mutateSecondariesData.js` using `mutateData`:

```
final = base + temporal + activeEffects + generalMod
```

`generalMod` = `modFinal.general.final.value` (from the global modifier pipeline). Exception: skill groups with their own modifier type bypass the general mod.

Secondary skills are split into two groups stored in `system.secondaries`:
- `guotecundariasuno` — first half of secondaries
- `guotecundariasdos` — second half

## Rasgos (formerly "Habilidades Especiales")

Rasgos are items of type `SECONDARY_SPECIAL_SKILL` stored in `system.secondaries.secondarySpecialSkills`. They are **optional bonuses** that can be applied to any skill/stat roll in the habilidades tab.

### Data model

```
system.secondaries.secondarySpecialSkills[i].system
  .base.value     → computed: characterLevel × 10 (readonly, never stored)
  .temporal.value → user-editable bonus
  .final.value    → computed: base + temporal (no generalMod, no activeEffects)
```

`mutateSecondariesData.js` loops over `secondarySpecialSkills` separately:
```js
for (const skill of secondarySpecialSkills) {
  skill.system.base.value  = actorLevel * 10;
  skill.system.final.value = skill.system.base.value + (skill.system.temporal.value ?? 0);
}
```

The old `system.level.value` field is ignored and kept only for backwards compat with existing actors.

### Checkbox behavior

Each rasgo has an **always-visible** checkbox (class `v2-rasgo-checkbox`). When checked:

- Every roll triggered from the habilidades tab includes that rasgo as a **separate term** in the roll formula.
- The term value = rasgo `final.value`.
- The term label = rasgo name (e.g., `"Sangre de Dragón"`).
- Multiple checked rasgos each produce their own labeled term.
- In a **combined roll**, rasgo terms are **flat bonuses** — they are NOT included in the N-skill average. They are appended after the averaged sum, just like `getModifierTerms` general modifiers.
- In a **saved combination roll**, same rule applies.

Implementation: before building any roll formula in the habilidades tab, collect all `.v2-rasgo-checkbox:checked` elements and push `{ value: parseInt(el.dataset.finalvalue), label: el.dataset.label }` into the values/labels arrays.

## Combined Roll Formula

When N skills/stats are selected:

```
combinedValue = sum over each skill i of: floor( effectiveValue_i / N / 5 ) × 5
```

Where `effectiveValue_i`:
- **Secondary skill**: `final.value` (already includes temporal + modifiers). At roll time the formula uses `floor(raw / N / 5) * 5` where `raw` is the skill's final.
- **Characteristic**: full 10TO100 value (effectiveBonus + level×10 + zen/inhumanidad extra + temporal×10). See `characteristics.md` for caps.

After the averaged sum, append (in order, if non-zero):
1. `getModifierTerms(actorSystem, 'general')` — standard general modifiers
2. Active rasgo terms (one term per checked rasgo, flat bonus, own label)
3. Manual modifier from `openModDialog()`

The characteristic checkbox carries `data-is-characteristic="true"` so the handler converts the raw stat value through the full 10TO100 pipeline before averaging.

## Saved Combinations

A saved combination is a stored list of skill/stat entries that the user can roll with one click at any time.

### Data structure

Stored in `system.flags.savedCombinations` (array, initialized `[]` in `template.json`):

```json
{
  "_id": "uuid",
  "label": "Anima + Percepción",
  "entries": [
    { "type": "secondary", "group": "guotecundariasuno", "key": "animaMagica" },
    { "type": "secondary", "group": "guotecundariasdos", "key": "percepcion" },
    { "type": "characteristic", "key": "perception" }
  ]
}
```

### Computed combined final (display only)

Shown on the card row at all times, updated whenever the sheet re-renders:

```
combinedFinal = floor( sum(effectiveValues) / N / 5 ) × 5
```

- Secondary entry: `system.secondaries[group][key].final.value`
- Characteristic entry: `system.characteristics.primaries[key].rollBase.value`

Null-safe: if a referenced skill no longer exists, treat its value as 0 and show the result without crashing.

### Save flow

1. User enters combine mode (clicks "Combinar" in the Combinaciones card header).
2. User selects checkboxes across the tab.
3. "Guardar combinación" button appears alongside "Confirmar".
4. Clicking "Guardar combinación":
   - Auto-generate label from selected skill names joined by " + " (e.g., `"Anima + Percepción"`).
   - Render an inline editable input pre-filled with that label so the user can rename it.
   - On confirm (Enter or blur), push the entry to `flags.savedCombinations` and call `actor.update()`.
5. Clicking "Confirmar" executes the combined roll (same logic as before) without saving.

### Roll behavior

Each saved combination row is **fully clickable** (behaves like other rollable rows — click anywhere except editable inputs triggers the roll). Right-click opens a context menu with at minimum a "Eliminar" option.

The roll executes the combined roll formula using the saved entries (same pipeline as the live combine handler), plus any currently checked rasgo bonuses.
