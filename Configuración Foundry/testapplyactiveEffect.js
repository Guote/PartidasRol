const activeCombatants = game.combats.active.turns

const isSomeoneMissing = activeCombatants.some(combatant => !combatant.initiative)

if (isSomeoneMissing) return

const masxInitiative = Math.max(...activeCombatants.map(combatant => combatant.initiative))
let initiative
for (combatant of activeCombatants) {
    initiative = combatant.initiative
    if (initiative + 150 <= masxInitiative) {
        console.log(`${combatant.name} es sorprendido!`)
    }
}