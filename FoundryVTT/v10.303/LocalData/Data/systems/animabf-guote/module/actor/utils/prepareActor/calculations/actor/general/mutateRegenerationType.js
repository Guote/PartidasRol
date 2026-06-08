import { calculateRegenerationTypeFromConstitution } from './calculations/calculateRegenerationTypeFromConstitution.js';
import { calculateRegenerationFromRegenerationType } from './calculations/calculateRegenerationFromRegenerationType.js';

const computeEspecial = (rt) => {
  if (rt < 11) return null;
  const parts = ['Sin cicatrices, sin sangrado'];
  if (rt >= 14) parts.push('Muñones se regeneran');
  if (rt >= 16) {
    const bonus = { 16: 20, 17: 40, 18: 100, 19: 200 }[rt] ?? 400;
    parts.push(`+${bonus} ElVylM`);
  }
  return `Especial Regen ${rt}: ${parts.join(', ')}`;
};

export const mutateRegenerationType = data => {
    const { regenerationType } = data.characteristics.secondaries;
    const humanidad = data.flags.humanidad ?? 'human';
    const rawCon = data.characteristics.primaries.constitution.final.value;
    const cappedCon = humanidad === 'zen' ? rawCon : humanidad === 'inhumano' ? Math.min(rawCon, 13) : Math.min(rawCon, 10);
    const baseRegen = calculateRegenerationTypeFromConstitution(cappedCon);
    regenerationType.base = { value: baseRegen };
    regenerationType.final.value = Math.max(0, regenerationType.mod.value + baseRegen);
    // eslint-disable-next-line prefer-const
    let [resting, normal, recovery] = calculateRegenerationFromRegenerationType(regenerationType.final.value);
    data.characteristics.secondaries.regeneration.resting = resting;
    if (normal === null)
        normal = resting;
    data.characteristics.secondaries.regeneration.normal = normal;
    data.characteristics.secondaries.regeneration.recovery = recovery;
    regenerationType.especial = computeEspecial(regenerationType.final.value);
};
