const calculateArmorWearArmorRequirement = (armor) => Math.max(armor.system.wearArmorRequirement.base.value - armor.system.quality.value, 0);
export {
  calculateArmorWearArmorRequirement
};
