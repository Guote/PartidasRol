import { WeaponSizeProportion } from "../../../../../../../types/combat/WeaponItemConfig.js";
export const calculateWeaponIntegrity = (weapon) => {
    let integrity = weapon.data.integrity.base.value + weapon.data.quality.value * 2;
    if (weapon.data.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
        integrity += 6;
    }
    if (weapon.data.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
        integrity += 16;
    }
    return Math.max(integrity, 0);
};
