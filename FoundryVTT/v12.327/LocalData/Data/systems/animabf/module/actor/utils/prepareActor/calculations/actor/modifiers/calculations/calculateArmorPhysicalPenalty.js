import { getEquippedArmors } from "../../../../utils/getEquippedArmors.js";
const calculateEquippedArmorsRequirement = (data) => {
  return getEquippedArmors(data).reduce(
    (prev, curr) => prev + curr.system.wearArmorRequirement.final.value,
    0
  );
};
const calculateArmorPhysicalPenalty = (data) => {
  const totalWearRequirement = calculateEquippedArmorsRequirement(data);
  if (getEquippedArmors(data).length === 0) return 0;
  return Math.min(0, data.combat.wearArmor.value - totalWearRequirement);
};
export {
  calculateArmorPhysicalPenalty,
  calculateEquippedArmorsRequirement
};
