/* eslint-disable class-methods-use-this */
import { nanoid } from "../../vendor/nanoid/nanoid.js";
import { ALL_ITEM_CONFIGURATIONS } from "./utils/prepareItems/constants.js";
import { getUpdateObjectFromPath } from "./utils/prepareItems/util/getUpdateObjectFromPath.js";
import { getFieldValueFromPath } from "./utils/prepareItems/util/getFieldValueFromPath.js";
import { prepareActor } from "./utils/prepareActor/prepareActor.js";
import { INITIAL_ACTOR_DATA } from "./constants.js";
import ABFActorSheet from "./ABFActorSheet.js";
import { Log } from "../../utils/Log.js";
export class ABFActor extends Actor {
    constructor(data, context) {
        super(data, context);
        this.i18n = game.i18n;
        if (this.system.version !== INITIAL_ACTOR_DATA.version) {
            Log.log(`Upgrading actor ${this.data.name} (${this.data._id}) from version ${this.system.version} to ${INITIAL_ACTOR_DATA.version}`);
            this.data.update({ data: { version: INITIAL_ACTOR_DATA.version } });
        }
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        this.system = foundry.utils.mergeObject(this.system, INITIAL_ACTOR_DATA, { overwrite: false });
        prepareActor(this);
    }
    applyFatigue(fatigueUsed) {
        const newFatigue = this.system.characteristics.secondaries.fatigue.value - fatigueUsed;
        this.update({
            data: {
                characteristics: {
                    secondaries: { fatigue: { value: newFatigue } }
                }
            }
        });
    }
    applyDamage(damage) {
        const newLifePoints = this.system.characteristics.secondaries.lifePoints.value - damage;
        this.update({
            data: {
                characteristics: {
                    secondaries: { lifePoints: { value: newLifePoints } }
                }
            }
        });
    }
    async createItem({ type, name, data = {} }) {
        await this.createEmbeddedDocuments('Item', [{ type, name, data }]);
    }
    async createInnerItem({ type, name, data = {} }) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        const items = getFieldValueFromPath(this.system, configuration.fieldPath) ?? [];
        await this.update({
            data: getUpdateObjectFromPath([...items, { _id: nanoid(), type, name, data }], configuration.fieldPath)
        });
    }
    async updateItem({ id, name, data = {} }) {
        const item = this.getItem(id);
        if (item) {
            let updateObject = { data };
            if (name) {
                updateObject = { ...updateObject, name };
            }
            if ((!!name && name !== item.name) || JSON.stringify(data) !== JSON.stringify(item.system)) {
                await item.update(updateObject);
            }
        }
    }
    _getSheetClass() {
        return ABFActorSheet;
    }
    async updateInnerItem({ type, id, name, data = {} }, forceSave = false) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        const items = getFieldValueFromPath(this.system, configuration.fieldPath);
        const item = items.find(it => it._id === id);
        if (item) {
            const hasChanges = forceSave || (!!name && name !== item.name) || JSON.stringify(data) !== JSON.stringify(item.data);
            if (hasChanges) {
                if (name) {
                    item.name = name;
                }
                if (data) {
                    item.data = data;
                }
                await this.update({
                    data: getUpdateObjectFromPath(items, configuration.fieldPath)
                });
            }
        }
    }
    getItem(itemId) {
        return this.getEmbeddedDocument('Item', itemId);
    }
    getInnerItem(type, itemId) {
        const configuration = ALL_ITEM_CONFIGURATIONS[type];
        return getFieldValueFromPath(this.system, configuration.fieldPath).find(item => item._id === itemId);
    }
}
