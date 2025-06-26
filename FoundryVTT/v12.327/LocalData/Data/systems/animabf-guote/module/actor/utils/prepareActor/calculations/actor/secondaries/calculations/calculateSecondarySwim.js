import { calculateNaturalPenaltyWithoutWearArmor } from '../../natural-penalty/calculations/calculateWearArmorNaturalPenalty.js';
export const calculateSecondarySwim = (data) => {
    const naturalPenalty = -calculateNaturalPenaltyWithoutWearArmor(data);
    return (data.secondaries.athletics.swim.base.value +
        data.general.modifiers.allActions.final.value +
        data.general.modifiers.physicalActions.value +
        naturalPenalty +
        data.general.modifiers.naturalPenalty.byWearArmorRequirement.value);
};
