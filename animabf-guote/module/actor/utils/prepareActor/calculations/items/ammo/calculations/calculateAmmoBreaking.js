import { getWeaponBreakingFromStrength } from "../../weapon/util/getWeaponBreakingFromStrength.js";
export const calculateAmmoBreaking = (ammo, data) => {
    const strength = data.characteristics.primaries.strength.value;
    return (ammo.system.breaking.base.value +
        getWeaponBreakingFromStrength(strength) +
        Math.floor((ammo.system.quality.value / 5) * 2));
};
