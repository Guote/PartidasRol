# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Context Files

Specialized context is in `.agents/`. Before starting any non-trivial task, read `.agents/index.md` to identify which files are relevant for the task at hand, then read those files.

## Large Task Planning

For tasks involving multiple phases or many file changes, create `currentPlan.md` at the project root before starting work. Update it as subtasks complete. If a session is interrupted, the next session should read this file first to know where to resume.

**When to create it:** 5+ files to change, or 3+ distinct phases, or the task spans multiple sessions.

**Format:**
```markdown
# Current Task: [name]

## Goal
[What needs to be done and why]

## Subtasks
- [x] Completed step
- [ ] **← RESUME HERE** Next step
- [ ] Later step

## Key Decisions
- [Important choices made during the task]

## Notes
- [Anything a new session needs to know to continue correctly]
```

Delete `currentPlan.md` when the task is fully complete.

## Project

**AnimaBF-Guote** — Anima Beyond Fantasy RPG system for Foundry VTT v10.
- **System ID**: `animabf-guote` | **Foundry**: v10 (10.303) | **Languages**: Spanish (primary), English, French
- Required modules: libWrapper (v1.12.12.1+), Compendium Folders (v2.6.1+)
- Entry point: `animabf-guote.mjs` | No build step — press F5 in Foundry to reload

## Localization (lang/es.json)

Only `lang/es.json` is maintained — never edit `en.json` or `fr.json`.

### Critical: no key-prefix conflicts

FoundryVTT builds its translation lookup by expanding dot-separated keys into a nested object via `setProperty()`. If one key's full path equals an **intermediate segment** of another key's path, the second assignment tries to set a property on a string value and fails — silently breaking **all** translations for the session.

**Bad** — `saveCurrent` is both a leaf value and an intermediate node:
```json
"anima.ui.combat.saveCurrent": "Guardar actual",
"anima.ui.combat.saveCurrent.tooltip": "..."
```

**Good** — flatten any sub-keys that would create a prefix conflict:
```json
"anima.ui.combat.saveCurrent": "Guardar actual",
"anima.ui.combat.saveCurrentTooltip": "..."
```

**Rule:** never add a key `foo.bar.baz` if `foo.bar` already exists as a key (or vice versa). Suffixes like `Title`, `Label`, `Tooltip` (camelCase, no dot) are the safe pattern.

## CSS: Foundry Global Overrides

### `button { width: 100% }`
Any inline or icon button MUST use `width: auto !important; display: inline-flex` to override this.

### `input[type="number"] { width: 100% }` (and other input types)
Foundry's input rules use attribute selectors — `input[type="number"]` has specificity **(0,1,1)**, which beats a plain class selector **(0,1,0)**. Any custom input width MUST be scoped under the dialog/container class:

```css
/* Wrong — loses to Foundry */
.my-input { width: 40px; }

/* Correct — (0,2,0) beats Foundry's (0,1,1) */
.my-dialog .my-input { width: 40px; }
```

See `.agents/styles.md` → "Foundry Input Width Override" for full explanation.
