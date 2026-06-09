import { calculateSecondaryStealth } from "./calculations/calculateSecondaryStealth.js";
import { calculateSecondarySwim } from "./calculations/calculateSecondarySwim.js";
import { calculateSecondaryHide } from "./calculations/calculateSecondaryHide.js";
import { calculateSecondaryNotice } from "./calculations/calculateSecondaryNotice.js";
import { calculateSecondarySearch } from "./calculations/calculateSecondarySearch.js";
import { mutateData } from "../../../utils/mutateData.js";

export const mutateSecondariesData = (data) => {
  const { secondaries } = data;
  const generalMod = data.general.modifiers.modFinal.general.final.value ?? 0;
  for (const rawSecondaryKey of Object.keys(secondaries)) {
    const secondaryKey = rawSecondaryKey;
    if (secondaryKey === "secondarySpecialSkills") continue;
    for (const key of Object.keys(secondaries[secondaryKey])) {
      mutateData(
        data,
        `secondaries.${secondaryKey}.${key}`,
        generalMod
      );
    }
  }
  const actorLevel = data.general.level?.value ?? 0;
  for (const skill of (secondaries.secondarySpecialSkills ?? [])) {
    skill.system.base = { value: actorLevel * 10 };
    skill.system.final = { value: actorLevel * 10 + (skill.system.temporal?.value ?? 0) };
  }
};
