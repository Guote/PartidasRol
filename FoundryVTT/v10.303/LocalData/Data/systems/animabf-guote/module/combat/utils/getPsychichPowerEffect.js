export const getPsychichPowerEffect = (power, rollTotal) => {
  let difficultyMet =
    Math.max(
      ...[0, 20, 40, 80, 120, 140, 180, 240, 280, 320, 440].filter(
        (key) => key < rollTotal
      )
    ) ?? 0;
  let powerEffect = power?.effects?.[difficultyMet]?.value;

  return powerEffect;
};
