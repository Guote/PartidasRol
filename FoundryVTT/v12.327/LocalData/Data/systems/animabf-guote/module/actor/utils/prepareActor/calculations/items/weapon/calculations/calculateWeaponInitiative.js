import { WeaponSizeProportion } from "../../../../../../../types/combat/WeaponItemConfig.js";
const calculateWeaponInitiative = (weapon) => {
  if (weapon.system.isSummon?.value) return 20;
  let initiative = weapon.system.initiative.base.value + weapon.system.quality.value;
  if (weapon.system.sizeProportion.value !== WeaponSizeProportion.NORMAL) {
    initiative -= 40;
  }
  return initiative;
};
export { calculateWeaponInitiative };
