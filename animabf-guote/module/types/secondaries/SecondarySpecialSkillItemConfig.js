import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const SecondarySpecialSkillItemConfig = {
    type: ABFItems.SECONDARY_SPECIAL_SKILL,
    isInternal: true,
    fieldPath: ['secondaries', 'secondarySpecialSkills'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.secondarySpecialSkills;
    },
    selectors: {
        addItemButtonSelector: 'add-secondary-special-skill',
        containerSelector: '#secondary-special-skills-context-menu-container',
        rowSelector: '.secondary-special-skill-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.secondarySkill.content')
        });
        actor.createInnerItem({ type: ABFItems.SECONDARY_SPECIAL_SKILL, name, data: { level: { value: 0 } } });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            actor.updateInnerItem({ type: ABFItems.SECONDARY_SPECIAL_SKILL, id, name, data });
        }
    },
    onAttach: (data, item) => {
        const items = data.secondaries.secondarySpecialSkills;
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
            data.secondaries.secondarySpecialSkills = [item];
        }
    }
};
