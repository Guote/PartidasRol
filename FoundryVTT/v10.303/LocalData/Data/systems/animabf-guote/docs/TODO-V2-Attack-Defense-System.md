# TODO: Attack & Defense Item System

**Status:** Pending (for after V2 sheet is fully working)
**Priority:** Medium
**Dependencies:** ABFActorSheetV2 must be complete and stable

---

## Overview

Create unified `attack` and `defense` item types that abstract combat options from various sources (weapons, spells, ki powers, psychic powers, etc.) into a single interface.

**Goal:** In the Combat tab, instead of showing weapons directly, show "Attacks" and "Defenses" which can derive from any source.

---

## Implementation Steps

### 1. Schema Changes (template.json)

Add to `Item.types`:
```json
"types": [..., "attack", "defense"]
```

Add item schemas:
```json
"attack": {
  "source": {
    "type": { "value": "custom" },  // weapon|spell|ki|psychic|technique|summon|custom
    "itemId": { "value": "" },
    "itemType": { "value": "" }
  },
  "attackValue": { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 } },
  "damage": { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 }, "isFixed": { "value": false } },
  "initiative": { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 } },
  "critic": { "primary": { "value": "-" }, "secondary": { "value": "-" } },
  "range": { "type": { "value": "melee" }, "value": { "value": 0 } },
  "special": { "value": "" },
  "notes": { "value": "" },
  "isRanged": { "value": false },
  "usesAmmo": { "value": false },
  "ammoId": { "value": "" },
  "enabled": { "value": true }
},

"defense": {
  "source": {
    "type": { "value": "custom" },  // weapon|dodge|spell|ki|psychic|custom
    "itemId": { "value": "" },
    "itemType": { "value": "" }
  },
  "defenseType": { "value": "block" },  // block|dodge|parry|magicShield|psychicShield|custom
  "defenseValue": { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 } },
  "absorption": { "value": 0 },
  "counterBonus": { "value": 0 },
  "special": { "value": "" },
  "notes": { "value": "" },
  "enabled": { "value": true }
}
```

Add to actor combat section:
```json
"combat": {
  "attacks": [],
  "defenses": []
}
```

### 2. Create Item Configs

**Files to create:**
- `module/types/combat/AttackItemConfig.js`
- `module/types/combat/DefenseItemConfig.js`

**Pattern:** Follow `WeaponItemConfig.js` structure with:
- `ABFItemConfigFactory()` call
- `INITIAL_ATTACK_DATA` / `INITIAL_DEFENSE_DATA` constants
- `onCreate` async function
- `prepareItem` function for derived calculations
- Selector definitions

### 3. Register Items

**ABFItems.js:**
```javascript
ABFItems["ATTACK"] = "attack";
ABFItems["DEFENSE"] = "defense";
```

**constants.js (prepareItems):**
```javascript
import { AttackItemConfig } from '../../../types/combat/AttackItemConfig.js';
import { DefenseItemConfig } from '../../../types/combat/DefenseItemConfig.js';

export const ITEM_CONFIGURATIONS = {
  // ... existing
  [AttackItemConfig.type]: AttackItemConfig,
  [DefenseItemConfig.type]: DefenseItemConfig,
};
```

### 4. Create Item Sheets (Optional)

If `hasSheet: true`, create:
- `templates/items/attack-sheet.hbs`
- `templates/items/defense-sheet.hbs`
- `module/items/sheets/AttackSheet.js`
- `module/items/sheets/DefenseSheet.js`

### 5. Actor Methods

Add to `ABFActor.js`:
```javascript
getAttacks() {
  return this.getItemsOf(ABFItems.ATTACK);
}

getDefenses() {
  return this.getItemsOf(ABFItems.DEFENSE);
}
```

### 6. Derived Data Calculations

In `prepareActor.js` or a new calculation module:
- Calculate `final` values based on source item (if linked)
- Apply actor's base attack/block/dodge
- Apply modifiers

### 7. Template Integration (V2 only)

Update `actor-sheet-v2.hbs` combat tab to display:
- Attacks table with roll buttons
- Defenses table with roll buttons
- Keep weapons/armors in Inventory tab

### 8. Chat Combat Integration

Update `ChatCombatManager.js` to:
- Allow selecting an Attack item instead of just weapon
- Allow selecting a Defense item instead of block/dodge
- Pass attack/defense data to combat resolution

---

## Migration Helper (Optional)

Create a utility that:
1. For each weapon, creates a linked attack item
2. For weapons with block > 0, creates a linked defense item
3. Creates a default "Dodge" defense item

Can be triggered from Settings or automatically on V2 sheet open.

---

## Notes

- **V1 Compatibility:** Weapons remain as-is; V1 sheet continues working
- **V2 Only:** Attack/Defense items only used in V2 sheet
- **Coexistence:** Both systems can coexist; attacks can link to weapons or be standalone

---

## Related Files

- `docs/ABFActorSheetV2-Design.md` - Full V2 design document
- `docs/ABFActorSheetV2-Schema-Analysis.md` - Schema details
- `module/types/combat/WeaponItemConfig.js` - Reference implementation

---

## Acceptance Criteria

- [ ] Attack items can be created, edited, deleted
- [ ] Defense items can be created, edited, deleted
- [ ] Attacks linked to weapons inherit base values
- [ ] Attacks can be standalone (custom ki blast, etc.)
- [ ] Combat tab in V2 shows attacks/defenses instead of weapons
- [ ] Chat combat can use attack/defense items
- [ ] V1 sheet continues working unchanged
