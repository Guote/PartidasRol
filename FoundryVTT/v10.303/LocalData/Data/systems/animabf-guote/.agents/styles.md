# Styles — CSS Design System

Context for working on `styles/actor-sheet-v2.css`.

---

## Reuse Before Inventing

Before writing new CSS classes or HTML structures for any UI element, **search the existing templates and stylesheets** for something that already does the same thing visually. Use `Grep` on `templates/` and `styles/` for keywords describing the pattern (e.g. "save", "preset", "footer", "row").

If you're unsure whether something similar already exists, **ask the user** before creating new classes.

Common patterns already defined (do not reinvent):

| Pattern | Where it's used | Classes / structure |
|---------|----------------|---------------------|
| Preset name input + save button row | Attack dialog, Defense dialog, Defense preset edit | `<div class="preset-save-row">` + `<input class="preset-name-input">` + `<button class="abf-button save-*-preset" disabled>` — button enabled by JS when input has value |
| Load preset dropdown row | Attack dialog, Defense dialog | `<div class="preset-load-row">` + `<label class="preset-label">` + `<select class="preset-selector load-*-preset">` |
| Preset manager wrapper | Attack dialog, Defense dialog | `<div class="preset-manager">` wrapping both rows above |

---

## Scoping Rule

Every selector must be scoped under `.actor-sheet-v2`. No bare `v2-*` rules.

```css
/* Correct */
.actor-sheet-v2 .v2-card { ... }

/* Wrong — leaks into other Foundry windows */
.v2-card { ... }
```

---

## CSS Variables

Defined on `.actor-sheet-v2` (not `:root`) to avoid global leakage.

### Brand colors
```css
--abf-primary: #6e2917        /* dark red — headers, borders, accents */
--abf-primary-light: #8b3a24  /* hover states */
--abf-primary-dark: #4a1b10   /* gradients, deep shadows */
--abf-secondary: #dcd7b7      /* parchment — backgrounds, muted labels */
--abf-secondary-light: #e7e5da
--abf-background: #f5f3eb     /* tab body background */
--abf-text: #333333
--abf-text-light: #ffffff     /* text on dark backgrounds (header) */
--abf-text-muted: #666666
--abf-border: #6e2917
--abf-border-light: #ccc
--abf-success: #2e7d32
--abf-warning: #ed6c02
--abf-error: #d32f2f
```

### Resource colors (labels and accents only)
```css
--abf-hp: #80FF00       /* bright green */
--abf-fatigue: #d10000  /* red */
--abf-zeon: #80B3FF     /* light blue */
--abf-ki: #f5ed00       /* yellow */
--abf-psychic: #FFFFFF  /* white */
--abf-destiny: #a1923e  /* gold */
--abf-shield: #d508d9   /* purple */
```

### Spacing scale
```css
--space-1: 2px   --space-2: 4px   --space-3: 6px
--space-4: 8px   --space-5: 10px  --space-6: 12px
```

### Typography
```css
--font-size-2xs: 0.65rem   /* tiny labels, secondary info */
--font-size-xs:  0.70rem   /* muted labels */
--font-size-sm:  0.80rem   /* default body text */
--font-size-base: 0.875rem
--font-size-lg:  1.00rem
--font-size-xl:  1.125rem
```

### Borders / shadows / transitions
```css
--radius-sm: 3px  --radius-md: 5px  --radius-lg: 8px
--shadow-sm: 0 1px 2px rgba(0,0,0,0.1)
--shadow-md: 0 2px 4px rgba(0,0,0,0.15)
--transition-fast: 0.1s ease
--transition-base: 0.15s ease
```

---

## Naming Convention

BEM-like: `.v2-[block]__[element]--[modifier]`

- Block: `.v2-card`, `.v2-res`, `.v2-stat-block`, `.v2-skill-row`
- Element: `.v2-card__header`, `.v2-res__label`
- Modifier: `.v2-res--compact`, `.v2-res--hp`, `.v2-card--inline`

---

## Utility Classes

```css
.v2-text-center / .v2-text-right
.v2-text-muted       /* --abf-text-muted */
.v2-text-primary     /* --abf-primary */
.v2-font-bold
.v2-hidden           /* display: none !important */
.v2-mod--bonus / .v2-mod--positive    /* green */
.v2-mod--malus / .v2-mod--negative   /* red */
```

---

## Resource Text Glow Utilities

Three utility classes per resource color for text/icon emphasis.
All scoped to `.actor-sheet-v2`.

| Variant | Class example | Effect | Best on |
|---------|--------------|--------|---------|
| Plain color | `v2-text--ki` | Resource-colored text, no shadow | Any bg |
| Shadow | `v2-shadow--ki` | Dark (#111) text + resource-colored glow | Light bg |
| Glow | `v2-glow--ki` | Resource-colored text + dark shadow | Dark bg |

Available suffixes: `ki` · `zeon` · `psychic` · `hp`

**Tip:** `v2-shadow--ki` on a **dark** background renders as a pure glow — the dark
text becomes invisible, only the colored halo shows. This is intentional and useful for
icons inside dark cells (e.g., `.ki-acc-row__cell` with the yin-yang icon).

Equivalent in `guote-module.css` (global scope, no `.actor-sheet-v2` wrapper):
`.gzr-icon--ki` = same visual as `v2-shadow--ki`.

To add a new color variant, append three rules to `actor-sheet-v2.css`:
```css
.actor-sheet-v2 .v2-text--{res}   { color: var(--abf-{res}); }
.actor-sheet-v2 .v2-shadow--{res} { color: #111; text-shadow: 0 0 5px var(--abf-{res}); }
.actor-sheet-v2 .v2-glow--{res}   { color: var(--abf-{res}); text-shadow: 0 0 5px #111; }
```

---

## Block-Level Class Reference

| Class | Purpose |
|-------|---------|
| `.v2-header` | Sheet header bar (dark gradient) |
| `.v2-res` | Resource widget: icon + label + inputs |
| `.v2-res--{color}` | Color variant: `hp` `fatigue` `zeon` `ki` `psy` `destiny` `init` `shield` |
| `.v2-res--compact` | Stacked compact resource for the resources row |
| `.v2-res-group` | Groups 2+ resources in a shared pill |
| `.v2-card` | Content card with optional header |
| `.v2-card--inline` | Horizontal header + body layout |
| `.v2-card--stats` | Stats grid card variant |
| `.v2-card--skills` | 3-column skills layout |
| `.v2-table` | Data table with hover rows |
| `.v2-table--compact` | Tighter row padding |
| `.v2-table__input` | Inline input inside table cell |
| `.v2-grid--{n}` | CSS grid: `2` `3` `4` `8` `auto` columns |
| `.v2-input` | Standard text input |
| `.v2-input--number` | Narrow number input |
| `.v2-select` | Styled select element |
| `.v2-stat-block` | Label + value block (optionally rollable) |
| `.v2-combat-value` | Base input + final value pair |
| `.v2-skill-row` | Secondary skill: name + base + final + combine |
| `.v2-characteristic` | Primary stat: name + input + mod |
| `.v2-combine-btn` | Link icon button for combining rolls |
| `.v2-btn` | General purpose button |
| `.v2-btn--primary` | Primary action button |
| `.v2-btn--small` | Smaller button |
| `.v2-btn-icon` | Icon-only button |
| `.v2-btn-icon-sm` | Small icon-only button |
| `.v2-collapsible` | Expandable section |
| `.v2-notes-editor` | Rich text editor container |
| `.v2-checkbox-label` | Styled checkbox + label |
| `.v2-sidetabs` | Vertical side tab navigation |
| `.v2-effects-list` | Active effects display |
| `.v2-modifiers-table` | Modifier breakdown table |
| `.v2-zeon-display` | Zeon/accumulation display |
| `.v2-grimoire-*` | Grimoire summary widgets |

---

## Grid Divider Pattern

Any multi-column list of repeating items (skills, presets, etc.) uses **both row and column dividers** — not gaps or surrounding borders alone.

The outer container (card or group) provides the enclosing border with `overflow: hidden` to clip row/column corners:
```css
/* Card body must have padding: 0 so rows are flush to edges */
.v2-card__body { padding: 0; }
```

For an **N-column grid**, the item rules are:

```css
/* Row divider on every item */
.v2-my-row {
  border-bottom: 1px solid var(--abf-border-light);
}

/* Column divider: right border on all columns except the last */
.v2-my-row:not(:nth-child(Nn)) {
  border-right: 1px solid var(--abf-border-light);
}

/* No bottom border on the last row */
.v2-my-row:nth-last-child(-n+N) {
  border-bottom: none;
}

/* Hover highlight */
.v2-my-row:hover {
  background: var(--abf-secondary-light);
}
```

Replace `N` with the column count (3 for skills, 2 for presets).

**Applied to:**
- `.v2-skill-row` inside `.v2-card--skills` (3 columns — uses `N=3`)
- `.v2-preset-item` inside `.v2-preset-grid` (2 columns — uses `N=2`)

Do **not** add `border-radius` to individual rows — `overflow: hidden` on the outer container clips them correctly.

Do **not** add `:last-child { border-bottom: none }` — the `:nth-last-child(-n+N)` rule handles the last row correctly for all row counts.

---

## Foundry Input Width Override

Foundry's global CSS uses attribute-qualified selectors for inputs:

```css
input[type="text"], input[type="number"], input[type="password"], ... { width: 100%; }
```

An attribute selector `[type="number"]` has specificity **(0,1,0)**. Combined with the type selector `input` it totals **(0,1,1)**.

A plain class rule like `.my-input { width: 40px }` has specificity **(0,1,0)** and **loses** to Foundry's rule — the input stretches full-width regardless.

**Fix:** Always scope custom input-width rules under the dialog/container class:

```css
/* Wrong — (0,1,0) loses to Foundry's (0,1,1) */
.my-input { width: 40px; }

/* Correct — (0,2,0) beats Foundry's (0,1,1) */
.my-dialog .my-input { width: 40px; }
```

This is the input equivalent of the `button { width: 100% }` problem. The fix for buttons is `width: auto !important`; for inputs the cleaner fix is specificity scoping via the container class.

**Applied in:** `templates/dialog/mystic/zeon-calculator-dialog.hbs` — all `.zc-input*` and `.zc-res__input*` width rules are scoped under `.zeon-calculator`.

---

## Button Icon Alignment

Foundry's default button styles do **not** set `align-items: center`, so icons inside buttons sit at the baseline, not vertically centered with the text.

**Fix:** Always add `align-items: center` alongside `display: inline-flex` on any button that contains both an `<i>` icon and text:

```css
/* In a CSS class (preferred) */
.my-btn {
  display: inline-flex !important;
  align-items: center;
  gap: 0.3rem;
  width: auto !important;   /* also required — Foundry sets button { width: 100% } */
}
```

```handlebars
{{!-- Inline style fallback for one-off buttons --}}
<button style="width:auto!important;display:inline-flex;align-items:center">
  <i class="fas fa-save"></i> Guardar
</button>
```

**Applied in:** `zeon-calculator-dialog.hbs` — `.zc-btn` bakes in `display:inline-flex; align-items:center; width:auto`.

---

## Non-Default Input Highlight

When an input or select has a non-default value, apply a reddish tint so the user can quickly see that something has been changed from the default state.

**Color:** `rgba(120, 46, 34, 0.25)` — subtle warm red, works on both light and dark input backgrounds.

**Implementation:** Use `!important` to override any base background on the element:

```css
.zc-input--modified,
.zc-select--modified {
  background: rgba(120, 46, 34, 0.25) !important;
}
```

**In templates**, conditionally add the modifier class based on whether the value differs from its default:

```handlebars
{{!-- Numeric input: shaded when non-zero --}}
<input class="zc-input{{#if someValue}} zc-input--modified{{/if}}">

{{!-- Select: shaded when not the default option --}}
<select class="zc-select{{#if (is "neq" selectedValue defaultValue)}} zc-select--modified{{/if}}">
```

**Applied in:** `templates/dialog/mystic/zeon-calculator-dialog.hbs` — fatigue pointsToUse, fatigue bonusPerPoint (select, default +15), actModifier, spell extraAccumulate, spell extraReserve.

---

## Inline Styles vs Classes

Use **inline styles** only for one-off layout tweaks that won't repeat:
```handlebars
<div style="margin-top: var(--space-2);">
<th style="width: 60px;">
```

Add a **class or modifier** when the same pattern appears 2+ times or has semantic meaning.

Always use CSS variables — no raw hex values or pixel numbers outside the variable definitions.
