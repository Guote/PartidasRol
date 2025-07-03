import "../ABFFoundryRoll.js";
import ABFExploderRoll from "../ABFExploderRoll/ABFExploderRoll.js";
class ABFInitiativeRoll extends ABFExploderRoll {
  async evaluate() {
    await super.evaluate();
    if (this.fumbled) {
      this.foundryRoll.recalculateTotal(this.calculateFumbledInitiativeMod());
    }
    return new Promise((resolve, reject) => {
      resolve(this.foundryRoll);
    });
  }
  /** @private */
  calculateFumbledInitiativeMod() {
    if (this.foundryRoll.firstResult === 1) return -126;
    if (this.foundryRoll.firstResult === 2) return -102;
    if (this.foundryRoll.firstResult <= this.fumbleRange)
      return -75 - this.foundryRoll.firstResult;
    return 0;
  }
}
export {
  ABFInitiativeRoll as default
};
