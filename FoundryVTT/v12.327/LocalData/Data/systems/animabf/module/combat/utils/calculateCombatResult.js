import { ABFSettingsKeys } from "../../../utils/registerSettings.js";
import { canCounterAttack } from "./canCounterAttack.js";
import { calculateCounterAttackBonus } from "./calculateCounterAttackBonus.js";
import { calculateDamage } from "./calculateDamage.js";
import { roundTo5Multiples } from "./roundTo5Multiples.js";
const calculateCombatResult = (attack, defense, at, damage, halvedAbsorption = false) => {
  const needToRound = game.settings.get(
    "animabf",
    ABFSettingsKeys.ROUND_DAMAGE_IN_MULTIPLES_OF_5
  );
  if (canCounterAttack(attack, defense)) {
    return {
      canCounterAttack: true,
      counterAttackBonus: calculateCounterAttackBonus(attack, defense)
    };
  }
  const result = calculateDamage(attack, defense, at, damage, halvedAbsorption);
  return {
    canCounterAttack: false,
    damage: needToRound ? roundTo5Multiples(result) : result
  };
};
export {
  calculateCombatResult
};
