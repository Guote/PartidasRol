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
            return -125;
        if (this.foundryRoll.firstResult === 2)
            return -100;
        if (this.foundryRoll.firstResult === 3)
            return -75;
        return 0;
    }
}
