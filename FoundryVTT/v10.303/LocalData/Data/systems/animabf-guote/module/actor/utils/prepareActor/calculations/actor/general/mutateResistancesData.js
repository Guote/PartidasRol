import { mutateData } from "../../../utils/mutateData.js";

const RESISTANCE_PATHS = [
  "characteristics.secondaries.resistances.physical",
  "characteristics.secondaries.resistances.disease",
  "characteristics.secondaries.resistances.poison",
  "characteristics.secondaries.resistances.magic",
  "characteristics.secondaries.resistances.psychic",
];

export const mutateResistancesData = (data) => {
  for (const path of RESISTANCE_PATHS) {
    mutateData(data, path);
  }
};
