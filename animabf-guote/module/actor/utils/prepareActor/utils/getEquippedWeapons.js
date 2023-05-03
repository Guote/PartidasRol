export const getEquippedWeapons = (system) => {
    const combat = system.combat;
    return combat.weapons.filter(a => a.system.equipped.value);
};
