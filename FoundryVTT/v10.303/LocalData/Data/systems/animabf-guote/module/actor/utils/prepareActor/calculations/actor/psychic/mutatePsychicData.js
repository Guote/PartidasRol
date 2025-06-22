import { bulkMutateData } from "../../../utils/mutateData.js";

export const mutatePsychicData = (data) => {
  bulkMutateData(
    data,
    [
      "psychic.psychicProjection",
      "psychic.psychicProjection.imbalance.offensive",
      "psychic.psychicProjection.imbalance.defensive",
      "psychic.psychicPotential",
    ],
    data.general.modifiers.modFinal.general.final.value,
    0
  );
};
