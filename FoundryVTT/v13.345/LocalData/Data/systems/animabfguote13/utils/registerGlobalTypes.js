import { WeaponShotType, NoneWeaponCritic, WeaponCritic, DamageType } from "../module/types/combat/WeaponItemConfig.js";
function registerGlobalTypes() {
  game.animabfguote13 = game.animabfguote13 || {};
  game.animabfguote13.weapon = {
    WeaponCritic,
    NoneWeaponCritic,
    WeaponShotType
  };
  game.animabfguote13.combat = {
    DamageType
  };
}
export {
  registerGlobalTypes
};
