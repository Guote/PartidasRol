# CLAUDE.md — Workspace Root

This file provides guidance to Claude Code when working in this workspace.

## Workspace Overview

This workspace provides Claude Code context for a FoundryVTT setup running **Anima Beyond Fantasy**.

The three relevant areas are:

| Area | Path |
|------|------|
| **System** | `c:/z - Git/PartidasRol/FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/` |
| **Custom Module** | `c:/z - Git/PartidasRol/FoundryVTT/v10.303/LocalData/Data/modules/guote-module/` |
| **Active World** | `c:/z - Git/PartidasRol/FoundryVTT/v10.303/LocalData/Data/worlds/Gaia-APS-v10/` |

Each has its own `CLAUDE.md` with detailed context. Read the relevant one before working on its files.

---

## Search Boundaries

**Default: do NOT search or read files under the `modules/` directory**, except:

- `modules/guote-module/` — the only module that is actively developed here

All other modules under `modules/` (barbrawl, acelib, etc.) are third-party. Never read, edit, or create files in them.

---

## guote-module Purpose

`guote-module` exists to:

1. **Add functionality to `animabf-guote`** — game-table automation (combat conditions, macro dialogs, etc.) that is too opinionated for the base system.
2. **Override configuration from other modules** — e.g., applying visual or behavioral patches to how third-party modules behave in this specific game setup.

### Hard Rule: Never Write to Other Modules Directly

If a change is needed to override or patch behavior from a third-party module, implement it in `guote-module` using:
- Foundry Hook overrides
- `libWrapper` patches (if the system already uses it)
- CSS overrides loaded by `guote-module`
- Re-registration of settings/defaults after the target module loads

Do **not** edit files in any module directory other than `guote-module/`.

---

## Key File Paths (Quick Reference)

| File | Purpose |
|------|---------|
| `systems/animabf-guote/CLAUDE.md` | Full system architecture reference |
| `modules/guote-module/CLAUDE.md` | Hook architecture, script patterns, known issues |
| `modules/guote-module/module.json` | Module manifest — declares loaded scripts |
| `modules/guote-module/guote-module.js` | Entry point — all auto-loaded hooks |
| `systems/animabf-guote/template.json` | Actor/Item data schema (check before adding new `macroCookies` namespaces) |
| `worlds/Gaia-APS-v10/CLAUDE.md` | Active world — structure, rules, search guidance |
| `worlds/Gaia-APS-v10/docs/data-files.md` | What each `data/*.db` file contains (load only when needed) |
| `worlds/Gaia-APS-v10/docs/packs.md` | What each compendium pack contains (load only when needed) |
