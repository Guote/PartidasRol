import { INITIAL_AMMO_DATA } from "../../../../../../types/combat/AmmoItemConfig.js";
import { calculateAmmoPresence } from "./calculations/calculateAmmoPresence.js";
import { calculateAmmoIntegrity } from "./calculations/calculateAmmoIntegrity.js";
import { calculateAmmoBreaking } from "./calculations/calculateAmmoBreaking.js";
import { calculateAmmoDamage } from "./calculations/calculateAmmoDamage.js";
const mutateAmmoData = (data) => {
  const combat = data.combat;
  combat.ammo = combat.ammo.map((ammo) => {
    ammo.system = foundry.utils.mergeObject(ammo.system, INITIAL_AMMO_DATA, {
      overwrite: false
    });
    return ammo;
  }).map((ammo) => {
    ammo.system.damage.final.value = calculateAmmoDamage(ammo);
    ammo.system.presence.final.value = calculateAmmoPresence(ammo);
    ammo.system.integrity.final.value = calculateAmmoIntegrity(ammo);
    ammo.system.breaking.final.value = calculateAmmoBreaking(ammo, data);
    return ammo;
  });
};
export {
  mutateAmmoData
};
