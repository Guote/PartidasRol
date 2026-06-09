import { ABFItems } from '../../items/ABFItems.js';
import { openSimpleInputDialog } from '../../utils/dialogs/openSimpleInputDialog.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';
export const SECONDARY_SPECIAL_SKILL_INITIAL_SYSTEM = { level: { value: 0 }, temporal: { value: 0 } };

/** @type {import("../Items").SecondarySpecialSkillItemConfig} */
export const SecondarySpecialSkillItemConfig = ABFItemConfigFactory({
    type: ABFItems.SECONDARY_SPECIAL_SKILL,
    isInternal: true,
    fieldPath: ['secondaries', 'secondarySpecialSkills'],
    selectors: {
        addItemButtonSelector: 'add-secondary-special-skill',
        containerSelector: '#secondary-special-skills-context-menu-container',
        rowSelector: '.secondary-special-skill-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('anima.dialogs.items.secondarySkill.content')
        });
        actor.createInnerItem({ type: ABFItems.SECONDARY_SPECIAL_SKILL, name, system: SECONDARY_SPECIAL_SKILL_INITIAL_SYSTEM });
    }
});
