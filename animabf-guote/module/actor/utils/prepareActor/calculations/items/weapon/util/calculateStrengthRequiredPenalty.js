import { getStrengthRequirement } from "./getStrengthRequirement.js";
export const calculateStrengthRequiredPenalty = (weapon, data) => {
    const actorStrength = data.characteristics.primaries.strength.value;
    const strengthDifference = getStrengthRequirement(weapon) - actorStrength;
    return strengthDifference > 0 ? -(strengthDifference * 10) : 0;
};
