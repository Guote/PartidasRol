# Chat-Based Combat System Implementation Plan

## Overview

Implement a new chat-based combat system that runs parallel to the existing WebSocket system. When an attack is made, a chat card is **automatically posted** with a "Defend" button. Multiple defenders can respond, and results are tracked in a dynamic result card.

## Design Decisions

- **Trigger**: Automatic on any attack roll (integrates with existing attack dialogs)
- **Defense Types**: Full support for physical (dodge/block), mystic, and psychic defenses
- **Counter-Attack**: Display bonus value only; player handles counter-attack manually

## Data Flow

```
Attack Roll (any type) → [Attack Card auto-posted] → Defend Button Click
    → [Defense Dialog - all types] → [Defense Card]
    → [Result Card (auto-updates with each defender)]
```

## New Files to Create

### JavaScript Classes (`module/combat/chat-combat/`)

| File | Purpose |
|------|---------|
| `ChatCombatManager.js` | Main controller: hooks, socket listeners, orchestration |
| `ChatAttackCard.js` | Creates attack chat messages with Defend button |
| `ChatDefenseCard.js` | Creates defense result chat messages |
| `ChatResultCard.js` | Creates/updates result table with all defenders |
| `ChatCombatDefenseDialog.js` | Full defense dialog with combat/mystic/psychic tabs |

### Handlebars Templates (`templates/chat/chat-combat/`)

| File | Purpose |
|------|---------|
| `attack-card.hbs` | Attack card: HA, damage, damage type, TA reduction, Defend button |
| `defense-card.hbs` | Defense card: HD, all TAs, defense type |
| `result-card.hbs` | Result table: rows per defender, Apply Damage buttons, counter bonus display |

### Defense Dialog Template (`templates/dialog/combat/chat-combat-defense/`)

| File | Purpose |
|------|---------|
| `chat-combat-defense-dialog.hbs` | Main defense dialog with tabs |
| `parts/combat.hbs` | Physical defense tab (dodge/block) |
| `parts/mystic.hbs` | Mystic defense tab |
| `parts/psychic.hbs` | Psychic defense tab |

## Files to Modify

| File | Changes |
|------|---------|
| `animabf-guote.mjs` | Import and initialize `ChatCombatManager` in `ready` hook |
| `module/utils/constants.js` | Add new template paths to `Templates` object |
| `utils/preloadTemplates.js` | Register new templates for preloading |
| `module/dialogs/combat/CombatAttackDialog.js` | Add hook to post attack card after roll |
| `lang/es.json`, `lang/en.json`, `lang/fr.json` | Add localization keys |
| `animabf-guote.css` | Add styles for chat combat cards |

## Key Data Structures

### Attack Card Flags (`message.flags['animabf-guote'].chatCombat`)

```javascript
{
  cardType: 'attack',
  attackerTokenId: string,
  attackerActorId: string,
  attackType: 'combat' | 'mystic' | 'psychic',
  attackTotal: number,      // Final HA
  baseDamage: number,
  damageType: string,       // cut, impact, thrust, heat, electricity, cold, energy
  taReduction: number,      // From weapon quality + ignoredTA
  resultMessageId: string | null,  // Set after first defense
  attackerInfo: { name, img }
}
```

### Result Card Flags

```javascript
{
  cardType: 'result',
  attackMessageId: string,
  results: [{
    defenderTokenId: string,
    defenderName: string,
    defenderImg: string,
    difference: number,
    canCounter: boolean,
    counterBonus: number,
    damage: number,
    damageApplied: boolean
  }]
}
```

## Implementation Details

### Automatic Attack Card Trigger

Modify `CombatAttackDialog.js` to post attack card when `onAttack` hook fires:

```javascript
// After existing roll.toMessage() call, add:
await ChatAttackCard.create(this.modalData.attacker.token, result);
```

This ensures attack cards are posted for all attack types (combat, mystic, psychic).

### ChatCombatManager.js

1. **Hook Registration**: `renderChatMessage` to attach button listeners
2. **Defend Button Handler**:
   - GM with selected tokens → those tokens defend
   - Player without selection → prompt their character token
3. **Defense Processing**:
   - Open `ChatCombatDefenseDialog` (full dialog with combat/mystic/psychic tabs)
   - On defense roll, create defense card
   - Calculate result using existing `calculateCombatResult()`
   - Create or update result card
4. **Socket Communication**: Notify clients when defenders added/damage applied

### Button Click Architecture

```javascript
// In renderChatMessage hook
html.find('.defend-button').click(() => { /* open defense dialog */ });
html.find('.apply-damage-button').click(() => { /* apply damage to token */ });
// Counter-attack: just displays bonus, no button action needed
```

### Result Card Updates

When new defender responds:
1. Get existing result card via `attackFlags.resultMessageId`
2. Add new result entry to `flags.results` array
3. Re-render template with updated data
4. Call `resultMessage.update({ content, flags })`

## Integration with Existing Code

**Reuse existing utilities:**
- `calculateCombatResult()` from `module/combat/utils/calculateCombatResult.js`
- `calculateATReductionByQuality()` from `module/combat/utils/calculateATReductionByQuality.js`
- `ABFFoundryRoll` for defense rolls
- `getFormula()` for roll formula building

**Get armor values from actor:**
```javascript
const at = actor.system.combat.totalArmor.at[damageType].value;
```

**Apply damage:**
```javascript
token.actor.applyDamage(damage);
```

## Localization Keys to Add

```
anima.chat.combat.attack.title, anima.chat.combat.attackTotal, anima.chat.combat.baseDamage,
anima.chat.combat.damageType, anima.chat.combat.taReduction, anima.chat.combat.defend,
anima.chat.combat.defense.title, anima.chat.combat.defenseTotal, anima.chat.combat.defenseType,
anima.chat.combat.armorValues, anima.chat.combat.result.title, anima.chat.combat.result.defender,
anima.chat.combat.result.difference, anima.chat.combat.result.outcome, anima.chat.combat.result.action,
anima.chat.combat.result.counter, anima.chat.combat.result.counterBonus, anima.chat.combat.result.damage,
anima.chat.combat.result.miss, anima.chat.combat.result.applyDamage, anima.chat.combat.selectDefender
```

## Implementation Sequence

1. **Phase 1**: Create `ChatCombatManager.js` skeleton, update `constants.js`, register in entry point
2. **Phase 2**: Create `ChatAttackCard.js` and `attack-card.hbs`, modify `CombatAttackDialog.js` to auto-post
3. **Phase 3**: Create `ChatCombatDefenseDialog.js` with full tabs (combat/mystic/psychic), wire up Defend button
4. **Phase 4**: Create `ChatDefenseCard.js` and `defense-card.hbs`
5. **Phase 5**: Create `ChatResultCard.js` and `result-card.hbs` with update logic
6. **Phase 6**: Add CSS styles, localization, and polish

## Verification

1. **Attack Card Test**: Trigger attack from token, verify card appears with correct data
2. **Defense Test**: Click Defend, complete dialog, verify defense card and result card appear
3. **Multiple Defenders**: Have multiple tokens defend same attack, verify result table updates
4. **Apply Damage**: Click Apply Damage button, verify token HP decreases
5. **Counter-Attack**: When HD > HA, verify counter bonus displays correctly (no damage/apply button)
6. **Cross-Client**: Test with GM and player clients to verify socket sync

## Status

- [x] Phase 1: Infrastructure setup
- [x] Phase 2: Attack card implementation
- [x] Phase 3: Defense dialog implementation
- [x] Phase 4: Defense card implementation (merged into attack card)
- [x] Phase 5: Result card implementation (merged into attack card)
- [x] Phase 6: Styling and localization
- [x] Phase 7: Hotbar integration and auto-targeting

## Implementation Summary

### Final Design
The defense and result cards were **merged into the attack card** for a cleaner UX. One card shows:
- Attacker info (portrait, name, HA) with collapsible attack details
- Results table with columns: Defender portrait, HD, TA, Outcome (💔 damage / ⚔️ counter), Action buttons
- Defend button for anyone to respond

### Files Created
- `module/combat/chat-combat/ChatCombatManager.js` - Main controller (exposed as `window.ChatCombat`)
- `module/combat/chat-combat/ChatAttackCard.js` - Attack card with integrated results (uses sessionId tracking)
- `module/combat/chat-combat/ChatCombatDefenseDialog.js` - Defense dialog with defender name display
- `templates/chat/chat-combat/attack-card.hbs` - Merged attack/results card
- `templates/dialog/combat/chat-combat-defense/chat-combat-defense-dialog.hbs`
- `templates/dialog/combat/chat-combat-defense/parts/combat.hbs`
- `templates/dialog/combat/chat-combat-defense/parts/mystic.hbs`
- `templates/dialog/combat/chat-combat-defense/parts/psychic.hbs`

### Files Modified
- `animabf-guote.mjs` - Initializes `window.ChatCombat = new ChatCombatManager()`
- `module/utils/constants.js` - Added new template paths
- `utils/preloadTemplates.js` - Registered new templates
- `module/dialogs/combat/CombatAttackDialog.js` - Auto-posts attack cards on any attack
- `utils/attachCustomMacroBar.js` - Added "Send Attack (Chat)" button (ctrl+3 GM, ctrl+2 player)
- `templates/custom-hotbar/custom-hotbar.hbs` - Added chat attack button for GM and players
- `animabf-guote.css` - Chat combat card styles with theme-integrated buttons
- `lang/en.json`, `lang/es.json`, `lang/fr.json` - Added localization keys (anima.chat.combat.*, customHotbar.*)

### Unused Files (can be removed)
- `templates/chat/chat-combat/defense-card.hbs`
- `templates/chat/chat-combat/result-card.hbs`
- `module/combat/chat-combat/ChatDefenseCard.js`
- `module/combat/chat-combat/ChatResultCard.js`
