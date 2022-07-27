import { ABFItems } from "./ABFItems.js";
import { ITEM_CONFIGURATIONS } from "../actor/utils/prepareItems/constants.js";
export default class ABFItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['sheet', 'item'],
            resizable: true
        });
    }
    constructor(object, options) {
        super(object, options);
        this.position.width = this.getWidthFromType();
        this.position.height = this.getHeightFromType();
    }
    getWidthFromType() {
        switch (this.item.data.type) {
            case ABFItems.SPELL:
                return 700;
            case ABFItems.ARMOR:
                return 1000;
            case ABFItems.WEAPON:
                return 815;
            default:
                return 900;
        }
    }
    getHeightFromType() {
        switch (this.item.data.type) {
            case ABFItems.SPELL:
                return 450;
            case ABFItems.WEAPON:
                return 300;
            case ABFItems.ARMOR:
                return 235;
            case ABFItems.AMMO:
                return 144;
            case ABFItems.PSYCHIC_POWER:
                return 500;
            default:
                return 450;
        }
    }
    getData() {
        const data = super.getData();
        data.item.prepareDerivedData();
        // Yes, a lot of datas, I know. This is Foundry VTT, welcome if you see this
        data.data.data = data.item.data.data;
        data.config = CONFIG.config;
        return data;
    }
    get template() {
        const configuration = ITEM_CONFIGURATIONS[this.item.data.type];
        if (configuration && configuration.hasSheet) {
            const path = 'systems/animabf-guote/templates/items/';
            return `${path}/${this.item.data.type}/${this.item.data.type}.hbs`;
        }
        return super.template;
    }
}
