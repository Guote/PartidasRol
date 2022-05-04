import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const SpecialSkillItemConfig = {
    type: ABFItems.SPECIAL_SKILL,
    isInternal: true,
    fieldPath: ['domine', 'specialSkills'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.specialSkills;
    },
    selectors: {
        addItemButtonSelector: 'add-special-skill',
        containerSelector: '#special-skills-context-menu-container',
        rowSelector: '.special-skill-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.specialSkill.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.SPECIAL_SKILL
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.SPECIAL_SKILL, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.specialSkills;
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
            data.domine.specialSkills = [item];
        }
    }
};
