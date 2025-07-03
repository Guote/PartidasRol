import { ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
const calculateArmorNaturalPenalty = (armor) => {
  if (armor.system.localization == ArmorLocation.HEAD) return 0;
  return Math.min(armor.system.naturalPenalty.base.value + armor.system.quality.value, 0);
};
export {
  calculateArmorNaturalPenalty
};
