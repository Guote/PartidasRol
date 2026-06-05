import { calculateTAModifierByQuality } from '../../../../../combat/utils/calculateATReductionByQuality.js';

export const mutateWeaponTAModifier = (data) => {
  data.taModifier.final.value = data.taModifier.base.value + calculateTAModifierByQuality(data.quality.value);
};
