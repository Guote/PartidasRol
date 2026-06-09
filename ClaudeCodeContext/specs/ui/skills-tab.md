# Skills Tab (Habilidades)

## Tab Layout (top to bottom)

1. **Características primarias** card — primary stat rows (AGI, CON, …)
2. **Habilidades secundarias** card — secondary skill grid
3. **Combinaciones** card — saved combinations + combine button
4. **Rasgos** card (formerly "Habilidades especiales")
5. **Capacidades Físicas** card — TM / IP / Regeneración

---

## Primary Characteristics Card

Displays all 8 primary stats via `characteristic-row.hbs`. Each row has a combine checkbox (shown in combine mode) and a rollable name. Header shows only B / +T column labels.

---

## Secondary Skills Card

Shows `guotecundariasuno` and `guotecundariasdos` via `skill-row.hbs`.

Header: label "Habilidades secundarias" | B / +T / = column labels | *(no combine button here — moved to Combinaciones card)*

Each row: combine checkbox (hidden unless combine mode active) | rollable name | base-to-final-input-small.

---

## Combinaciones Card

### Header

```
[Combinaciones]                      [Combinar]
```

When combine mode is **active**:

```
[Combinaciones]             [Guardar combinación]  [Confirmar]
```

- **Combinar** — enters combine mode (adds `v2-combine-active` to `.v2-tab-skills`). Resets all combine checkboxes.
- **Confirmar** — executes the combined roll with selected checkboxes, then exits combine mode.
- **Guardar combinación** — opens an inline save row (see Save Flow below).

### Body

Each saved combination row:

```
[label input]    [combined final value]
```

- **Label input**: editable inline text input. Pre-filled with the auto-generated name on creation; user can rename at any time (saves on blur/Enter via `actor.update()`).
- **Combined final value**: read-only span, recalculated on each sheet render (see `secondary-skills.md` for formula).
- The entire row is **rollable** — clicking anywhere on the row (except the label input) triggers the combined roll for that saved combination. Uses `data-combination-id` to identify which entry to roll.
- **Right-click** opens a context menu with "Eliminar" to delete the entry.

### Save Flow (inline)

When "Guardar combinación" is clicked:

1. A temporary save row appears at the bottom of the card body:
   ```
   [auto-generated name (editable)]    [Guardar ✓]  [Cancelar ✗]
   ```
2. The name field is pre-filled with the joined skill labels (e.g., `"Anima + Percepción"`).
3. User can edit the name, then click ✓ or press Enter to confirm.
4. On confirm: push to `flags.savedCombinations`, `actor.update()`, exit combine mode, remove save row.
5. Cancelar or Escape: discard, exit combine mode.

---

## Rasgos Card

### Header

```
[Rasgos]                             [B]  [+T]  [=]   [+]
```

`[+]` button adds a new rasgo (same flow as existing "add special skill").

### Body

Each rasgo row:

```
[☑ checkbox]  [name (rollable)]  [base (readonly)]  [temporal input]  [= final]
```

- **Checkbox** (`v2-rasgo-checkbox`): **always visible**, regardless of combine mode. When checked, the rasgo is active and its `final.value` is included as a flat bonus (with its own name as label) in any roll from this tab.
- **Name**: rollable — clicking triggers a d100 roll using the rasgo's final value as the bonus (same as a skill roll, plus any other active rasgos).
- **Base**: read-only display, value = `characterLevel × 10`. Uses `base-to-final-input-small.hbs` with `baseReadonly=true`.
- **Temporal**: editable number input, stored as `system.dynamic.secondarySpecialSkills.{_id}.system.temporal.value`.
- **Final**: `base + temporal`, computed server-side.

Right-click on the row opens context menu with "Eliminar".

---

## Combine Mode (v2-combine-active)

When `.v2-combine-active` is present on `.v2-tab-skills`:

- All `.v2-skill-combine-checkbox` elements become visible (secondary skills + characteristics).
- Rasgo checkboxes (`v2-rasgo-checkbox`) remain always visible and are NOT affected by this class.
- The Combinaciones card header changes from "Combinar" to "Confirmar" + "Guardar combinación".

Combine checkboxes and rasgo checkboxes are **independent**:
- Combine checkboxes (`.v2-skill-combine-checkbox`): select which skills participate in the average.
- Rasgo checkboxes (`.v2-rasgo-checkbox`): always-active toggles that add flat bonuses to all tab rolls, regardless of combine mode.

---

## CSS Notes

- Combine checkboxes: `display: none` by default; `.v2-combine-active .v2-skill-combine-checkbox { display: block }`.
- Rasgo checkboxes: `display: block` always (no gating class needed).
- Buttons in card headers: `width: auto !important; display: inline-flex` to override Foundry's global `button { width: 100% }`.
