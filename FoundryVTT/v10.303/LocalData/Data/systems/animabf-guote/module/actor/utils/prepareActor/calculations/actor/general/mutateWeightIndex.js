import { calculateWeightFromWeightIndex } from './calculations/calculateWeightFromWeightIndex.js';

export const mutateWeightIndex = (data) => {
  const humanidad = data.flags.humanidad ?? 'human';
  const rawFue = data.characteristics.primaries.strength.value;
  const cappedFue = humanidad === 'zen' ? rawFue : humanidad === 'inhumano' ? Math.min(rawFue, 13) : Math.min(rawFue, 10);

  const { weightIndex } = data.characteristics.secondaries;
  const generalMod = Math.floor((data.general.modifiers.modFinal.general.final.value ?? 0) / 20);
  weightIndex.final.value = Math.max(0, cappedFue + (weightIndex.mod?.value ?? 0) + generalMod);
  const maxWeight = calculateWeightFromWeightIndex(weightIndex.final.value);
  data.characteristics.secondaries.weightLoad.max.value = maxWeight;
  data.characteristics.secondaries.weightLoad.medium = { value: maxWeight * 2 };
  data.characteristics.secondaries.weightLoad.heavy = { value: maxWeight * 4 };
};
