# V2 Actor Sheet — Templates & Components

Context for working on `templates/actor-v2/` and `module/actor/ABFActorSheetV2.js`.

---

## Directory Layout

```
templates/actor-v2/
  actor-sheet-v2.hbs           # Root: header + sidetabs + body
  components/                  # Reusable partials (see catalog below)
  parts/
    header/                    # Header rows (portrait, resources, resistances)
    tabs/                      # One .hbs per side tab
```

Tabs: `bio.hbs`, `skills.hbs`, `combat.hbs`, `mystic.hbs`, `domine.hbs`, `psychic.hbs`, `summoning.hbs`, `inventory.hbs`, `settings.hbs`, `notes.hbs`

---

## How to Use a Partial

```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/COMPONENT_NAME.hbs"
    param1=value1
    param2=value2}}
```

Always use the full `systems/animabf-guote/...` path.

`xRoot` helper accesses the sheet root context from any nesting depth:
```handlebars
{{xRoot.actor.name}}
{{lookup (lookup @root.system.secondaries group) key}}
```

---

## Component Catalog

### `labeled-input.hbs`
Label + text/number input pair. For simple bio fields.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/labeled-input.hbs"
    label=(localize "anima.ui.aspectSection.hair.title")
    name="system.general.aspect.hair.value"
    value=system.general.aspect.hair.value
    type="text"}}   {{!-- type optional, defaults to "text" --}}
```

### `stat-block.hbs`
Label + value display. Optionally editable and/or rollable.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/stat-block.hbs"
    label="Initiative"
    value=system.combat.initiative.final.value
    inputName="system.combat.initiative.base.value"
    inputValue=system.combat.initiative.base.value
    rollable=true
    rollData="1d100xa"
    rollValue=system.combat.initiative.final.value
    rollLabel="Initiative"
    showMod=true
    modValue=system.combat.initiative.modifier.value}}
```

### `combat-value.hbs`
Base input + final rollable value. Attack, Block, Magic Projection, etc.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/combat-value.hbs"
    label=(localize "anima.ui.combat.attack.title")
    baseName="system.combat.attack.base.value"
    baseValue=system.combat.attack.base.value
    finalValue=system.combat.attack.final.value
    rollable=true
    rollLabel="Attack"
    rollFormula="1d100xa"
    compact=false}}
```

### `resource-bar.hbs`
Current/max resource pair with optional sacrificed field. HP, Fatigue, etc.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/resource-bar.hbs"
    label="HP"
    color="hp"
    current=system.characteristics.secondaries.lifePoints.value
    currentName="system.characteristics.secondaries.lifePoints.value"
    max=system.characteristics.secondaries.lifePoints.max
    maxName="system.characteristics.secondaries.lifePoints.max"
    showSacrificed=false}}
```
`color` values: `hp`, `fatigue`, `zeon`, `ki`, `psychic`, `destiny`

### `resource-pool.hbs`
Current/max pool with optional regen. Zeon, Ki, etc.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/resource-pool.hbs"
    label=(localize "anima.ui.mystic.zeon.title")
    valueName="system.mystic.zeon.value"
    currentValue=system.mystic.zeon.value
    maxName="system.mystic.zeon.max"
    maxValue=system.mystic.zeon.max
    colorClass="zeon"
    showRegen=true
    regenValue=system.mystic.zeonRegeneration.final.value
    compact=false}}
```

### `rollable-stat.hbs`
Rollable stat row with optional base input. For inline skill-list contexts.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/rollable-stat.hbs"
    label="Perception"
    baseValue=system.secondaries.perception.base.value
    baseName="system.secondaries.perception.base.value"
    finalValue=system.secondaries.perception.final.value
    rollData="1d100xa"
    rollLabel="Perception"
    showBase=true
    inline=false}}
```

### `characteristic-row.hbs`
Used inside `{{#each system.characteristics.primaries as |stat key|}}` — no parameters needed.
```handlebars
{{#each system.characteristics.primaries as |stat key|}}
  {{> "systems/animabf-guote/templates/actor-v2/components/characteristic-row.hbs"}}
{{/each}}
```

### `skill-row.hbs`
Secondary skill row: rollable name + base input + final value + combine button.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/skill-row.hbs"
    group="guotecundariasuno"
    key="acrobacias"}}
```

### `simple-item-list.hbs`
Card with single-column table listing items by name. Right-click for context menu (edit/delete). Items must have `._id` and `.name`.
```handlebars
{{> "systems/animabf-guote/templates/actor-v2/components/simple-item-list.hbs"
    title=(localize "anima.ui.advantageSection.title")
    addAction="add-advantage"
    addLabel=(localize "anima.dialogs.items.advantage.content")
    items=system.general.advantages}}
```

---

## Layout Primitives

```handlebars
{{!-- Grid columns --}}
<div class="v2-grid v2-grid--2">   {{!-- 2 equal columns --}}
<div class="v2-grid v2-grid--3">
<div class="v2-grid v2-grid--4">
<div class="v2-grid v2-grid--auto"> {{!-- auto-fit --}}

{{!-- Card --}}
<div class="v2-card">
  <div class="v2-card__header">
    <div class="v2-card__header-title"><span>Title</span></div>
    <div class="v2-card__header-actions">
      <button type="button" class="v2-card__header-btn" data-on-click="my-action">
        <i class="fas fa-plus"></i>
      </button>
    </div>
  </div>
  <div class="v2-card__body"><!-- content --></div>
</div>

{{!-- Table (no inner card padding: style="padding: 0;") --}}
<table class="v2-table">
  <thead><tr><th>Col</th></tr></thead>
  <tbody>
    {{#each items as |item|}}
    <tr data-item-id="{{item._id}}">   {{!-- required for context menu --}}
      <td><input type="text" class="v2-table__input" name="..." value="{{item.name}}"></td>
    </tr>
    {{else}}
    <tr><td class="v2-text-center v2-text-muted">-</td></tr>
    {{/each}}
  </tbody>
</table>
```

---

## Interaction Patterns

### Rollable elements
```handlebars
<span class="rollable"
      data-roll="1d100xa"
      data-rollvalue="{{finalValue}}"
      data-label="My Roll Label">{{finalValue}}</span>
```

### Action buttons
```handlebars
<button type="button" data-on-click="add-weapon">Add</button>
```
Handler must be registered in `ABFActorSheetV2.activateListeners`. To add a handler:
```js
html.find("[data-on-click='my-action']").click(ev => { ... });
```

### Context menus
Rows need `data-item-id` on the `<tr>`. Built via `buildCommonContextualMenu(itemConfig)` in the sheet.

### Combine button
Links a stat to the "combine roll" system:
```handlebars
<button type="button" class="v2-combine-btn"
        data-rollvalue="{{value}}"
        data-label="Skill Name">
  <i class="fas fa-link"></i>
</button>
```

---

## Rich Text (Editor) Pattern

**Never use `<textarea>` for multi-line text.** Use Foundry's `{{editor}}`:

```handlebars
<div class="v2-card__body v2-notes-editor">
  {{editor system.general.description.enriched
            target="system.general.description.value"
            button=true owner=true editable=true}}
</div>
```

Prerequisites:
1. Field `.value` must exist in `template.json`
2. `.enriched` must be populated in `prepareActor.js`:
   ```js
   actor.system.general.myField.enriched = await TextEditor.enrichHTML(
     actor.system.general.myField.value, { async: true }
   );
   ```

Currently enriched: `system.general.description`, `system.general.notesText`

---

## `_header.` Prefix (Avoiding Duplicate Input Names)

When header shows the same field as a tab partial, Foundry submits arrays. Fix:
```handlebars
{{!-- In header-v2.hbs --}}
<input name="_header.system.mystic.zeon.value" value="{{system.mystic.zeon.value}}">
```
`ABFActorSheetV2._updateObject()` strips the prefix and gives header values priority over tab values.

---

## ABFActorSheetV2 Architecture

- `getData()` — async, builds template context from `actor.system.*`
- `activateListeners(html)` — all jQuery event bindings go here
- `_updateObject(event, formData)` — strips `_header.` prefix → `unflat()` → `splitAsActorAndItemChanges()` → save
- `_onDropItem()` — drag-and-drop handling
- `buildCommonContextualMenu(itemConfig)` — right-click menu for any item table
