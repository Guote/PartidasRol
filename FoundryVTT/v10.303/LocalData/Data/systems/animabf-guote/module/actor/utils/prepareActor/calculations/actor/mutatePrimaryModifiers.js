import { calculateAttributeModifier } from '../util/calculateAttributeModifier.js';

export const mutatePrimaryModifiers = (data) => {
    const { primaries } = data.characteristics;
    for (const primaryKey of Object.keys(primaries)) {
        const base = primaries[primaryKey].value;
        const temporal = primaries[primaryKey].temporal?.value ?? 0;
        const final = base + temporal;
        primaries[primaryKey] = {
            value: base,
            temporal: { value: temporal },
            final: { value: final },
            mod: calculateAttributeModifier(final),
        };
    }
};
