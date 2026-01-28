# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an unofficial Foundry VTT v13+ system implementation for the "Anima Beyond Fantasy" tabletop RPG. The codebase is written in vanilla JavaScript (ES6 modules) with Handlebars templates. There is no build system - files are loaded directly by Foundry VTT.

**Key Files:**
- [animabfguote13.js](animabfguote13.js) - Main entry point, registers all Foundry hooks
- [system.json](system.json) - System manifest (compatibility, packs, languages)
- [template.json](template.json) - Complete data schema for actors and items (40+ item types)
- [module/](module/) - All system logic (actors, items, combat, rolls)
- [templates/](templates/) - Handlebars UI templates
- [utils/](utils/) - Shared utilities and helpers

## Development Workflow

**No build/compile step required.** The system uses native ES6 modules loaded directly by Foundry VTT.

**Testing:** Manual testing only - open Foundry VTT and load the system in a test world.

**Common Development Pattern:**
1. Make changes to `.js` files or `.hbs` templates
2. Reload Foundry VTT (F5 in browser)
3. Test changes in the character sheet or combat tracker

**Language Files:** [lang/es.json](lang/es.json), [lang/en.json](lang/en.json), [lang/fr.json](lang/fr.json) contain all UI strings.

## Core Architecture Pattern: The Mutation System

The system's most important architectural pattern is the **mutation-based calculation flow** for derived actor data. Understanding this is critical to working with the codebase.

### How It Works

When actor data changes, Foundry calls `prepareDerivedData()` which triggers a sequential pipeline of ~20 "mutation" functions that directly modify the actor's system data in-place.

**Flow:**
```
Actor change detected
  ↓
ABFActor.prepareDerivedData()
  ↓
prepareItems() - Resets all item collection arrays
  ↓
Sequential mutations execute in order:
  1. mutateTotalLevel
  2. mutatePresence
  3. mutateResistances
  4. mutatePrimaryModifiers
  5. mutateRegenerationType
  ... (15+ more) ...
  20. mutateDomineData
  ↓
Actor data fully calculated
```

**Key Locations:**
- Orchestration: [module/actor/utils/prepareActor/prepareActor.js](module/actor/utils/prepareActor/prepareActor.js)
- Mutation functions: [module/actor/utils/prepareActor/calculations/actor/](module/actor/utils/prepareActor/calculations/actor/)
- Item calculations: [module/actor/utils/prepareActor/calculations/items/](module/actor/utils/prepareActor/calculations/items/)

### Mutation Function Pattern

Each mutation function:
1. Takes `actor.system` as parameter
2. Modifies nested properties directly (in-place)
3. May call helper calculation functions
4. Follows naming: `mutate[Property].js`

**Example:** [module/actor/utils/prepareActor/calculations/actor/mutatePrimaryModifiers.js](module/actor/utils/prepareActor/calculations/actor/mutatePrimaryModifiers.js)

```javascript
const mutatePrimaryModifiers = (data) => {
  const { primaries } = data.characteristics;
  for (const primaryKey of Object.keys(primaries)) {
    primaries[primaryKey].mod = calculateAttributeModifier(
      primaries[primaryKey].value
    );
  }
};
```

**Why This Matters:**
- Order of mutations is critical (later mutations depend on earlier ones)
- Items and actors have interdependencies (weapons need actor strength, armors affect actor penalties)
- When adding calculations, place them in the correct position in the sequence

## Item System Architecture

Items use a **configuration factory pattern** to integrate with actors.

### ItemConfig Pattern

Each item type has a configuration class in [module/types/](module/types/) that defines:
- `type` - Item type identifier
- `fieldPath` - Where items are stored in actor data
- `resetFieldPath(actor)` - Clears the collection
- `addItemToCollection(actor, item)` - Adds computed item

**Example:** Weapons are stored at `actor.system.combat.weapons[]` and managed by `WeaponItemConfig`.

**Registry:** [module/actor/utils/prepareItems/constants.js](module/actor/utils/prepareItems/constants.js) contains:
- `ITEM_CONFIGURATIONS` - Visible items
- `INTERNAL_ITEM_CONFIGURATIONS` - Internal mechanics
- `ALL_ITEM_CONFIGURATIONS` - Combined registry

### Item Preparation Flow

During actor preparation:
1. `prepareItems()` calls `resetFieldPath()` on all item configs (clears arrays)
2. Mutation functions rebuild collections with calculated values
3. Item mutations (e.g., `mutateWeaponsData()`) call ItemConfig methods to populate actor arrays with equipped items

**Key Files:**
- [module/items/ABFItem.js](module/items/ABFItem.js) - Base item class
- [module/items/ABFItemSheet.js](module/items/ABFItemSheet.js) - Item sheet UI
- [module/types/](module/types/) - All ItemConfig implementations

## Combat System

The combat system uses websocket communication for real-time attack/defense coordination.

### Combat Flow

1. **Attack Declaration:**
   - Actor creates `ABFAttackData` with ability, damage, modifiers, targets
   - Posted to chat with embedded defense buttons

2. **Defense Response:**
   - Targets click defense buttons
   - `ABFDefenseData` sent to GM via websocket
   - Defense roll executed, state updated to "rolling" → "done"

3. **Result Calculation:**
   - `computeCombatResult()` calculates damage from attack - defense
   - Applies armor reduction, supernatural shields, critical effects
   - Damage applied to target actor

**Key Files:**
- [module/combat/ABFCombat.js](module/combat/ABFCombat.js) - Combat document (initiative, rounds)
- [module/combat/ABFAttackData.js](module/combat/ABFAttackData.js) - Attack data structure
- [module/combat/ABFDefenseData.js](module/combat/ABFDefenseData.js) - Defense response
- [module/combat/ABFCombatResultData.js](module/combat/ABFCombatResultData.js) - Result calculation
- [module/combat/utils/computeCombatResult.js](module/combat/utils/computeCombatResult.js) - Damage/critical calculator
- [module/combat/websocket/](module/combat/websocket/) - Real-time communication

### Websocket Architecture

Two-way communication between GM and players:
- `WSGMCombatManager` - GM-side operations (authoritative)
- `WSUserCombatManager` - Player-side operations (requests)
- Message types for attack/defense synchronization
- Target state tracking: "pending" → "rolling" → "done" → "expired"

## Migration System

Schema changes are handled through numbered migration files in [module/migration/migrations/](module/migration/migrations/).

**System:**
- Registry auto-detects migrations (migration1.js through migration11.js)
- Executes on world load if actor/item version < system version
- Tracks completion per document

**When adding migrations:**
1. Create new numbered file (e.g., `migration12.js`)
2. Export migration functions for actors/items
3. Update actor/item version after applying

## Data Structure Patterns

### Dual Value Pattern

Many fields use `base`, `special`, and `final` structure:

```javascript
modifiers: {
  physicalActions: {
    base: { value: 0 },      // Base value
    special: { value: 0 },   // Bonuses/penalties
    final: { value: 0 }      // Calculated: base + special
  }
}
```

### Equipped Items

Equipped weapons/armors are copied into actor arrays (not references) with fully computed values updated during mutations.

## Template System

Handlebars templates in [templates/](templates/) organized by category:
- [templates/actor/parts/combat/](templates/actor/parts/combat/) - Combat tab UI
- [templates/actor/parts/mystic/](templates/actor/parts/mystic/) - Magic system UI
- [templates/actor/parts/psychic/](templates/actor/parts/psychic/) - Psychic powers UI
- [templates/actor/parts/domine/](templates/actor/parts/domine/) - Ki/martial arts UI
- [templates/chat/](templates/chat/) - Chat message templates

**Custom Features:**
- Formula evaluation: `@formula{actor.characteristics.primaries.strength.value + 5}`
- Custom Handlebars helpers in [utils/handlebars-helpers/](utils/handlebars-helpers/)

## Important Conventions

1. **File Paths:** Use Windows paths with backslashes (e.g., `c:\path\to\file`)
2. **Imports:** Always use `.js` extension in imports
3. **Actor Modifications:** Never modify actor data directly - always use mutations during `prepareDerivedData()`
4. **Item Collections:** Reset via ItemConfig before rebuilding
5. **Combat Changes:** Consider both GM and player perspectives (websocket sync)
6. **Translations:** Add new strings to all three language files (es, en, fr)

## Common Tasks

**Adding a new calculated value to actors:**
1. Update [template.json](template.json) with new field
2. Create calculation function in appropriate `calculations/` subdirectory
3. Create mutation function that calls calculation
4. Add mutation to sequence in [prepareActor.js](module/actor/utils/prepareActor/prepareActor.js) (order matters!)

**Adding a new item type:**
1. Add type to [template.json](template.json) `Item.types` array with data schema
2. Create ItemConfig in [module/types/](module/types/) with appropriate category subdirectory
3. Register in [constants.js](module/actor/utils/prepareItems/constants.js)
4. Create mutation if items need to appear in actor collections
5. Create template in [templates/](templates/) for item sheet

**Modifying combat mechanics:**
1. Update attack/defense/result data structures in [module/combat/](module/combat/)
2. Update [computeCombatResult.js](module/combat/utils/computeCombatResult.js) for damage calculations
3. Update chat templates in [templates/chat/](templates/chat/)
4. Test with multiple users (GM + player) to verify websocket sync

## System Version & Compatibility

- Current version: 2.1.0
- Requires Foundry VTT v13 minimum (verified on v13.348)
- Git repository: https://github.com/AnimaBeyondDevelop/AnimaBeyondFoundry
- This is a development/testing copy in LocalData (not installed via package manager)
