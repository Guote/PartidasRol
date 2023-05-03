import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const MetamagicItemConfig = {
    type: ABFItems.METAMAGIC,
    isInternal: true,
    fieldPath: ['mystic', 'metamagics'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.metamagics;
    },
    selectors: {
        addItemButtonSelector: 'add-metamagic',
        containerSelector: '#metamagics-context-menu-container',
        rowSelector: '.metamagic-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.metamagic.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.METAMAGIC,
            data: { grade: { value: 0 } }
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, system} = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.METAMAGIC, name, data });
        }
    },
    onAttach: (data, item) => {
        const items = data.mystic.metamagics;
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
            data.mystic.metamagics = [item];
        }
    }
};
