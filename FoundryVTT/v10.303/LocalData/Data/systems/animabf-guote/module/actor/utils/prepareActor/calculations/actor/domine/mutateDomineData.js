import { mutateData } from "../../../utils/mutateData.js";

export const mutateDomineData = async (data) => {
  const allActionsPenalty = data.general.modifiers.allActions.final.value;
  const { domine } = data;
  const KI_ACCUMULATIONS = [
    "strength",
    "agility",
    "dexterity",
    "constitution",
    "willPower",
    "power",
  ];

  for (const accum of KI_ACCUMULATIONS) {
    mutateData(
      data,
      `domine.kiAccumulation.${accum}`,
      Math.floor(data.general.modifiers.modFinal.attack.final.value / 20),
      1
    );
  }
};
