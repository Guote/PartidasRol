import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { WeaponCritic } from "./WeaponItemConfig.js";
export const INITIAL_AMMO_DATA = {
    amount: { value: 0 },
    damage: { base: { value: 0 }, final: { value: 0 } },
    critic: { value: WeaponCritic.CUT },
    quality: { value: 0 },
    integrity: { base: { value: 0 }, final: { value: 0 } },
    breaking: { base: { value: 0 }, final: { value: 0 } },
    presence: { base: { value: 0 }, final: { value: 0 } },
    special: { value: '' }
};
export const AmmoItemConfig = {
    type: ABFItems.AMMO,
    isInternal: false,
    hasSheet: true,
    fieldPath: ['combat', 'ammo'],
    getFromDynamicChanges: changes => {
        return changes.data.dynamic.ammo;
    },
    selectors: {
        addItemButtonSelector: 'add-ammo',
        containerSelector: '#ammo-context-menu-container',
        rowSelector: '.ammo-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const name = await openSimpleInputDialog({
            content: i18n.localize('dialogs.items.ammo.content')
        });
        const itemData = {
            name,
            type: ABFItems.AMMO,
            data: INITIAL_AMMO_DATA
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
        const items = data.combat.ammo;
        item.system = foundry.utils.mergeObject(item.system, INITIAL_AMMO_DATA, { overwrite: false });
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
            data.combat.ammo = [item];
        }
    }
};
