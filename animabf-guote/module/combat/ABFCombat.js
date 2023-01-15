import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
export default class ABFCombat extends Combat {
    async nextRound() {
        // Reset initiative for everyone when going to the next round
        await this.resetAll();
        return super.nextRound();
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        this.combatants.forEach(combatant => {
            combatant.actor?.prepareDerivedData();
        });
    }
    // Modify rollInitiative so that it asks for modifiers
    async rollInitiative(ids, { updateTurn = false, messageOptions } = {}) {
        const mod = await openModDialog();
        if (typeof ids === 'string') {
            ids = [ids];
        }
        for (const id of ids) {
            const combatant = this.data.combatants.get(id);
            await super.rollInitiative(id, {
                formula: `1d100Initiative + ${combatant?.actor?.data.data.characteristics.secondaries.initiative.final.value}${mod ?  ` + ${mod}` : ""}`,
                updateTurn,
                messageOptions
            });         
            await this.update({turn: 0})
        }
        return this;
    }

    /* static async _onUpdateCombat(combat) {
        await combat.update({turn: 0});
    } */
    /* _sortCombatants(a, b) {
        let initiativeA = a.initiative || -9999;
        let initiativeB = b.initiative || -9999;
        if (initiativeA < (a?.actor?.data.data.characteristics.secondaries.initiative.final.value || 0))
            initiativeA -= 2000;
        if (initiativeB < (b?.actor?.data.data.characteristics.secondaries.initiative.final.value || 0))
            initiativeB -= 2000;
        console.log("SORTING INITIATIVE ", a, b, initiativeA, initiativeB)
        return initiativeB - initiativeA;
    } */
}
