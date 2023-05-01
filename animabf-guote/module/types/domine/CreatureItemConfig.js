import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const CreatureItemConfig = {
    type: ABFItems.CREATURE,
    isInternal: true,
    fieldPath: ['domine', 'creatures'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.creatures;
    },
    selectors: {
        addItemButtonSelector: 'add-creature',
        containerSelector: '#creatures-context-menu-container',
        rowSelector: '.creature-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.creature.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.CREATURE,
            data: {
                earth: {
                    value: false
                },
                fire: {
                    value: false
                },
                metal: {
                    value: false
                },
                water: {
                    value: false
                },
                wood: {
                    value: false
                }
            }
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            await actor.updateInnerItem({
                id,
                type: ABFItems.CREATURE,
                name,
                data
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.creatures;
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
            data.domine.creatures = [item];
        }
    }
};
