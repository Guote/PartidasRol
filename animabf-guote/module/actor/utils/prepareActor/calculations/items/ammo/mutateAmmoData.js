import { INITIAL_AMMO_DATA } from "../../../../../../types/combat/AmmoItemConfig.js";
import { calculateAmmoPresence } from "./calculations/calculateAmmoPresence.js";
import { calculateAmmoIntegrity } from "./calculations/calculateAmmoIntegrity.js";
import { calculateAmmoBreaking } from "./calculations/calculateAmmoBreaking.js";
import { calculateAmmoDamage } from "./calculations/calculateAmmoDamage.js";
export const mutateAmmoData = (data) => {
    const combat = data.combat;
    combat.ammo = combat.ammo
        .map(ammo => {
        ammo.data = foundry.utils.mergeObject(ammo.data, INITIAL_AMMO_DATA, { overwrite: false });
        return ammo;
    })
        .map(ammo => {
        ammo.data.damage.final.value = calculateAmmoDamage(ammo);
        ammo.data.presence.final.value = calculateAmmoPresence(ammo);
        ammo.data.integrity.final.value = calculateAmmoIntegrity(ammo);
        ammo.data.breaking.final.value = calculateAmmoBreaking(ammo, data);
        return ammo;
    });
};
