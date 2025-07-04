import { ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
const calculateArmorPerceptionPenalty = (armor) => {
  if (armor.system.localization.value !== ArmorLocation.HEAD) return 0;
  return Math.min(armor.system.perceptionPenalty.base.value, 0);
};
export {
  calculateArmorPerceptionPenalty
};
