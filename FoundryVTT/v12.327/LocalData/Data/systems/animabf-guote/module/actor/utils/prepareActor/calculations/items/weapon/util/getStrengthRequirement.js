import { WeaponEquippedHandType, WeaponManageabilityType } from "../../../../../../../types/combat/WeaponItemConfig.js";
const getStrengthRequirement = (weapon) => {
  switch (weapon.system.manageabilityType.value) {
    case WeaponManageabilityType.ONE_HAND:
      return weapon.system.strRequired.oneHand.final.value;
    case WeaponManageabilityType.TWO_HAND:
      return weapon.system.strRequired.twoHands.final.value;
    default:
      if (weapon.system.oneOrTwoHanded.value === WeaponEquippedHandType.ONE_HANDED) {
        return weapon.system.strRequired.oneHand.final.value;
      }
      return weapon.system.strRequired.twoHands.final.value;
  }
};
export {
  getStrengthRequirement
};
