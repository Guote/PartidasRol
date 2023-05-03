import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const MartialArtItemConfig = {
    type: ABFItems.MARTIAL_ART,
    isInternal: true,
    fieldPath: ['domine', 'martialArts'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.martialArts;
    },
    selectors: {
        addItemButtonSelector: 'add-martial-art',
        containerSelector: '#martial-arts-context-menu-container',
        rowSelector: '.martial-art-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.martialArt.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.MARTIAL_ART,
            data: {
                grade: { value: '' }
            }
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, system } = changes[id];
            await actor.updateInnerItem({
                id,
                type: ABFItems.MARTIAL_ART,
                name,
                system
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.martialArts;
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
            data.domine.martialArts = [item];
        }
    }
};
