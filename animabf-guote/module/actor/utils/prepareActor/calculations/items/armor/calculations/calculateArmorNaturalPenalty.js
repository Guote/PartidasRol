export const calculateArmorNaturalPenalty = (armor) => Math.min(armor.data.naturalPenalty.base.value + armor.data.quality.value, 0);
