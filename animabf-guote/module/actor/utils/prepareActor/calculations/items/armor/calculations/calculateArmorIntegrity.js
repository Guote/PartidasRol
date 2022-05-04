export const calculateArmorIntegrity = (armor) => {
    return Math.max(armor.data.integrity.base.value + armor.data.quality.value, 0);
};
