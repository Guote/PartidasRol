# Combat

## Summary
Combat flows through the chat-combat system: attacker opens `CombatAttackDialog`, sends attack → `ChatAttackCard` is created → defender receives a `ChatCombatDefenseDialog` prompt → defense result is processed by `ChatCombatManager._processDefense()` → result card shows outcome.

## Attack vs Defense Resolution

```
defenseSucceeded = Math.max(0, defenseTotal) > Math.max(0, attackTotal)
```

- `attackTotal` — roll.total from the attack, stored in `attackFlags.attackTotal`
- `defenseTotal` — roll.total from the defense

If `!defenseSucceeded`, damage is calculated. Counter-attack is possible only when `defenseSucceeded` (defense > attack).

## Defense Counter — Ha Defendido

When defending in combat tab with "Aumentar contador de defensas" checked (`increaseDefenseCounter: true`):
- Stack count tracked via SIC counter on the "Ha defendido" CUB condition
- Max 3 stacks; each stack adds one to the CUB condition via `ActiveEffectCounter.getCounter(effect).setValue(N)`
- Penalty: -25 / -50 / -75 for 1 / 2 / 3 stacks (configured via CUB condition on `modFisico.defense.conditionPen`)
- Condition duration: 1 round (auto-cleared by Foundry at round start)
- Implemented in: `guote-module.js` — `animabf.defenseSent` hook (GM-only)

## Acorralado

Applied automatically when `!defenseSucceeded` (attack beat the defense):
- CUB condition "Acorralado" added to defender's token
- Duration: 1 round (auto-cleared by Foundry)
- Implemented in: `guote-module.js` — `animabf.combatResolved` hook (GM-only)

## Multiple Defenses Penalty

`multipleDefensesPenalty` — separate from Ha Defendido. This is a per-session dialog value (not persisted as condition). Manually set by the defender in the dialog. Shown as "Def. múlt" in the roll formula.

## Acumulación (Resistance) Defense

Actors with `defenseType === "resistance"` (also referred to as "acumulación") do not roll an active physical defense. They use the **Acumulación tab** in `ChatCombatDefenseDialog`, which is set as their default tab.

Behavior differences from normal defenders:
- `withoutRoll` defaults to `true` (no dice roll; the formula replaces `1d100xa` with `0`)
- The tab shows only the **"Está sorprendido"** checkbox instead of a weapon selector
- The shared "Modificadores de Defensa" section and HD/TA summary are still shown below
- Other tabs (Armas, Hechizos, etc.) remain accessible
- Acorralado condition is **never applied** to resistance actors (skipped in guote-module)

### Sorprendido — TA Halving Order

When "Está sorprendido" is checked, the defender's effective TA is halved **before** the attacker's `taReduction` is applied:

```
effectiveTA = clamp(floor(baseTA / 2) + taReduction, 0, 10)
```

Example: dragon with base TA 10, attacker weapon has `taReduction = -2`, defender is sorprendido:
1. Halve: `floor(10 / 2) = 5`
2. Apply reduction: `5 + (-2) = 3`
3. Final effective TA: 3

The `surprised` flag travels from `defenseResult.surprised` through `ChatCombatManager._calculateResult()`, which performs the halving before clamping and adding `taReduction`. `calculateDamage` receives the already-adjusted `at` value (no `halvedAbsorption` param needed).

## Masa (group) combat

- Masa actors use `"mass"` defense type (`system.general.settings.defenseType.value`)
- Attack dialog uses `withoutRoll = true` for masa defenders
- Mass attack bonus: extra damage based on number of living members still in attack accumulation

## Multiple Attacks

Dialog tabs in attack/defense dialogs are labelled: "Armas", "Hechizos", "Poderes Psí.", "Invocaciones".

The combat tab exposes "Ataque principal" + "Maniobras" inputs for declaring multiple attacks per round. Penalty is driven by `maniobras` only (`×20` normal / `×10` cadencia), committed to `modManiobras.ha` on first attack. Values persist via `macroCookies.combatAttackDialog` and clear at round start.

See `specs/mechanics/weapons.md` for the full spec (penalty formula, cadencia, CONT_ATAQUES condition, hook payload).

## Key Hooks

| Hook | Fired from | Used for |
|------|-----------|---------|
| `animabf.defenseSent` | `ChatCombatDefenseDialog._sendCombatDefense()` (combat and accumulation tabs, both standalone and chat-combat) | Ha Defendido condition |
| `animabf.combatResolved` | `ChatCombatManager._processDefense()` | Acorralado condition |
| `animabf.combatAttackSent` | `CombatAttackDialog.js` after successful combat-tab attack send | Cont. Ataques condition (CONT_ATAQUES) in guote-module |
| `animabf.mysticSpellCast` | attack/defense dialogs after consuming zeon | guote-module Usando Energía sync |

## Related files
- `module/combat/chat-combat/ChatCombatManager.js`
- `module/combat/chat-combat/ChatCombatDefenseDialog.js`
- `module/dialogs/combat/CombatAttackDialog.js`
- `modules/guote-module/guote-module.js`
