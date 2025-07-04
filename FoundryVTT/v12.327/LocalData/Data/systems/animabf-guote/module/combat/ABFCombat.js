import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import { getFormula } from "../rolls/utils/getFormula.js";
class ABFCombat extends Combat {
  /**
   *  @param {import('../../types/foundry-vtt-types/src/foundry/common/data/data.mjs/combatData').CombatDataConstructorData} data
   *  @param {Context<null>} [context]
   */
  constructor(data, context) {
    super(data, context);
    this.setFlag("world", "newRound", true);
  }
  async startCombat() {
    const combatants = this.combatants.map((c) => c.token);
    for (let token of combatants) {
      token?.actor?.resetDefensesCounter();
    }
    return super.startCombat();
  }
  async nextTurn() {
    if (this.getFlag("world", "newRound")) {
      this.setFlag("world", "newRound", false);
    }
    return super.nextTurn();
  }
  async nextRound() {
    await this.resetAll();
    this.setFlag("world", "newRound", true);
    const combatants = this.combatants.map((c) => c.token);
    for (let token of combatants) {
      token?.actor?.resetDefensesCounter();
      token?.actor?.consumeMaintainedZeon();
      token?.actor?.psychicShieldsMaintenance();
    }
    return super.nextRound();
  }
  async previousRound() {
    await this.resetAll();
    const combatants = this.combatants.map((c) => c.token);
    for (let token of combatants) {
      token?.actor?.consumeMaintainedZeon(true);
      token?.actor?.psychicShieldsMaintenance(true);
    }
    return super.previousRound();
  }
  prepareDerivedData() {
    super.prepareDerivedData();
    this.combatants.forEach((combatant) => {
      combatant.actor?.prepareDerivedData();
    });
  }
  /**
   * Modify rollInitiative so that it asks for modifiers
   * @param {string[] | string} ids
   * @param {{updateTurn?: boolean, messageOptions?: any}} [options]
   */
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
      await this.update({ turn: 0 });
    }
    return this;
  }
  /**
   * @protected @override
   * @param {Combatant} combatantA
   * @param {Combatant} combatantB
   */
  _sortCombatants(combatantA, combatantB) {
    let initiativeA = combatantA.initiative || -9999;
    let initiativeB = combatantB.initiative || -9999;
    if (
      initiativeA <
      (combatantA?.actor?.system.characteristics.secondaries.initiative.final
        .value || 0)
    )
      initiativeA -= 2e3;
    if (
      initiativeB <
      (combatantB?.actor?.system.characteristics.secondaries.initiative.final
        .value || 0)
    )
      initiativeB -= 2e3;
    return initiativeB - initiativeA;
  }
}
export { ABFCombat as default };
