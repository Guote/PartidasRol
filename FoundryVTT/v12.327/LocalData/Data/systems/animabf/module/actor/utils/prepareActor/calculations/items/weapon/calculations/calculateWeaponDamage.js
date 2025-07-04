import { WeaponShotType, WeaponSizeProportion } from "../../../../../../../types/combat/WeaponItemConfig.js";
import { calculateWeaponStrengthModifier } from "../util/calculateWeaponStrengthModifier.js";
const addSizeModifier = (weapon, damage) => {
  if (weapon.system.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
    damage *= 1.5;
    damage = Math.floor(damage / 5) * 5;
  }
  if (weapon.system.sizeProportion.value === WeaponSizeProportion.GIANT) {
    damage *= 2;
  }
  return damage;
};
const calculateWeaponDamage = (weapon, data) => {
  const getDamage = () => {
    const weaponStrengthModifier = calculateWeaponStrengthModifier(weapon, data);
    const extraDamage = data.general.modifiers.extraDamage.value;
    if (weapon.system.isRanged.value && weapon.system.shotType.value === WeaponShotType.SHOT) {
      const { ammo } = weapon.system;
      if (ammo) {
        let ammoDamage = ammo.system.damage.final.value - ammo.system.quality.value * 2;
        ammoDamage = addSizeModifier(weapon, ammoDamage);
        ammoDamage += ammo.system.quality.value * 2;
        return ammoDamage + weaponStrengthModifier + extraDamage;
      }
      return 0;
    }
    return addSizeModifier(weapon, weapon.system.damage.base.value) + weaponStrengthModifier + extraDamage + weapon.system.quality.value * 2;
  };
  return Math.max(getDamage(), 0);
};
export {
  calculateWeaponDamage
};
