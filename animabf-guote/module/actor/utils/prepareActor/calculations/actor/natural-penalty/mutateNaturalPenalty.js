import { calculateNonHelmetArmorsNaturalPenalty } from "./calculations/calculateNonHelmetArmorsNaturalPenalty.js";
import { calculateWearArmorNaturalPenalty } from "./calculations/calculateWearArmorNaturalPenalty.js";
import { calculateEquippedArmorsPenalty } from "./calculations/calculateEquippedArmorsPenalty.js";
export const mutateNaturalPenalty = (system) => {
    const wearArmorNaturalPenalty = calculateWearArmorNaturalPenalty(system);
    let armorsNaturalPenalty = calculateNonHelmetArmorsNaturalPenalty(system);
    if (wearArmorNaturalPenalty > 0) {
        armorsNaturalPenalty += wearArmorNaturalPenalty;
    }
    const equippedArmorsPenalty = calculateEquippedArmorsPenalty(system);
    system.general.modifiers.naturalPenalty.byArmors.value = Math.min(0, armorsNaturalPenalty) + equippedArmorsPenalty;
    system.general.modifiers.naturalPenalty.byWearArmorRequirement.value = Math.min(0, wearArmorNaturalPenalty);
};
