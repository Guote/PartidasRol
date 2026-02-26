# Actor Data — Schema, Pipeline & Item System

Context for working on `module/actor/`, `template.json`, and `module/actor/utils/prepareActor/`.

---

## Actor Types

`template.json` defines: `character` and `npc`. Both share the same system schema.

Sheets:
- `ABFActorSheetV2` (`module/actor/ABFActorSheetV2.js`) — V2, primary active development
- `ABFActorSheet` (`module/actor/ABFActorSheet.js`) — V1, legacy
- `SimpleActorSheet` (`module/actor/SimpleActorSheet.js`) — minimal NPC sheet

---

## Derived Data Pipeline

`prepareActor.js` runs on every data re-derivation (load, update). **Order is critical.**

### Execution order
```
1.  mutateMasaData            — bulk/load calculation
2.  mutatePrimaryModifiers    — characteristic modifiers (AGI mod, STR mod, etc.)
3.  mutateMovementType        — movement speed from AGI
4.  mutateRegenerationType    — regeneration from CON
5.  mutatePenalties           — armor/encumbrance penalties
6.  mutateCombatData          — attack/block/dodge finals  ← needs steps 2 & 5
7.  mutateArmorsData          — worn armor stats
8.  mutateTotalArmor          — total AT from all armors
9.  mutateNaturalPenalty      — natural armor penalty
10. mutateSecondariesData     — secondary skill finals     ← needs steps 2 & 5
11. mutateAmmoData            — ammo stats
12. mutateWeaponsData         — weapon final values        ← needs step 2
13. mutateInitiative          — initiative final
14. mutateMysticData          — zeon, spell levels, magic projection finals
15. mutatePsychicData         — psychic points, power finals
16. mutateDomineData          — ki accumulation, technique finals
17. mutateIncarnationOverride — incarnation overrides mystic stats if active
```

**Rule:** if function B reads data that function A writes, A must come before B.

### Adding a new derived field
1. Add the field to `template.json` under the correct actor type
2. Create `module/actor/utils/prepareActor/calculations/actor/your/mutateYourField.js`
3. Import and insert it at the correct position in `DERIVED_DATA_FUNCTIONS` in `prepareActor.js`
4. If the field needs rich text, add `TextEditor.enrichHTML()` directly in `prepareActor.js` (see below)

---

## Enriched Fields (Rich Text)

Added in `prepareActor.js` before `DERIVED_DATA_FUNCTIONS` runs:
```js
actor.system.general.description.enriched = await TextEditor.enrichHTML(
  actor.system.general.description.value, { async: true }
);
actor.system.general.notesText.enriched = await TextEditor.enrichHTML(
  actor.system.general.notesText.value ?? "", { async: true }
);
```

To add a new enriched field:
```js
actor.system.path.to.field.enriched = await TextEditor.enrichHTML(
  actor.system.path.to.field.value ?? "", { async: true }
);
```
Then use `{{editor system.path.to.field.enriched target="system.path.to.field.value" ...}}` in the template.

---

## Item Storage: Embedded vs Dynamic

### Embedded Items (ABFItem documents)
Full Foundry `Item` documents stored inside the actor. Have their own `_id`, schema, item sheet.

Types: `weapon`, `armor`, `ammo`, `spell`, `psychicPower`, `technique`, `advantage`, `disadvantage`, `mentalPattern`, `psychicDiscipline`, `note`, `inventoryItem`, `summon`, `incarnation`

```js
actor.items.get(id)
actor.items.filter(i => i.type === "weapon")
await actor.updateEmbeddedDocuments("Item", [{ _id: id, "system.field": value }])
await actor.deleteEmbeddedDocuments("Item", [id])
await actor.createEmbeddedDocuments("Item", [{ name, type, system: { ... } }])
```

`prepareItems.js` processes embedded items and attaches them to `actor.system.*` paths so templates can access them.

### Dynamic Items (system data arrays)
Stored as plain objects in `actor.system.dynamic.*`. No separate item sheet — edited inline.

Types: contacts, levels, elan (small data that doesn't need full item overhead)

```js
actor.system.dynamic.contacts   // array of contact objects with _id
await actor.update({ "system.dynamic.contacts.ID.name": "New Name" })
```

---

## ALL_ITEM_CONFIGURATIONS

`module/actor/utils/prepareItems/constants.js` exports `ALL_ITEM_CONFIGURATIONS` — the master registry of every item type with:
- `fieldPath` — where on `actor.system.*` the items live
- `selectors` — CSS selectors for the table container and rows
- `contextMenuConfig` — extra context menu options
- `hasSheet` / `isInternal` — sheet behavior flags

Every item type that appears in a table **must** be registered here.

---

## `_updateObject` in ABFActorSheetV2

Called on form submit. Transformation pipeline:
1. Strip `_header.` prefix (header values take priority)
2. `unflat()` — converts dot-notation keys to nested objects
3. `splitAsActorAndItemChanges()` — separates actor-level from embedded item updates
4. `actor.update()` for actor data, `actor.updateEmbeddedDocuments()` for items

Do not call `actor.update()` directly in sheet code.

---

## Adding a New Item Type

1. Add schema to `template.json` under `Item.types`
2. Register in `module/items/ABFItems.js`
3. Create item config in `module/types/your-category/YourItemConfig.js`
4. Add to `ALL_ITEM_CONFIGURATIONS` in `module/actor/utils/prepareItems/constants.js`
5. Create item sheet template in `templates/items/your-type/`
6. Optionally register a sheet in `ABFItemSheet.js`
