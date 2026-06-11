# Project TODOs — PartidasRol / animabf-guote

Items here must be surfaced at the start of every Claude session in this project.

---

## Open Tasks

- [ ] **Refactor defense dialog summaries** — Currently each defense tab (combat, mystic, psychic, summon, accumulation) has its own separate `summary` object computed in `getData()`, and the template uses `this.ui.activeSummary` to show whichever is active. The attack dialog has a single unified summary bar. Refactor the defense dialog to do the same: one shared summary bar that updates regardless of tab, instead of per-tab summary objects. The `chat-combat-defense-dialog.hbs` RESUMEN section and `getData()` are the entry points.

- [ ] **Implement Descanso** — `modules/guote-module/scripts/Descanso.js` exists but the feature is unused and the file still uses the deprecated v9 API (`actor.update({ data: {...} })`). Decide whether to implement it properly (convert to v10 `system.*` API, wire it into the module) or delete the file entirely.

- [ ] **CSS cleanup — Phase 1 (safe, immediate)** — Delete `/styles/animabf-guote.css` (duplicate of root-level `animabf-guote.css`; not loaded by Foundry, not referenced anywhere).

- [ ] **CSS cleanup — Phase 2 (dialog styles)** — Extract inline `<style>` blocks from the two large dialog templates into dedicated CSS files loaded via `system.json` or the `renderDialog` hook:
  - `templates/dialog/mystic/zeon-calculator-dialog.hbs` → `styles/zeon-calculator-dialog.css` (685 lines)
  - `templates/dialog/domine/ki-calculator-dialog.hbs` → `styles/ki-calculator-dialog.css` (537 lines)

- [ ] **CSS cleanup — Phase 3 (item sheet styles, optional)** — Consolidate inline styles from item templates into `styles/item-sheets.css`:
  - `templates/items/summon/summon.hbs` (318 lines)
  - `templates/items/weapon/weapon.hbs` (209 lines)
  - `templates/items/incarnation/incarnation.hbs` (99 lines)
  - Leave technique (18 lines), simple-actor-sheet (32 lines), and macro styles (7+35 lines) inline — too small to extract.

- [ ] **Custom damage formula on weapon items** — Add a `damage.customFormula` string field to weapons so individual weapons can override the standard damage calculation with an expression referencing actor and weapon stats. Full exploration in engram #125 (`sdd/weapon-custom-damage-formula/explore`).
  - **Option 1 (recommended):** Formula stored on weapon, evaluated at actor prep time inside `calculateWeaponDamage.js` using `Roll.safeEval` + `[varname]` substitution (same pattern as `[NE]` in summons). Variables: `[base]`, `[sizedBase]`, `[quality]`, `[qualityMod]`, `[str]`, `[strMod]`, `[is2H]`, `[extraDamage]`. Empty formula = unchanged behavior. Effort: Low.
  - **Option 2:** Only evaluate at combat time in `CombatAttackDialog` — `damage.final` never reflects the formula; inconsistent. Effort: Medium.
  - **Option 3:** Full Foundry Roll object (async, dice-aware) — overkill for deterministic damage. Effort: High.
  - Files: `WeaponItemConfig.js`, `template.json`, `calculateWeaponDamage.js`, `weapon.hbs`, `ABFItemSheet.js`.

- [x] **Multiple attacks + dialog tab rename** — Implemented 2026-06-09. Full spec in `specs/mechanics/weapons.md`.
  - [x] Tab renames in attack/defense dialogs: "Armas", "Hechizos", "Poderes Psí.", "Invocaciones"
  - [x] "Ataque principal" + "Maniobras" inputs in combat tab
  - [x] Penalty logic, section lock, trash button, round-start clear
  - [x] `animabf.combatAttackSent` hook in guote-module (CONT_ATAQUES condition)
  - [ ] **PENDING (manual)**: Configure "Cont. Ataques" in CUB: 1-round duration, no modifier changes, SIC counter type

---

## Deprecated / Archived Scripts

The following scripts were archived (not deleted) during the May 2026 code audit because they are unfinished experiments. Do not use them — they exist only as historical reference:

- `modules/guote-module/scripts/deprecated_AcumulacionKi_2.js`
- `modules/guote-module/scripts/deprecated_AcumulacionKi_unfinishedGPT.js`

> Note: if these files are missing, they may need to be restored from git history (`git restore`) and renamed.
