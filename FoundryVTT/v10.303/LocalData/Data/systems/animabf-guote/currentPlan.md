# Current Task: Visible Global Modifiers in Chat Roll Formulas

## Goal
Make the physical (Mod. Físico) and supernatural (Mod. Sobrenat.) global modifiers appear
as explicit labeled terms in roll formulas posted to chat, instead of being silently baked
into stat totals. E.g., `1d100xa + 150 [HA] + 10 [Mod. Físico] - 20 [Mod. Sobrenat.]`
instead of `1d100xa + 140 [HA]`.

---

## Background / Architecture

### Modifier Pipeline (mutatePenalties.js)
`mutatePenalties` computes modifier totals from user inputs + conditions + CUB conditions:
- `modFisico.final.value` — physical modifier (min penalty + max bonus from modFisArray)
- `modSobrenatural.final.value` — supernatural modifier (same logic)
- `modFinal.general.final.value` — fis + sob combined (used by secondaries, mystic, psychic)
- `modFinal.attack.final.value` — modManiobras.ha + attack-specific fis + attack-specific sob
- `modFinal.defense.final.value` — modManiobras.hd + defense-specific fis + defense-specific sob

Note: attack/defense modifiers differ from general because they include per-action condition
bonuses (modFisico.attack.conditionPen/Bon, modSobrenatural.attack.conditionPen/Bon).

### Where modifiers get baked in (mutate functions)
| File | Modifier applied | Stat affected |
|------|-----------------|---------------|
| `mutateCombatData.js` | `modFinal.attack` | `combat.attack.final` |
| `mutateCombatData.js` | `modFinal.defense` | `combat.block.final`, `combat.dodge.final` |
| `mutateSecondariesData.js` | `modFinal.general` | all secondaries `.final` |
| `mutateInitiative.js` | `floor(modFinal.general/10)*5` | initiative.final |
| `mutateMysticData.js` | `floor(modFinal.general/10)*5` | magic act finals |
| `mutateMysticData.js` | `modFinal.general` | projection, summoning finals |
| `mutatePsychicData.js` | `modFinal.general` | psychic projection & potential finals |
| `mutateDomineData.js` | `floor(modFinal.attack/20)` | ki accumulation finals |

Weapon attack/block finals also pick up the modifier because `calculateWeaponAttack` and
`calculateWeaponBlock` start from `data.combat.attack.final.value` / `data.combat.block.final.value`.

### getFormula call sites (where rolls go to chat)
| File | Roll type | Modifier source currently baked into stat |
|------|-----------|-------------------------------------------|
| `CombatAttackDialog.js:246` | combat attack | `modFinal.attack` in HA |
| `CombatAttackDialog.js:366` | mystic attack | `modFinal.general` in Proy. Mag. |
| `CombatAttackDialog.js:449` | psychic potential | none (psychicPotential.final) |
| `CombatDefenseDialog.js:182` | block/dodge | `modFinal.defense` in HD |
| `ChatCombatDefenseDialog.js:308` | block/dodge | `modFinal.defense` in HD |
| `ChatCombatDefenseDialog.js:195` | psychic potential | none |
| `ABFActorSheetV2.js:767` | preset combat | `modFinal.attack` in HA |
| `ABFActorSheetV2.js:843` | preset mystic | `modFinal.general` in Proy. Mag. |
| `ABFActorSheetV2.js:909` | preset psychic | `modFinal.general` in Proy. Psi. |
| `ABFActorSheetV2.js:1098` | generic _onRoll | `modFinal.general` in stat.final |

---

## Subtasks

### Phase 1 — Combat (attack / block / dodge) ✓ DONE
- [x] `mutatePenalties.js` — add `modFinal.attack.fis/sob`, `modFinal.defense.fis/sob`
- [x] `mutateCombatData.js` — remove modFinal from attack/block/dodge finals
- [x] `CombatAttackDialog.js` — add modFis + modSob + modManiobras to combat formula
- [x] `CombatDefenseDialog.js` — same for block/dodge
- [x] `ChatCombatDefenseDialog.js` — same
- [x] `ABFActorSheetV2.js` — preset combat attack formula

### Phase 2 — Secondaries ✓ DONE
- [x] `mutateSecondariesData.js` — remove `modFinal.general` from secondary finals
- [x] `skill-row.hbs` — add `data-modifier-type="general"` to rollable spans
- [x] `ABFActorSheetV2._onRoll` — dispatch modifier by `dataset.modifierType`:
  - `"general"` → modFisico.final [Mod. Físico] + modSobrenatural.final [Mod. Sobrenat.]
  - `"initiative"` → floor(modFinal.general/10)*5 [Mod. Global]
  - none → no extra modifier (characteristics, etc.)

### Phase 3 — Mystic / Psychic / Domine / Initiative ✓ DONE

### Phase 4 — Consolidation & Combat Tab Fixes ✓ DONE
- [x] `mutateInitiative.js` — remove scaled modifier
- [x] `mutateMysticData.js` — remove modFinal from magic act, projection, summoning
- [x] `mutatePsychicData.js` — remove modFinal from psychic finals
- [x] `mutateDomineData.js` — remove modifier from ki accumulation
- [x] `CombatAttackDialog.js` mystic section — add modFis + modSob
- [x] `ABFActorSheetV2.js` preset mystic + psychic sections — add modFis + modSob
- [x] `initiative-display.hbs` — `data-modifier-type="initiative"`
- [x] `combat-value.hbs` — `modifierType` param support
- [x] `horizontal-titled-input.hbs` + `vertical-titled-input.hbs` — `modifierType` pass-through
- [x] `summoning.hbs` — `modifierType="general"` on 4 combat-value partials
- [x] `spellbook.hbs` — `modifierType="general"` on 2 magic projection partials
- [x] V1 `magic-projection.hbs` — `modifierType="general"` on all 3 rollable partials
- [x] V1 `psychic-projection.hbs` — `modifierType="general"` on 2 rollable partials
- [x] V1 `psychic-potential.hbs` — `modifierType="general"` on rollable partial

### Phase 4 — Consolidation & Combat Tab Fixes ✓ DONE
- [x] `getModifierTerms.js` — created shared utility at `module/rolls/utils/getModifierTerms.js`
- [x] `ABFActorSheetV2.js` — imported getModifierTerms; fixed _onRoll input guard (`INPUT` early return); refactored preset attack/mystic/psychic + _onRoll
- [x] `CombatAttackDialog.js` — refactored combat + mystic formula sections
- [x] `CombatDefenseDialog.js` — refactored defense formula
- [x] `ChatCombatDefenseDialog.js` — refactored defense formula
- [x] `combat.hbs` — added `modifierType="attack"` to attack, `modifierType="defense"` to block/dodge

---

## Key Decisions
- **Attack-specific modifiers:** `modFinal.attack.fis/sob` are stored separately from
  `modFisico.final.value` because attacks include per-action condition bonuses. The formula
  uses the attack-specific values.
- **modManiobras:** Stored as `modFinal.attack.final - fis - sob` and shown as a separate
  term "Mod. Maniobras" (only appears in formula when non-zero, since `getFormula` skips 0).
- **Weapon attack values:** `calculateWeaponAttack` builds on `combat.attack.final.value`,
  so after Phase 1 it will also lose the baked modifier — weapon and unarmed attacks are
  treated consistently.

---

## Notes
- `modFinal.attack.fis` and `.sob` are runtime-only derived fields; no `template.json` changes needed.
- `getFormula` already skips 0-valued terms, so modManiobras/fis/sob only show if non-zero.
- Phase 2 is harder because `_onRoll` is generic and driven by HBS `data-rollvalue` attributes.
