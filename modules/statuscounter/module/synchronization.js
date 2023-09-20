/**
 * Synchronizes the effects and counters of the given dataset in order to
 *  ensure that they have matching, associated objects.
 * @param {Object} tokenData The current data of the token.
 * @param {Object} newData The data to be merged into the token data.
 */
export const synchronizeEffectCounters = function(tokenData, newData) {
	if (!("effects" in newData) && hasProperty(newData, "flags.statuscounter.effectCounters")) {
		synchronizeEffects(tokenData, newData);
	} else if ("effects" in newData) {
		synchronizeCounters(tokenData, newData);
    }
};

/**
 * Synchronizes the effects of the given token to make sure that they match
 *  their counters. This also updates the state of their UI elements.
 * @param {Object} tokenData The current data of the token.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeEffects(tokenData, newData) {
    let counterPaths = newData.flags.statuscounter.effectCounters.map(counter => counter.path);
    if (arrayEquals(counterPaths, tokenData.effects)) return;

    // Insert effect array into the update
    newData.effects = counterPaths;
}

/**
 * Synchronizes the effect counters to make sure that they match their effects.
 * @param {Object} tokenData The current data of the token.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeCounters(tokenData, newData) {
    let effectCounters = foundry.utils.getProperty(tokenData, "flags.statuscounter.effectCounters");
    if (arrayEquals(newData.effects, effectCounters?.map(counter => counter.path))) return;
    
    let token = canvas.tokens.get(tokenData._id);
    let counters = [];
    for (let effect of newData.effects) {
        let effectCounter = effectCounters?.find(counter => counter.path === effect);
        counters.push(effectCounter ? effectCounter : new EffectCounter(1, effect, token.document));
    }

    // Insert counter array into the update
    foundry.utils.setProperty(newData, "flags.statuscounter.effectCounters", counters);
}

/**
 * Compares two arrays for equality of each element.
 * @param {Array} array1 The first array to compare.
 * @param {Array} array2 The second array to compare to.
 * @returns True if the arrays contain the same elements, false otherwise.
 */
function arrayEquals(array1, array2) {
	return Array.isArray(array1) && Array.isArray(array2)
		&& array1.length === array2.length
		&& array1.every((value, index) => value === array2[index]);
}