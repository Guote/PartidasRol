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

The penalty is **dialog-local only** — it is NOT written to the actor's modifiers. It is added as a term in the roll formula (label: `"Maniobra (ataques múltiples)"`) and in `combat.summary.haFinal`.

The character sheet HA does **not** reflect this penalty. This is intentional: writing a persistent modifier would require knowing when to clear it (round end), adding complexity that isn't worth it now. The macroCookies persistence (see below) handles the "remember across dialog openings" UX problem instead.

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
