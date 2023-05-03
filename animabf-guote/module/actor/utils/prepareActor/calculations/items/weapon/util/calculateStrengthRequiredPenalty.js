import { getStrengthRequirement } from "./getStrengthRequirement.js";
export const calculateStrengthRequiredPenalty = (weapon, system) => {
    const actorStrength = system.characteristics.primaries.strength.value;
    const strengthDifference = getStrengthRequirement(weapon) - actorStrength;
    return strengthDifference > 0 ? -(strengthDifference * 10) : 0;
};
