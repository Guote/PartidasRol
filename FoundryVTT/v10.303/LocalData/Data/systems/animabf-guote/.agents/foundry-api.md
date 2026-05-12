# FoundryVTT v10 API

---

## Document Structure

- All game data lives in **Documents**: `Actor`, `Item`, `Combat`, `ChatMessage`, etc.
- Persistent data is always under `document.system.*` (system schema from `template.json`).
- Never read `document.data.*` — that's v9 and below.
- `document._id` and `document.id` are both the string ID. Prefer `document.id`.
- `document.toObject()` returns a plain JS object (safe to mutate). `document.system` is live data.

## Updating Documents

```js
// Actor field
await actor.update({ "system.characteristics.primaries.agility.value": 8 });

// Embedded item inside actor
await actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.damage.value": 50 }]);

// Delete embedded item
await actor.deleteEmbeddedDocuments("Item", [item.id]);

// Create embedded item
await actor.createEmbeddedDocuments("Item", [{ name: "Sword", type: "weapon", system: { ... } }]);
```

## Hook System

```js
Hooks.on("init", () => { /* register classes, sheets, settings */ });
Hooks.on("ready", () => { /* post-load setup */ });
Hooks.once("renderSomeApplication", (app, html, data) => { /* one-shot */ });
```

## Sheet Lifecycle

- `getData()` — async, assembles template context. No DOM logic here.
- `activateListeners(html)` — attaches jQuery event handlers after render.
- `_updateObject(event, formData)` — called on form submit. Transform data here before saving.
- `render(true)` — opens the sheet. `render(false)` re-renders an already-open sheet.

## Localization

```js
game.i18n.localize("anima.ui.someKey")   // in JS
{{localize "anima.ui.someKey"}}           // in Handlebars
```

**Always update all three**: `lang/es.json`, `lang/en.json`, `lang/fr.json`.

## Sockets (Client ↔ Client)

```js
// Register handler (in init or ready hook)
game.socket.on("system.animabf-guote", (data) => { /* handle */ });

// Emit from any client
game.socket.emit("system.animabf-guote", { type: "myEvent", payload: {} });
```

Only the GM can modify documents on behalf of players. Use sockets to request GM-side updates.

## Useful Globals

```js
game.actors              // ActorCollection
game.actors.get(id)
game.actors.getName(name)
game.items               // World items
game.user                // Current user
game.user.isGM
game.users
canvas.tokens.controlled // Currently selected tokens
game.user.targets        // Targeted tokens (Set)

// From selected token → actor
const actor = canvas.tokens.controlled[0]?.actor;

// Notifications
ui.notifications.info("msg")
ui.notifications.warn("msg")
ui.notifications.error("msg")

// Chat
ChatMessage.create({ content: "msg", speaker: ChatMessage.getSpeaker({ actor }) });
```

## Dialogs

```js
// Simple yes/no
new Dialog({
  title: "Confirm",
  content: "<p>Are you sure?</p>",
  buttons: {
    yes: { label: "Yes", callback: () => { /* do it */ } },
    no:  { label: "No" }
  },
  default: "no"
}).render(true);

// Project utility
ABFDialogs.confirm(title, body, { onConfirm: () => { ... } });
```

## System-Specific Globals

- `window.Websocket` — WebSocket combat manager (`sendAttack`, `sendAttackRequest`)
- `window.ChatCombat` — Chat combat manager (`sendAttack`)

## System Settings (read in JS)

```js
game.settings.get("animabf-guote", "AUTO_ACCEPT_COMBAT_REQUESTS")
game.settings.get("animabf-guote", "ROUND_DAMAGE_IN_MULTIPLES_OF_5")
game.settings.get("animabf-guote", "USE_DAMAGE_TABLE")
game.settings.get("animabf-guote", "SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT")
game.settings.get("animabf-guote", "DEVELOP_MODE")
```

## Reloading After Changes

Press `F5` in the Foundry browser window. No build step — all JS/HBS/CSS is served as-is.

---

## Core Classes

| Class | Location | Purpose |
|-------|----------|---------|
| `ABFActor` | `module/actor/ABFActor.js` | Custom Actor document |
| `ABFItem` | `module/items/ABFItem.js` | Custom Item document |
| `ABFCombat` | `module/combat/ABFCombat.js` | d100 initiative tracker |
| `ABFActorSheetV2` | `module/actor/ABFActorSheetV2.js` | V2 character sheet (primary) |
| `ABFActorSheet` | `module/actor/ABFActorSheet.js` | V1 sheet (legacy) |
| `ABFFoundryRoll` | `module/rolls/ABFFoundryRoll.js` | Base custom roll |
| `ABFExploderRoll` | `module/rolls/ABFExploderRoll/` | Critical/fumble explosion |
| `ABFInitiativeRoll` | `module/rolls/ABFInitiativeRoll/` | `1d100Initiative` formula |
| `ChatCombatManager` | `module/combat/chat-combat/ChatCombatManager.js` | `window.ChatCombat` |
| `ChatAttackCard` | `module/combat/chat-combat/ChatAttackCard.js` | Attack card in chat |

All registered in `animabf-guote.mjs` via the `init` hook.

---

## Custom Hotbar

`utils/attachCustomMacroBar.js`, template `templates/custom-hotbar/custom-hotbar.hbs`:

| Button | GM Shortcut | Player Shortcut | Action |
|--------|-------------|-----------------|--------|
| Damage Calculator | ctrl+1 | — | Opens damage calculator dialog |
| Send Attack (WebSocket) | ctrl+2 | ctrl+1 | `window.Websocket.sendAttack()` |
| Send Attack (Chat) | ctrl+3 | ctrl+2 | `window.ChatCombat.sendAttack()` |

---

## Localization Key Prefixes

Files: `lang/es.json`.

| Prefix | Used for |
|--------|---------|
| `anima.ui.*` | UI labels and titles |
| `anima.macros.combat.*` | Combat dialog messages |
| `anima.chat.combat.*` | Chat-based combat system |
| `anima.customHotbar.*` | Hotbar button tooltips |
| `anima.dialogs.items.*` | Item add/delete dialogs |
| `anima.contextualMenu.*` | Right-click menu labels |

---

## Testing

Jest test files (no `package.json` in deployed version — tests live in the source repo):
- `module/actor/utils/splitAsActorAndItemChanges.test.js`
- `module/combat/utils/__test__/calculateCounterAttackBonus.test.js`
- `module/combat/utils/__test__/calculateDamage.test.js`
- `module/rolls/ABFExploderRoll/ABFExploderRoll.test.js`
- `module/rolls/ABFInitiativeRoll/ABFInitiativeRoll.test.js`
