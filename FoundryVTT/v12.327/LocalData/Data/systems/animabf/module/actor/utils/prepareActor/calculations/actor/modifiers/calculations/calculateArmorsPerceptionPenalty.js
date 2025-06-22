import { ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
const calculateArmorsPerceptionPenalty = (data) => {
  const combat = data.combat;
  const equippedArmors = combat.armors.filter(
    (armor) => armor.system.equipped.value && armor.system.localization.value === ArmorLocation.HEAD
  );
  return equippedArmors.reduce(
    (prev, curr) => prev + curr.system.perceptionPenalty.final.value,
    0
  );
};
export {
  calculateArmorsPerceptionPenalty
};
