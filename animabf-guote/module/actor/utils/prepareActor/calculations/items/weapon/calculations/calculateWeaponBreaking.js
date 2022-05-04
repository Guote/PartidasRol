import { WeaponSizeProportion } from "../../../../../../../types/combat/WeaponItemConfig.js";
import { getWeaponBreakingFromStrength } from "../util/getWeaponBreakingFromStrength.js";
export const calculateWeaponBreaking = (weapon, data) => {
    const strength = data.characteristics.primaries.strength.value;
    let breaking = weapon.data.breaking.base.value +
        getWeaponBreakingFromStrength(strength) +
        Math.floor((weapon.data.quality.value / 5) * 2);
    if (weapon.data.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
        breaking += 3;
    }
    if (weapon.data.sizeProportion.value === WeaponSizeProportion.ENORMOUS) {
        breaking += 8;
    }
    return breaking;
};
