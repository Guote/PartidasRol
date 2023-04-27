import { INITIAL_WEAPON_DATA, WeaponShotType } from "../../../../../../types/combat/WeaponItemConfig.js";
import { calculateWeaponAttack } from "./calculations/calculateWeaponAttack.js";
import { calculateWeaponBlock } from "./calculations/calculateWeaponBlock.js";
import { calculateWeaponDamage } from "./calculations/calculateWeaponDamage.js";
import { calculateWeaponReload } from "./calculations/calculateWeaponReload.js";
import { calculateWeaponIntegrity } from "./calculations/calculateWeaponIntegrity.js";
import { calculateWeaponBreaking } from "./calculations/calculateWeaponBreaking.js";
import { calculateWeaponPresence } from "./calculations/calculateWeaponPresence.js";
import { calculateWeaponRange } from "./calculations/calculateWeaponRange.js";
import { calculateWeaponInitiative } from "./calculations/calculateWeaponInitiative.js";
export const mutateWeaponsData = (system) => {
    const combat = system.combat;
    combat.weapons = combat.weapons
        .map(weapon => {
        weapon.system = foundry.utils.mergeObject(weapon.system, INITIAL_WEAPON_DATA, { overwrite: false });
        return weapon;
    })
        .map(weapon => {
        weapon.system.attack.final.value = calculateWeaponAttack(weapon, system);
        weapon.system.block.final.value = calculateWeaponBlock(weapon, system);
        weapon.system.initiative.final.value = calculateWeaponInitiative(weapon);
        weapon.system.damage.final.value = calculateWeaponDamage(weapon, system);
        weapon.system.integrity.final.value = calculateWeaponIntegrity(weapon);
        weapon.system.breaking.final.value = calculateWeaponBreaking(weapon, system);
        weapon.system.presence.final.value = calculateWeaponPresence(weapon);
        if (weapon.system.isRanged.value) {
            weapon.system.range.final.value = calculateWeaponRange(weapon, system);
            if (weapon.system.shotType.value === WeaponShotType.SHOT) {
                weapon.system.reload.final.value = calculateWeaponReload(weapon, system);
                if (weapon.system.ammo) {
                    weapon.system.critic.primary.value = weapon.system.ammo.system.critic.value;
                }
            }
        }
        return weapon;
    });
};
