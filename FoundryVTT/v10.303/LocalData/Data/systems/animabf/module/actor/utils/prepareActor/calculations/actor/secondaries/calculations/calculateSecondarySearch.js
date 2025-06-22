import { calculateHelmetArmorsNaturalPenalty } from '../../natural-penalty/calculations/calculateHelmetArmorsNaturalPenalty.js';
export const calculateSecondarySearch = (data) => {
    let value = data.secondaries.perception.search.base.value + data.general.modifiers.allActions.final.value;
    value += calculateHelmetArmorsNaturalPenalty(data);
    return value;
};
