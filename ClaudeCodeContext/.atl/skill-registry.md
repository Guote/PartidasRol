# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Import Anima Beyond Fantasy character from PDF text | pdf-import | C:\Users\Alonso\.claude\skills\pdf-import\SKILL.md |
| "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | C:\Users\Alonso\.claude\skills\judgment-day\SKILL.md |
| Creating a pull request, opening a PR, preparing changes for review | branch-pr | C:\Users\Alonso\.claude\skills\branch-pr\SKILL.md |
| Creating a GitHub issue, reporting a bug, requesting a feature | issue-creation | C:\Users\Alonso\.claude\skills\issue-creation\SKILL.md |
| Create a new skill, add agent instructions, document patterns for AI | skill-creator | C:\Users\Alonso\.claude\skills\skill-creator\SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### pdf-import
- Two paths based on attack line scan: Simple (1–3 weapons, no `"; o \d+"`) → run importFromPdf macro; Complex (4+ weapons OR `"; o \d+"` in attack line) → generate full creation macro directly
- Always scan attack line for `"; o \d+"` BEFORE choosing path — never assume Simple
- Fix systematic regex failures in `pdfTextParser.js`

### judgment-day
- Launch TWO sub-agents in parallel, independently — neither knows about the other (blind review)
- Orchestrator synthesizes after both return: Confirmed (both found it) = fix immediately; Suspect A/B (one found it) = triage; Contradiction (disagreement) = flag for user
- Classify WARNINGs: real (triggerable in normal use) vs theoretical (contrived/impossible scenario). Theoretical = report as INFO only, do NOT fix
- Max 2 re-judge iterations before escalating to user
- NEVER do the review as orchestrator — coordinate only, delegate all reviewing

### branch-pr
- Every PR MUST link an issue with `status:approved` label — no exceptions
- Every PR MUST have exactly one `type:*` label
- Branch naming MUST match: `type/description` — lowercase only, e.g. `feat/temporal-modifiers`, `fix/zeon-sign-bug`
- Run shellcheck on any modified scripts before opening PR
- Blank PRs without issue linkage are blocked by GitHub Actions automation

### issue-creation
- Always use a template (Bug Report or Feature Request) — blank issues are disabled
- New issues auto-get `status:needs-review`; a maintainer must add `status:approved` before any PR can be opened
- Search for duplicates first before creating
- Questions go to Discussions, not Issues

### skill-creator
- Create skills for: repeated patterns, project-specific conventions that differ from generic best practices, complex multi-step workflows
- Do NOT create for trivial/one-off patterns or things already documented elsewhere
- Structure: `skills/{name}/SKILL.md` (required) + optional `assets/` and `references/` subdirs

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| CLAUDE.md (workspace) | C:\z - Git\PartidasRol\ClaudeCodeContext\CLAUDE.md | Workspace overview, hard rules, key file paths |
| CLAUDE.md (system) | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\CLAUDE.md | System architecture, CSS gotchas, localization rules |
| .agents/index.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\index.md | Task routing index — maps task type to context file |
| .agents/v2-sheet.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\v2-sheet.md | HBS components, V2 sheet UI, partials, data-on-click |
| .agents/styles.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\styles.md | CSS patterns, Foundry overrides, design tokens |
| .agents/combat.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\combat.md | Combat dialogs, ChatCombat, websocket combat |
| .agents/actor-data.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\actor-data.md | Actor schema, template.json, prepareActor, derived data |
| .agents/macros.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\macros.md | Macros, importFromPdf, automation scripts |
| .agents/foundry-api.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\foundry-api.md | FoundryVTT API, hooks, sockets, roll classes |
| .agents/roadmap.md | C:\z - Git\PartidasRol\FoundryVTT\v10.303\LocalData\Data\systems\animabf-guote\.agents\roadmap.md | Planned features, attack/defense items, field reference |
| specs/INDEX.md | C:\z - Git\PartidasRol\ClaudeCodeContext\specs\INDEX.md | Gateway to game mechanics and UI design specs |

Read the convention files listed above for project-specific patterns and rules.
