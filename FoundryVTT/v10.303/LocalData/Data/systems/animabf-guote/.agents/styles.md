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
--abf-hp: #c62828
--abf-fatigue: #f57c00
--abf-zeon: #1565c0
--abf-ki: #2e7d32
--abf-psychic: #7b1fa2
--abf-destiny: #ffd700
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

## Inline Styles vs Classes

Use **inline styles** only for one-off layout tweaks that won't repeat:
```handlebars
<div style="margin-top: var(--space-2);">
<th style="width: 60px;">
```

Add a **class or modifier** when the same pattern appears 2+ times or has semantic meaning.

Always use CSS variables — no raw hex values or pixel numbers outside the variable definitions.
