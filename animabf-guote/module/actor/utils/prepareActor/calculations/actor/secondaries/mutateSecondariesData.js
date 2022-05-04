import { calculateSecondaryStealth } from "./calculations/calculateSecondaryStealth.js";
import { calculateSecondarySwim } from "./calculations/calculateSecondarySwim.js";
import { calculateSecondaryHide } from "./calculations/calculateSecondaryHide.js";
import { calculateSecondaryNotice } from "./calculations/calculateSecondaryNotice.js";
import { calculateSecondarySearch } from "./calculations/calculateSecondarySearch.js";
const SECONDARIES_AFFECTED_BY_ALL_PHYSIC_PENALTIES = ['acrobatics', 'athleticism', 'climb', 'jump'];
const SECONDARIES_AFFECTED_BY_ARMOR_PHYSIC_PENALTY = ['featsOfStrength', 'dance'];
const SECONDARIES_AFFECTED_BY_WEAR_ARMOR_PHYSIC_PENALTY = ['ride', 'piloting'];
export const mutateSecondariesData = (data) => {
    const { secondaries } = data;
    for (const rawSecondaryKey of Object.keys(secondaries)) {
        const secondaryKey = rawSecondaryKey;
        if (secondaryKey === 'secondarySpecialSkills')
            continue;
        for (const key of Object.keys(secondaries[secondaryKey])) {
            const secondary = data.secondaries[secondaryKey][key];
            if (key === 'stealth') {
                secondary.final.value = calculateSecondaryStealth(data);
            }
            else if (key === 'hide') {
                secondary.final.value = calculateSecondaryHide(data);
            }
            else if (key === 'swim') {
                secondary.final.value = calculateSecondarySwim(data);
            }
            else if (key === 'notice') {
                secondary.final.value = calculateSecondaryNotice(data);
            }
            else if (key === 'search') {
                secondary.final.value = calculateSecondarySearch(data);
            }
            else {
                secondary.final.value = secondary.base.value + data.general.modifiers.allActions.final.value;
                if (SECONDARIES_AFFECTED_BY_ALL_PHYSIC_PENALTIES.includes(key)) {
                    secondary.final.value +=
                        data.general.modifiers.physicalActions.value +
                            data.general.modifiers.naturalPenalty.byArmors.value +
                            data.general.modifiers.naturalPenalty.byWearArmorRequirement.value;
                }
                if (SECONDARIES_AFFECTED_BY_ARMOR_PHYSIC_PENALTY.includes(key)) {
                    secondary.final.value +=
                        data.general.modifiers.physicalActions.value + data.general.modifiers.naturalPenalty.byArmors.value;
                }
                if (SECONDARIES_AFFECTED_BY_WEAR_ARMOR_PHYSIC_PENALTY.includes(key)) {
                    secondary.final.value +=
                        data.general.modifiers.physicalActions.value +
                            data.general.modifiers.naturalPenalty.byWearArmorRequirement.value;
                }
            }
        }
    }
};
