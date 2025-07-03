const calculateArmorMovementRestriction = (armor) => Math.min(
  armor.system.movementRestriction.base.value + Math.floor(armor.system.quality.value / 5),
  0
);
export {
  calculateArmorMovementRestriction
};
