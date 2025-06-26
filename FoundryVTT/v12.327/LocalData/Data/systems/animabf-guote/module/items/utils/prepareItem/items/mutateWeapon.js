import { mutateStrRequired } from "./mutations/mutateStrRequired.js";
import { mutateWeaponStrength } from "./mutations/mutateWeaponStrength.js";
import { mutateHAHDifFixed } from "./mutations/mutateHAHDifFixed.js";
const DERIVED_DATA_FUNCTIONS = [
  mutateStrRequired,
  mutateWeaponStrength,
  mutateHAHDifFixed,
];
export const mutateWeapon = async (item) => {
  const { system: data } = item;
  for (const fn of DERIVED_DATA_FUNCTIONS) {
    await fn(data);
  }
};
