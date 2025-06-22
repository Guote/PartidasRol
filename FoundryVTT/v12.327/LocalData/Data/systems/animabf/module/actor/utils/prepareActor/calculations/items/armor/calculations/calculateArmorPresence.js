const calculateArmorPresence = (armor) => Math.max(armor.system.presence.base.value + armor.system.quality.value * 10, 0);
export {
  calculateArmorPresence
};
