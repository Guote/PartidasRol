import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const DisadvantageItemConfig = {
    type: ABFItems.DISADVANTAGE,
    isInternal: false,
    fieldPath: ['general', 'disadvantages'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.disadvantages;
    },
    selectors: {
        addItemButtonSelector: 'add-disadvantage',
        containerSelector: '#disadvantages-context-menu-container',
        rowSelector: '.disadvantage-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.disadvantage.content')
        });
        await actor.createItem({
            name,
            type: ABFItems.DISADVANTAGE
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateItem({ id, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.general.disadvantages;
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
            data.general.disadvantages = [item];
        }
    }
};
