import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const ArsMagnusItemConfig = {
    type: ABFItems.ARS_MAGNUS,
    isInternal: true,
    fieldPath: ['domine', 'arsMagnus'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.arsMagnus;
    },
    selectors: {
        addItemButtonSelector: 'add-ars-magnus',
        containerSelector: '#ars-magnus-context-menu-container',
        rowSelector: '.ars-magnus-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.arsMagnus.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.ARS_MAGNUS
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.ARS_MAGNUS, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.arsMagnus;
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
            data.domine.arsMagnus = [item];
        }
    }
};
