export const calculateArmorWearArmorRequirement = (armor) => Math.max(armor.data.wearArmorRequirement.base.value - armor.data.quality.value, 0);
