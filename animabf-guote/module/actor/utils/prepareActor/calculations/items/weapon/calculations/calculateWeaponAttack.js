import { getWeaponKnowledgePenalty } from "../util/getWeaponKnowledgePenalty.js";
import { calculateStrengthRequiredPenalty } from "../util/calculateStrengthRequiredPenalty.js";
export const calculateWeaponAttack = (weapon, data) => data.combat.attack.final.value +
    weapon.data.attack.special.value +
    weapon.data.quality.value +
    getWeaponKnowledgePenalty(weapon) +
    calculateStrengthRequiredPenalty(weapon, data);
