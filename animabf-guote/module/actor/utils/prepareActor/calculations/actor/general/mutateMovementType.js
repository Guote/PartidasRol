import { calculateMovementInMetersFromMovementType } from "./calculations/calculateMovementInMetersFromMovementType.js";
import { getEquippedArmors } from "../../../utils/getEquippedArmors.js";
import { calculateNaturalPenaltyWithoutWearArmor } from "../natural-penalty/calculations/calculateWearArmorNaturalPenalty.js";
const calculateArmorsMovementTypeModifier = (system) => {
    const armorsMovementRestrictions = getEquippedArmors(system).reduce((prev, curr) => prev + curr.system.movementRestriction.final.value, 0);
    const totalWearRequirement = calculateNaturalPenaltyWithoutWearArmor(system);
    const wearArmor = system.combat.wearArmor.value;
    const wearArmorModifier = Math.floor(Math.max(0, wearArmor - totalWearRequirement) / 50);
    return Math.min(0, wearArmorModifier + armorsMovementRestrictions);
};
export const mutateMovementType = (system) => {
    const armorsMovementRestrictions = calculateArmorsMovementTypeModifier(system); 
    const { movementType } = system.characteristics.secondaries;
    movementType.final.value =
        movementType.mod.value +
            system.characteristics.primaries.agility.value +
            Math.min(0, Math.ceil(system.general.modifiers.allActions.base.value / 20)) +
            armorsMovementRestrictions;
    movementType.final.value = Math.max(0, movementType.final.value);
    system.characteristics.secondaries.movement.maximum.value = calculateMovementInMetersFromMovementType(movementType.final.value);
    system.characteristics.secondaries.movement.running.value = calculateMovementInMetersFromMovementType(Math.max(0, movementType.final.value - 2));
};
