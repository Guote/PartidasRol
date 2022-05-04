import { WeaponEquippedHandType } from "../../../../../../../types/combat/WeaponItemConfig.js";
import { getCurrentEquippedHand } from "./getCurrentEquippedHand.js";
import { calculateAttributeModifier } from "../../../util/calculateAttributeModifier.js";
export const calculateWeaponStrengthModifier = (weapon, data) => {
    const hasOnlyOneEquippedHandMultiplier = getCurrentEquippedHand(weapon) === WeaponEquippedHandType.ONE_HANDED;
    const equippedHandMultiplier = hasOnlyOneEquippedHandMultiplier ? 1 : 2;
    if (weapon.data.hasOwnStr.value) {
        return calculateAttributeModifier(weapon.data.weaponStrength.final.value);
    }
    return data.characteristics.primaries.strength.mod * equippedHandMultiplier;
};
