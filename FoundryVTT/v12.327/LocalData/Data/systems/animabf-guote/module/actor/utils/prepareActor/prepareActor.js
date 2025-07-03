import { prepareItems } from "../prepareItems/prepareItems.js";
import { mutateWeaponsData } from "./calculations/items/weapon/mutateWeaponsData.js";
import { mutatePrimaryModifiers } from "./calculations/actor/mutatePrimaryModifiers.js";
import { mutateTotalArmor } from "./calculations/actor/mutateTotalArmor.js";
import { mutateAmmoData } from "./calculations/items/ammo/mutateAmmoData.js";
import { mutateArmorsData } from "./calculations/items/armor/mutateArmorsData.js";
import { mutateNaturalPenalty } from "./calculations/actor/modifiers/mutateNaturalPenalty.js";
import { mutatePhysicalModifier } from "./calculations/actor/modifiers/mutatePhysicalModifier.js";
import { mutatePerceptionPenalty } from "./calculations/actor/modifiers/mutatePerceptionPenalty.js";
import { mutateAllActionsModifier } from "./calculations/actor/modifiers/mutateAllActionsModifier.js";
import { mutateSecondariesData } from "./calculations/actor/secondaries/mutateSecondariesData.js";
import { mutateCombatData } from "./calculations/actor/combat/mutateCombatData.js";
import { mutateMovementType } from "./calculations/actor/general/mutateMovementType.js";
import { mutateMysticData } from "./calculations/actor/mystic/mutateMysticData.js";
import { mutatePsychicData } from "./calculations/actor/psychic/mutatePsychicData.js";
import { mutateDomineData } from "./calculations/actor/domine/mutateDomineData.js";
import { mutateInitiative } from "./calculations/actor/mutateInitiative.js";
import { mutateRegenerationType } from "./calculations/actor/general/mutateRegenerationType.js";
const DERIVED_DATA_FUNCTIONS = [
  mutatePrimaryModifiers,
  mutateRegenerationType,
  mutateAllActionsModifier,
  mutateArmorsData,
  mutateTotalArmor,
  mutateNaturalPenalty,
  mutatePhysicalModifier,
  mutatePerceptionPenalty,
  mutateCombatData,
  mutateMovementType,
  mutateSecondariesData,
  mutateAmmoData,
  mutateWeaponsData,
  mutateInitiative,
  mutateMysticData,
  mutatePsychicData,
  mutateDomineData
];
const prepareActor = async (actor) => {
  await prepareItems(actor);
  actor.system.general.description.enriched = await TextEditor.enrichHTML(
    actor.system.general.description.value,
    { async: true }
  );
  for (const key of Object.keys(actor.system.ui.contractibleItems)) {
    if (typeof actor.system.ui.contractibleItems[key] === "string") {
      actor.system.ui.contractibleItems[key] = actor.system.ui.contractibleItems[key] === "true";
    }
  }
  const { system } = actor;
  for (const fn of DERIVED_DATA_FUNCTIONS) {
    await fn(system);
  }
};
export {
  prepareActor
};
