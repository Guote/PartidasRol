export const calculateArmorPresence = (armor) => Math.max(armor.data.presence.base.value + armor.data.quality.value * 10, 0);
