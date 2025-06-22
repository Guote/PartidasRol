import { prepareItems } from '../prepareItems/prepareItems.js';
import { mutateWeaponsData } from './calculations/items/weapon/mutateWeaponsData.js';
import { mutatePrimaryModifiers } from './calculations/actor/mutatePrimaryModifiers.js';
import { mutateTotalArmor } from './calculations/actor/mutateTotalArmor.js';
import { mutateAmmoData } from './calculations/items/ammo/mutateAmmoData.js';
import { mutateArmorsData } from './calculations/items/armor/mutateArmorsData.js';
import { mutateNaturalPenalty } from './calculations/actor/natural-penalty/mutateNaturalPenalty.js';
import { mutateSecondariesData } from './calculations/actor/secondaries/mutateSecondariesData.js';
import { mutatePenalties } from './calculations/actor/modifiers/mutatePenalties.js';
import { mutateCombatData } from './calculations/actor/combat/mutateCombatData.js';
import { mutateMovementType } from './calculations/actor/general/mutateMovementType.js';
import { mutateMysticData } from './calculations/actor/mystic/mutateMysticData.js';
import { mutatePsychicData } from './calculations/actor/psychic/mutatePsychicData.js';
import { mutateDomineData } from './calculations/actor/domine/mutateDomineData.js';
import { mutateInitiative } from './calculations/actor/mutateInitiative.js';
import { mutateRegenerationType } from './calculations/actor/general/mutateRegenerationType.js';
// Be careful with order of this functions, some derived data functions could be dependent of another
const DERIVED_DATA_FUNCTIONS = [
    mutatePrimaryModifiers,
    mutateMovementType,
    mutateRegenerationType,
    mutatePenalties,
    mutateCombatData,
    mutateArmorsData,
    mutateTotalArmor,
    mutateNaturalPenalty,
    mutateSecondariesData,
    mutateAmmoData,
    mutateWeaponsData,
    mutateInitiative,
    mutateMysticData,
    mutatePsychicData,
    mutateDomineData
];
export const prepareActor = async (actor) => {
    await prepareItems(actor);
    actor.system.general.description.enriched = await TextEditor.enrichHTML(actor.system.general.description.value, { async: true });
    // We need to parse to boolean because Foundry saves booleans as string
    for (const key of Object.keys(actor.system.ui.contractibleItems)) {
        if (typeof actor.system.ui.contractibleItems[key] === 'string') {
            actor.system.ui.contractibleItems[key] =
                actor.system.ui.contractibleItems[key] === 'true';
        }
    }
    const { system } = actor;
    for (const fn of DERIVED_DATA_FUNCTIONS) {
        await fn(system);
    }
};
