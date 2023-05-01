import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const SummonItemConfig = {
    type: ABFItems.SUMMON,
    isInternal: true,
    fieldPath: ['mystic', 'summons'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.summons;
    },
    selectors: {
        addItemButtonSelector: 'add-summon',
        containerSelector: '#summons-context-menu-container',
        rowSelector: '.summon-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.summon.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.SUMMON
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.SUMMON, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.mystic.summons;
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
            data.mystic.summons = [item];
        }
    }
};
