import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';
export const LEVEL_INITIAL_SYSTEM = { level: 0 };

/** @type {import("../Items").LevelItemConfig} */
export const LevelItemConfig = ABFItemConfigFactory({
    type: ABFItems.LEVEL,
    isInternal: true,
    fieldPath: ['general', 'levels'],
    selectors: {
        addItemButtonSelector: 'add-level',
        containerSelector: '#level-context-menu-container',
        rowSelector: '.level-row'
    },
    onCreate: async (actor) => {
        actor.createInnerItem({ type: ABFItems.LEVEL, name: '', system: LEVEL_INITIAL_SYSTEM });
    }
});
