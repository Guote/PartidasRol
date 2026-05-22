import { ABFItems } from '../../items/ABFItems.js';
import { openSimpleInputDialog } from '../../utils/dialogs/openSimpleInputDialog.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';
export const METAMAGIC_INITIAL_SYSTEM = { grade: { value: 0 } };

/** @type {import("../Items").MetamagicItemConfig} */
export const MetamagicItemConfig = ABFItemConfigFactory({
    type: ABFItems.METAMAGIC,
    isInternal: true,
    fieldPath: ['mystic', 'metamagics'],
    selectors: {
        addItemButtonSelector: 'add-metamagic',
        containerSelector: '#metamagics-context-menu-container',
        rowSelector: '.metamagic-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('anima.dialogs.items.metamagic.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.METAMAGIC,
            system: METAMAGIC_INITIAL_SYSTEM
        });
    }
});
