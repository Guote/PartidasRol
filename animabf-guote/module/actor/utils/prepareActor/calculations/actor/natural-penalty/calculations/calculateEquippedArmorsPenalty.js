import { ArmorType } from "../../../../../../../types/combat/ArmorItemConfig.js";
export const calculateEquippedArmorsPenalty = (data) => {
    const combat = data.combat;
    const equippedArmorsNonNatural = combat.armors.filter(armor => armor.system.equipped.value && armor.system.type.value !== ArmorType.NATURAL);
    return Math.min(0, (equippedArmorsNonNatural.length - 1) * -20);
};
