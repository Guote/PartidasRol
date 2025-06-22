export const getMassAttackBonus = (numberOfAttacks = 0) => {
  const massAttackBonus = {
    0: 0,
    3: 30,
    5: 50,
    10: 70,
    15: 90,
    25: 110,
    50: 130,
    100: 150,
  };

  let lastMatch = 0;
  let keys = Object.keys(massAttackBonus).sort((a, b) => a - b);
  for (let key of keys) {
    if (numberOfAttacks >= key) lastMatch = key;
    if (key > numberOfAttacks) break;
  }

  return massAttackBonus[lastMatch] ?? 0;
};
