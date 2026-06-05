/**
 * Returns the TA modifier contributed by weapon quality (negative = reduces enemy TA).
 * Quality 5 → -1, quality 10 → -2, etc.
 * @param {number} quality
 * @returns {number}
 */
export const calculateTAModifierByQuality = (quality) =>
  -Math.max(0, Math.round(quality / 5));
