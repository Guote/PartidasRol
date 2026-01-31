# ABFActorSheetV2 - Schema & Data Binding Analysis

This document details the technical requirements for editable fields, schema changes, and new item types.

---

## 1. Data Update Flow

### 1.1 How Form Fields Update Actor Data

```
User edits input → form submit → ABFActorSheet._updateObject()
                                        ↓
                              splitAsActorAndItemChanges(formData)
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    ↓                                       ↓
            actorChanges                              itemChanges
            (standard paths)                    (system.dynamic.* paths)
                    ↓                                       ↓
            super._updateObject()                    updateItems()
                    ↓                                       ↓
            Actor.update()                     ALL_ITEM_CONFIGURATIONS[type].onUpdate()
                    ↓
            prepareDerivedData()
```

### 1.2 Field Naming Conventions

**Actor fields (direct update):**
```html
<input name="system.characteristics.secondaries.lifePoints.value" value="{{...}}" />
```

**Item fields (via dynamic routing):**
```html
<input name="system.dynamic.weapons.{{item._id}}.system.attack.special.value" value="{{...}}" />
```

**Read-only derived fields:**
```html
<input disabled name="system.combat.attack.final.value" value="{{...}}" />
```

### 1.3 Editable vs Derived Fields Pattern

| Field Type | Attribute | Updates |
|------------|-----------|---------|
| User-editable base value | `name="system.path.base.value"` | Direct to actor |
| User-editable current value | `name="system.path.value"` | Direct to actor |
| System-calculated final | `disabled` | Never (recalculated) |
| Item property | `name="system.dynamic.{type}.{id}.system.{prop}"` | Via item config |

---

## 2. Required Schema Changes (template.json)

### 2.1 Sacrificed HP Field

**Current schema:**
```json
"lifePoints": { "value": 100, "max": 100 }
```

**Required change:**
```json
"lifePoints": { "value": 100, "max": 100, "sacrificed": 0 }
```

**Impact:**
- `sacrificed` reduces effective max HP
- Effective max = `max - sacrificed`
- Sacrificed HP regenerates differently (game rules)

**Template binding:**
```handlebars
<input type="number"
       name="system.characteristics.secondaries.lifePoints.sacrificed"
       value="{{system.characteristics.secondaries.lifePoints.sacrificed}}" />
```

### 2.2 Selected Weapon for Initiative

**Current:** No explicit "selected weapon" field. Initiative calculated from base + modifiers.

**Required change:**
```json
"combat": {
  "selectedWeaponId": { "value": "" }
}
```

**Impact:**
- Stores the ID of the currently selected weapon
- Initiative display uses this weapon's initiative bonus
- Dropdown in header to select weapon

**Template binding:**
```handlebars
<select name="system.combat.selectedWeaponId.value">
  <option value="">-- {{localize "anima.ui.combat.noWeapon"}} --</option>
  {{#each weapons}}
    <option value="{{this._id}}" {{#if (eq this._id ../system.combat.selectedWeaponId.value)}}selected{{/if}}>
      {{this.name}}
    </option>
  {{/each}}
</select>
```

### 2.3 Combat Notes Field

**Current:** Notes are items, not a simple text field.

**Required change:**
```json
"combat": {
  "notes": { "value": "" }
}
```

**Impact:**
- Single large textarea for combat-specific notes
- Simpler than managing note items for quick combat info

**Template binding:**
```handlebars
<textarea name="system.combat.notes.value" rows="5">{{system.combat.notes.value}}</textarea>
```

---

## 3. New Item Types: Attack & Defense

### 3.1 Overview

The `attack` and `defense` item types unify combat options from various sources:
- Weapons → physical attacks/blocks
- Spells → magical attacks/defenses
- Ki Powers → domine attacks
- Psychic Powers → mental attacks
- Custom → anything else

### 3.2 Attack Item Schema

**Add to template.json under "Item":**

```json
"attack": {
  "source": {
    "type": { "value": "custom" },
    "itemId": { "value": "" },
    "itemType": { "value": "" }
  },
  "attackValue": {
    "base": { "value": 0 },
    "special": { "value": 0 },
    "final": { "value": 0 }
  },
  "damage": {
    "base": { "value": 0 },
    "special": { "value": 0 },
    "final": { "value": 0 },
    "isFixed": { "value": false }
  },
  "initiative": {
    "base": { "value": 0 },
    "special": { "value": 0 },
    "final": { "value": 0 }
  },
  "critic": {
    "primary": { "value": "-" },
    "secondary": { "value": "-" }
  },
  "range": {
    "type": { "value": "melee" },
    "value": { "value": 0 }
  },
  "special": { "value": "" },
  "notes": { "value": "" },
  "isRanged": { "value": false },
  "usesAmmo": { "value": false },
  "ammoId": { "value": "" },
  "enabled": { "value": true }
}
```

**Source types enum:**
```javascript
export const AttackSourceType = {
  WEAPON: "weapon",
  SPELL: "spell",
  KI_POWER: "ki",
  PSYCHIC_POWER: "psychic",
  TECHNIQUE: "technique",
  SUMMON: "summon",
  CUSTOM: "custom"
};
```

### 3.3 Defense Item Schema

**Add to template.json under "Item":**

```json
"defense": {
  "source": {
    "type": { "value": "custom" },
    "itemId": { "value": "" },
    "itemType": { "value": "" }
  },
  "defenseType": {
    "value": "block"
  },
  "defenseValue": {
    "base": { "value": 0 },
    "special": { "value": 0 },
    "final": { "value": 0 }
  },
  "absorption": {
    "value": 0
  },
  "counterBonus": {
    "value": 0
  },
  "special": { "value": "" },
  "notes": { "value": "" },
  "enabled": { "value": true }
}
```

**Defense types enum:**
```javascript
export const DefenseType = {
  BLOCK: "block",
  DODGE: "dodge",
  PARRY: "parry",
  MAGIC_SHIELD: "magicShield",
  PSYCHIC_SHIELD: "psychicShield",
  CUSTOM: "custom"
};
```

### 3.4 Adding Item Types to System

**Step 1: Add to template.json "Item.types":**
```json
"types": [
  "advantage", "ammo", "armor", "disadvantage", "spell",
  "mentalPattern", "note", "psychicDiscipline", "psychicPower",
  "technique", "weapon", "inventoryItem",
  "attack",   // NEW
  "defense"   // NEW
]
```

**Step 2: Add item type enums (ABFItems.js):**
```javascript
ABFItems["ATTACK"] = "attack";
ABFItems["DEFENSE"] = "defense";
```

**Step 3: Create item configs:**

```javascript
// module/types/combat/AttackItemConfig.js
import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";

export const AttackSourceType = {
  WEAPON: "weapon",
  SPELL: "spell",
  KI_POWER: "ki",
  PSYCHIC_POWER: "psychic",
  TECHNIQUE: "technique",
  SUMMON: "summon",
  CUSTOM: "custom"
};

export const INITIAL_ATTACK_DATA = {
  source: {
    type: { value: AttackSourceType.CUSTOM },
    itemId: { value: "" },
    itemType: { value: "" }
  },
  attackValue: {
    base: { value: 0 },
    special: { value: 0 },
    final: { value: 0 }
  },
  damage: {
    base: { value: 0 },
    special: { value: 0 },
    final: { value: 0 },
    isFixed: { value: false }
  },
  initiative: {
    base: { value: 0 },
    special: { value: 0 },
    final: { value: 0 }
  },
  critic: {
    primary: { value: "-" },
    secondary: { value: "-" }
  },
  range: {
    type: { value: "melee" },
    value: { value: 0 }
  },
  special: { value: "" },
  notes: { value: "" },
  isRanged: { value: false },
  usesAmmo: { value: false },
  ammoId: { value: "" },
  enabled: { value: true }
};

export const AttackItemConfig = ABFItemConfigFactory({
  type: ABFItems.ATTACK,
  isInternal: false,
  hasSheet: true,
  defaultValue: INITIAL_ATTACK_DATA,
  fieldPath: ["combat", "attacks"],
  selectors: {
    addItemButtonSelector: "add-attack",
    containerSelector: "#attacks-context-menu-container",
    rowSelector: ".attack-row",
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.attacks.content"),
    });
    const itemData = {
      name,
      type: ABFItems.ATTACK,
      system: INITIAL_ATTACK_DATA,
    };
    await actor.createItem(itemData);
  },
  prepareItem(data) {
    // Calculate final values based on source item if linked
    // This is called during actor.prepareDerivedData()
  },
});
```

```javascript
// module/types/combat/DefenseItemConfig.js
import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";

export const DefenseType = {
  BLOCK: "block",
  DODGE: "dodge",
  PARRY: "parry",
  MAGIC_SHIELD: "magicShield",
  PSYCHIC_SHIELD: "psychicShield",
  CUSTOM: "custom"
};

export const INITIAL_DEFENSE_DATA = {
  source: {
    type: { value: DefenseType.CUSTOM },
    itemId: { value: "" },
    itemType: { value: "" }
  },
  defenseType: {
    value: DefenseType.BLOCK
  },
  defenseValue: {
    base: { value: 0 },
    special: { value: 0 },
    final: { value: 0 }
  },
  absorption: {
    value: 0
  },
  counterBonus: {
    value: 0
  },
  special: { value: "" },
  notes: { value: "" },
  enabled: { value: true }
};

export const DefenseItemConfig = ABFItemConfigFactory({
  type: ABFItems.DEFENSE,
  isInternal: false,
  hasSheet: true,
  defaultValue: INITIAL_DEFENSE_DATA,
  fieldPath: ["combat", "defenses"],
  selectors: {
    addItemButtonSelector: "add-defense",
    containerSelector: "#defenses-context-menu-container",
    rowSelector: ".defense-row",
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.defenses.content"),
    });
    const itemData = {
      name,
      type: ABFItems.DEFENSE,
      system: INITIAL_DEFENSE_DATA,
    };
    await actor.createItem(itemData);
  },
  prepareItem(data) {
    // Calculate final values based on actor's block/dodge
  },
});
```

**Step 4: Register in constants.js:**
```javascript
import { AttackItemConfig } from '../../../types/combat/AttackItemConfig.js';
import { DefenseItemConfig } from '../../../types/combat/DefenseItemConfig.js';

export const ITEM_CONFIGURATIONS = {
  // ... existing
  [AttackItemConfig.type]: AttackItemConfig,
  [DefenseItemConfig.type]: DefenseItemConfig,
};
```

**Step 5: Add arrays to actor schema (template.json):**
```json
"combat": {
  // ... existing fields
  "attacks": [],
  "defenses": [],
  "selectedWeaponId": { "value": "" },
  "notes": { "value": "" }
}
```

---

## 4. Complete template.json Changes

### 4.1 Actor Schema Additions

```json
{
  "Actor": {
    "character": {
      "characteristics": {
        "secondaries": {
          "lifePoints": {
            "value": 100,
            "max": 100,
            "sacrificed": 0  // NEW
          }
        }
      },
      "combat": {
        // ... existing fields ...
        "attacks": [],           // NEW: attack items
        "defenses": [],          // NEW: defense items
        "selectedWeaponId": { "value": "" },  // NEW: for initiative display
        "notes": { "value": "" }  // NEW: combat notes textarea
      }
    }
  }
}
```

### 4.2 Item Schema Additions

```json
{
  "Item": {
    "types": [
      // ... existing types ...
      "attack",    // NEW
      "defense"    // NEW
    ],

    "attack": {
      "source": {
        "type": { "value": "custom" },
        "itemId": { "value": "" },
        "itemType": { "value": "" }
      },
      "attackValue": {
        "base": { "value": 0 },
        "special": { "value": 0 },
        "final": { "value": 0 }
      },
      "damage": {
        "base": { "value": 0 },
        "special": { "value": 0 },
        "final": { "value": 0 },
        "isFixed": { "value": false }
      },
      "initiative": {
        "base": { "value": 0 },
        "special": { "value": 0 },
        "final": { "value": 0 }
      },
      "critic": {
        "primary": { "value": "-" },
        "secondary": { "value": "-" }
      },
      "range": {
        "type": { "value": "melee" },
        "value": { "value": 0 }
      },
      "special": { "value": "" },
      "notes": { "value": "" },
      "isRanged": { "value": false },
      "usesAmmo": { "value": false },
      "ammoId": { "value": "" },
      "enabled": { "value": true }
    },

    "defense": {
      "source": {
        "type": { "value": "custom" },
        "itemId": { "value": "" },
        "itemType": { "value": "" }
      },
      "defenseType": { "value": "block" },
      "defenseValue": {
        "base": { "value": 0 },
        "special": { "value": 0 },
        "final": { "value": 0 }
      },
      "absorption": { "value": 0 },
      "counterBonus": { "value": 0 },
      "special": { "value": "" },
      "notes": { "value": "" },
      "enabled": { "value": true }
    }
  }
}
```

---

## 5. Template Editable Fields Reference

### 5.1 Header Fields

| Field | Path | Editable | Notes |
|-------|------|----------|-------|
| HP Current | `system.characteristics.secondaries.lifePoints.value` | Yes | |
| HP Max | `system.characteristics.secondaries.lifePoints.max` | Yes | |
| HP Sacrificed | `system.characteristics.secondaries.lifePoints.sacrificed` | Yes | NEW |
| Fatigue Current | `system.characteristics.secondaries.fatigue.value` | Yes | |
| Fatigue Max | `system.characteristics.secondaries.fatigue.max` | Yes | |
| Destiny Base | `system.general.destinyPoints.base.value` | Yes | |
| Destiny Final | `system.general.destinyPoints.final.value` | No | Derived |
| Initiative Base | `system.characteristics.secondaries.initiative.base.value` | Yes | |
| Initiative Final | `system.characteristics.secondaries.initiative.final.value` | No | Derived |
| Selected Weapon | `system.combat.selectedWeaponId.value` | Yes | NEW |
| Resistances (each) | `system.characteristics.secondaries.resistances.{type}.base.value` | Yes | |
| Physical Modifier | `system.general.modifiers.modFisico.bonus.value` | Yes | |
| Supernatural Modifier | `system.general.modifiers.modSobrenatural.bonus.value` | Yes | |

### 5.2 Skills Tab Fields

| Field | Path | Editable | Notes |
|-------|------|----------|-------|
| Primary Characteristic Value | `system.characteristics.primaries.{stat}.value` | Yes | |
| Primary Characteristic Mod | `system.characteristics.primaries.{stat}.mod` | No | Derived |
| Secondary Skill Base | `system.secondaries.{group}.{skill}.base.value` | Yes | |
| Secondary Skill Final | `system.secondaries.{group}.{skill}.final.value` | No | Derived |

### 5.3 Combat Tab Fields

| Field | Path | Editable | Notes |
|-------|------|----------|-------|
| Attack Base | `system.combat.attack.base.value` | Yes | |
| Attack Final | `system.combat.attack.final.value` | No | Derived |
| Block Base | `system.combat.block.base.value` | Yes | |
| Block Final | `system.combat.block.final.value` | No | Derived |
| Dodge Base | `system.combat.dodge.base.value` | Yes | |
| Dodge Final | `system.combat.dodge.final.value` | No | Derived |
| Wear Armor | `system.combat.wearArmor.value` | Yes | |
| Combat Notes | `system.combat.notes.value` | Yes | NEW |

### 5.4 Dynamic Resources (Conditional)

| Field | Path | Editable | Condition |
|-------|------|----------|-----------|
| Zeon Current | `system.mystic.zeon.value` | Yes | mystic tab enabled |
| Zeon Max | `system.mystic.zeon.max` | Yes | mystic tab enabled |
| Zeon Accumulated | `system.mystic.zeonAccumulated.value` | Yes | mystic tab enabled |
| Ki Generic Current | `system.domine.kiAccumulation.generic.value` | Yes | domine tab enabled |
| Ki Generic Max | `system.domine.kiAccumulation.generic.max` | Yes | domine tab enabled |
| PP Current | `system.psychic.psychicPoints.value` | Yes | psychic tab enabled |
| PP Max | `system.psychic.psychicPoints.max` | Yes | psychic tab enabled |
| PP In Use | `system.psychic.psychicPoints.inUse` | Yes | psychic tab enabled |

---

## 6. Implementation Checklist

### 6.1 Schema Changes (template.json)

- [ ] Add `sacrificed` to `lifePoints`
- [ ] Add `selectedWeaponId` to `combat`
- [ ] Add `notes` to `combat`
- [ ] Add `attacks` array to `combat`
- [ ] Add `defenses` array to `combat`
- [ ] Add `"attack"` to `Item.types`
- [ ] Add `"defense"` to `Item.types`
- [ ] Add `attack` item schema
- [ ] Add `defense` item schema

### 6.2 JavaScript Changes

- [ ] Create `AttackItemConfig.js`
- [ ] Create `DefenseItemConfig.js`
- [ ] Add to `ABFItems.js` enum
- [ ] Add to `constants.js` exports
- [ ] Add getter methods to `ABFActor.js`
- [ ] Create item sheet templates (if hasSheet: true)

### 6.3 Template Changes

- [ ] Create header components with correct `name` attributes
- [ ] Create combat tab with attacks/defenses tables
- [ ] Add combat notes textarea
- [ ] Add weapon selector dropdown
- [ ] Ensure all editable fields have proper `name` bindings
- [ ] Ensure derived fields have `disabled` attribute

### 6.4 Localization

- [ ] Add keys for new UI labels
- [ ] Add keys for attack/defense dialogs
- [ ] Update es.json, en.json, fr.json

---

## 7. Migration Considerations

### 7.1 Existing Data Compatibility

The changes are **additive** - no existing fields are removed or renamed:
- New fields get default values from `INITIAL_ACTOR_DATA`
- Existing actors continue working
- V1 sheet remains fully functional

### 7.2 Auto-Creation of Attack/Defense from Weapons

Consider adding a migration/helper that:
1. For each weapon, creates a corresponding attack item
2. For weapons with block values, creates a defense item
3. Links them via `source.itemId`

This can be a manual action in settings or automatic on sheet open.

---

## 8. Form Binding Examples

### 8.1 Simple Input

```handlebars
{{!-- Editable base value --}}
<input type="number"
       name="system.characteristics.secondaries.lifePoints.value"
       value="{{system.characteristics.secondaries.lifePoints.value}}" />

{{!-- Read-only derived value --}}
<input type="number" disabled
       value="{{system.characteristics.secondaries.lifePoints.max}}" />
```

### 8.2 Select Dropdown

```handlebars
<select name="system.combat.selectedWeaponId.value">
  <option value="">{{localize "anima.ui.combat.noWeapon"}}</option>
  {{#each system.combat.weapons}}
    <option value="{{this._id}}"
            {{#if (eq this._id @root.system.combat.selectedWeaponId.value)}}selected{{/if}}>
      {{this.name}} (Init: {{this.system.initiative.final.value}})
    </option>
  {{/each}}
</select>
```

### 8.3 Item Row with Dynamic Name

```handlebars
{{#each system.combat.attacks}}
<tr class="attack-row" data-item-id="{{this._id}}">
  <td>{{this.name}}</td>
  <td>
    <input type="number"
           name="system.dynamic.attack.{{this._id}}.system.attackValue.special.value"
           value="{{this.system.attackValue.special.value}}" />
  </td>
  <td>{{this.system.attackValue.final.value}}</td>
</tr>
{{/each}}
```

### 8.4 Textarea

```handlebars
<textarea name="system.combat.notes.value"
          rows="6"
          placeholder="{{localize 'anima.ui.combat.notesPlaceholder'}}">{{system.combat.notes.value}}</textarea>
```

---

## Summary

**Minimal changes for V2 Phase 1:**
1. Add `sacrificed` to `lifePoints` in template.json
2. Add `selectedWeaponId` and `notes` to `combat` in template.json
3. Create templates with proper `name` attributes

**Full Attack/Defense system (Phase 2+):**
1. Add item types to template.json
2. Create ItemConfig files
3. Register in constants.js
4. Create item sheets
5. Optional: migration helper for existing weapons
