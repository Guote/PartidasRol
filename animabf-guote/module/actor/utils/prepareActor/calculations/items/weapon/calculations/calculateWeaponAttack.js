import { getWeaponKnowledgePenalty } from "../util/getWeaponKnowledgePenalty.js";
import { calculateStrengthRequiredPenalty } from "../util/calculateStrengthRequiredPenalty.js";
export const calculateWeaponAttack = (weapon, system) => system.combat.attack.final.value +
    weapon.system.attack.special.value +
    weapon.system.quality.value +
    getWeaponKnowledgePenalty(weapon) +
    calculateStrengthRequiredPenalty(weapon, system);
