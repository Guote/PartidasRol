import { calculateArmorsNaturalPenalty } from "./calculations/calculateArmorsNaturalPenalty.js";
import { calculateEquippedArmorsNaturalPenalty } from "./calculations/calculateEquippedArmorsNaturalPenalty.js";
import { calculateEquippedArmorsRequirement } from "./calculations/calculateArmorPhysicalPenalty.js";
const mutateNaturalPenalty = (data) => {
  let wearArmor = data.combat.wearArmor.value;
  let wearArmorRequirement = calculateEquippedArmorsRequirement(data);
  let armorsNaturalPenalty = calculateArmorsNaturalPenalty(data);
  let equippedArmorsPenalty = calculateEquippedArmorsNaturalPenalty(data);
  let unreducedNaturalPenalty = Math.min(0, armorsNaturalPenalty);
  let naturalPenaltyReduction = Math.min(
    -armorsNaturalPenalty,
    Math.max(0, wearArmor - wearArmorRequirement)
  );
  data.general.modifiers.naturalPenalty.unreduced.value = unreducedNaturalPenalty;
  data.general.modifiers.naturalPenalty.reduction.value = naturalPenaltyReduction;
  data.general.modifiers.naturalPenalty.final.value = unreducedNaturalPenalty + naturalPenaltyReduction + equippedArmorsPenalty + data.general.modifiers.naturalPenalty.base.value + data.general.modifiers.naturalPenalty.special.value;
};
export {
  mutateNaturalPenalty
};
