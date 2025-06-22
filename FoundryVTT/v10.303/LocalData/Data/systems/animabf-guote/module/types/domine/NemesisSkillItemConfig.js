import { ABFItems } from '../../items/ABFItems.js';
import { openSimpleInputDialog } from '../../utils/dialogs/openSimpleInputDialog.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';
/** @type {import("../Items").NemesisSkillItemConfig} */
export const NemesisSkillItemConfig = ABFItemConfigFactory({
    type: ABFItems.NEMESIS_SKILL,
    isInternal: true,
    fieldPath: ['domine', 'nemesisSkills'],
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
    }
});
