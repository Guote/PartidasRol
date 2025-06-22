import { calculateAttributeModifier } from "../util/calculateAttributeModifier.js";
const mutatePrimaryModifiers = (data) => {
  const { primaries } = data.characteristics;
  for (const primaryKey of Object.keys(primaries)) {
    primaries[primaryKey] = {
      value: primaries[primaryKey].value,
      mod: calculateAttributeModifier(primaries[primaryKey].value)
    };
  }
};
export {
  mutatePrimaryModifiers
};
