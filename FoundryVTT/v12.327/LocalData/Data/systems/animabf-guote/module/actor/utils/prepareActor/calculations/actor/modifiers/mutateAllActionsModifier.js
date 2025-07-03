import { calculateFatigue } from "./calculations/calculateFatigue.js";
const mutateAllActionsModifier = (data) => {
  data.general.modifiers.allActions.final.value = data.general.modifiers.allActions.base.value + data.general.modifiers.allActions.special.value + calculateFatigue(data);
};
export {
  mutateAllActionsModifier
};
