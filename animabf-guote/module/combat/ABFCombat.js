import { getFormula } from "../rolls/utils/getFormula.js";
import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
export default class ABFCombat extends Combat {
  constructor(data, context) {
    super(data, context);
    this.setFlag("world", "newRound", true);
  }
  async nextTurn() {
    if (this.getFlag("world", "newRound")) {
      this.setFlag("world", "newRound", false);
    }
    return super.nextTurn();
  }
  async nextRound() {
    // Reset initiative for everyone when going to the next round
    await this.resetAll();
    this.setFlag("world", "newRound", true);
    return super.nextRound();
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    this.combatants.forEach((combatant) => {
      combatant.actor?.prepareDerivedData();
    });
  }
  // Modify rollInitiative so that it asks for modifiers
  async rollInitiative(ids, { updateTurn = false, messageOptions } = {}) {
    const mod = await openModDialog();
    if (typeof ids === "string") {
      ids = [ids];
    }
    for (const id of ids) {
      const combatant = this.combatants.get(id);
      let formula = getFormula({
        dice: "1d100Initiative",
        values: [
          combatant?.actor?.system.characteristics.secondaries.initiative.final
            .value,
          mod,
        ],
        labels: ["Turno", "Mod"],
      });
      await super.rollInitiative(id, {
        formula: formula,
        updateTurn,
        messageOptions,
      });
    }
    if (this.getFlag("world", "newRound")) {
      await this.update({ turn: 0 }); // Updates active turn such that it is the one with higher innitiative.
    }
    return this;
  }
  _sortCombatants(a, b) {
    let initiativeA = a.initiative || -9999;
    let initiativeB = b.initiative || -9999;
    if (
      initiativeA <
      (a?.actor?.system.characteristics.secondaries.initiative.final.value || 0)
    )
      initiativeA -= 2000;
    if (
      initiativeB <
      (b?.actor?.system.characteristics.secondaries.initiative.final.value || 0)
    )
      initiativeB -= 2000;
    return initiativeB - initiativeA;
  }
}
