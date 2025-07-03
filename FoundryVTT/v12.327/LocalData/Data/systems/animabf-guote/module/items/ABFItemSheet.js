import { ABFItems } from "./ABFItems.js";
import { ITEM_CONFIGURATIONS } from "../actor/utils/prepareItems/constants.js";
import { sveltify } from "../../svelte/sveltify.js";
import SpellContainer from "../../svelte/components/spellContainer.svelte.js";
class ABFItemSheet extends sveltify(ItemSheet) {
  constructor(object, options) {
    super(object, options);
    this.position.width = this.getWidthFromType();
    this.position.height = this.getHeightFromType();
  }
  static get svelteDescriptors() {
    return [{ SvelteComponent: SpellContainer, selector: "#svelte-spell" }];
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "item"],
      resizable: true
    });
  }
  get template() {
    const configuration = ITEM_CONFIGURATIONS[this.item.type];
    if (configuration && configuration.hasSheet) {
      return `systems/animabf-guote/templates/items/${this.item.type}/${this.item.type}.hbs`;
    }
    return super.template;
  }
  getWidthFromType() {
    switch (this.item.type) {
      case ABFItems.SPELL:
        return 700;
      case ABFItems.ARMOR:
        return 1e3;
      case ABFItems.WEAPON:
        return 815;
      default:
        return 900;
    }
  }
  getHeightFromType() {
    switch (this.item.type) {
      case ABFItems.SPELL:
        return 450;
      case ABFItems.WEAPON:
        return 300;
      case ABFItems.ARMOR:
        return 235;
      case ABFItems.AMMO:
        return 144;
      case ABFItems.PSYCHIC_POWER:
        return 540;
      default:
        return 450;
    }
  }
  async getData(options) {
    const sheet = await super.getData(options);
    await sheet.item.prepareDerivedData();
    sheet.system = sheet.item.system;
    sheet.config = CONFIG.config;
    return sheet;
  }
}
export {
  ABFItemSheet as default
};
