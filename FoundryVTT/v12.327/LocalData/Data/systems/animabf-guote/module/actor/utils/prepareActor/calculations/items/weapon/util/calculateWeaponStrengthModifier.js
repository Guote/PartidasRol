import { WeaponEquippedHandType } from "../../../../../../../types/combat/WeaponItemConfig.js";
import { getCurrentEquippedHand } from "./getCurrentEquippedHand.js";
import { calculateAttributeModifier } from "../../../util/calculateAttributeModifier.js";
const calculateWeaponStrengthModifier = (weapon, data) => {
  const hasOnlyOneEquippedHandMultiplier = getCurrentEquippedHand(weapon) === WeaponEquippedHandType.ONE_HANDED;
  const equippedHandMultiplier = hasOnlyOneEquippedHandMultiplier ? 1 : 2;
  if (weapon.system.hasOwnStr?.value) {
    return calculateAttributeModifier(weapon.system.weaponStrength.final.value);
  }
  return data.characteristics.primaries.strength.mod * equippedHandMultiplier;
};
export {
  calculateWeaponStrengthModifier
};
