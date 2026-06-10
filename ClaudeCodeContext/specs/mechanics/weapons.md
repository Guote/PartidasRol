# Weapons

## Weapon Data Model

Defined in `module/types/combat/WeaponItemConfig.js`.

Key fields:
- `system.attack.final.value` — final attack value (after bonuses)
- `system.damage.final.value` — final damage value
- `system.critic.primary.value` / `system.critic.secondary.value` — critic types
- `system.cadence.value` — rate of fire (string, e.g. "3", "5x"). Empty string if not ranged/not set.
- `system.taModifier.final.value` — armor type modifier
- `system.isRanged.value` — boolean
- `system.shotType.value` — `WeaponShotType.SHOT` or similar

## Multiple Attacks

### Declaring multiple attacks in the attack dialog

The attack dialog (combat tab) uses three fields to declare multiple attacks per round:

- `attacker.combat.multipleAttackMode` — `"normal"` | `"cadencia"`
- `attacker.combat.atacquePrincipal` — integer ≥ 1, default 1. Tooltip: "Ataque principal". Adds to the condition counter but does **not** affect the HA penalty.
- `attacker.combat.maniobras` — integer ≥ 0, default 0. Tooltip: "Maniobras". Adds to the condition counter **and** drives the HA penalty.

UI appearance: `[Mode selector] [Ataque principal input] [Maniobras input]` — styled like the base+temporal pattern used in secondary skills.

**Input tinting**: tint an input when its value differs from its default (ataquePrincipal ≠ 1, maniobras ≠ 0). Same visual pattern used for modified inputs elsewhere in the dialogs.

These fields are persisted in `macroCookies.combatAttackDialog` on attack send, so the next dialog opening pre-populates with the last used values.

### HA penalty formula

Penalty is computed from **Maniobras only**. Applies to every attack in the declared sequence (including the first), for the rest of the round.

| Mode | Penalty |
|------|---------|
| `"normal"` | `-(maniobras) × 20` |
| `"cadencia"` | `-(maniobras) × 10` |

When `maniobras = 0`, penalty = 0 regardless of ataquePrincipal.

On the **first confirmed attack** with `maniobras > 0`, the penalty is written to the actor:
- `system.general.modifiers.modManiobras.ha` (base value) = penalty amount (e.g. `-40` for 2 maniobras normal)
- `system.macroCookies.combatAttackDialog.combat.committedManiobrasHA` = same value (committed-state flag)

This makes the penalty visible in the effects tab under "Ataques con armas" (`modFinal.attack.final.value`). It composes additively with CUB posture conditions (which add to `modManiobras.ha` via ActiveEffects).

On subsequent dialog opens in the same round, the "ataques declarados" section is greyed out and locked. A trash button clears both fields immediately. On round start (via `updateCombat` hook in guote-module), both fields are cleared for all combatants.

**Double-count prevention**: when `committedManiobrasHA !== 0`, `getData()` zeroes out `summaryMultiAttackPenalty` in the summary (penalty already present in `modTermSum` via `modFinal.attack.final.value`), and the roll formula also uses `multipleAttackPenalty = 0`.

> **Future**: for "normal" mode, the -20 per maneuver will eventually depend on weapon size. For now it is always -20.

### Cadencia de fuego

When mode = `"cadencia"`, the label in the selector displays `"Cadencia fuego {X}"` where X = `weapon.system.cadence.value || "120"`.

The `"120"` fallback appears when the weapon has no cadence value set (empty string).

### Condition: Cont. Ataques

Managed by `guote-module.js` via the `animabf.combatAttackSent` hook (GM-only).

Purpose: visual counter on the token to remind how many extra attacks remain in the round. **No HA/HD modifiers** — purely informational.

The SIC counter is based on the **total** declared attacks (`ataquePrincipal + maniobras`):

Behavior on attack send (combat tab only):
- If condition **absent**: `cubAdd("Cont. Ataques", token)` — SIC counter starts at `(ataquePrincipal + maniobras) - 1`
- If condition **present**: decrement SIC counter by 1

Configuration (set by user in CUB, not in code):
- Duration: 1 round (auto-clears at round end)
- No ActiveEffect changes (no modifier keys)
- SIC type: simple counter

### Hook

`CombatAttackDialog.js` fires after a successful combat-tab attack send:

```js
Hooks.callAll('animabf.combatAttackSent', attackerToken, attackResult, {
  multipleAttackMode,   // "normal" | "cadencia"
  ataquePrincipal,      // ≥ 1
  maniobras,            // ≥ 0
});
```

`guote-module.js` listens on `animabf.combatAttackSent` (GM-only, combat-tab result only).

## Related Files

- `module/types/combat/WeaponItemConfig.js` — weapon schema
- `module/dialogs/combat/CombatAttackDialog.js` — attack dialog, multiple-attack logic
- `templates/dialog/combat/combat-attack/parts/combat.hbs` — combat tab UI
- `modules/guote-module/guote-module.js` — condition management hook
