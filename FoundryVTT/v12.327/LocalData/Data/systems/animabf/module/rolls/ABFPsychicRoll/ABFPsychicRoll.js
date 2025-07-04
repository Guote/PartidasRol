import "../ABFFoundryRoll.js";
import ABFExploderRoll from "../ABFExploderRoll/ABFExploderRoll.js";
import { psychicPotentialEffect } from "../../combat/utils/psychicPotentialEffect.js";
import { psychicFatigueCheck } from "../../combat/utils/psychicFatigueCheck.js";
class ABFPsychicRoll extends ABFExploderRoll {
  /** @returns {Promise<ABFFoundryRoll>} */
  async evaluate() {
    await super.evaluate();
    const {
      general: {
        settings: { inhuman, zen }
      },
      psychic: { mentalPatterns, psychicDisciplines },
      power,
      mentalPatternImbalance
    } = this.foundryRoll.data;
    const powerDiscipline = power?.system.discipline.value;
    let imbalance = psychicDisciplines.find((i) => i.name === powerDiscipline)?.system.imbalance ? 1 : 0;
    let newPotentialTotal = psychicPotentialEffect(
      this.foundryRoll.total ?? 0,
      imbalance,
      inhuman.value,
      zen.value
    );
    if (!psychicFatigueCheck(power?.system.effects[newPotentialTotal].value)) {
      if (mentalPatternImbalance) {
        newPotentialTotal = psychicPotentialEffect(
          newPotentialTotal,
          1,
          inhuman.value,
          zen.value
        );
      } else if (power?.system.combatType.value === "attack" && mentalPatterns.find((i) => i.name == "courage")) {
        newPotentialTotal = psychicPotentialEffect(
          newPotentialTotal,
          1,
          inhuman.value,
          zen.value
        );
      }
    }
    this.foundryRoll.overrideTotal(newPotentialTotal);
    return new Promise((resolve, reject) => {
      resolve(this.foundryRoll);
    });
  }
}
export {
  ABFPsychicRoll as default
};
