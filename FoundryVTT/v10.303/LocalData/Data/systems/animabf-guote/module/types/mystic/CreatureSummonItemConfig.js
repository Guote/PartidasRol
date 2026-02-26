import { ABFItems } from '../../items/ABFItems.js';
import { openSimpleInputDialog } from '../../utils/dialogs/openSimpleInputDialog.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';

export const CreatureSummonItemConfig = ABFItemConfigFactory({
    type: ABFItems.CREATURE_SUMMON,
    isInternal: true,
    fieldPath: ['mystic', 'creatureSummons'],
    selectors: {
        addItemButtonSelector: 'add-creature-summon',
        containerSelector: '#creature-summons-context-menu-container',
        rowSelector: '.creature-summon-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('anima.ui.mystic.creatureSummon.addDialog')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.CREATURE_SUMMON,
            system: {
                actorId: { value: '' },
                actorUuid: { value: '' },
                notes: { value: '' }
            }
        });
    }
});
