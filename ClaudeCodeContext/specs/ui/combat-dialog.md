# Combat Dialog

## Summary
Two main dialogs: `CombatAttackDialog.js` (non-chat, legacy) and `ChatCombatDefenseDialog.js` (new chat-combat flow). Both show a summary bar (HA/HD final + damage + enemy TA) that re-computes on every `getData()` render cycle.

## Summary bar formula — per tab

The summary bar (`activeSummary`) is computed in `getData()` (attack) and at end of `getData()` (defense).

### Attack dialog (CombatAttackDialog.js)

| Tab | haFinal formula |
|-----|----------------|
| Combat | `attackValue + fatigue×15 + modifier + counterBonus + massBonus + getModifierTerms("attack").sum` |
| Mystic | `magicProjection + massBonus + getModifierTerms("general-negative").sum + modifier` |
| Psychic | `projectionValue + modifier + massBonus + getModifierTerms("general-negative").sum` |
| Summon | `effectiveHA + modifier + massBonus + getModifierTerms("general-negative").sum` |

### Defense dialog (ChatCombatDefenseDialog.js)

| Tab | hdFinal formula |
|-----|----------------|
| Combat | `hdBase + modifier + fatigue×15 + multipleDefensesPenalty + getModifierTerms("defense").sum` |
| Mystic | `magicProjection + modifier + getModifierTerms("general-negative").sum` |
| Psychic | `psychicProjection + modifier + getModifierTerms("general-negative").sum` |
| Summon | `effectiveHD + modifier + getModifierTerms("general-negative").sum` |

`hdBase` = dodge final or block final (depending on `defenseType` setting).

## Modifier type rules (see `mechanics/modifiers.md` for full rules)

- Combat tab → full attack/defense modifiers (both signs)
- Mystic, Psychic, Summon → `"general-negative"` only (penalties only)
- Summon does NOT include attack/defense-specific modifiers (HA/HD maneuver mods)

## Actual roll vs summary

The summary is a live preview. The actual roll uses identical modifier terms — `getModifierTerms` is called again inside `_sendCombatDefense()` etc. Both must use the same modifier type.

## Dialog tabs

Each dialog has tabs: `combat`, `mystic`, `psychic`, `summon`. Active tab controls which summary is shown (`modalData.ui.activeSummary = modalData.defender[activeTab]?.summary`).

## increaseDefenseCounter checkbox

- Name: `defender.combat.increaseDefenseCounter`
- Default: `true`
- Passed through `defenseResult` to the `animabf.defenseSent` hook
- Only relevant for the combat tab

## Standalone vs chat-combat mode

`ChatCombatDefenseDialog` can be opened:
- **Standalone** (`this.standalone = true`): from token right-click, no attack message to respond to
- **Chat-combat** (default): opened by `ChatCombatManager` in response to an attack card

The `animabf.defenseSent` hook fires in both modes (move outside if/else).

## Related files
- `module/dialogs/combat/CombatAttackDialog.js`
- `module/combat/chat-combat/ChatCombatDefenseDialog.js`
- `templates/dialog/combat/chat-combat-defense/chat-combat-defense-dialog.hbs`
