import { calculateSecondaryStealth } from "./calculations/calculateSecondaryStealth.js";
import { calculateSecondarySwim } from "./calculations/calculateSecondarySwim.js";
const SECONDARIES_AFFECTED_BY_NATURAL_PENALTIES = [
  "acrobatics",
  "athleticism",
  "climb",
  "jump",
  "dance",
  "hide",
  "featsOfStrength",
];
const ATTRIBUTES_AFFECTED_BY_PHYSICAL_PENALTIES = [
  "agility",
  "dexterity",
  "strength",
  "constitution",
];
const SECONDARIES_AFFECTED_BY_PERCEPTION_PENALTIES = ["search", "notice"];
const mutateSecondariesData = (data) => {
  const { secondaries } = data;
  for (const rawSecondaryKey of Object.keys(secondaries)) {
    const secondaryKey = rawSecondaryKey;
    if (secondaryKey === "secondarySpecialSkills") continue;
    for (const key of Object.keys(secondaries[secondaryKey])) {
      const secondary = data.secondaries[secondaryKey][key];
      secondary.final.value =
        secondary.base.value +
        data.general.modifiers.modFinal.general.final.value;
      /* const secondary = data.secondaries[secondaryKey][key];
      if (key === "stealth") {
        secondary.final.value = calculateSecondaryStealth(data);
      } else if (key === "swim") {
        secondary.final.value = calculateSecondarySwim(data);
      } else {
        secondary.final.value = secondary.base.value + data.general.modifiers.allActions.final.value;
        if (SECONDARIES_AFFECTED_BY_NATURAL_PENALTIES.includes(key)) {
          secondary.final.value += data.general.modifiers.naturalPenalty.final.value;
        }
        if (SECONDARIES_AFFECTED_BY_PERCEPTION_PENALTIES.includes(key)) {
          secondary.final.value += data.general.modifiers.perceptionPenalty.final.value;
        }
        if (ATTRIBUTES_AFFECTED_BY_PHYSICAL_PENALTIES.includes(secondary.attribute.value)) {
          secondary.final.value += data.general.modifiers.physicalActions.final.value;
        }
      } */
    }
  }
};
export { mutateSecondariesData };
