export const calculateArmorNaturalPenalty = (armor) => Math.min(armor.system.naturalPenalty.base.value + armor.system.quality.value, 0);
