# Macros

Context for working in `module/macros/`.

---

## Available Macro Functions

| File | Purpose |
|------|---------|
| `createCharacterFromTemplateMacro.js` | Creates a new character actor from a template actor |
| `createMasaMacro.js` | Bulk actor creation utility |
| `damageCalculatorMacro.js` | Opens the standalone damage calculator dialog |
| `importIncarnationMacro.js` | Imports an Incarnation item onto a selected actor |
| `importFromPdf/importFromPdfMacro.js` | Full PDF → Actor import pipeline entry point |
| `importFromPdf/actorMapper.js` | Maps parsed PDF fields to AnimaBF actor schema |
| `importFromPdf/pdfTextParser.js` | Parses raw PDF text into structured field data |

---

## FoundryVTT Globals Available in Macros

```js
// Actors
game.actors.get(id)
game.actors.getName("Actor Name")
game.actors.filter(a => a.type === "character")

// Selected tokens / active scene
canvas.tokens.controlled          // array of controlled tokens
canvas.tokens.controlled[0]?.actor // actor from first selected token
game.user.targets                 // Set of targeted tokens

// Permissions
game.user.isGM

// Notifications
ui.notifications.info("msg")
ui.notifications.warn("msg")
ui.notifications.error("msg")

// Chat
ChatMessage.create({
  content: "<p>Message</p>",
  speaker: ChatMessage.getSpeaker({ actor })
})
```

---

## Actor Data Access

```js
// Read
const hp = actor.system.characteristics.secondaries.lifePoints.value;
const weapons = actor.items.filter(i => i.type === "weapon");

// Write — always use update(), never mutate directly
await actor.update({ "system.field.path": newValue });
await actor.updateEmbeddedDocuments("Item", [{ _id: item.id, "system.damage.value": 40 }]);
await actor.createEmbeddedDocuments("Item", [{ name: "Sword", type: "weapon", system: { ... } }]);
await actor.deleteEmbeddedDocuments("Item", [item.id]);
```

---

## Dialog Patterns

### Simple confirmation
```js
new Dialog({
  title: "Confirm",
  content: "<p>Are you sure?</p>",
  buttons: {
    yes: { label: "Yes", callback: () => { /* do it */ } },
    no:  { label: "No" }
  },
  default: "no"
}).render(true);

// Project utility (localized strings)
ABFDialogs.confirm(titleKey, bodyKey, { onConfirm: () => { ... } });
```

### FormApplication (complex forms with inputs)
```js
class MyDialog extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "My Dialog",
      template: "systems/animabf-guote/templates/dialog/my-dialog.hbs",
      width: 400,
      resizable: true
    });
  }
  getData() { return { /* template context */ }; }
  async _updateObject(event, formData) { /* handle submit */ }
}
new MyDialog().render(true);
```

---

## PDF Import Pipeline

Three-step pipeline in `importFromPdf/`:

1. **`pdfTextParser.js`** — regex patterns extract labeled fields from raw copy-pasted PDF text → flat JS object
2. **`actorMapper.js`** — maps flat parsed fields to AnimaBF actor schema paths, handles type coercion
3. **`importFromPdfMacro.js`** — orchestrates the pipeline, creates or updates the actor document

Test files: `module/macros/pdf examples/` (`.txt` files — paste content from PDF character sheets)

When adding new PDF field support:
- Add regex to `pdfTextParser.js`
- Add mapping to `actorMapper.js`
- Verify with the example txt files

---

## GM Permissions in Macros

Macros run with the permissions of the executing user. Operations like creating actors or modifying other players' actors will fail silently for non-GM users.

Always guard privileged operations:
```js
if (!game.user.isGM) {
  // Option 1: show error
  ui.notifications.warn("GM required");
  return;
  // Option 2: delegate to GM via socket
  game.socket.emit("system.animabf-guote", { type: "myGMOperation", payload: data });
}
```
