import { calculateNaturalPenaltyWithoutWearArmor } from "../../natural-penalty/calculations/calculateWearArmorNaturalPenalty.js";
export const calculateSecondarySwim = (system) => {
    const naturalPenalty = -calculateNaturalPenaltyWithoutWearArmor(system);
    return (system.secondaries.athletics.swim.base.value +
        system.general.modifiers.allActions.final.value +
        system.general.modifiers.physicalActions.value +
        naturalPenalty +
        system.general.modifiers.naturalPenalty.byWearArmorRequirement.value);
};
