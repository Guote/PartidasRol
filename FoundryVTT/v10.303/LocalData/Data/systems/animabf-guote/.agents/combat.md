# Combat System

Context for working in `module/combat/` and related dialog templates.

---

## Two Parallel Systems — Know Which One You're Touching

| | WebSocket Combat | Chat Combat |
|-|-----------------|-------------|
| **Entry point** | `window.Websocket.sendAttack()` | `window.ChatCombat.sendAttack()` |
| **Hotbar** | ctrl+2 GM / ctrl+1 player | ctrl+3 GM / ctrl+2 player |
| **Transport** | Real-time WebSocket | Foundry chat messages + socket events |
| **Location** | `module/combat/websocket/` | `module/combat/chat-combat/` |
| **Dialog templates** | `templates/dialog/combat/combat-attack/` | `templates/dialog/combat/chat-combat-defense/` |
| **Style** | Synchronous — both sides connected live | Asynchronous — defender can respond later |

Do not mix code between the two systems.

---

## Chat Combat (Primary Active Development)

### Key files
- `ChatCombatManager.js` — registered as `window.ChatCombat`. Entry point for attacks.
- `ChatAttackCard.js` — creates and updates the chat message card.
- `ChatCombatDefenseDialog.js` — `FormApplication` opened on the defender's side.
- `CombatAttackDialog.js` — `module/dialogs/combat/CombatAttackDialog.js` — attacker fills this.

### Templates
```
templates/dialog/combat/combat-attack/
  combat-attack-dialog.hbs     # Attack dialog
  parts/combat.hbs
  parts/mystic.hbs
  parts/psychic.hbs
  parts/summon.hbs

templates/dialog/combat/chat-combat-defense/
  chat-combat-defense-dialog.hbs
  parts/combat.hbs
  parts/mystic.hbs
  parts/psychic.hbs
  parts/summon.hbs
```

### Full Attack → Defense Flow
```
1. Attacker selects token (optionally targets enemy)
2. Calls window.ChatCombat.sendAttack()
3. CombatAttackDialog opens — attacker fills form
4. On submit → ChatAttackCard posts to chat (contains attack roll + results)
5. If target was set → socket sends chatCombat.promptDefense to defender's client
6. Anyone can click "Defend" on the card → ChatCombatDefenseDialog opens
7. Defender fills response → result appended to same attack card
8. Results row shows: HD, TA, damage or counter-attack
9. GM sees Apply Damage / Undo Damage buttons
```

### Socket Events
All go through `game.socket.emit("system.animabf-guote", { type, payload })`:

| Event type | Purpose |
|------------|---------|
| `chatCombat.defenseAdded` | Defender responded — update card display on all clients |
| `chatCombat.damageApplied` | GM applied damage — sync state |
| `chatCombat.damageUndone` | GM undid damage — sync state |
| `chatCombat.promptDefense` | Ask a specific user to open defense dialog |

### Session ID Pattern
When a defender is added, the old message is deleted and recreated at the bottom (keeps it visible).
`ChatAttackCard._sessionMap` is a static `Map<sessionId, messageId>` tracking the live message per session.

```js
// Flags stored on the chat message
message.getFlag("animabf-guote", "sessionId")    // stable session identifier
message.getFlag("animabf-guote", "attackData")   // serialized attack state
```

### Dialog Part Tabs
Each attack/defense dialog has parts for different combat modes. Which tab is shown depends on `combatType` in the form data:

| Part | Shown when |
|------|-----------|
| `parts/combat.hbs` | Always — physical weapons |
| `parts/mystic.hbs` | Actor has active spells |
| `parts/psychic.hbs` | Actor has psychic powers |
| `parts/summon.hbs` | Actor has active summons or incarnation |

---

## WebSocket Combat (Legacy, Stable)

```
module/combat/websocket/
  ws-combat/
    gm/       # GM-side message handlers
    user/     # Player-side message handlers
```

`window.Websocket` is registered in the `ready` hook in `animabf-guote.mjs`.

---

## ABFCombat (Initiative Tracker)

- `module/combat/ABFCombat.js` — extends Foundry's `Combat` document
- Initiative formula: `1d100Initiative` (custom die term via `ABFInitiativeRoll`)
- Registered in the `init` hook

---

## Damage Utilities

- `module/combat/utils/calculateDamage.js` — core damage formula
- `module/combat/utils/calculateCounterAttackBonus.js` — counter-attack bonus
- Rounding controlled by `ROUND_DAMAGE_IN_MULTIPLES_OF_5` system setting
- Damage table mode controlled by `USE_DAMAGE_TABLE` system setting
- Tests in `module/combat/utils/__test__/`
