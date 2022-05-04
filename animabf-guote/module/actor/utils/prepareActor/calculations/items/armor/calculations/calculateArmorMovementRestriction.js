export const calculateArmorMovementRestriction = (armor) => Math.min(armor.data.movementRestriction.base.value + Math.floor(armor.data.quality.value / 5), 0);
