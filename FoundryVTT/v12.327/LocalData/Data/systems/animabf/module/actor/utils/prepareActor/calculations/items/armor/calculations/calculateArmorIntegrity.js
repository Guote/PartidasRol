const calculateArmorIntegrity = (armor) => {
  return Math.max(armor.system.integrity.base.value + armor.system.quality.value, 0);
};
export {
  calculateArmorIntegrity
};
