import { WeaponSizeProportion } from '../../../../../../../types/combat/WeaponItemConfig.js';
export const calculateWeaponIntegrity = (weapon) => {
    let integrity = weapon.system.integrity.base.value + weapon.system.quality.value * 2;
    if (weapon.system.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
        integrity += 6;
    }
    if (weapon.system.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
        integrity += 16;
    }
    return Math.max(integrity, 0);
};
