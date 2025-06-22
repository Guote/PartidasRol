/* eslint-disable class-methods-use-this */
import { nanoid } from '../../vendor/nanoid/nanoid.js';
import { ABFItems } from '../items/ABFItems.js';
import { ALL_ITEM_CONFIGURATIONS } from './utils/prepareItems/constants.js';
import { getUpdateObjectFromPath } from './utils/prepareItems/util/getUpdateObjectFromPath.js';
import { getFieldValueFromPath } from './utils/prepareItems/util/getFieldValueFromPath.js';
import { prepareActor } from './utils/prepareActor/prepareActor.js';
import { INITIAL_ACTOR_DATA } from './constants.js';
import ABFActorSheet from './ABFActorSheet.js';
import { Log } from '../../utils/Log.js';
import { migrateItem } from '../items/migrations/migrateItem.js';
export class ABFActor extends Actor {
    constructor(data, context) {
        super(data, context);
        this.i18n = game.i18n;
        if (this.system.version !== INITIAL_ACTOR_DATA.version) {
            Log.log(`Upgrading actor ${this.name} (${this._id}) from version ${this.system.version} to ${INITIAL_ACTOR_DATA.version}`);
            this.updateSource({ version: INITIAL_ACTOR_DATA.version });
        }
    }
    async prepareDerivedData() {
        super.prepareDerivedData();
        this.system = foundry.utils.mergeObject(this.system, INITIAL_ACTOR_DATA, {
            overwrite: false
        });
        await prepareActor(this);
    }
    applyFatigue(fatigueUsed) {
        const newFatigue = this.system.characteristics.secondaries.fatigue.value - fatigueUsed;
        this.update({
            system: {
                characteristics: {
                    secondaries: { fatigue: { value: newFatigue } }
                }
            }
        });
    }
    applyDamage(damage) {
        const newLifePoints = this.system.characteristics.secondaries.lifePoints.value - damage;
        this.update({
            system: {
                characteristics: {
                    secondaries: { lifePoints: { value: newLifePoints } }
                }
            }
        });
    }
    async createItem({ type, name, system = {} }) {
        await this.createEmbeddedDocuments('Item', [
            {
                type,
                name,
                system
            }
        ]);
    }
    async createInnerItem({ type, name, system = {} }) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        const items = getFieldValueFromPath(this.system, configuration.fieldPath) ?? [];
        await this.update({
            system: getUpdateObjectFromPath([
                ...items,
                {
                    _id: nanoid(),
                    type,
                    name,
                    system
                }
            ], configuration.fieldPath)
        });
    }
    async updateItem({ id, name, system = {} }) {
        const item = this.getItem(id);
        if (item) {
            let updateObject = { system };
            if (name) {
                updateObject = {
                    ...updateObject,
                    name
                };
            }
            if ((!!name && name !== item.name) ||
                JSON.stringify(system) !== JSON.stringify(item.system)) {
                await item.update(updateObject);
            }
        }
    }
    async updateInnerItem({ type, id, name, system = {} }, forceSave = false) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        const items = this.getInnerItems(type);
        const item = items.find(it => it._id === id);
        if (item) {
            const hasChanges = forceSave ||
                (!!name && name !== item.name) ||
                JSON.stringify(system) !== JSON.stringify(item.system);
            if (hasChanges) {
                if (name) {
                    item.name = name;
                }
                if (system) {
                    item.system = system;
                }
                await this.update({
                    system: getUpdateObjectFromPath(items, configuration.fieldPath)
                });
            }
        }
    }
    getInnerItem(type, itemId) {
        return this.getItemsOf(type).find(item => item._id === itemId);
    }
    getSecondarySpecialSkills() {
        return this.getItemsOf(ABFItems.SECONDARY_SPECIAL_SKILL);
    }
    getKnownSpells() {
        return this.getItemsOf(ABFItems.SPELL);
    }
    getSpellMaintenances() {
        return this.getItemsOf(ABFItems.SPELL_MAINTENANCE);
    }
    getSelectedSpells() {
        return this.getItemsOf(ABFItems.SELECTED_SPELL);
    }
    getKnownMetamagics() {
        return this.getItemsOf(ABFItems.METAMAGIC);
    }
    getKnownSummonings() {
        return this.getItemsOf(ABFItems.SUMMON);
    }
    getCategories() {
        return this.getItemsOf(ABFItems.LEVEL);
    }
    getKnownLanguages() {
        return this.getItemsOf(ABFItems.LANGUAGE);
    }
    getElans() {
        return this.getItemsOf(ABFItems.ELAN);
    }
    getElanPowers() {
        return this.getItemsOf(ABFItems.ELAN_POWER);
    }
    getTitles() {
        return this.getItemsOf(ABFItems.TITLE);
    }
    getAdvantages() {
        return this.getItemsOf(ABFItems.ADVANTAGE);
    }
    getDisadvantages() {
        return this.getItemsOf(ABFItems.DISADVANTAGE);
    }
    getContacts() {
        return this.getItemsOf(ABFItems.CONTACT);
    }
    getNotes() {
        return this.getItemsOf(ABFItems.NOTE);
    }
    getPsychicDisciplines() {
        return this.getItemsOf(ABFItems.PSYCHIC_DISCIPLINE);
    }
    getMentalPatterns() {
        return this.getItemsOf(ABFItems.MENTAL_PATTERN);
    }
    getInnatePsychicPowers() {
        return this.getItemsOf(ABFItems.INNATE_PSYCHIC_POWER);
    }
    getPsychicPowers() {
        return this.getItemsOf(ABFItems.PSYCHIC_POWER);
    }
    getKiSkills() {
        return this.getItemsOf(ABFItems.KI_SKILL);
    }
    getNemesisSkills() {
        return this.getItemsOf(ABFItems.NEMESIS_SKILL);
    }
    getArsMagnus() {
        return this.getItemsOf(ABFItems.ARS_MAGNUS);
    }
    getMartialArts() {
        return this.getItemsOf(ABFItems.MARTIAL_ART);
    }
    getKnownCreatures() {
        return this.getItemsOf(ABFItems.CREATURE);
    }
    getSpecialSkills() {
        return this.getItemsOf(ABFItems.SPECIAL_SKILL);
    }
    getKnownTechniques() {
        return this.getItemsOf(ABFItems.TECHNIQUE);
    }
    getCombatSpecialSkills() {
        return this.getItemsOf(ABFItems.COMBAT_SPECIAL_SKILL);
    }
    getCombatTables() {
        return this.getItemsOf(ABFItems.COMBAT_TABLE);
    }
    getAmmos() {
        return this.getItemsOf(ABFItems.AMMO);
    }
    getWeapons() {
        return this.getItemsOf(ABFItems.WEAPON);
    }
    getArmors() {
        return this.getItemsOf(ABFItems.ARMOR);
    }
    getInventoryItems() {
        return this.getItemsOf(ABFItems.INVENTORY_ITEM);
    }
    getAllItems() {
        return Object.values(ABFItems).flatMap(itemType => this.getItemsOf(itemType));
    }
    _getSheetClass() {
        return ABFActorSheet;
    }
    getItemsOf(type) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        if (!configuration) {
            console.error(`No configuration found for item type ${type}`);
            return [];
        }
        if (configuration.isInternal) {
            return this.getInnerItems(type);
        }
        return this.items.filter(i => i.type === type);
    }
    getInnerItems(type) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        if (!configuration) {
            console.error(`No configuration found for item type ${type}`);
            return [];
        }
        if (configuration.fieldPath.length === 0) {
            return [];
        }
        const items = getFieldValueFromPath(this.system, configuration.fieldPath);
        if (Array.isArray(items)) {
            return items.map(migrateItem);
        }
        return [];
    }
    getItem(itemId) {
        return this.getEmbeddedDocument('Item', itemId);
    }
}
