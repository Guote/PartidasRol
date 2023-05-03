import { calculateHelmetArmorsNaturalPenalty } from "../../natural-penalty/calculations/calculateHelmetArmorsNaturalPenalty.js";
export const calculateSecondarySearch = (system) => {
    let value = system.secondaries.perception.search.base.value + system.general.modifiers.allActions.final.value;
    value += calculateHelmetArmorsNaturalPenalty(system);
    return value;
};
