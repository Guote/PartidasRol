# Roadmap — Planned Features

Features designed but not yet implemented. Use this as reference when building them.

---

## Attack & Defense Item System

**Status:** Pending — V2 sheet must be stable first
**Goal:** Replace weapon-centric combat tab with unified Attack/Defense items that can derive from weapons, spells, ki powers, psychic powers, or be standalone.

### Why
Currently the combat tab shows weapons directly. This means ki blasts, spells, and psychic attacks all live in different tabs and can't be used uniformly in the attack dialog. Attack/Defense items unify all combat options into one interface.

### Schema additions needed in `template.json`

**New item types:**
```json
"Item": {
  "types": [...existing..., "attack", "defense"],

  "attack": {
    "source": {
      "type": { "value": "custom" },   // weapon|spell|ki|psychic|technique|summon|custom
      "itemId": { "value": "" },
      "itemType": { "value": "" }
    },
    "attackValue": { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 } },
    "damage":      { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 }, "isFixed": { "value": false } },
    "initiative":  { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 } },
    "critic":  { "primary": { "value": "-" }, "secondary": { "value": "-" } },
    "range":   { "type": { "value": "melee" }, "value": { "value": 0 } },
    "special": { "value": "" },
    "notes":   { "value": "" },
    "isRanged": { "value": false },
    "usesAmmo": { "value": false },
    "ammoId":   { "value": "" },
    "enabled":  { "value": true }
  },

  "defense": {
    "source": {
      "type": { "value": "custom" },   // weapon|dodge|spell|ki|psychic|custom
      "itemId": { "value": "" },
      "itemType": { "value": "" }
    },
    "defenseType":  { "value": "block" },  // block|dodge|parry|magicShield|psychicShield|custom
    "defenseValue": { "base": { "value": 0 }, "special": { "value": 0 }, "final": { "value": 0 } },
    "absorption":   { "value": 0 },
    "counterBonus": { "value": 0 },
    "special": { "value": "" },
    "notes":   { "value": "" },
    "enabled": { "value": true }
  }
}
```

**New actor combat fields:**
```json
"combat": {
  "attacks": [],
  "defenses": [],
  "selectedWeaponId": { "value": "" },
  "notes": { "value": "" }
}
```

### Implementation steps

1. **`template.json`** — add schemas above
2. **`module/items/ABFItems.js`** — add `ABFItems["ATTACK"] = "attack"` and `DEFENSE`
3. **`module/types/combat/AttackItemConfig.js`** — follow `WeaponItemConfig.js` pattern with `ABFItemConfigFactory()`
4. **`module/types/combat/DefenseItemConfig.js`** — same pattern
5. **`module/actor/utils/prepareItems/constants.js`** — register both configs in `ALL_ITEM_CONFIGURATIONS`
6. **`module/actor/utils/prepareActor/`** — add derived calculation for attack/defense finals (based on source item if linked)
7. **`templates/actor-v2/parts/tabs/combat.hbs`** — add attacks table, defenses table, weapon selector dropdown, combat notes editor
8. **`module/combat/chat-combat/ChatCombatManager.js`** — allow selecting Attack item instead of raw weapon

### Migration helper (optional)
A utility that auto-creates Attack items from existing weapons (linked via `source.itemId`).

---

## Sacrificed HP

**Status:** Schema not yet added
**Goal:** Track HP sacrificed through certain game mechanics (regenerates differently).

```json
"lifePoints": { "value": 100, "max": 100, "sacrificed": 0 }
```

Effective max HP = `max - sacrificed`. Add input to header next to HP bar.

---

## Selected Weapon for Initiative

**Status:** Schema not yet added
**Goal:** Header shows a dropdown to select the active weapon; initiative display reflects that weapon's initiative bonus.

```json
"combat": { "selectedWeaponId": { "value": "" } }
```

---

## Quick Actions (Header)

**Status:** Not implemented
**Goal:** Buttons in the header for common actions: Full Rest, Half Rest, Send Attack (Chat).

- **Full Rest** — recover fatigue to max + HP regeneration × days
- **Half Rest** — recover half fatigue, no HP
- **Attack** — calls `window.ChatCombat.sendAttack()`

---

## Field Reference: Editable vs Derived

Use this when building templates to know which fields should have `name=` (editable) vs `disabled` (derived/read-only).

### Header

| Field | Path | Editable |
|-------|------|----------|
| HP Current | `system.characteristics.secondaries.lifePoints.value` | ✓ |
| HP Max | `system.characteristics.secondaries.lifePoints.max` | ✓ |
| HP Sacrificed | `system.characteristics.secondaries.lifePoints.sacrificed` | ✓ (planned) |
| Fatigue Current | `system.characteristics.secondaries.fatigue.value` | ✓ |
| Fatigue Max | `system.characteristics.secondaries.fatigue.max` | ✓ |
| Destiny Base | `system.general.destinyPoints.base.value` | ✓ |
| Destiny Final | `system.general.destinyPoints.final.value` | ✗ derived |
| Initiative Base | `system.characteristics.secondaries.initiative.base.value` | ✓ |
| Initiative Final | `system.characteristics.secondaries.initiative.final.value` | ✗ derived |
| Selected Weapon | `system.combat.selectedWeaponId.value` | ✓ (planned) |
| Resistance (each) | `system.characteristics.secondaries.resistances.{type}.base.value` | ✓ |
| Physical Modifier | `system.general.modifiers.modFisico.bonus.value` | ✓ |
| Supernatural Modifier | `system.general.modifiers.modSobrenatural.bonus.value` | ✓ |

### Skills tab

| Field | Path | Editable |
|-------|------|----------|
| Primary Char value | `system.characteristics.primaries.{stat}.value` | ✓ |
| Primary Char mod | `system.characteristics.primaries.{stat}.mod` | ✗ derived |
| Secondary base | `system.secondaries.{group}.{skill}.base.value` | ✓ |
| Secondary final | `system.secondaries.{group}.{skill}.final.value` | ✗ derived |

### Combat tab

| Field | Path | Editable |
|-------|------|----------|
| Attack base | `system.combat.attack.base.value` | ✓ |
| Attack final | `system.combat.attack.final.value` | ✗ derived |
| Block base | `system.combat.block.base.value` | ✓ |
| Block final | `system.combat.block.final.value` | ✗ derived |
| Dodge base | `system.combat.dodge.base.value` | ✓ |
| Dodge final | `system.combat.dodge.final.value` | ✗ derived |
| Wear Armor | `system.combat.wearArmor.value` | ✓ |
| Combat Notes | `system.combat.notes.value` | ✓ (planned) |

### Dynamic resources (conditional on tab visibility)

| Field | Path | Editable |
|-------|------|----------|
| Zeon current | `system.mystic.zeon.value` | ✓ |
| Zeon max | `system.mystic.zeon.max` | ✓ |
| Zeon accumulated | `system.mystic.zeonAccumulated.value` | ✓ |
| Ki generic current | `system.domine.kiAccumulation.generic.value` | ✓ |
| Ki generic max | `system.domine.kiAccumulation.generic.max` | ✓ |
| PP current | `system.psychic.psychicPoints.value` | ✓ |
| PP max | `system.psychic.psychicPoints.max` | ✓ |
| PP in use | `system.psychic.psychicPoints.inUse` | ✓ |
