import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
var SpellGradeNames;
(function (SpellGradeNames) {
    SpellGradeNames["BASE"] = "anima.ui.mystic.spell.grade.base.title";
    SpellGradeNames["INTERMEDIATE"] = "anima.ui.mystic.spell.grade.intermediate.title";
    SpellGradeNames["ADVANCED"] = "anima.ui.mystic.spell.grade.advanced.title";
    SpellGradeNames["ARCANE"] = "anima.ui.mystic.spell.grade.arcane.title";
})(SpellGradeNames || (SpellGradeNames = {}));
export const SpellItemConfig = {
    type: ABFItems.SPELL,
    isInternal: false,
    hasSheet: true,
    fieldPath: ['mystic', 'spells'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.spells;
    },
    selectors: {
        addItemButtonSelector: 'add-spell',
        containerSelector: '#spells-context-menu-container',
        rowSelector: '.spell-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.spell.content')
        });
        const itemCreateData = {
            name,
            type: ABFItems.SPELL,
            data: {
                description: { value: '' },
                level: { value: 0 },
                via: { value: '' },
                hasDailyMaintenance: { value: false },
                spellType: { value: '' },
                actionType: { value: '' },
                grades: {
                    base: {
                        name: { value: SpellGradeNames.BASE },
                        intRequired: { value: 0 },
                        maintenanceCost: { value: 0 },
                        zeon: { value: 0 },
                        description: { value: '' }
                    },
                    intermediate: {
                        name: { value: SpellGradeNames.INTERMEDIATE },
                        intRequired: { value: 0 },
                        maintenanceCost: { value: 0 },
                        zeon: { value: 0 },
                        description: { value: '' }
                    },
                    advanced: {
                        name: { value: SpellGradeNames.ADVANCED },
                        intRequired: { value: 0 },
                        maintenanceCost: { value: 0 },
                        zeon: { value: 0 },
                        description: { value: '' }
                    },
                    arcane: {
                        name: { value: SpellGradeNames.ARCANE },
                        intRequired: { value: 0 },
                        maintenanceCost: { value: 0 },
                        zeon: { value: 0 },
                        description: { value: '' }
                    }
                }
            }
        };
        await actor.createItem(itemCreateData);
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            await actor.updateItem({ id, name, data });
        }
    },
    onAttach: (data, item) => {
        const items = data.mystic.spells;
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
            data.mystic.spells = [item];
        }
    }
};
