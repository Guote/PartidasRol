# Context Routing Index

Before starting any non-trivial task, scan this table and load only the files that match.
Files are in `.agents/`. Most tasks need 1–2 files.

| Task involves... | Load |
|-----------------|------|
| Handlebars templates, HBS components, V2 sheet UI, partials, `{{editor}}`, `data-on-click`, column sorting, sortable tables | `v2-sheet.md` |
| CSS, styles, `.actor-sheet-v2`, classes, variables, design tokens | `styles.md` |
| Combat, attack dialog, defense dialog, `ChatCombat`, `ChatAttackCard`, websocket combat | `combat.md` |
| Actor schema, `template.json`, `prepareActor`, derived data, `enriched`, embedded items, item types, compendium packs | `actor-data.md` |
| Macros, `importFromPdf`, `createCharacter`, automation scripts | `macros.md` |
| FoundryVTT API, `game.*`, `canvas.*`, hooks, sockets, `Actor.update`, `ChatMessage`, core classes, hotbar, localization keys, testing, roll classes | `foundry-api.md` |
| Item types, spells, weapons, armor, psychic powers, techniques, summons, incarnations | `actor-data.md` + `foundry-api.md` |
| Planned features, attack/defense items, sacrificed HP, roadmap, field reference | `roadmap.md` |

`foundry-api.md` is worth loading for any task that touches JS files.
