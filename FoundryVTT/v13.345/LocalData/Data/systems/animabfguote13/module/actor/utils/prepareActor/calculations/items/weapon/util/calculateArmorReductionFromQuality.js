import { WeaponShotType } from "../../../../../../../types/combat/WeaponItemConfig.js";
const calculateArmorReductionFromQuality = (weapon) => {
  let quality = 0;
  if (weapon) {
    quality = weapon.system.quality.value;
    if (weapon.system.isRanged.value && weapon.system.shotType.value === WeaponShotType.SHOT) {
      quality = weapon.system.ammo?.system.quality.value ?? 0;
    }
  }
  if (quality <= 0) {
    return 0;
  }
  return Math.round(quality / 5);
};
export {
  calculateArmorReductionFromQuality
};
