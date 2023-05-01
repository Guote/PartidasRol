import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const TechniqueItemConfig = {
    type: ABFItems.TECHNIQUE,
    isInternal: false,
    fieldPath: ['domine', 'techniques'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.techniques;
    },
    selectors: {
        addItemButtonSelector: 'add-technique',
        containerSelector: '#techniques-context-menu-container',
        rowSelector: '.technique-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.technique.content')
        });
        await actor.createItem({
            name,
            type: ABFItems.TECHNIQUE,
            data: {
                description: { value: '' },
                level: { value: 0 },
                strength: { value: 0 },
                agility: { value: 0 },
                dexterity: { value: 0 },
                constitution: { value: 0 },
                willPower: { value: 0 },
                power: { value: 0 },
                martialKnowledge: { value: 0 }
            }
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            await actor.updateItem({
                id,
                name,
                data
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.domine.techniques;
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
            data.domine.techniques = [item];
        }
    }
};
