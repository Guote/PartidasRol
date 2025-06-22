import "../../../ABFItem.js";
import { mutateStrRequired } from "./mutations/mutateStrRequired.js";
import { mutateWeaponStrength } from "./mutations/mutateWeaponStrength.js";
const DERIVED_DATA_FUNCTIONS = [mutateStrRequired, mutateWeaponStrength];
const mutateWeapon = async (item) => {
  const { system } = item;
  for (const fn of DERIVED_DATA_FUNCTIONS) {
    await fn(system);
  }
};
export {
  mutateWeapon
};
