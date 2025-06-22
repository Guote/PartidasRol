export const getEquippedWeapons = (data) => {
    const combat = data.combat;
    return combat.weapons.filter(a => a.system.equipped.value);
};
