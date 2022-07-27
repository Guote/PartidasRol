import ABFExploderRoll from "../ABFExploderRoll/ABFExploderRoll.js";
export default class ABFInitiativeRoll extends ABFExploderRoll {
    evaluate() {
        super.evaluate();
        if (this.fumbled) {
            this.foundryRoll.recalculateTotal(this.calculateFumbledInitiativeMod());
        }
        return this.foundryRoll;
    }
    calculateFumbledInitiativeMod() {
        if (this.foundryRoll.firstResult === 1)
            return -126;
        if (this.foundryRoll.firstResult === 2)
            return -102;
        if (this.foundryRoll.firstResult <= this.fumbleRange)
            return -75 - this.foundryRoll.firstResult;
        return 0;
    }
}
