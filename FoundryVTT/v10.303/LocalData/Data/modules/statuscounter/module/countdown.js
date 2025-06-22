/**
 * Initializes the countdown feature.
 *  This script serves as an example for more advanced usages of the counter
 *  API. Note that this script has no imports as the {@link EffectCounter} class
 *  is registered globally.
 */
export const registerCountdown = function() {
    // Make sure that the counter module is initialized
    if (!window.EffectCounter) return;

    // Add counter types
    CounterTypes.addType("statuscounter.countdown_turn",
        getCombatCountdownValue, setCombatCountdownValue, canSelectCountdown);
    CounterTypes.addType("statuscounter.countdown_round",
        getCombatCountdownValue, setCombatCountdownValue, canSelectCountdown);
    
    // Register a hook to receive combat round changes
    Hooks.on("updateCombat", function(combat, diffData, _options, userId) {
        if (!("round" in diffData || "turn" in diffData)) return;

        const gmUpdate = game.users.get(userId)?.isGM;

        for (let combatant of combat.combatants) {
            let token = combatant.token;
            if (!token) continue;

            // Ignore other counter types and tokens with no countdowns
            let countdowns = ActiveEffectCounter.getCounters(token)
                .filter(counter => counter.type.startsWith("statuscounter.countdown"));

            if (countdowns.length > 0) {
                // Remove counters that reached 0
                let isUpdating = false;
                for (let counter of countdowns) {
                    // Fetching the parent once for multiple operations is not required, but more efficient
                    let parent = counter.findParent(token);
                    
                    if (counter.getValue(parent) <= 0) {
                        isUpdating = true;

                        const updateUser = gmUpdate
                            ? game.users.get(userId)
                            : combatant.players[0] ?? game.users.find(u => u.isGM && u.active);
                        if (game.user === updateUser) counter.remove(parent);
                    }
                }

                // If we didn't remove anything, trigger a redraw
                if (!isUpdating) {
                    token.actor.getActiveTokens(true).forEach(t => EffectCounter.redrawCounters(t, countdowns));
                }
            }

        }
    });
}

/**
 * Registers a setting for the countdown font folor and initializes the font
 *  with default values.
 */
export const registerCountdownSettings = function() {
	game.settings.register("statuscounter", "countdownColor", {
		name: game.i18n.localize("statuscounter.countdownColor.name"),
		hint: game.i18n.localize("statuscounter.countdownColor.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "ffff00",
		onChange: updateCounters
    });
    
    updateCountdownFont();
}

/**
 * Redraws the status effects (and counters) to display new settings.
 */
function updateCounters() {
    updateCountdownFont();
    EffectCounter.drawCounters();
}

/**
 * Updates the font style for the countdown type from the configuration.
 */
export const updateCountdownFont = function() {
	let font = CONFIG.canvasTextStyle.clone();
    font.fontSize = game.settings.get("statuscounter", "counterFontSize");
    font.fill = '#' + game.settings.get("statuscounter", "countdownColor").replace('#', '');
    CounterTypes.setFont("statuscounter.countdown_turn", font);
    CounterTypes.setFont("statuscounter.countdown_round", font);
}

/**
 * Prevents simple token effects from being used as a countdown because they
 *  don't support durations.
 * @param {EffectCounter} counter The counter to determine the menu entry visibility for.
 * @returns {boolean} True if the counter is associated with an active effect, false otherwise.
 */
function canSelectCountdown(counter) {
    return counter instanceof ActiveEffectCounter;
}

/**
 * Retreives the remaining rounds or turns of the countdown.
 * @param {EffectCounter} counter The counter to get the value for.
 * @param {ActiveEffect} effect The parent entity of the counter. Since this type is only allowed
 *  for active effects, the parent must be one.
 * @returns {number} The remaining rounds or turns of the active effect.
 */
function getCombatCountdownValue(counter, effect) {
    const remaining = effect.duration.remaining;
    if (counter.type.endsWith("_round")) {
        return Math.ceil(remaining);
    } else {
        const rounds = Math.floor(remaining);
        const turnsPerRound = game.combat?.turns.length ?? 1;
        return Math.round(rounds * turnsPerRound + (remaining - rounds) * 100);
    }
}

/**
 * Sets the remaining rounds or turns of the countdown relative to the current
 *  round and turn.
 * @param {EffectCounter} counter The counter to set the value on.
 * @param {number} value The numeric value to set.
 * @param {ActiveEffect} effect The parent entity of the counter.
 */
function setCombatCountdownValue(counter, value, effect) {
    if (value <= 0) return null;

    let roundBased = counter.type.endsWith("_round");
    let duration = {};

    // Set remaining rounds or turns
    if (roundBased) {
        duration.rounds = value;
        duration.turns = 0;
    } else {
        duration.rounds = 0;
        duration.turns = value;
    }

    const combat = game.combat;
    if (combat && combat.active && combat.round !== 0) {
        duration.combat = combat._id;

        // Set start round and turn to current values
        duration.startRound = combat.round ?? 1;
        duration.startTurn = combat.turn ?? 0;
    } else {
        duration.startRound = 1;
        duration.startTurn = 0;
    }

    // Always update the effect, not the counter.
    counter.visible = !!combat;
    if (effect._temporary) {
        foundry.utils.mergeObject(effect.duration, duration);
        return true;
    } else {
        effect.update({ duration: duration, "flags.statuscounter.counter": counter });
        return false;
    }
}