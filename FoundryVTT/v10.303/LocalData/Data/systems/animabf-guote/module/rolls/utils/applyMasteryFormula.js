/**
 * Replaces the open-ended explosion modifier with the mastery variant
 * when the actor's base skill value reaches 200+.
 * @param {string} formula
 * @param {number} baseValue
 * @returns {string}
 */
export const applyMasteryFormula = (formula, baseValue) =>
    baseValue >= 200 ? formula.replace('xa', 'xamastery') : formula;
