import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const SpellMaintenanceItemConfig = {
    type: ABFItems.SPELL_MAINTENANCE,
    isInternal: true,
    fieldPath: ['mystic', 'spellMaintenances'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.spellMaintenances;
    },
    selectors: {
        addItemButtonSelector: 'add-spell-maintenance',
        containerSelector: '#spell-maintenances-context-menu-container',
        rowSelector: '.spell-maintenance-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.spellMaintenance.content')
        });
        actor.createInnerItem({ type: ABFItems.SPELL_MAINTENANCE, name, data: { cost: { value: 0 } } });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, system} = changes[id];
            actor.updateInnerItem({ type: ABFItems.SPELL_MAINTENANCE, id, name, data });
        }
    },
    onAttach: (data, item) => {
        const items = data.mystic.spellMaintenances;
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
            data.mystic.spellMaintenances = [item];
        }
    }
};
