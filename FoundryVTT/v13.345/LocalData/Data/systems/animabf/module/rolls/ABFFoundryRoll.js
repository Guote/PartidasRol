import ABFExploderRoll from "./ABFExploderRoll/ABFExploderRoll.js";
import ABFInitiativeRoll from "./ABFInitiativeRoll/ABFInitiativeRoll.js";
import ABFControlRoll from "./ABFControlRoll/ABFControlRoll.js";
import ABFPsychicRoll from "./ABFPsychicRoll/ABFPsychicRoll.js";
class ABFFoundryRoll extends Roll {
  /**
   * @private
   * @readonly
   * @type {ABFRoll | undefined}
   */
  animabfRoll;
  /**
   * @param {string} rawFormula
   * @param {import('@module/types/Actor').ABFActorDataSourceData} [data]
   * @param {Partial<RollTerm.EvaluationOptions>} [options]
   */
  constructor(rawFormula, data, options) {
    let formula = rawFormula.trim();
    if (formula.endsWith("+")) {
      formula = formula.substr(0, formula.length - 1);
    }
    super(formula, data, options);
    if (data) {
      this.data = data;
    }
    if (this.formula.includes("xa")) {
      this.animabfRoll = new ABFExploderRoll(this);
    }
    if (this.formula.includes("Initiative")) {
      this.animabfRoll = new ABFInitiativeRoll(this);
    }
    if (this.formula.includes("ControlRoll")) {
      this.animabfRoll = new ABFControlRoll(this);
    }
    if (this.formula.includes("PsychicRoll")) {
      this.animabfRoll = new ABFPsychicRoll(this);
    }
  }
  get firstResult() {
    return this.getResults()[0];
  }
  get lastResult() {
    return this.getResults()[this.getResults().length - 1];
  }
  get fumbled() {
    if (this.animabfRoll instanceof ABFExploderRoll)
      return this.animabfRoll?.fumbled || false;
    return false;
  }
  recalculateTotal(mod = 0) {
    this._total = this._evaluateTotal() + mod;
  }
  overrideTotal(newtotal = 0) {
    if (newtotal) {
      this._total = newtotal;
    }
  }
  getResults() {
    return this.dice.map(
      (d) => d.results.map((res) => {
        const val = typeof res.result === "number" ? res.result : 0;
        const cnt = res?.count ?? 1;
        const contributes = !(res?.discarded || res?.active === false || cnt === 0);
        return contributes ? val * cnt : 0;
      })
    ).flat();
  }
  // TODO Evaluate not finished this | Promise<this>
  /** @returns {Promise<Roll>} */
  async evaluate(options) {
    await super.evaluate(options);
    await this.animabfRoll?.evaluate(options);
    return new Promise((resolve, reject) => {
      resolve(this);
    });
  }
}
export {
  ABFFoundryRoll as default
};
