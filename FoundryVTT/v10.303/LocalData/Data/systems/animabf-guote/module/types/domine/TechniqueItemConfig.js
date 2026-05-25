import { ABFItems } from '../../items/ABFItems.js';
import { ABFItemConfigFactory } from '../ABFItemConfig.js';
/**
 * Initial data for a new technique. Used to infer the type of the data inside `technique.system`
 * @readonly
 */
export const INITIAL_TECHNIQUE_DATA = {
    description: { value: '' },
    level: { value: 0 },
    roundCost: { value: 0 },
    active: { value: false },
    strength: { value: 0 },
    agility: { value: 0 },
    dexterity: { value: 0 },
    constitution: { value: 0 },
    willPower: { value: 0 },
    power: { value: 0 },
    martialKnowledge: { value: 0 }
};
/** @type {import("../Items").TechniqueItemConfig} */
export const TechniqueItemConfig = ABFItemConfigFactory({
    type: ABFItems.TECHNIQUE,
    isInternal: false,
    hasSheet: true,
    fieldPath: ['domine', 'techniques'],
    selectors: {
        addItemButtonSelector: 'add-technique',
        containerSelector: '#techniques-context-menu-container',
        rowSelector: '.technique-row'
    },
    onCreate: async (actor) => {
        const created = await actor.createEmbeddedDocuments('Item', [{
            name: 'Nueva Técnica',
            type: ABFItems.TECHNIQUE,
            system: INITIAL_TECHNIQUE_DATA
        }]);
        if (created[0]) created[0].sheet.render(true);
    },
    // TODO: This should go inside prepareItem, as in spellItemConfig. Same for other TextEditors
    // That it's called also when opening the standalone sheet.
    onAttach: async (actor, technique) => {
        technique.system.enrichedDescription = await TextEditor.enrichHTML(technique.system.description?.value ?? '', {
            async: true
        });
    }
});
