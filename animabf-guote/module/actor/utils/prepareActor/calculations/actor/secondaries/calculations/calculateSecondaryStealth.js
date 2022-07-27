import { calculateEquippedArmorsPenalty } from "../../natural-penalty/calculations/calculateEquippedArmorsPenalty.js";
import { calculateNonHelmetArmorsNaturalPenalty } from "../../natural-penalty/calculations/calculateNonHelmetArmorsNaturalPenalty.js";
import { calculateWearArmorNaturalPenalty } from "../../natural-penalty/calculations/calculateWearArmorNaturalPenalty.js";
export const calculateSecondaryStealth = (data) => {
    const equippedArmorsPenalty = calculateEquippedArmorsPenalty(data);
    const wearArmorNaturalPenalty = calculateWearArmorNaturalPenalty(data);
    const naturalPenaltyWithoutEquippedArmorsPenalty = calculateNonHelmetArmorsNaturalPenalty(data);
    const armorPenalty = Math.min(wearArmorNaturalPenalty + naturalPenaltyWithoutEquippedArmorsPenalty, naturalPenaltyWithoutEquippedArmorsPenalty / 2) + equippedArmorsPenalty;
    return Math.round(data.secondaries.subterfuge.stealth.base.value + data.general.modifiers.allActions.final.value + armorPenalty);
};
