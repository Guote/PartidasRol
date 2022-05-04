export const calculateDamage = (attack, defense, at, damage) => {
    const damageRoundedToCeil10Multiplier = Math.ceil(damage / 10) * 10;
    const combatResult = Math.floor((attack - (defense + at * 10 )) / 10) * 10;
    const dealDamage = (damageRoundedToCeil10Multiplier * combatResult) / 100;
    return Math.max(dealDamage, 0);
};
