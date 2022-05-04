import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const TitleItemConfig = {
    type: ABFItems.TITLE,
    isInternal: true,
    fieldPath: ['general', 'titles'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.titles;
    },
    selectors: {
        addItemButtonSelector: 'add-title',
        containerSelector: '#titles-context-menu-container',
        rowSelector: '.title-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.title.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.TITLE
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.TITLE, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.general.titles;
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
            data.general.titles = [item];
        }
    }
};
