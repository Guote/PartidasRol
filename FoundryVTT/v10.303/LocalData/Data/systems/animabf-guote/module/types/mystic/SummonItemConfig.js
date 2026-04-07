import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';

/**
 * Default data for a single power within a summon item.
 * @readonly
 */
export const INITIAL_POWER_DATA = {
    name:          '',
    active:        { value: false },
    ne:            { value: 0 },
    zeon:          { base: { value: 0 }, final: { value: 0 } },
    summonDif:     { value: 0 },
    accion:        { value: 'activa' },
    duracion:      { value: '' },
    atkFormula:    { value: '' },
    defFormula:    { value: '' },
    damageFormula: { value: '' },
    rmFormula:     { value: '' },
    critic:        { value: 'energy' },
    appearance:    { value: '' },
    effect:        { value: '' }
};

/**
 * Initial data for a new summon item.
 * @readonly
 */
export const INITIAL_SUMMON_DATA = {
    pacto:  { value: '' },
    powers: [{ ...INITIAL_POWER_DATA }]
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
