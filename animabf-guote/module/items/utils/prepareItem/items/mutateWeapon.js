import { INITIAL_WEAPON_DATA } from "../../../../types/combat/WeaponItemConfig.js";
import { mutateStrRequired } from "./mutations/mutateStrRequired.js";
import { mutateWeaponStrength } from "./mutations/mutateWeaponStrength.js";
const DERIVED_DATA_FUNCTIONS = [mutateStrRequired, mutateWeaponStrength];
export const mutateWeapon = (item) => {
    item.data.data = foundry.utils.mergeObject(item.data.data, INITIAL_WEAPON_DATA, { overwrite: false });
    const { data } = item.data;
    for (const fn of DERIVED_DATA_FUNCTIONS) {
        fn(data);
    }
};
