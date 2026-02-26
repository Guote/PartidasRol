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
