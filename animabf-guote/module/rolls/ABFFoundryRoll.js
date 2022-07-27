import ABFExploderRoll from "./ABFExploderRoll/ABFExploderRoll.js";
import ABFInitiativeRoll from "./ABFInitiativeRoll/ABFInitiativeRoll.js";
import ABFControlRoll from "./ABFControlRoll/ABFControlRoll.js";
/**
 * This class represents the entrypoint of Foundry
 * We must never add our logic here, all of it must be placed in its own class like ABFExploredRoll
 */
export default class ABFFoundryRoll extends Roll {
    constructor(rawFormula, data, options) {
        let formula = rawFormula.trim();
        // In FoundryVTT 0.8.8 I don't know why but the system inserts at the end a "+ "
        // so here, if we found that the end of the formula is "+ " we remove it
        if (formula.endsWith('+')) {
            formula = formula.substr(0, formula.length - 1);
        }
        super(formula, data, options);
        if (data) {
            this.data = data;
        }
        if (this.formula.includes('xa')) {
            this.abfRoll = new ABFExploderRoll(this);
        }
        if (this.formula.includes('Initiative')) {
            this.abfRoll = new ABFInitiativeRoll(this);
        }
        if (this.formula.includes('ControlRoll')) {
            this.abfRoll = new ABFControlRoll(this);
        }
    }
    get firstResult() {
        return this.getResults()[0];
    }
    get lastResult() {
        return this.getResults()[this.getResults().length - 1];
    }
    get fumbled() {
        if (this.abfRoll instanceof ABFExploderRoll)
            return this.abfRoll?.fumbled || false;
        else
            return false;
    }
    recalculateTotal(mod = 0) {
        this._total = this._evaluateTotal() + mod;
    }
    getResults() {
        return this.dice.map(d => d.results.map(res => res.result)).flat();
    }
    // TODO Evaluate not finished this | Promise<this>
    evaluate(partialOptions) {
        const options = { ...partialOptions, async: false };
        super.evaluate(options);
        this.abfRoll?.evaluate(options);
        return this;
    }
}
