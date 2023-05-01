import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const NoteItemConfig = {
    type: ABFItems.NOTE,
    isInternal: false,
    fieldPath: ['general', 'notes'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.notes;
    },
    selectors: {
        addItemButtonSelector: 'add-note',
        containerSelector: '#_notes-context-menu-container',
        rowSelector: '.note-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.note.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.NOTE
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.NOTE, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.general.notes;
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
            data.general.notes = [item];
        }
    }
};
