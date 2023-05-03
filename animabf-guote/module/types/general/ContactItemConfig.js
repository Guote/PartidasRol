import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const ContactItemConfig = {
    type: ABFItems.CONTACT,
    isInternal: true,
    fieldPath: ['general', 'contacts'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.contacts;
    },
    selectors: {
        addItemButtonSelector: 'add-contact',
        containerSelector: '#contacts-context-menu-container',
        rowSelector: '.contact-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.contact.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.CONTACT
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, system} = changes[id];
            await actor.updateInnerItem({
                id,
                type: ABFItems.CONTACT,
                name,
                system
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.general.contacts;
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
            data.general.contacts = [item];
        }
    }
};
