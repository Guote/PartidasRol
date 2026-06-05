export const calculateWeightFromWeightIndex = (weightIndex) => {
  if (weightIndex <= 0) return 0;
  if (weightIndex <= 10) return weightIndex * 5;
  if (weightIndex === 11) return 75;
  if (weightIndex === 12) return 100;
  if (weightIndex === 13) return 125;
  // 14+: recursive doubling
  return calculateWeightFromWeightIndex(weightIndex - 1) * 2;
};
