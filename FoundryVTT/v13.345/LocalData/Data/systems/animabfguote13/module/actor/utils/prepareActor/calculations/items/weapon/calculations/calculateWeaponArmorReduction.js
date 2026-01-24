import "../../../../../../../types/combat/WeaponItemConfig.js";
const calculateWeaponArmorReduction = (weapon) => {
  let reducedArmor = weapon.system.reducedArmor.base.value + weapon.system.reducedArmor.special.value;
  return reducedArmor;
};
export {
  calculateWeaponArmorReduction
};
