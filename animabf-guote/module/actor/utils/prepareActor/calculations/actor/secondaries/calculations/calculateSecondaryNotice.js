import { calculateHelmetArmorsNaturalPenalty } from "../../natural-penalty/calculations/calculateHelmetArmorsNaturalPenalty.js";
export const calculateSecondaryNotice = (system) => {
    let value = system.secondaries.perception.notice.base.value + system.general.modifiers.allActions.final.value;
    value += calculateHelmetArmorsNaturalPenalty(system);
    return value;
};
