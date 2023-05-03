export const getEquippedArmors = (system) => {
    const combat = system.combat;
    return combat.armors.filter(a => a.system.equipped.value);
};
