# Conditions

## Summary
Conditions are managed by **Combat Utility Belt (CUB)** via `game.cub.addCondition / removeCondition / hasCondition`. **Status Icon Counters (SIC)** adds visual stacking (counter badge on token icon). All condition logic in guote-module runs GM-only (`if (!game.user.isGM) return`).

## CUB helpers (guote-module.js)

```js
cubHas(name, token)    // game.cub.hasCondition — returns false if CUB unavailable
cubAdd(name, token)    // game.cub.addCondition — silently fails if unavailable
cubRemove(name, token) // game.cub.removeCondition — silently fails if unavailable
```

## SIC stacking

To increment a condition's SIC counter (rather than re-adding the condition):
```js
const effect = actor.effects.find(e => (e.name ?? e.label) === CONDITION_NAME);
if (!effect) {
  cubAdd(CONDITION_NAME, token);           // creates effect, SIC counter = 1
} else {
  const ctr = window.ActiveEffectCounter?.getCounter(effect);
  const count = ctr ? (ctr.getValue(effect) ?? 1) : 1;
  if (count < MAX) await ctr?.setValue(count + 1, effect);
}
```

## Conditions in use

| Condition | Trigger | Duration | Clears | Penalty source |
|-----------|---------|----------|--------|---------------|
| **Cont. Defensas** | combat defense sent with increaseDefenseCounter=true | 1 round | Foundry auto | CUB change: `modFisico.defense.conditionPen` ADD -25 (SIC multiplies per stack) |
| **Cont. Ataques** | combat attack sent with ataquePrincipal+maniobras > 1 | 1 round | Foundry auto | none — purely informational counter |
| **Acorralado** | attack beats defense (`!defenseSucceeded`) | 1 round | Foundry auto | configurable in CUB |
| **Sorpresa** | initiative gap ≥ 150 vs active combatant | turn-based | next turn re-check | CUB |
| **Usando Energia** | ki or zeon accumulated / upkeep active | manual | ki/zeon fully cleared | CUB, synced via updateActor + updateItem hooks |
| **Fortalecimiento** | total modifiers (fis+sob) > 0 | manual | when mods ≤ 0 | CUB |
| **Debilitamiento** | total modifiers < 0 | manual | when mods ≥ 0 | CUB |
| **Concentrado** | manual | manual | manual | prevents ki partial penalty on round start |
| **En Llamas** | burn counter ≥ 100 (EnLlamas.js macro) | macro-managed | burn counter < 100 | macro |

## Ha Defendido — SIC max stacks

No SIC setting for max stacks — enforced in code. Stack count read via `ctr.getValue(effect)`, capped at 3 in the `animabf.defenseSent` hook.

## Ha Defendido — penalty

Configure in CUB:
- Change key: `system.general.modifiers.modFisico.defense.conditionPen`
- Mode: ADD, Value: -25
- SIC type: simple (each stack applies one more -25 via `multiplier` type or `simple` × instances)

## Condition duration

Set via `duration.rounds: 1, startRound: game.combat.round` on the ActiveEffect after CUB adds it. Only works inside an active combat encounter.

## Related files
- `modules/guote-module/guote-module.js` — all condition hook logic
- `module/combat/chat-combat/ChatCombatDefenseDialog.js` — fires `animabf.defenseSent`
- `module/combat/chat-combat/ChatCombatManager.js` — fires `animabf.combatResolved`
