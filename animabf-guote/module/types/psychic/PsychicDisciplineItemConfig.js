import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export const PsychicDisciplineItemConfig = {
    type: ABFItems.PSYCHIC_DISCIPLINE,
    isInternal: false,
    fieldPath: ['psychic', 'psychicDisciplines'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.psychicDisciplines;
    },
    selectors: {
        addItemButtonSelector: 'add-psychic-discipline',
        containerSelector: '#psychic-disciplines-context-menu-container',
        rowSelector: '.psychic-discipline-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.psychicDiscipline.content')
        });
        await actor.createInnerItem({
            name,
            type: ABFItems.PSYCHIC_DISCIPLINE
        });
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name } = changes[id];
            await actor.updateInnerItem({ id, type: ABFItems.PSYCHIC_DISCIPLINE, name });
        }
    },
    onAttach: (data, item) => {
        const items = data.psychic.psychicDisciplines;
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
            data.psychic.psychicDisciplines = [item];
        }
    }
};
