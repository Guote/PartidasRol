import { ABFItems } from '../../items/ABFItems.js';
import { openSimpleInputDialog } from '../../utils/dialogs/openSimpleInputDialog.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';
/** @type {import("../Items").PsychicDisciplineItemConfig} */
export const PsychicDisciplineItemConfig = ABFItemConfigFactory({
    type: ABFItems.PSYCHIC_DISCIPLINE,
    isInternal: false,
    fieldPath: ['psychic', 'psychicDisciplines'],
    selectors: {
        addItemButtonSelector: 'add-psychic-discipline',
        containerSelector: '#psychic-disciplines-context-menu-container',
        rowSelector: '.psychic-discipline-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.psychicDiscipline.content')
        });
        await actor.createItem({
            name,
            type: ABFItems.PSYCHIC_DISCIPLINE
        });
    }
});
