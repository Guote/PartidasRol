/**
 * Calculate damage directed at a supernatural shield.
 *
 * A supernatural shield absorbs the full base weapon damage plus 10 extra
 * damage per TA point that the attack bypassed. Whatever the shield cannot
 * absorb overflows directly to the defender's HP.
 *
 * @param {number} baseDamage - Base weapon damage (before the percentage formula)
 * @param {number} ignoredTA  - TA points bypassed by the attack (defenderTA - effectiveTA)
 * @returns {number} Total damage aimed at the shield
 */
export const calculateShieldDamage = (baseDamage, ignoredTA) =>
  baseDamage + ignoredTA * 10;
