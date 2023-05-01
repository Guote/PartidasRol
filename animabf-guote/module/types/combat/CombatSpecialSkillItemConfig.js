import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const CombatSpecialSkillItemConfig = {
    type: ABFItems.COMBAT_SPECIAL_SKILL,
    isInternal: true,
    fieldPath: ['combat', 'combatSpecialSkills'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.combatSpecialSkills;
    },
    selectors: {
        addItemButtonSelector: 'add-combat-special-skill',
        containerSelector: '#combat-special-skills-context-menu-container',
        rowSelector: '.combat-special-skill-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.combatSpecialSkills.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.COMBAT_SPECIAL_SKILL
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.COMBAT_SPECIAL_SKILL, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.combat.combatSpecialSkills;
        if (items) {
            const itemIndex = items.findIndex(i => i._id === item._id);
            if (itemIndex !== -1) {
                items[itemIndex] = item;
            }
            else {
                items.push(item);
            }
        }
        else {
            data.combat.combatSpecialSkills = [item];
        }
    }
};
