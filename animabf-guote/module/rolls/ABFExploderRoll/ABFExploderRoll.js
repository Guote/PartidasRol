import ABFFoundryRoll from "../ABFFoundryRoll.js";
import { ABFRoll } from "../ABFRoll.js";
export default class ABFExploderRoll extends ABFRoll {
    constructor() {
        super(...arguments);
        this.DEFAULT_OPEN_RANGE = 90;
        this.lastOpenRange = this.DEFAULT_OPEN_RANGE;
    }
    get canExplode() {
        return this.foundryRoll.lastResult >= this.DEFAULT_OPEN_RANGE;
    }
    evaluate() {
        if (this.canExplode) {
            this.explodeDice(this.lastOpenRange + 1);
        }
        this.firstDice.results = this.firstDice.results.map(res => ({
            ...res,
            success: res.result >= this.lastOpenRange,
            failure: res.result <= this.DEFAULT_FUMBLE_RANGE
        }));
        this.foundryRoll.recalculateTotal();
        return this.foundryRoll;
    }
    explodeDice(openRange) {
        this.lastOpenRange = openRange;
        const newRoll = new ABFFoundryRoll('1d100').evaluate();
        const newResult = this.addRoll(newRoll);
        if (newResult >= Math.min(openRange, 100)) {
            this.explodeDice(openRange + 1);
        }
    }
}
