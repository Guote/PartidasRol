import { getWeaponKnowledgePenalty } from "../util/getWeaponKnowledgePenalty.js";
import { calculateStrengthRequiredPenalty } from "../util/calculateStrengthRequiredPenalty.js";
export const calculateWeaponAttack = (weapon, data) =>
  weapon.system.isSummon
    ? weapon.system.baseAtk.value + weapon.system.attack.special.value
    : data.combat.attack.final.value +
      weapon.system.attack.special.value +
      weapon.system.quality.value +
      getWeaponKnowledgePenalty(weapon) +
      calculateStrengthRequiredPenalty(weapon, data);
