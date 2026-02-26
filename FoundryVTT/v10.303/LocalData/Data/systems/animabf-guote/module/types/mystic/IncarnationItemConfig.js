import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';

export const INITIAL_INCARNATION_DATA = {
    level: { value: 0 },
    difficulty: { value: 0 },
    summonBonus: { value: 0 },
    turno: { value: 0 },
    ha: { value: 0 },
    hd: { value: 0 },
    magicProjection: { value: 0 },
    psychicProjection: { value: 0 },
    equipment: { value: '' },
    activeOptions: { value: '' },
    passiveSkills: { value: '' },
    active: { value: false }
};

export const IncarnationItemConfig = ABFItemConfigFactory({
    type: ABFItems.INCARNATION,
    isInternal: false,
    hasSheet: true,
    defaultValue: INITIAL_INCARNATION_DATA,
    fieldPath: ['mystic', 'incarnations'],
    selectors: {
        addItemButtonSelector: 'add-incarnation',
        containerSelector: '#incarnations-context-menu-container',
        rowSelector: '.incarnation-row'
    },
    onCreate: async (actor) => {
        const { i18n } = game;
        const itemData = {
            name: i18n.localize('anima.ui.mystic.incarnation.new'),
            type: ABFItems.INCARNATION,
            system: INITIAL_INCARNATION_DATA
        };
        await actor.createItem(itemData);
    }
});
