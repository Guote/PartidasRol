import { WeaponSize } from '../../../../../types/combat/WeaponItemConfig.js';
import { mutateData } from '../../utils/mutateData.js';
export const mutateInitiative = (data) => {
    const combat = data.combat;
    const { general } = data;
    const penalty = Math.ceil(Math.min(general.modifiers.allActions.final.value + general.modifiers.physicalActions.value, 0) / 2) + general.modifiers.naturalPenalty.byArmors.value;
    const { initiative } = data.characteristics.secondaries;

    const activeEffectMod = data?.activeEffects?.characteristics?.secondaries?.initiative?.final?.value ?? 0
    
    mutateData(
      data,
      "characteristics.secondaries.initiative"
    );
    
    const equippedWeapons = combat.weapons.filter(weapon => weapon.system.isShown?.value);
    const equippedShield = equippedWeapons.find(weapon => weapon.system.isShield.value);
    const desarmadoWeapon = combat.weapons.find(w => w.system?.isDefault?.value);
    const unarmedBonus = desarmadoWeapon?.system?.initiative?.final?.value ?? 20;

    // We subtract 20 because people are used to put as base unarmed initiative
    initiative.final.value -= 20;
    if (equippedShield) {
        if (equippedShield.system.size.value === WeaponSize.SMALL) {
            initiative.final.value -= 15;
        }
        else if (equippedShield.system.size.value === WeaponSize.MEDIUM) {
            initiative.final.value -= 25;
        }
        else {
            initiative.final.value -= 40;
        }
    }
    const equippedNonShieldWeapons = equippedWeapons.filter(
        w => !w.system.isShield.value && !w.system?.isDefault?.value
    );
    if (equippedNonShieldWeapons.length === 0) {
        initiative.final.value += unarmedBonus;
    } else {
        const minWeaponInit = Math.min(...equippedNonShieldWeapons.map(w => w.system.initiative.final.value));
        initiative.final.value += minWeaponInit;
    }
    initiative.final.value += data.general.modifiers.modFinal.initiative ?? 0;
};
