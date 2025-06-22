export class ABFRoll {
    constructor(foundryRoll) {
        this.foundryRoll = foundryRoll;
        this.DEFAULT_FUMBLE_RANGE = 3;
        this.DEFAULT_OPEN_RANGE = 90;
        this.DEFAULT_OPEN_WITH_DOUBLES = false;
        this.openRollRange = this.DEFAULT_OPEN_RANGE;
        this.fumbleRange = this.DEFAULT_FUMBLE_RANGE;
        this.openOnDoubles = this.DEFAULT_OPEN_WITH_DOUBLES;
        if (this.foundryRoll.data.general !== undefined) {
            this.openOnDoubles = this.foundryRoll.data.general.settings.openOnDoubles.value;
            this.openRollRange = this.foundryRoll.data.general.settings.openRolls.value;
            if (this.openRollRange === 0) {
                // If openRollRange is set to 0 it's probably an actor from 1.14 that hasn't been configured
                this.openRollRange = this.DEFAULT_OPEN_RANGE;
            }
            this.fumbleRange = this.foundryRoll.data.general.settings.fumbles.value;
            if (foundryRoll.formula.includes('mastery') && this.fumbleRange > 1)
                this.fumbleRange -= 1;
        }
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
