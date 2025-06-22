const roundCounterAttack = (value) => Math.floor(value / 5) * 5;
const calculateCounterAttackBonus = (attack, defense) => {
  return Math.min(roundCounterAttack((defense - attack) / 2), 150);
};
export {
  calculateCounterAttackBonus
};
