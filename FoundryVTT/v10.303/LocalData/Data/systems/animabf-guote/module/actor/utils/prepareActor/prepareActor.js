import { prepareItems } from "../prepareItems/prepareItems.js";
import { mutateWeaponsData } from "./calculations/items/weapon/mutateWeaponsData.js";
import { mutatePrimaryModifiers } from "./calculations/actor/mutatePrimaryModifiers.js";
import { mutateTotalArmor } from "./calculations/actor/mutateTotalArmor.js";
import { mutateAmmoData } from "./calculations/items/ammo/mutateAmmoData.js";
import { mutateArmorsData } from "./calculations/items/armor/mutateArmorsData.js";
import { mutateNaturalPenalty } from "./calculations/actor/natural-penalty/mutateNaturalPenalty.js";
import { mutateSecondariesData } from "./calculations/actor/secondaries/mutateSecondariesData.js";
import { mutatePenalties } from "./calculations/actor/modifiers/mutatePenalties.js";
import { mutateCombatData } from "./calculations/actor/combat/mutateCombatData.js";
import { mutateMovementType } from "./calculations/actor/general/mutateMovementType.js";
import { mutateMysticData } from "./calculations/actor/mystic/mutateMysticData.js";
import { mutatePsychicData } from "./calculations/actor/psychic/mutatePsychicData.js";
import { mutateDomineData } from "./calculations/actor/domine/mutateDomineData.js";
import { mutateIncarnationOverride } from "./calculations/actor/mystic/mutateIncarnationOverride.js";
import { mutateInitiative } from "./calculations/actor/mutateInitiative.js";
import { mutateRegenerationType } from "./calculations/actor/general/mutateRegenerationType.js";
import { mutateMasaData } from "./calculations/actor/mutateMasaData.js";
import { mutateWeightIndex } from "./calculations/actor/general/mutateWeightIndex.js";
import { mutateResistancesData } from "./calculations/actor/general/mutateResistancesData.js";
// Cache TextEditor.enrichHTML results on the actor instance. Re-enriches only when source text changes.
// ALWAYS use this instead of calling TextEditor.enrichHTML directly — prepareActor runs on every render.
const enrichCached = async (actor, key, source) => {
  if (!actor._enrichCache) actor._enrichCache = {};
  const entry = actor._enrichCache[key];
  if (entry?.src === source) return entry.html;
  const html = await TextEditor.enrichHTML(source ?? '', { async: true });
  actor._enrichCache[key] = { src: source, html };
  return html;
};

// Be careful with order of this functions, some derived data functions could be dependent of another
const DERIVED_DATA_FUNCTIONS = [
  mutateMasaData,
  mutatePrimaryModifiers,
  mutateRegenerationType,
  mutatePenalties,

  mutateMovementType,
  mutateWeightIndex,
  mutateCombatData,
  mutateArmorsData,
  mutateTotalArmor,
  mutateNaturalPenalty,
  mutateSecondariesData,
  mutateResistancesData,
  mutateAmmoData,
  mutateWeaponsData,
  mutateInitiative,
  mutateMysticData,
  mutatePsychicData,
  mutateDomineData,
  mutateIncarnationOverride,
];
export const prepareActor = async (actor) => {
  await prepareItems(actor);
  actor.system.general.description.enriched = await enrichCached(actor, 'description', actor.system.general.description.value ?? '');
  actor.system.general.notesText.enriched = await enrichCached(actor, 'notesText', actor.system.general.notesText.value ?? '');
  actor.system.combat.notes.enriched = await enrichCached(actor, 'combatNotes', actor.system.combat.notes.value ?? '');
  // We need to parse to boolean because Foundry saves booleans as string
  for (const key of Object.keys(actor.system.ui.contractibleItems)) {
    if (typeof actor.system.ui.contractibleItems[key] === "string") {
      actor.system.ui.contractibleItems[key] =
        actor.system.ui.contractibleItems[key] === "true";
    }
  }
  const { system } = actor;
  for (const fn of DERIVED_DATA_FUNCTIONS) {
    await fn(system, actor);
  }
};
