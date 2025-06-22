import { ActiveEffectCounter, EffectCounter, CounterTypes } from "./api.js";

/**
 * Initializes the active effect multiplier type.
 */
export const registerMultiplier = function() {
    CounterTypes.addType("statuscounter.multiplier",
        null, null, canSelectMultiplier);

    // Extend add and multiply operations on active effects.
    if (game.modules.get("lib-wrapper")?.active) {
        // Override using libWrapper: https://github.com/ruipin/fvtt-lib-wrapper
        libWrapper.register("statuscounter", "CONFIG.ActiveEffect.documentClass.prototype._applyAdd",
            function (wrapped, actor, change, current, delta, changes) {
                wrapped(actor, change, current, adjustDelta(this, delta), changes);
            }, "WRAPPER");
        libWrapper.register("statuscounter", "CONFIG.ActiveEffect.documentClass.prototype._applyMultiply",
            function (wrapped, actor, change, current, delta, changes) {
                wrapped(actor, change, current, adjustDelta(this, delta), changes);
            }, "WRAPPER");
    } else {
        // Manual override.
        const originalAdd = CONFIG.ActiveEffect.documentClass.prototype._applyAdd;
        CONFIG.ActiveEffect.documentClass.prototype._applyAdd = function (actor, change, current, delta, changes) {
            return originalAdd.apply(this, [actor, change, current, adjustDelta(this, delta), changes]);
        }

        const originalMultiply = CONFIG.ActiveEffect.documentClass.prototype._applyMultiply;
        CONFIG.ActiveEffect.documentClass.prototype._applyMultiply = function (actor, change, current, delta, changes) {
            return originalMultiply.apply(this, [actor, change, current, adjustDelta(this, delta), changes]);
        }
    }
}

/**
 * Multiplies the given delta value with the effect counter.
 * @param {ActiveEffect} effect The parent of the effect to adjust.
 * @param {*} delta The delta value provided by FoundryVTT.
 * @returns {*} The multiplied delta value.
 */
function adjustDelta(effect, delta) {
    if (typeof (delta) === "number") {
        const counter = ActiveEffectCounter.getCounter(effect);
        if (counter?.value && counter.type === "statuscounter.multiplier") delta *= counter.value;
    }

    return delta;
}

/**
 * Determines if the multiplier type can be selected for the given counter.
 * @param {EffectCounter} counter The counter to determine the menu entry visibility for.
 * @param {Token | ActiveEffect} parent The parent entity of the counter.
 * @returns {boolean} True if the active effect of the counter has a numeric change (which is any
 *  active effect change with mode ADD or MULTIPLY), false otherwise.
 */
function canSelectMultiplier(counter, parent) {
    if (!(counter instanceof ActiveEffectCounter)) return false;
    if (!(parent.changes && parent.changes.length > 0)) return false;

    const modes = CONST.ACTIVE_EFFECT_MODES;
    for (let change of parent.changes) {
        if ((change.mode === modes.ADD || change.mode === modes.MULTIPLY) && Number(change.value)) return true;
    }

    return false;
}