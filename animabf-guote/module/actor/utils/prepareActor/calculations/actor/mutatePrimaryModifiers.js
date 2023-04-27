import { calculateAttributeModifier } from "../util/calculateAttributeModifier.js";
/**
 * Adds to primary characteristics object without modifiers its modifiers,
 * calculated based on its value
 * @param system
 */
export const mutatePrimaryModifiers = (system) => {
    const { primaries } = system.characteristics;
    for (const primaryKey of Object.keys(primaries)) {
        primaries[primaryKey] = {
            value: primaries[primaryKey].value,
            mod: calculateAttributeModifier(primaries[primaryKey].value)
        };
    }
};
