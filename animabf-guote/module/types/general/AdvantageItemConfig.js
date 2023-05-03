import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const AdvantageItemConfig = {
    type: ABFItems.ADVANTAGE,
    isInternal: false,
    fieldPath: ['general', 'advantages'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.advantages;
    },
    selectors: {
        addItemButtonSelector: 'add-advantage',
        containerSelector: '#advantages-context-menu-container',
        rowSelector: '.advantage-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.advantage.content')
        });
        await actor.createItem({
            name,
            type: ABFItems.ADVANTAGE
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateItem({ id, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.general.advantages;
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
            data.general.advantages = [item];
        }
    }
};
