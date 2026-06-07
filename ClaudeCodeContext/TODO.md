# Project TODOs — PartidasRol / animabf-guote

Items here must be surfaced at the start of every Claude session in this project.

---

## Open Tasks

- [ ] **Implement Descanso** — `modules/guote-module/scripts/Descanso.js` exists but the feature is unused and the file still uses the deprecated v9 API (`actor.update({ data: {...} })`). Decide whether to implement it properly (convert to v10 `system.*` API, wire it into the module) or delete the file entirely.
- [ ] **Add Secondary atrributes** - Movement from AGI, max load from fue, regeneration from con. Zeon, ki and CV regeneration should be in their own sheet tabs. The "Descanso" function should handle them all. Mark Inhumanidad/zen
- [ ] **Input layout for base/temporal/final** - The character sheet (v2) displays data susceptible to base/temporal/final breakdowns inconsistently. Decide on a layout. There are two scales of data:
  - **Big inputs** — HA, HD, Potential, ACT, etc.
  - **Small inputs** — primary stats, habilidades secundarias, ki accumulation per stat, etc.
  - **Header data** — small and meant to be quickly accessible; not changing for now.

  Options:
  - **Path A:** Always show all 3 inputs (base editable, temporal editable, final read-only). Design two variants — one for big data, one for small. Challenge: small data is ~60×20 px and must clearly label which is base, temp, final.
  - **Path B:** Add a global "Edit sheet" toggle in the header. When active → Path A layout. When inactive → show only base and final. Reduces visual clutter in play mode.
  - **Path C:** User to decide after seeing a suggestion.
- [ ] **Remove unused attack macro** - I no longer want to use the Enviar ataque (websocket) flow and macro. 

---

## Deprecated / Archived Scripts

The following scripts were archived (not deleted) during the May 2026 code audit because they are unfinished experiments. Do not use them — they exist only as historical reference:

- `modules/guote-module/scripts/deprecated_AcumulacionKi_2.js`
- `modules/guote-module/scripts/deprecated_AcumulacionKi_unfinishedGPT.js`

> Note: if these files are missing, they may need to be restored from git history (`git restore`) and renamed.
