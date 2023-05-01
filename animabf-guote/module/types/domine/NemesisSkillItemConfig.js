import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const NemesisSkillItemConfig = {
    type: ABFItems.NEMESIS_SKILL,
    isInternal: true,
    fieldPath: ['domine', 'nemesisSkills'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.nemesisSkills;
    },
    selectors: {
        addItemButtonSelector: 'add-nemesis-skill',
        containerSelector: '#nemesis-skills-context-menu-container',
        rowSelector: '.nemesis-skill-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.nemesisSkill.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.NEMESIS_SKILL
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.NEMESIS_SKILL, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.nemesisSkills;
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
            data.domine.nemesisSkills = [item];
        }
    }
};
