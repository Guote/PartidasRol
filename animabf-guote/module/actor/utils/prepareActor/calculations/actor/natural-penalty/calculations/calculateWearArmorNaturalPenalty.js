import { getEquippedArmors } from '../../../../utils/getEquippedArmors.js';
export const calculateNaturalPenaltyWithoutWearArmor = (data) => {
    return getEquippedArmors(data).reduce((prev, curr) => prev + curr.system.wearArmorRequirement.final.value, 0);
};
export const calculateWearArmorNaturalPenalty = (data) => {
    const totalWearRequirement = calculateNaturalPenaltyWithoutWearArmor(data);
    return data.combat.wearArmor.value - totalWearRequirement;
};
