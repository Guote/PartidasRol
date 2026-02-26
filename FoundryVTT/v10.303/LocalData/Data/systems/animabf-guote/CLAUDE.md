# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context Files

Specialized context is in `.agents/`. Before starting any non-trivial task, read `.agents/index.md` to identify which files are relevant for the task at hand, then read those files.

## Large Task Planning

For tasks involving multiple phases or many file changes, create `currentPlan.md` at the project root before starting work. Update it as subtasks complete. If a session is interrupted, the next session should read this file first to know where to resume.

**When to create it:** 5+ files to change, or 3+ distinct phases, or the task spans multiple sessions.

**Format:**
```markdown
# Current Task: [name]

## Goal
[What needs to be done and why]

## Subtasks
- [x] Completed step
- [ ] **← RESUME HERE** Next step
- [ ] Later step

## Key Decisions
- [Important choices made during the task]

## Notes
- [Anything a new session needs to know to continue correctly]
```

Delete `currentPlan.md` when the task is fully complete.

## Project Overview

**AnimaBF-Guote** is an unofficial Anima Beyond Fantasy RPG system for Foundry VTT v10. This is the compiled/deployed version - original source is at https://github.com/AnimaBeyondDevelop/AnimaBeyondFoundry

- **System ID**: `animabf-guote`
- **Foundry Compatibility**: v10 (verified 10.303)
- **Languages**: Spanish (primary), English, French

## Required Modules

- **libWrapper** (v1.12.12.1+)
- **Compendium Folders** (v2.6.1+)

## Architecture

### Entry Point & Initialization

`animabf-guote.mjs` - Uses Foundry's Hook system:
- `init` hook: Registers custom classes (ABFActor, ABFItem, ABFCombat), sheets, settings, and preloads templates
- `ready` hook: Registers WebSocket combat routes, custom macro bar, and initializes `window.ChatCombat`

**Global Window Objects:**
- `window.Websocket` - WebSocket combat manager (sendAttack, sendAttackRequest)
- `window.ChatCombat` - Chat combat manager (sendAttack)

### Custom Hotbar

Configured in `utils/attachCustomMacroBar.js`, template at `templates/custom-hotbar/custom-hotbar.hbs`:

| Button | GM Shortcut | Player Shortcut | Action |
|--------|-------------|-----------------|--------|
| Damage Calculator | ctrl+1 | - | Opens damage calculator |
| Send Attack (WebSocket) | ctrl+2 | ctrl+1 | `window.Websocket.sendAttack()` |
| Send Attack (Chat) | ctrl+3 | ctrl+2 | `window.ChatCombat.sendAttack()` |

### Core Classes

| Class | Location | Purpose |
|-------|----------|---------|
| `ABFActor` | `module/actor/ABFActor.js` | Custom Actor document class |
| `ABFItem` | `module/items/ABFItem.js` | Custom Item document class |
| `ABFCombat` | `module/combat/ABFCombat.js` | Custom Combat tracker with d100 initiative |
| `ABFActorSheet` | `module/actor/ABFActorSheet.js` | Main character sheet |
| `ABFFoundryRoll` | `module/rolls/ABFFoundryRoll.js` | Custom dice roll system |
| `ChatCombatManager` | `module/combat/chat-combat/ChatCombatManager.js` | Chat-based combat controller |
| `ChatAttackCard` | `module/combat/chat-combat/ChatAttackCard.js` | Attack card creation/management |
| `ChatCombatDefenseDialog` | `module/combat/chat-combat/ChatCombatDefenseDialog.js` | Defense dialog for chat combat |

### Derived Data Pipeline

Actor preparation happens in `module/actor/utils/prepareActor/prepareActor.js`, which orchestrates calculation functions in a specific order. Each calculation module is in `module/actor/utils/prepareActor/calculations/`.

Order matters - primary modifiers must be calculated before combat data that depends on them.

### Combat System

Two parallel combat systems exist:

#### WebSocket Combat (Original)
Real-time combat via WebSocket synchronization:
- `module/combat/websocket/ws-combat/gm/` - GM-side handlers
- `module/combat/websocket/ws-combat/user/` - Player-side handlers
- Combat dialogs in `module/combat/websocket/dialogs/`
- Triggered via hotbar button "Send Attack (WebSocket)" or `window.Websocket.sendAttack()`

#### Chat-Based Combat (New)
Asynchronous combat via chat messages:
- `module/combat/chat-combat/ChatCombatManager.js` - Main controller, exposed as `window.ChatCombat`
- `module/combat/chat-combat/ChatAttackCard.js` - Creates/updates attack cards with results table
- `module/combat/chat-combat/ChatCombatDefenseDialog.js` - Defense dialog (FormApplication)
- Templates in `templates/chat/chat-combat/` and `templates/dialog/combat/chat-combat-defense/`

**Chat Combat Flow:**
1. Attacker selects token, optionally targets enemies, clicks "Send Attack (Chat)" hotbar button (ctrl+3 GM, ctrl+2 player)
2. Attack dialog opens, attack card auto-posted to chat on completion
3. Targeted token owners receive defense dialog automatically via socket
4. Anyone can click "Defend" button on attack card to respond
5. Results appear in the same attack card (HD, TA, damage/counter-attack)
6. GM can apply/undo damage via buttons in results table

**Chat Combat Socket Events:**
- `chatCombat.defenseAdded` - Notifies clients when a defender responds
- `chatCombat.damageApplied` / `chatCombat.damageUndone` - Syncs damage state
- `chatCombat.promptDefense` - Prompts specific user to defend

**Session Tracking:**
Attack cards use a `sessionId` in flags to handle message recreation (delete old + create new at bottom) when defenders are added. `ChatAttackCard._sessionMap` tracks sessionId → messageId.

### Custom Roll Classes

- `ABFFoundryRoll` - Main roll class, extends Foundry's Roll
- `ABFExploderRoll` - Critical hit/fumble explosion mechanics
- `ABFInitiativeRoll` - Initiative formula: `1d100Initiative`
- `ABFControlRoll` - Skill checks

### Handlebars Templates

126 templates in `templates/` directory. Custom helper `xRoot` (defined in entry point) provides access to root data without `../../../` chains.

Register helpers via `utils/handlebars-helpers/registerHelpers.js`.

## Data Schema

Defined in `template.json`:

**Actor Types**: `character`, `npc`

**Item Types**: `weapon`, `armor`, `ammo`, `spell`, `psychicPower`, `technique`, `inventoryItem`, `advantage`, `disadvantage`, `mentalPattern`, `psychicDiscipline`, `note`

**Damage Types**: cut, impact, thrust, heat, electricity, cold, energy

## Testing

Jest test files exist at:
- `module/actor/utils/splitAsActorAndItemChanges.test.js`
- `module/combat/utils/__test__/calculateCounterAttackBonus.test.js`
- `module/combat/utils/__test__/calculateDamage.test.js`
- `module/rolls/ABFExploderRoll/ABFExploderRoll.test.js`
- `module/rolls/ABFInitiativeRoll/ABFInitiativeRoll.test.js`

Note: No package.json present in deployed version. Build/test tooling is in the source repository.

## Key System Settings

Registered in `utils/registerSettings.js`:
- `AUTO_ACCEPT_COMBAT_REQUESTS`
- `ROUND_DAMAGE_IN_MULTIPLES_OF_5`
- `SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT`
- `USE_DAMAGE_TABLE`
- `DEVELOP_MODE`

## Localization

Language files in `lang/` (~680 keys each). Update all three when adding strings:
- `lang/es.json` (Spanish - primary)
- `lang/en.json` (English)
- `lang/fr.json` (French)

**Key Prefixes:**
- `anima.ui.*` - UI labels and titles
- `anima.macros.combat.*` - Combat dialog messages
- `anima.chat.combat.*` - Chat-based combat system
- `anima.customHotbar.*` - Hotbar button tooltips

## Game Mechanics Implemented

- **Combat**: Attack/defense resolution, counter-attacks, critical explosions, damage calculation with armor reduction
- **Mystic (Magic)**: Spell Vias (paths), spell grades, zeon system
- **Psychic**: Psychic powers and disciplines
- **Domine**: Ki accumulation, martial arts, techniques, seals

## Compendium Packs

Spanish content in `packs/`:
- `weapons_es.db`, `armors_es.db`, `magic_es.db`, `psychic_powers_es.db`, `npcs_es.db`

## V2 Actor Sheet Patterns

### Header Resource Inputs with `_header.` Prefix

When the V2 actor sheet header has resource inputs (Zeon, Ki, Psychic Points, etc.) that also exist in V1 tab templates included via partials, use the `_header.` prefix pattern to avoid duplicate input names causing array submission issues.

**Problem:** Foundry forms submit all inputs with the same `name` attribute as arrays. When header and tab both have `name="system.mystic.zeon.value"`, the form submits `["100", "100"]` instead of `100`.

**Solution:** Header inputs use `_header.` prefix:
```handlebars
{{!-- In header-v2.hbs --}}
<input type="number" name="_header.system.mystic.zeon.value" value="{{system.mystic.zeon.value}}">
```

Then in `ABFActorSheetV2._updateObject()`, strip the prefix and map to real paths:
```javascript
Object.keys(formData).forEach((key) => {
  if (key.startsWith("_header.")) {
    const realKey = key.substring(8); // Remove "_header." prefix
    formData[realKey] = formData[key];
    delete formData[key];
  }
});
```

This gives header edits priority over tab values when both exist.

### Textarea Pattern: Always Use `{{editor}}`

In the V2 actor sheet, **never use a plain `<textarea>`** for multi-line text content. Always use Foundry's `{{editor}}` helper, which provides rich text editing (ProseMirror).

**Pattern:**
```handlebars
<div class="v2-card__body v2-notes-editor">
  {{editor system.field.enriched target="system.field.value" button=true owner=true editable=true}}
</div>
```

**Prerequisites:**
- The `.value` field must exist in `template.json`
- The `.enriched` field must be populated in `prepareActor.js` via `TextEditor.enrichHTML(actor.system.field.value)`
