import { WeaponShotType } from "../../../../../../types/combat/WeaponItemConfig.js";
import { calculateWeaponAttack } from "./calculations/calculateWeaponAttack.js";
import { calculateWeaponBlock } from "./calculations/calculateWeaponBlock.js";
import { calculateWeaponDamage } from "./calculations/calculateWeaponDamage.js";
import { calculateWeaponReload } from "./calculations/calculateWeaponReload.js";
import { calculateWeaponIntegrity } from "./calculations/calculateWeaponIntegrity.js";
import { calculateWeaponBreaking } from "./calculations/calculateWeaponBreaking.js";
import { calculateWeaponPresence } from "./calculations/calculateWeaponPresence.js";
import { calculateWeaponRange } from "./calculations/calculateWeaponRange.js";
import { calculateWeaponInitiative } from "./calculations/calculateWeaponInitiative.js";
const mutateWeaponsData = (data) => {
  const combat = data.combat;
  combat.weapons = combat.weapons.map((weapon) => {
    weapon.system.attack = {
      base: weapon.system.attack.base,
      special: weapon.system.attack.special,
      final: { value: calculateWeaponAttack(weapon, data) },
    };
    weapon.system.block = {
      base: weapon.system.block.base,
      special: weapon.system.block.special,
      final: { value: calculateWeaponBlock(weapon, data) },
    };
    weapon.system.initiative = {
      base: weapon.system.initiative.base,
      final: { value: calculateWeaponInitiative(weapon) },
    };
    weapon.system.damage = {
      base: weapon.system.damage.base,
      final: { value: calculateWeaponDamage(weapon, data) },
    };
    weapon.system.integrity = {
      base: weapon.system.integrity.base,
      final: { value: calculateWeaponIntegrity(weapon) },
    };
    weapon.system.breaking = {
      base: weapon.system.breaking.base,
      final: { value: calculateWeaponBreaking(weapon, data) },
    };
    weapon.system.presence = {
      base: weapon.system.presence.base,
      final: { value: calculateWeaponPresence(weapon) },
    };
    if (weapon.system.isRanged.value) {
      weapon.system.range = {
        base: weapon.system.range.base,
        final: { value: calculateWeaponRange(weapon, data) },
      };
      if (weapon.system.shotType.value === WeaponShotType.SHOT) {
        weapon.system.reload = {
          base: weapon.system.reload.base,
          final: { value: calculateWeaponReload(weapon, data) },
        };
        if (weapon.system.ammo) {
          weapon.system.critic.primary.value =
            weapon.system.ammo.system.critic.value;
        }
      }
    }
    /* if (weapon.system.isSummon.value) {
      weapon.system.summonData = {

      };
    } */
    return weapon;
  });
};
export { mutateWeaponsData };
