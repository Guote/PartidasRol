import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const SelectedSpellItemConfig = {
    type: ABFItems.SELECTED_SPELL,
    isInternal: true,
    fieldPath: ['mystic', 'selectedSpells'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.selectedSpells;
    },
    selectors: {
        addItemButtonSelector: 'add-selected-spell',
        containerSelector: '#selected-spells-context-menu-container',
        rowSelector: '.selected-spell-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.selectedSpell.content')
        });
        actor.createInnerItem({ type: ABFItems.SELECTED_SPELL, name, data: { cost: { value: 0 } } });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, system} = changes[id];
            actor.updateInnerItem({ type: ABFItems.SELECTED_SPELL, id, name, data });
        }
    },
    onAttach: (data, item) => {
        const items = data.mystic.selectedSpells;
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
            data.mystic.selectedSpells = [item];
        }
    }
};
