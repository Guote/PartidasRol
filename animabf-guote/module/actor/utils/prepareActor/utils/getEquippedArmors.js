export const getEquippedArmors = (data) => {
    const combat = data.combat;
    return combat.armors.filter(a => a.data.equipped.value);
};
