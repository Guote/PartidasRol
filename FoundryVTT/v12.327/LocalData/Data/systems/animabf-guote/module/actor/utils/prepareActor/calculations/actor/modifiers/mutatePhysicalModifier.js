import { calculateArmorPhysicalPenalty } from "./calculations/calculateArmorPhysicalPenalty.js";
const mutatePhysicalModifier = (data) => {
  let armorPhysicalModifier = calculateArmorPhysicalPenalty(data);
  data.general.modifiers.physicalActions.final.value = data.general.modifiers.physicalActions.base.value + data.general.modifiers.physicalActions.special.value + armorPhysicalModifier;
};
export {
  mutatePhysicalModifier
};
