import { ArmorType, ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
const calculateEquippedArmorsNaturalPenalty = (data) => {
  const combat = data.combat;
  const equippedArmorsNonNatural = combat.armors.filter(
    (armor) => armor.system.equipped.value && armor.system.type.value !== ArmorType.NATURAL && armor.system.localization.value !== ArmorLocation.HEAD
  );
  return Math.min(0, (equippedArmorsNonNatural.length - 1) * -20);
};
export {
  calculateEquippedArmorsNaturalPenalty
};
