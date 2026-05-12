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
