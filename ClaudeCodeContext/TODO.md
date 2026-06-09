# Project TODOs — PartidasRol / animabf-guote

Items here must be surfaced at the start of every Claude session in this project.

---

## Open Tasks

- [ ] **Implement Descanso** — `modules/guote-module/scripts/Descanso.js` exists but the feature is unused and the file still uses the deprecated v9 API (`actor.update({ data: {...} })`). Decide whether to implement it properly (convert to v10 `system.*` API, wire it into the module) or delete the file entirely.

- [ ] **Multiple attacks + dialog tab rename** — See `specs/mechanics/weapons.md` for full spec.
  - Rename tabs in attack and defense dialogs: "Armas", "Hechizos", "Poderes Psí.", "Invocaciones"
  - Add "Ataque principal" + "Maniobras" inputs to the attack dialog combat tab (next to fatigue selector)
  - Penalty: `maniobras × 20` (normal) or `maniobras × 10` (cadencia) — dialog-local only, not on character sheet
  - SIC condition "Cont. Ataques" counter = `(ataquePrincipal + maniobras) - 1`, managed via `animabf.combatAttackSent` hook in guote-module
  - Configure "Cont. Ataques" in CUB manually: 1-round duration, no modifier changes, SIC counter type
  - **Note**: penalty not shown on character sheet by design; macroCookies persistence handles round-reminder UX

---

## Deprecated / Archived Scripts

The following scripts were archived (not deleted) during the May 2026 code audit because they are unfinished experiments. Do not use them — they exist only as historical reference:

- `modules/guote-module/scripts/deprecated_AcumulacionKi_2.js`
- `modules/guote-module/scripts/deprecated_AcumulacionKi_unfinishedGPT.js`

> Note: if these files are missing, they may need to be restored from git history (`git restore`) and renamed.
