import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const KiSkillItemConfig = {
    type: ABFItems.KI_SKILL,
    isInternal: true,
    fieldPath: ['domine', 'kiSkills'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.kiSkills;
    },
    selectors: {
        addItemButtonSelector: 'add-ki-skill',
        containerSelector: '#ki-skills-context-menu-container',
        rowSelector: '.ki-skill-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.kiSkill.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.KI_SKILL
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.KI_SKILL, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.kiSkills;
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
            data.domine.kiSkills = [item];
        }
    }
};
