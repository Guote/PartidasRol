# Game Mechanics Reference — Anima Beyond Fantasy (animabf-guote)

## Initiative / Turno

### Base value
- Stored as `characteristics.secondaries.initiative.base.value` (e.g. 100)
- This is what the player enters as their "natural turno" (unarmed initiative)
- The system subtracts 20 internally and then adds back a weapon modifier, so that entering 100 with Desarmado (mod +20) gives a final turno of 100

### Final value calculation (`mutateInitiative.js`)
```
final = base - 20 + unarmedBonus
      = base - 20 + weaponMod   (if weapons are active)
```
- Always subtract 20 first
- Then add Desarmado's `initiative.final.value` (default 20) when no other weapons are active
- Or add the **minimum** `initiative.final.value` of all active non-shield non-default weapons
- Additionally subtract shield penalty if a shield is active:
  - Small shield: -15
  - Medium shield: -25
  - Large/other shield: -40

### Dual-wield penalty — REMOVED
The `isShown` checkbox means "I am using this weapon this turn" and cannot distinguish a dual-wield stance from simply having multiple weapons ready. The old size-based same-weapon penalty (-10/-20 for 2 weapons of the same size) was removed. The rule is now simply: use the minimum modifier of all selected weapons.

---

## Weapons

### Key flags (not in template.json — set at creation time)
| Flag | Type | Meaning |
|------|------|---------|
| `system.isShown.value` | boolean | "Usar para turno" — this weapon participates in the current turn's initiative calculation |
| `system.isShield.value` | boolean | This item is a shield, not a weapon — excluded from the weapon slot, applies shield penalty |
| `system.isDefault.value` | boolean | **Desarmado** — always present, non-removable, excluded from the regular weapon slot count |
| `system.equipped.value` | boolean | Weapon is equipped (worn/carried ready) |

### Initiative fields
- `initiative.base.value` — the weapon's raw initiative modifier from its stat block
- `initiative.final.value` — the computed final modifier (base + bonuses). This is what the formula uses.
- Effective turno with this weapon = `(actor.initiative.base - 20) + weapon.initiative.final`

### Desarmado
- A real weapon item fetched from the `animabf-guote.weapons` compendium at character creation
- Created with `isDefault: true`, `isShown: true`, `equipped: true`
- Sorted first in the weapon list; rendered with a slightly grayed row background
- Cannot be deleted (delete option hidden in context menu via `condition` callback)
- Its `initiative.final.value` is the unarmed baseline (default 20 → gives natural turno = base)
- Can be edited via the weapon sheet like any other weapon

---

## Roll formula for Initiative

```
1d100xa + [Turno: base-20] + [WeaponName: weaponMod] + [Mod: mod]
```

- `base - 20` is the "Turno" term
- `weaponMod` is the modifier of the **slowest** active option (Desarmado or the slowest regular weapon, whichever has the lower effective initiative)
- If Desarmado's effective (= base) ≤ slowest regular weapon's effective → use Desarmado's mod and name
- Otherwise → use the slowest regular weapon's mod and name
- No dual-wield (Ambidiestro) term

---

## Turno Actual display (combat tab)

The "turno actual" section shows one entry per weapon that participates in the turn:
- Desarmado (if `isShown`) always listed first
- All regular shown non-shield weapons listed after
- The entry with the lowest effective initiative is highlighted (`isSlowest: true`)
- Effective initiative of an entry = `(base - 20) + weapon.initiative.final`

Fallback: if Desarmado is somehow unchecked AND no other weapons are active, shows a synthetic "Natural" entry.

---

## Character creation

Two macros create characters and must both call `createDesarmadoWeapon(actor)`:
- `module/macros/functions/createCharacterFromTemplateMacro.js` — template-based creation
- `module/macros/functions/importFromPdf/importFromPdfMacro.js` — PDF import

The shared utility is at `module/actor/utils/createDesarmadoWeapon.js`.
