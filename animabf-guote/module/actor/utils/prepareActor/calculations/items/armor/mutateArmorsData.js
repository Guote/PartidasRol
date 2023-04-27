import { INITIAL_ARMOR_DATA } from "../../../../../../types/combat/ArmorItemConfig.js";
import { calculateArmorIntegrity } from "./calculations/calculateArmorIntegrity.js";
import { calculateArmorPresence } from "./calculations/calculateArmorPresence.js";
import { calculateArmorTA } from "./calculations/calculateArmorTA.js";
import { calculateArmorMovementRestriction } from "./calculations/calculateArmorMovementRestriction.js";
import { calculateArmorNaturalPenalty } from "./calculations/calculateArmorNaturalPenalty.js";
import { calculateArmorWearArmorRequirement } from "./calculations/calculateArmorWearArmorRequirement.js";
export const mutateArmorsData = (system) => {
    const combat = system.combat;
    combat.armors = combat.armors
        .map(armor => {
        armor.system = foundry.utils.mergeObject(armor.system, INITIAL_ARMOR_DATA, { overwrite: false });
        return armor;
    })
        .map(armor => {
        armor.system.cut.final.value = calculateArmorTA(armor, armor.system.cut.base.value);
        armor.system.cold.final.value = calculateArmorTA(armor, armor.system.cold.base.value);
        armor.system.heat.final.value = calculateArmorTA(armor, armor.system.heat.base.value);
        armor.system.electricity.final.value = calculateArmorTA(armor, armor.system.electricity.base.value);
        armor.system.impact.final.value = calculateArmorTA(armor, armor.system.impact.base.value);
        armor.system.thrust.final.value = calculateArmorTA(armor, armor.system.thrust.base.value);
        if (armor.system.isEnchanted.value) {
            armor.system.energy.final.value = calculateArmorTA(armor, armor.system.energy.base.value);
        }
        else {
            armor.system.energy.final.value = armor.system.energy.base.value;
        }
        armor.system.integrity.final.value = calculateArmorIntegrity(armor);
        armor.system.presence.final.value = calculateArmorPresence(armor);
        armor.system.movementRestriction.final.value = calculateArmorMovementRestriction(armor);
        armor.system.naturalPenalty.final.value = calculateArmorNaturalPenalty(armor);
        armor.system.wearArmorRequirement.final.value = calculateArmorWearArmorRequirement(armor);
        return armor;
    });
};
