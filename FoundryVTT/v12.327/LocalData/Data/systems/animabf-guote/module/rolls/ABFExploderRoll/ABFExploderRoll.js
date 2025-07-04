import ABFFoundryRoll from "../ABFFoundryRoll.js";
import { ABFRoll } from "../ABFRoll.js";
class ABFExploderRoll extends ABFRoll {
  lastOpenRange = this.openRollRange;
  async canExplode() {
    const lastResult = this.firstDice.results[this.firstDice.results.length - 1];
    if (this.openOnDoubles && lastResult.result % 11 === 0) {
      const newRoll = new ABFFoundryRoll("1d10");
      await newRoll.evaluate();
      if (newRoll.total === lastResult.result / 11) {
        this.firstDice.results[this.firstDice.results.length - 1] = {
          ...lastResult,
          success: true,
          exploded: true,
          count: 100
        };
        return true;
      }
    }
    let exploded = lastResult.result >= this.lastOpenRange;
    lastResult.success = exploded;
    return exploded;
  }
  get fumbled() {
    return this.foundryRoll.firstResult <= this.fumbleRange;
  }
  /** @param {number} result */
  checkDoubles(result) {
    if (result % 11 === 0) {
      const newRoll = new ABFFoundryRoll("1d10");
      newRoll.evaluate();
      return newRoll.total === result / 11;
    }
    return false;
  }
  /** @returns {Promise<ABFFoundryRoll>} */
  async evaluate() {
    if (await this.canExplode()) {
      await this.explodeDice(this.lastOpenRange + 1);
    }
    this.firstDice.results[0].failure = this.firstDice.results[0].result <= this.fumbleRange;
    this.foundryRoll.recalculateTotal();
    return new Promise((resolve, reject) => {
      resolve(this.foundryRoll);
    });
  }
  /** @param {number} openRange */
  async explodeDice(openRange) {
    this.lastOpenRange = Math.min(openRange, 100);
    const newRoll = new ABFFoundryRoll("1d100");
    await newRoll.evaluate();
    this.addRoll(newRoll);
    if (await this.canExplode()) {
      await this.explodeDice(openRange + 1);
    }
  }
}
export {
  ABFExploderRoll as default
};
