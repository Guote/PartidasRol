const calculateArmorTA = (armor, ta) => Math.max(Math.floor(armor.system.quality.value / 5) + ta, 0);
export {
  calculateArmorTA
};
