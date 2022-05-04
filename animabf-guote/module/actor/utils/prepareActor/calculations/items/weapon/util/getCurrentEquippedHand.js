import { WeaponEquippedHandType, WeaponManageabilityType } from "../../../../../../../types/combat/WeaponItemConfig.js";
export const getCurrentEquippedHand = (weapon) => {
    switch (weapon.data.manageabilityType.value) {
        case WeaponManageabilityType.ONE_HAND:
            return WeaponEquippedHandType.ONE_HANDED;
        case WeaponManageabilityType.TWO_HAND:
            return WeaponEquippedHandType.TWO_HANDED;
        default:
            return weapon.data.oneOrTwoHanded.value;
    }
};
