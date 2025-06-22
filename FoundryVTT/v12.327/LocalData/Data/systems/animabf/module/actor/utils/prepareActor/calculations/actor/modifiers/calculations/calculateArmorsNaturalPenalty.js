import { ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
const calculateArmorsNaturalPenalty = (data) => {
  const combat = data.combat;
  const equippedArmors = combat.armors.filter(
    (armor) => armor.system.equipped.value && armor.system.localization.value !== ArmorLocation.HEAD
  );
  return equippedArmors.reduce(
    (prev, curr) => prev + curr.system.naturalPenalty.final.value,
    0
  );
};
export {
  calculateArmorsNaturalPenalty
};
