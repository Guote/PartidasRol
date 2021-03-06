import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const CombatTableItemConfig = {
    type: ABFItems.COMBAT_TABLE,
    isInternal: true,
    fieldPath: ['combat', 'combatTables'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.combatTables;
    },
    selectors: {
        addItemButtonSelector: 'add-combat-table',
        containerSelector: '#combat-tables-context-menu-container',
        rowSelector: '.combat-table-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.combatTable.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.COMBAT_TABLE
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            actor.updateInnerItem({
                id,
                type: ABFItems.COMBAT_TABLE,
                name
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.combat.combatTables;
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
            data.combat.combatTables = [item];
        }
    }
};
