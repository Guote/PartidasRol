import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const InnatePsychicPowerItemConfig = {
    type: ABFItems.INNATE_PSYCHIC_POWER,
    isInternal: true,
    fieldPath: ['psychic', 'innatePsychicPowers'],
    getFromDynamicChanges: changes => {
        return changes.system.dynamic.innatePsychicPowers;
    },
    selectors: {
        addItemButtonSelector: 'add-innate-psychic-power',
        containerSelector: '#innate-psychic-powers-context-menu-container',
        rowSelector: '.innate-psychic-power-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.innatePsychicPower.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.INNATE_PSYCHIC_POWER,
            data: {
                effect: { value: '' },
                value: { value: 0 }
            }
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            await actor.updateInnerItem({
                id,
                type: ABFItems.INNATE_PSYCHIC_POWER,
                name,
                data
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.psychic.innatePsychicPowers;
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
            data.psychic.innatePsychicPowers = [item];
        }
    }
};
