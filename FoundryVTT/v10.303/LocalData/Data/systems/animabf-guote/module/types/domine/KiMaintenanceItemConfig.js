import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';

export const KI_MAINTENANCE_INITIAL_SYSTEM = {
    active:    { value: true  },
    roundCost: { value: 0     },
    techniqueId: { value: '' },
};

/** @type {import("../Items").KiMaintenanceItemConfig} */
export const KiMaintenanceItemConfig = ABFItemConfigFactory({
    type: ABFItems.KI_MAINTENANCE,
    isInternal: true,
    fieldPath: ['domine', 'kiMaintenances'],
    selectors: {
        addItemButtonSelector: 'add-ki-maintenance',
        containerSelector: '#ki-maintenances-context-menu-container',
        rowSelector: '.ki-maintenance-row'
    },
    onCreate: async (actor) => {
        actor.createInnerItem({
            type: ABFItems.KI_MAINTENANCE,
            name: 'Nuevo efecto',
            system: KI_MAINTENANCE_INITIAL_SYSTEM
        });
    }
});
