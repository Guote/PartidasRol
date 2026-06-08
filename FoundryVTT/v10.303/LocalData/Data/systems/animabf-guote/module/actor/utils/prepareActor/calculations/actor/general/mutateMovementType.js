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

  const humanidad = data.flags.humanidad ?? 'human';
  const rawAgi = data.characteristics.primaries.agility.value;
  const cappedAgi = humanidad === 'zen' ? rawAgi : humanidad === 'inhumano' ? Math.min(rawAgi, 13) : Math.min(rawAgi, 10);

  const { movementType } = data.characteristics.secondaries;
  movementType.final.value =
    movementType.mod.value +
    cappedAgi +
    Math.floor(data.general.modifiers.modFinal.general.final.value / 20) +
    armorsMovementRestrictions +
    activeEffectMod;
  movementType.final.value = Math.max(1, movementType.final.value);

  const baseMeters = calculateMovementInMetersFromMovementType(movementType.final.value);
  data.characteristics.secondaries.movement.maximum.value = baseMeters;
  data.characteristics.secondaries.movement.active = { value: baseMeters * 2 };
  data.characteristics.secondaries.movement.sprint = { value: baseMeters * 3 };
  data.characteristics.secondaries.movement.running.value =
    calculateMovementInMetersFromMovementType(
      Math.max(0, movementType.final.value - 2)
    );

  // Compute per-mode TM (same base without movementType.mod, different mod per mode)
  const tmBase =
    cappedAgi +
    Math.floor(data.general.modifiers.modFinal.general.final.value / 20) +
    armorsMovementRestrictions +
    activeEffectMod;
  const tmModes = data.flags.tmModes ?? [];
  data.characteristics.secondaries.preparedTmModes = tmModes.map(mode => {
    const finalTm = Math.max(0, tmBase + (mode.mod ?? 0));
    const meters = calculateMovementInMetersFromMovementType(finalTm);
    return {
      _id: mode._id,
      label: mode.label ?? '',
      mod: mode.mod ?? 0,
      tm: finalTm,
      meters,
      meters2: meters * 2,
      meters3: meters * 3,
    };
  });
};
