# Input UX Conventions

## Select-all on focus

Every `<input>` and `<textarea>` in all ABF sheets and dialogs selects its full contents when clicked/focused. This lets the user immediately type a new value without having to manually select first.

### How it works

Each sheet and dialog class adds this one line at the top of `activateListeners`:

```js
activateListeners(html) {
    super.activateListeners(html);
    html.find('input, textarea').on('focus', function () { this.select(); });
    // ... rest of listeners
}
```

Applied to all current ABF classes:

| File | Class |
|------|-------|
| `module/actor/ABFActorSheetV2.js` | `ABFActorSheetV2` |
| `module/items/ABFItemSheet.js` | `ABFItemSheet` |
| `module/dialogs/combat/CombatAttackDialog.js` | `CombatAttackDialog` |
| `module/dialogs/combat/CombatDefenseDialog.js` | `CombatDefenseDialog` |
| `module/dialogs/domine/KiCalculatorDialog.js` | `KiCalculatorDialog` |
| `module/dialogs/mystic/ZeonCalculatorDialog.js` | `ZeonCalculatorDialog` |
| `module/dialogs/GenericDialog.js` | `GenericDialog` |

### Rule for new sheets and dialogs

Every new `FormApplication` subclass MUST add this line immediately after `super.activateListeners(html)`. No other configuration needed.

Do NOT add per-element `onfocus` attributes or per-class focus bindings — the single line at the top of `activateListeners` covers all inputs in the sheet/dialog.

> Note: `Hooks.on('renderApplication', ...)` does NOT work for this — Foundry v10 only fires `render{ClassName}` for the specific subclass, not parent-class hook variants.

### Resource inputs (`.v2-res__input`)

Header resources have additional behavior on top of select-all (which comes from the hook):
- **Enter key** confirms the value and blurs the input
- **Delta notation**: typing `+5` or `-3` adds/subtracts from the current value

These are wired in `ABFActorSheetV2.activateListeners`. Only the keydown and change handlers live there; select-all is handled by the global hook.
