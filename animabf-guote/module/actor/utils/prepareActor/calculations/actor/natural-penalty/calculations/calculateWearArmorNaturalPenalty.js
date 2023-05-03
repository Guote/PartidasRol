import { getEquippedArmors } from "../../../../utils/getEquippedArmors.js";
export const calculateNaturalPenaltyWithoutWearArmor = (system) => {
    return getEquippedArmors(system).reduce((prev, curr) => prev + curr.system.wearArmorRequirement.final.value, 0);
};
export const calculateWearArmorNaturalPenalty = (system) => {
    const totalWearRequirement = calculateNaturalPenaltyWithoutWearArmor(system);
    return system.combat.wearArmor.value - totalWearRequirement;
};
