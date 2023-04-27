import { calculateSecondaryStealth } from "./calculations/calculateSecondaryStealth.js";
import { calculateSecondarySwim } from "./calculations/calculateSecondarySwim.js";
import { calculateSecondaryHide } from "./calculations/calculateSecondaryHide.js";
import { calculateSecondaryNotice } from "./calculations/calculateSecondaryNotice.js";
import { calculateSecondarySearch } from "./calculations/calculateSecondarySearch.js";
const SECONDARIES_AFFECTED_BY_ALL_PHYSIC_PENALTIES = ['acrobatics', 'athleticism', 'climb', 'jump'];
const SECONDARIES_AFFECTED_BY_ARMOR_PHYSIC_PENALTY = ['featsOfStrength', 'dance'];
const SECONDARIES_AFFECTED_BY_WEAR_ARMOR_PHYSIC_PENALTY = ['ride', 'piloting'];
export const mutateSecondariesData = (system) => {
    const { secondaries } = system;
    for (const rawSecondaryKey of Object.keys(secondaries)) {
        const secondaryKey = rawSecondaryKey;
        if (secondaryKey === 'secondarySpecialSkills')
            continue;
        for (const key of Object.keys(secondaries[secondaryKey])) {
            const secondary = system.secondaries[secondaryKey][key];
            if (key === 'stealth') {
                secondary.final.value = calculateSecondaryStealth(system);
            }
            else if (key === 'hide') {
                secondary.final.value = calculateSecondaryHide(system);
            }
            else if (key === 'swim') {
                secondary.final.value = calculateSecondarySwim(system);
            }
            else if (key === 'notice') {
                secondary.final.value = calculateSecondaryNotice(system);
            }
            else if (key === 'search') {
                secondary.final.value = calculateSecondarySearch(system);
            }
            else {
                secondary.final.value = secondary.base.value + system.general.modifiers.allActions.final.value;
                if (SECONDARIES_AFFECTED_BY_ALL_PHYSIC_PENALTIES.includes(key)) {
                    secondary.final.value +=
                        system.general.modifiers.physicalActions.value +
                            system.general.modifiers.naturalPenalty.byArmors.value +
                            system.general.modifiers.naturalPenalty.byWearArmorRequirement.value;
                }
                if (SECONDARIES_AFFECTED_BY_ARMOR_PHYSIC_PENALTY.includes(key)) {
                    secondary.final.value +=
                        system.general.modifiers.physicalActions.value + system.general.modifiers.naturalPenalty.byArmors.value;
                }
                if (SECONDARIES_AFFECTED_BY_WEAR_ARMOR_PHYSIC_PENALTY.includes(key)) {
                    secondary.final.value +=
                        system.general.modifiers.physicalActions.value +
                            system.general.modifiers.naturalPenalty.byWearArmorRequirement.value;
                }
            }
        }
    }
};
