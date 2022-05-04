export class ABFRoll {
    constructor(foundryRoll) {
        this.foundryRoll = foundryRoll;
        this.DEFAULT_FUMBLE_RANGE = 3;
    }
    get fumbled() {
        return this.foundryRoll.firstResult <= this.DEFAULT_FUMBLE_RANGE;
    }
    get firstDice() {
        return this.foundryRoll.dice[0];
    }
    addRoll(newRoll) {
        this.firstDice.results.push({
            result: newRoll.getResults()[0],
            active: true
        });
        return newRoll.getResults()[0];
    }
    getRoll() {
        return this.foundryRoll;
    }
}
