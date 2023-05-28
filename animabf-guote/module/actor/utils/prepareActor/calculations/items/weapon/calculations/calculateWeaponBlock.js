import { getWeaponKnowledgePenalty } from "../util/getWeaponKnowledgePenalty.js";
import { calculateStrengthRequiredPenalty } from "../util/calculateStrengthRequiredPenalty.js";
import { calculateShieldBlockBonus } from "../../../actor/combat/calculations/calculateShieldBlockBonus.js";
export const calculateWeaponBlock = (weapon, data) =>
  weapon.data.isSummon
    ? weapon.data.baseDef.value + weapon.data.block.special.value
    : data.combat.block.final.value +
      weapon.data.block.special.value +
      weapon.data.quality.value +
      (weapon.data.isShield.value && weapon.data.equipped.value
        ? calculateShieldBlockBonus(weapon)
        : 0) +
      getWeaponKnowledgePenalty(weapon) +
      calculateStrengthRequiredPenalty(weapon, data);
