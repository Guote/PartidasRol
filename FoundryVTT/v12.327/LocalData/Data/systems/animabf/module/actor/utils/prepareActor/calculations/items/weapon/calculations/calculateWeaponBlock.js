import { getWeaponKnowledgePenalty } from "../util/getWeaponKnowledgePenalty.js";
import { calculateStrengthRequiredPenalty } from "../util/calculateStrengthRequiredPenalty.js";
import { calculateShieldBlockBonus } from "../../../actor/combat/calculations/calculateShieldBlockBonus.js";
const calculateWeaponBlock = (weapon, data) => data.combat.block.final.value + weapon.system.block.special.value + weapon.system.quality.value + (weapon.system.isShield.value && weapon.system.equipped.value ? calculateShieldBlockBonus(weapon) : 0) + getWeaponKnowledgePenalty(weapon) + calculateStrengthRequiredPenalty(weapon, data);
export {
  calculateWeaponBlock
};
