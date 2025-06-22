import { calculateNonHelmetArmorsNaturalPenalty } from './calculations/calculateNonHelmetArmorsNaturalPenalty.js';
import { calculateWearArmorNaturalPenalty } from './calculations/calculateWearArmorNaturalPenalty.js';
import { calculateEquippedArmorsPenalty } from './calculations/calculateEquippedArmorsPenalty.js';
export const mutateNaturalPenalty = (data) => {
    const wearArmorNaturalPenalty = calculateWearArmorNaturalPenalty(data);
    let armorsNaturalPenalty = calculateNonHelmetArmorsNaturalPenalty(data);
    if (wearArmorNaturalPenalty > 0) {
        armorsNaturalPenalty += wearArmorNaturalPenalty;
    }
    const equippedArmorsPenalty = calculateEquippedArmorsPenalty(data);
    data.general.modifiers.naturalPenalty.byArmors.value = Math.min(0, armorsNaturalPenalty) + equippedArmorsPenalty;
    data.general.modifiers.naturalPenalty.byWearArmorRequirement.value = Math.min(0, wearArmorNaturalPenalty);
};
