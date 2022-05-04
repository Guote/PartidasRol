import { getEquippedArmors } from "../../../../utils/getEquippedArmors.js";
export const calculateWearArmorNaturalPenalty = (data) => {
    const totalWearRequirement = getEquippedArmors(data).reduce((prev, curr) => prev + curr.data.wearArmorRequirement.final.value, 0);
    return data.combat.wearArmor.value - totalWearRequirement;
};
