import { ArmorLocation } from "../../../../../../../types/combat/ArmorItemConfig.js";
export const calculateHelmetArmorsNaturalPenalty = (system) => {
    const combat = system.combat;
    const equippedArmors = combat.armors.filter(armor => armor.system.equipped.value && armor.system.localization.value === ArmorLocation.HEAD);
    return equippedArmors.reduce((prev, curr) => prev + curr.system.naturalPenalty.final.value, 0);
};
