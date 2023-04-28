import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
export var ArmorLocation;
(function (ArmorLocation) {
    ArmorLocation["COMPLETE"] = "complete";
    ArmorLocation["NIGHTDRESS"] = "nightdress";
    ArmorLocation["BREASTPLATE"] = "breastplate";
    ArmorLocation["HEAD"] = "head";
})(ArmorLocation || (ArmorLocation = {}));
export var ArmorType;
(function (ArmorType) {
    ArmorType["SOFT"] = "soft";
    ArmorType["HARD"] = "hard";
    ArmorType["NATURAL"] = "natural";
})(ArmorType || (ArmorType = {}));
const derivedFieldInitialData = { base: { value: 0 }, final: { value: 0 } };
export const INITIAL_ARMOR_DATA = {
    cut: derivedFieldInitialData,
    impact: derivedFieldInitialData,
    thrust: derivedFieldInitialData,
    heat: derivedFieldInitialData,
    electricity: derivedFieldInitialData,
    cold: derivedFieldInitialData,
    energy: derivedFieldInitialData,
    integrity: derivedFieldInitialData,
    presence: derivedFieldInitialData,
    wearArmorRequirement: derivedFieldInitialData,
    movementRestriction: derivedFieldInitialData,
    naturalPenalty: derivedFieldInitialData,
    isEnchanted: { value: false },
    type: { value: ArmorType.SOFT },
    localization: { value: ArmorLocation.BREASTPLATE },
    quality: { value: 0 },
    equipped: { value: false }
};
export const ArmorItemConfig = {
    type: ABFItems.ARMOR,
    isInternal: false,
    hasSheet: true,
    fieldPath: ['combat', 'armors'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.armors;
    },
    selectors: {
        addItemButtonSelector: 'add-armor',
        containerSelector: '#armors-context-menu-container',
        rowSelector: '.armor-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.armors.content')
        });
        const itemData = {
            name,
            type: ABFItems.ARMOR,
            data: INITIAL_ARMOR_DATA
        };
        await actor.createItem(itemData);
    },
    onUpdate: async (actor, changes) => {
        for (const id of Object.keys(changes)) {
            const { name, data } = changes[id];
            actor.updateItem({
                id,
                name,
                data
            });
        }
    },
    onAttach: (data, item) => {
        const items = data.combat.armors;
        item.system = foundry.utils.mergeObject(item.system, INITIAL_ARMOR_DATA, { overwrite: false });
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
            data.combat.armors = [item];
        }
    }
};
