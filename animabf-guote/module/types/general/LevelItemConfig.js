import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const LevelItemConfig = {
    type: ABFItems.LEVEL,
    isInternal: true,
    fieldPath: ['general', 'levels'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.levels;
    },
    selectors: {
        addItemButtonSelector: 'add-level',
        containerSelector: '#level-context-menu-container',
        rowSelector: '.level-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.level.content')
        });
        actor.createInnerItem({ type: ABFItems.LEVEL, name, data: { level: 0 } });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            actor.updateInnerItem({ type: ABFItems.LEVEL, id, name, data });
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
