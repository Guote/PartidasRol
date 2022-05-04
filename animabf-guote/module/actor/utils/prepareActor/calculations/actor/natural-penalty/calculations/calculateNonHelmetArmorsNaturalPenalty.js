import { ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
export const calculateNonHelmetArmorsNaturalPenalty = (data) => {
    const combat = data.combat;
    const equippedArmors = combat.armors.filter(armor => armor.data.equipped.value && armor.data.localization.value !== ArmorLocation.HEAD);
    return equippedArmors.reduce((prev, curr) => prev + curr.data.naturalPenalty.final.value, 0);
};
