import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';

/**
 * Initial data for a new summon item.
 * @readonly
 */
export const INITIAL_SUMMON_DATA = {
    summonDif: { value: 0 },
    zeonCost: { value: 0 },
    baseAtk: { value: 0 },
    baseDef: { value: 0 },
    damage: { value: 0 },
    critic: { value: 'impact' },
    turno: { value: 20 },
    special: { value: '' },
    bonusAtk: { value: 0 },
    bonusDef: { value: 0 },
    bonusDamage: { value: 0 },
    bonusOther: { value: '' }
};

/** @type {import("../Items").SummonItemConfig} */
export const SummonItemConfig = ABFItemConfigFactory({
    type: ABFItems.SUMMON,
    isInternal: false,
    hasSheet: true,
    defaultValue: INITIAL_SUMMON_DATA,
    fieldPath: ['mystic', 'summons'],
    selectors: {
        addItemButtonSelector: 'add-summon',
        containerSelector: '#summons-context-menu-container',
        rowSelector: '.summon-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const itemData = {
            name: i18n.localize('anima.ui.mystic.summon.new'),
            type: ABFItems.SUMMON,
            system: INITIAL_SUMMON_DATA
        };
        await actor.createItem(itemData);
    }
});
