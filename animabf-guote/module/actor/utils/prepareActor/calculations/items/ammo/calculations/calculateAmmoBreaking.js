import { getWeaponBreakingFromStrength } from "../../weapon/util/getWeaponBreakingFromStrength.js";
export const calculateAmmoBreaking = (ammo, data) => {
    const strength = data.characteristics.primaries.strength.value;
    return (ammo.data.breaking.base.value +
        getWeaponBreakingFromStrength(strength) +
        Math.floor((ammo.data.quality.value / 5) * 2));
};
