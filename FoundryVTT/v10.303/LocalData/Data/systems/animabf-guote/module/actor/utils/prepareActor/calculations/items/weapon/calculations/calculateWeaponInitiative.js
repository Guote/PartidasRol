import { WeaponSizeProportion } from '../../../../../../../types/combat/WeaponItemConfig.js';
export const calculateWeaponInitiative = (weapon) => {
    if (weapon.system.isSummon?.value) return 20
    let initiative = weapon.system.initiative.base.value + weapon.system.quality.value;
    // This depends on the size of the character but right now is not automatized
    if (weapon.system.sizeProportion.value !== WeaponSizeProportion.NORMAL) {
        initiative -= 40;
    }
    return initiative;
};
