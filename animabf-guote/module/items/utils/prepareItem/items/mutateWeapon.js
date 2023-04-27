import { INITIAL_WEAPON_DATA } from "../../../../types/combat/WeaponItemConfig.js";
import { mutateStrRequired } from "./mutations/mutateStrRequired.js";
import { mutateWeaponStrength } from "./mutations/mutateWeaponStrength.js";
const DERIVED_DATA_FUNCTIONS = [mutateStrRequired, mutateWeaponStrength];
export const mutateWeapon = (item) => {
  item.system = foundry.utils.mergeObject(item.system, INITIAL_WEAPON_DATA, {
    overwrite: false,
  });
  for (const fn of DERIVED_DATA_FUNCTIONS) {
    fn(item.system);
  }
};
