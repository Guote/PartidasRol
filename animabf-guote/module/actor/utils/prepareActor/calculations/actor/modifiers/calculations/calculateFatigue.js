export const calculateFatigue = (data) => {
  const currentFatigue = data.characteristics.secondaries.fatigue.value;
  const maxFatigue = data.characteristics.secondaries.fatigue.max;

  let fatigueMod = {
    [0]: -80,
    [1]: -80,
    [2]: -40,
    [3]: -20,
  };

  if (data.flags?.fatigueNone) return 0;

  if (currentFatigue >= maxFatigue) return 0;
  return fatigueMod?.[currentFatigue] ?? 0;
};
