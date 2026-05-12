# Skill Registry — animabf-guote / PartidasRol

Generated: 2026-05-11

## Project Context Files

| File | Purpose |
|------|---------|
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/CLAUDE.md` | Main project instructions, architecture overview |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/index.md` | Context routing index |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/actor-data.md` | Actor schema, template.json, prepareActor |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/combat.md` | Combat systems (chat & websocket) |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/foundry-api.md` | FoundryVTT API patterns, testing |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/macros.md` | Macro system and importFromPdf |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/styles.md` | CSS patterns and gotchas |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/v2-sheet.md` | V2 actor sheet patterns |
| `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/.agents/roadmap.md` | Planned features and roadmap |
| `C:/Users/Alonso/.claude/projects/C--z---Git-PartidasRol/memory/MEMORY.md` | Persistent project memory index |

## User Skills

| Skill | Trigger |
|-------|---------|
| `pdf-import` | User invokes `/pdf-import` to import Anima Beyond Fantasy character from PDF text |
| `judgment-day` | User says "judgment day", "juzgar", "dual review", adversarial review needed |
| `branch-pr` | Creating a pull request or preparing changes for review |
| `issue-creation` | Creating a GitHub issue, reporting a bug, requesting a feature |
| `skill-creator` | Creating a new skill or documenting patterns for AI agents |
| `simplify` | Review changed code for reuse, quality, and efficiency; fix issues found |
| `review` | Review a pull request |
| `security-review` | Security review of pending changes on current branch |
| `update-config` | Configure Claude Code settings.json; automated behaviors requiring hooks |
| `fewer-permission-prompts` | Scan transcripts and add allowlist to reduce permission prompts |
| `loop` | Run a prompt or slash command on a recurring interval |
| `schedule` | Schedule recurring remote agents or one-time scheduled runs |
| `init` | Initialize a new CLAUDE.md file with codebase documentation |
| `go-testing` | Writing Go tests (not applicable to this JS project) |
| `claude-api` | Build/debug Claude API / Anthropic SDK apps |

## Compact Rules

### animabf-guote Project Standards

**Stack**: FoundryVTT v10 (10.303), JavaScript ES Modules, Handlebars (.hbs), CSS
**Entry point**: `animabf-guote.mjs` — **no build step**, press F5 in Foundry to reload.
**This is a compiled/deployed version** — no package.json, no build tooling present here.

**File locations**:
- System root: `FoundryVTT/v10.303/LocalData/Data/systems/animabf-guote/`
- Templates: `templates/` (Handlebars templates)
- Module code: `module/` (actors, combat, dialogs, items, rolls, utils)
- Macros source: `module/macros/functions/` — edit here, NOT macros.db

**Data schema**: `template.json` defines Actor types (`character`, `npc`) and Item types.

**Localization**: Update `lang/es.json`, `lang/en.json`, `lang/fr.json` when adding strings.

**CSS gotcha**: Foundry sets `button { width: 100% }` globally. Icon/inline buttons MUST use `width: auto !important; display: inline-flex`.

**V2 sheet**: Header inputs use `_header.` prefix to avoid duplicate name arrays. Always use `{{editor}}` (never `<textarea>`) for multi-line text.

**Derived data pipeline**: `prepareActor.js` orchestrates calculation order — primary modifiers before combat data.

**Combat**: Two parallel systems — WebSocket (real-time) and Chat-based (async). Chat combat uses `sessionId` flags for message tracking.

**Testing**: Jest test files exist under `module/` but no package.json in deployed directory — tests cannot be run from here. Tests live in the upstream source repo.

### pdf-import

Trigger: `/pdf-import` — Import Anima Beyond Fantasy character from PDF text.

Two paths:
- **Simple** (≤3 weapons, no `"; o \d+"` in attack line): run importFromPdf macro, fix issues in preview
- **Complex** (4+ weapons OR `"; o \d+"` OR custom abilities): skip import, generate full creation macro directly

### judgment-day

Trigger: "judgment day", "juzgar", "dual review", "que lo juzguen"
Protocol: Two blind parallel judge sub-agents review simultaneously → synthesize → fix → re-judge up to 2 iterations.

### branch-pr / issue-creation

Follow Agent Teams Lite issue-first enforcement: create GitHub issue before PR.

### simplify

Trigger: After implementing features — review changed code for reuse, quality, efficiency.
Fixes issues found inline.

### review / security-review

Trigger: `/review` for PR review, `/security-review` for security audit of branch changes.
