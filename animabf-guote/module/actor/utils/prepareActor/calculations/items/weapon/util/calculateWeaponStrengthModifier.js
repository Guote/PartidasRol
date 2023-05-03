import { WeaponEquippedHandType } from "../../../../../../../types/combat/WeaponItemConfig.js";
import { getCurrentEquippedHand } from "./getCurrentEquippedHand.js";
import { calculateAttributeModifier } from "../../../util/calculateAttributeModifier.js";
export const calculateWeaponStrengthModifier = (weapon, system) => {
    const hasOnlyOneEquippedHandMultiplier = getCurrentEquippedHand(weapon) === WeaponEquippedHandType.ONE_HANDED;
    const equippedHandMultiplier = hasOnlyOneEquippedHandMultiplier ? 1 : 2;
    if (weapon.system.hasOwnStr.value) {
        return calculateAttributeModifier(weapon.system.weaponStrength.final.value);
    }
    return system.characteristics.primaries.strength.mod * equippedHandMultiplier;
};
