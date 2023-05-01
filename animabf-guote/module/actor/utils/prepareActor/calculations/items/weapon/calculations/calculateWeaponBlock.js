import { getWeaponKnowledgePenalty } from "../util/getWeaponKnowledgePenalty.js";
import { calculateStrengthRequiredPenalty } from "../util/calculateStrengthRequiredPenalty.js";
import { calculateShieldBlockBonus } from "../../../actor/combat/calculations/calculateShieldBlockBonus.js";
export const calculateWeaponBlock = (weapon, system) => {
  const actorAttack = system.combat.block.final.value;
  const weaponSpecial = weapon.system.block.special.value;
  const weaponQual = weapon.system.quality.value;

  return (
    system.combat.block.final.value +
    weapon.system.block.special.value +
    weapon.system.quality.value +
    (weapon.system.isShield.value && weapon.system.equipped.value
      ? calculateShieldBlockBonus(weapon)
      : 0) +
    getWeaponKnowledgePenalty(weapon) +
    calculateStrengthRequiredPenalty(weapon, system)
  );
};
