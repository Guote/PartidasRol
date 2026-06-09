import { calculateAttributeModifier } from '../util/calculateAttributeModifier.js';

const calcStatRollBase = (statFinal, level, humanidad) => {
  let effectiveBonus;
  if (humanidad === 'zen') {
    effectiveBonus = statFinal * 10;
  } else if (humanidad === 'inhumano') {
    effectiveBonus = Math.min(statFinal, 13) * 10;
  } else {
    effectiveBonus = Math.min(statFinal, 10) * 10;
  }
  let extra = 0;
  if (statFinal > 13 && humanidad === 'zen') extra = 80;
  else if (statFinal > 10 && (humanidad === 'inhumano' || humanidad === 'zen')) extra = 40;
  return effectiveBonus + extra + level * 10;
};

export const mutatePrimaryModifiers = (data) => {
    const { primaries } = data.characteristics;
    const humanidad = data.flags?.humanidad ?? 'human';
    const level = data.general.level?.value ?? 0;
    for (const primaryKey of Object.keys(primaries)) {
        const base = primaries[primaryKey].value;
        const temporal = primaries[primaryKey].temporal?.value ?? 0;
        const final = base + temporal;
        primaries[primaryKey] = {
            value: base,
            temporal: { value: temporal },
            final: { value: final },
            mod: calculateAttributeModifier(final),
            rollBase: { value: calcStatRollBase(final, level, humanidad) },
        };
    }
};

export const mutatePrimaryRollBases = (data) => {
  const generalMod = data.general.modifiers.modFinal.general.final.value ?? 0;
  if (generalMod === 0) return;
  const { primaries } = data.characteristics;
  for (const primaryKey of Object.keys(primaries)) {
    if (primaries[primaryKey]?.rollBase?.value !== undefined) {
      primaries[primaryKey].rollBase.value += generalMod;
    }
  }
};
