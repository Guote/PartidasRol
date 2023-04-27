import { calculateRegenerationTypeFromConstitution } from "./calculations/calculateRegenerationTypeFromConstitution.js";
import { calculateRegenerationFromRegenerationType } from "./calculations/calculateRegenerationFromRegenerationType.js";
export const mutateRegenerationType = (system) => {
    const { regenerationType } = system.characteristics.secondaries;
    let baseRegen = calculateRegenerationTypeFromConstitution(system.characteristics.primaries.constitution.value);
    regenerationType.final.value =
        Math.max(0, regenerationType.mod.value + baseRegen);
    let [resting, normal, recovery] = calculateRegenerationFromRegenerationType(regenerationType.final.value);
    system.characteristics.secondaries.regeneration.resting = resting;
    if (normal === null)
        normal = resting;
    system.characteristics.secondaries.regeneration.normal = normal;
    system.characteristics.secondaries.regeneration.recovery = recovery;
};
