import { calculateHelmetArmorsNaturalPenalty } from "../../natural-penalty/calculations/calculateHelmetArmorsNaturalPenalty.js";
export const calculateSecondaryNotice = (data) => {
    let value = data.secondaries.perception.notice.base.value + data.general.modifiers.allActions.final.value;
    value += calculateHelmetArmorsNaturalPenalty(data);
    return value;
};
