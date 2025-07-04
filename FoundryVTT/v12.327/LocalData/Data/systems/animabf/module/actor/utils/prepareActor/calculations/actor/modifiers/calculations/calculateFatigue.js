const calculateFatigue = (data) => {
  if (!data.automationOptions.calculateFatigueModifier.value) return 0;
  const currentFatigue = data.characteristics.secondaries.fatigue.value;
  const maxFatigue = data.characteristics.secondaries.fatigue.max;
  if (currentFatigue >= maxFatigue) return 0;
  switch (currentFatigue) {
    case 0:
      return -120;
    case 1:
      return -80;
    case 2:
      return -40;
    case 3:
      return -20;
    case 4:
      return -10;
    default:
      return 0;
  }
};
export {
  calculateFatigue
};
