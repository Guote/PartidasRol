import { calculateEquippedArmorsPenalty } from "../../natural-penalty/calculations/calculateEquippedArmorsPenalty.js";
import { calculateNonHelmetArmorsNaturalPenalty } from "../../natural-penalty/calculations/calculateNonHelmetArmorsNaturalPenalty.js";
import { calculateWearArmorNaturalPenalty } from "../../natural-penalty/calculations/calculateWearArmorNaturalPenalty.js";
export const calculateSecondaryStealth = (system) => {
    const equippedArmorsPenalty = calculateEquippedArmorsPenalty(system);
    const wearArmorNaturalPenalty = calculateWearArmorNaturalPenalty(system);
    const naturalPenaltyWithoutEquippedArmorsPenalty = calculateNonHelmetArmorsNaturalPenalty(system);
    const armorPenalty = Math.min(wearArmorNaturalPenalty + naturalPenaltyWithoutEquippedArmorsPenalty, naturalPenaltyWithoutEquippedArmorsPenalty / 2) + equippedArmorsPenalty;
    return Math.round(system.secondaries.subterfuge.stealth.base.value + system.general.modifiers.allActions.final.value + armorPenalty);
};
