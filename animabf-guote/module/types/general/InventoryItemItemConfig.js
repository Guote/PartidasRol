import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const InventoryItemItemConfig = {
    type: ABFItems.INVENTORY_ITEM,
    isInternal: true,
    fieldPath: ['general', 'inventory'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.inventory;
    },
    selectors: {
        addItemButtonSelector: 'add-inventory-item',
        containerSelector: '#inventory-items-context-menu-container',
        rowSelector: '.inventory-item-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.inventoryItem.content')
        });
        actor.createInnerItem({ type: ABFItems.INVENTORY_ITEM, name, data: { level: 0 } });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            actor.updateInnerItem({ type: ABFItems.INVENTORY_ITEM, id, name, data });
        }
    },
    onAttach: (data, item) => {
        const items = data.general.levels;
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
            data.general.levels = [item];
        }
    }
};
