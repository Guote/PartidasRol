import { WeaponShotType, NoneWeaponCritic, WeaponCritic, DamageType } from "../module/types/combat/WeaponItemConfig.js";
function registerGlobalTypes() {
  game.animabf = game.animabf || {};
  game.animabf.weapon = {
    WeaponCritic,
    NoneWeaponCritic,
    WeaponShotType
  };
  game.animabf.combat = {
    DamageType
  };
}
export {
  registerGlobalTypes
};
