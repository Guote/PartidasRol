import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';

export const SPELL_MAINTENANCE_INITIAL_SYSTEM = {
    active:       { value: true  },
    spellId:      { value: ''    },
    grade:        { value: ''    },
    cost:         { value: 0     },
    dayCostMod:   { value: 0     },
    roundCost:    { value: 0     },
    roundCostMod: { value: 0     },
};

/** @type {import("../Items").SpellMaintenanceItemConfig} */
export const SpellMaintenanceItemConfig = ABFItemConfigFactory({
    type: ABFItems.SPELL_MAINTENANCE,
    isInternal: true,
    fieldPath: ['mystic', 'spellMaintenances'],
    selectors: {
        addItemButtonSelector: 'add-spell-maintenance',
        containerSelector: '#spell-maintenances-context-menu-container',
        rowSelector: '.spell-maintenance-row'
    },
    onCreate: async (actor) => {
        actor.createInnerItem({
            type: ABFItems.SPELL_MAINTENANCE,
            name: '',
            system: SPELL_MAINTENANCE_INITIAL_SYSTEM
        });
    }
});
