import { ABFRoll } from "../ABFRoll.js";
export default class ABFControlRoll extends ABFRoll {
    constructor() {
        super(...arguments);
        this.success = false;
    }
    evaluate() {
        let penalty = Math.max(0, Math.floor(-this.foundryRoll.data.general.modifiers.allActions.base.value / 20));
        if (this.foundryRoll.lastResult === 10) {
            this.success = true;
            penalty -= 2;
        }
        this.foundryRoll.recalculateTotal(-penalty);
        return this.foundryRoll;
    }
}
