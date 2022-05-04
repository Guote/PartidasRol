export const getEquippedWeapons = (data) => {
    const combat = data.combat;
    return combat.weapons.filter(a => a.data.equipped.value);
};
