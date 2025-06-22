export const getEquippedArmors = (data) => {
    const combat = data.combat;
    return combat.armors.filter(a => a.system.equipped.value);
};
