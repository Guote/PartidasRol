import { calculateMovementInMetersFromMovementType } from "./calculations/calculateMovementInMetersFromMovementType.js";
import { getEquippedArmors } from "../../../utils/getEquippedArmors.js";
import { calculateNaturalPenaltyWithoutWearArmor } from "../natural-penalty/calculations/calculateWearArmorNaturalPenalty.js";
import { mutateData } from "../../../utils/mutateData.js";
const calculateArmorsMovementTypeModifier = (data) => {
  const armorsMovementRestrictions = getEquippedArmors(data).reduce(
    (prev, curr) => prev + curr.system.movementRestriction.final.value,
    0
  );
  const totalWearRequirement = calculateNaturalPenaltyWithoutWearArmor(data);
  const wearArmor = data.combat.wearArmor.value;
  const wearArmorModifier = Math.floor(
    Math.max(0, wearArmor - totalWearRequirement) / 50
  );
  return Math.min(0, wearArmorModifier + armorsMovementRestrictions);
};
export const mutateMovementType = (data) => {
  const activeEffectMod =
    data?.activeEffects?.characteristics?.secondaries?.movementType?.final
      ?.value ?? 0;

  const armorsMovementRestrictions = calculateArmorsMovementTypeModifier(data);

  const { movementType } = data.characteristics.secondaries;
  movementType.final.value =
    movementType.mod.value +
    data.characteristics.primaries.agility.value +
    Math.floor(data.general.modifiers.modFinal.general.final.value / 20) +
    armorsMovementRestrictions +
    activeEffectMod;
  movementType.final.value = Math.max(0, movementType.final.value);

  data.characteristics.secondaries.movement.maximum.value =
    calculateMovementInMetersFromMovementType(movementType.final.value);
  data.characteristics.secondaries.movement.running.value =
    calculateMovementInMetersFromMovementType(
      Math.max(0, movementType.final.value - 2)
    );
};
