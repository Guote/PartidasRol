import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const MentalPatternItemConfig = {
    type: ABFItems.MENTAL_PATTERN,
    isInternal: false,
    fieldPath: ['psychic', 'mentalPatterns'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.mentalPatterns;
    },
    selectors: {
        addItemButtonSelector: 'add-mental-pattern',
        containerSelector: '#mental-patterns-context-menu-container',
        rowSelector: '.mental-pattern-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.mentalPattern.content')
        });
        await actor.createItem({
            name,
            type: ABFItems.MENTAL_PATTERN,
            data: {
                bonus: { value: 0 },
                penalty: { value: 0 }
            }
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, system} = changes[id];
            await actor.updateItem({
                id,
                name,
                system
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.psychic.mentalPatterns;
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
            data.psychic.mentalPatterns = [item];
        }
    }
};
