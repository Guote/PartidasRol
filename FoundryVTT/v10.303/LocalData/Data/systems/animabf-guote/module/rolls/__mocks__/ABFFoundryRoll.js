/**
 * Custom implementation of Roll from foundry.js
 * Test methods are unique methods used for unit testing
 */
import { nextValueService } from './nextValueService.js';
export default class ABFFoundryRoll {
    constructor(formula, data) {
        this._rolled = false;
        this._formula = formula;
        this.system = data;
        this.dice = [];
    }
    recalculateTotal(mod = 0) {
        this._total = this.getResults().reduce((prev, curr) => prev + curr) + mod;
    }
    get total() {
        return this._total;
    }
    get firstResult() {
        return this.getResults()[0];
    }
    get lastResult() {
        return this.getResults()[this.getResults().length - 1];
    }
    getResults() {
        return this.dice.map(d => d.results.map(res => res.result)).flat();
    }
    get firstDice() {
        return this.dice[0];
    }
    evaluate() {
        if (this._rolled)
            throw new Error('Already rolled');
        const value = nextValueService.getNextValue() ?? Math.min(1, Math.floor(Math.random() * 100));
        const diceTerm = { results: [{ result: value, active: true }] };
        this.dice.push(diceTerm);
        this.recalculateTotal();
        this._rolled = true;
        nextValueService.setNextValue(undefined);
        return this;
    }
}
