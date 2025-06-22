import { calculateArmorsPerceptionPenalty } from "./calculations/calculateArmorsPerceptionPenalty.js";
const mutatePerceptionPenalty = (data) => {
  let armorsPerceptionPenalty = calculateArmorsPerceptionPenalty(data);
  data.general.modifiers.perceptionPenalty.final.value = data.general.modifiers.perceptionPenalty.base.value + data.general.modifiers.perceptionPenalty.special.value + Math.min(0, armorsPerceptionPenalty);
};
export {
  mutatePerceptionPenalty
};
