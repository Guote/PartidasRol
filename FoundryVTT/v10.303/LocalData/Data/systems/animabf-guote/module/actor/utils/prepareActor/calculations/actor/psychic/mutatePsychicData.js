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
    0,
    0
  );

  const generalNeg = data.general.modifiers.modFinal.generalNegative ?? 0;
  const generalNegHalf = data.general.modifiers.modFinal.generalNegativeHalf ?? 0;

  data.psychic.psychicProjection.imbalance.offensive.withMod = {
    value: (data.psychic.psychicProjection.imbalance.offensive.final.value ?? 0) + generalNeg,
  };
  data.psychic.psychicProjection.imbalance.defensive.withMod = {
    value: (data.psychic.psychicProjection.imbalance.defensive.final.value ?? 0) + generalNeg,
  };
  data.psychic.psychicPotential.withMod = {
    value: (data.psychic.psychicPotential.final.value ?? 0) + generalNegHalf,
  };
};
