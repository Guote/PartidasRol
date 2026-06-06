# CLAUDE.md — Workspace Root

This file provides guidance to Claude Code when working in this workspace.

## Session Start — Always Do This First

At the start of every session in this project, read `TODO.md` (in this directory) and tell the user what open tasks are listed there. Do this before anything else.

---

## Specs (Game Mechanics & UI Design)

`specs/INDEX.md` is the gateway — scan it to find which spec file(s) to load before implementing or fixing anything. Each file is small and focused; never load more than 2-3 at once.

**When to read specs**: before implementing any feature or fixing any bug — scan the index, load relevant files.
**When to update specs**: after any session that clarifies a rule, fixes a design inconsistency, or adds a new UI pattern — update the relevant spec file as part of the same work.

| Directory | Contents |
|-----------|---------|
| `specs/mechanics/` | Game rules: modifiers, combat, stats, skills, level, psychic, mystic, summoning, ki, masa |
| `specs/ui/` | Design patterns: resources, skills tab, combat dialog, chat cards, conditions |

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

## Hard Rules (Claude Code Behavior)

These rules apply in every session, every task, unconditionally.

### No git commands
Never run any git command — no `git status`, `git diff`, `git commit`, `git push`, `git log`, or any other git operation. The user controls all git operations. If you want to describe what changed, write it in chat. If you want to suggest a commit message, write it in chat — do not run `git commit`.

### Python is not available on this machine
`python3` and `python` are not installed. Use **Node.js** for any scripting, data parsing, or automation tasks.

Node inline script pattern (avoids shell escaping issues):
```bash
node --input-type=module << 'EOF'
import { readFileSync } from 'fs';
// your code here
EOF
```

### Never edit macros.db
Macro source lives under `systems/animabf-guote/module/macros/functions/`. The `worlds/.../data/macros.db` is a NeDB runtime database — editing it directly is fragile and gets overwritten by the runtime. Always edit the `.js` source files.

### CSS: Foundry overrides `button { width: 100% }` globally
Any inline or icon button MUST use `width: auto !important; display: inline-flex` to override this. Forgetting this causes buttons to stretch full-width. See `systems/animabf-guote/.agents/styles.md` for the full pattern.

### Memory dual-write protocol
When saving anything to the local auto-memory files (`~/.claude/projects/.../memory/`), **also** write the same rule or finding to the relevant `CLAUDE.md` in the repo (this file, or the system/module/world CLAUDE.md as appropriate). Local memory files are machine-only — CLAUDE.md travels with the repo and is visible to all collaborators.

---

## Agent Teams Lite / SDD

This project uses **Agent Teams Lite (ATL)** and **Spec-Driven Development (SDD)**.

The orchestrator instructions live in `~/.claude/CLAUDE.md` (global, machine-local).
Skill registry: `.atl/skill-registry.md` — defines project standards injected into sub-agents.

**On a new machine**: copy the orchestrator instructions block from the primary machine's
`~/.claude/CLAUDE.md` into the same path. Without it, `/sdd-new`, `/sdd-ff`, and
`/sdd-continue` will not behave correctly.

---

## Key File Paths (Quick Reference)

| File | Purpose |
|------|---------|
| `TODO.md` | Open tasks — read at session start and surface to user |
| `systems/animabf-guote/CLAUDE.md` | Full system architecture reference |
| `modules/guote-module/CLAUDE.md` | Hook architecture, script patterns, known issues |
| `modules/guote-module/module.json` | Module manifest — declares loaded scripts |
| `modules/guote-module/guote-module.js` | Entry point — all auto-loaded hooks |
| `systems/animabf-guote/template.json` | Actor/Item data schema (check before adding new `macroCookies` namespaces) |
| `worlds/Gaia-APS-v10/CLAUDE.md` | Active world — structure, rules, search guidance |
| `worlds/Gaia-APS-v10/docs/data-files.md` | What each `data/*.db` file contains (load only when needed) |
| `worlds/Gaia-APS-v10/docs/packs.md` | What each compendium pack contains (load only when needed) |
