import { ABFItems } from "./ABFItems.js";
import { ITEM_CONFIGURATIONS } from "../actor/utils/prepareItems/constants.js";
class ABFItemSheet extends ItemSheet {
  constructor(object, options) {
    super(object, options);
    this.position.width = this.getWidthFromType();
    this.position.height = this.getHeightFromType();
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "item"],
      resizable: true
    });
  }
  get template() {
    const configuration = ITEM_CONFIGURATIONS[this.item?.type];
    if (configuration && configuration.hasSheet) {
      return `systems/animabfguote13/templates/items/${this.item.type}/${this.item.type}.hbs`;
    }
    return super.template;
  }
  getWidthFromType() {
    switch (this.item?.type) {
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
    switch (this.item?.type) {
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
  // ABFItemSheet.js
  async _render(force, options = {}) {
    if (!this.item || !this.item.type) {
      return super._render(force, options);
    }
    if (this.item.type !== ABFItems.EFFECT) {
      return super._render(force, options);
    }
    if (typeof this.item.toActiveEffectData !== "function" || typeof this.item.fromActiveEffect !== "function") {
      return super._render(force, options);
    }
    const aeData = this.item.toActiveEffectData();
    if (!aeData) return super._render(force, options);
    const parent = this.item.parent;
    const isOwned = parent instanceof Actor;
    if (!isOwned) {
      const [effect2] = await this.item.createEmbeddedDocuments("ActiveEffect", [aeData]);
      if (!effect2) return super._render(force, options);
      const syncHandler2 = async (doc, diff, hookOptions, userId) => {
        if (doc.id !== effect2.id) return;
        if (userId !== game.user.id) return;
        if (doc.transfer === true) {
          await doc.update({ transfer: false });
          return;
        }
        await this.item.fromActiveEffect(doc);
      };
      Hooks.on("updateActiveEffect", syncHandler2);
      Hooks.once("closeActiveEffectConfig", async (app) => {
        if (app?.document?.id !== effect2.id) return;
        Hooks.off("updateActiveEffect", syncHandler2);
        await this.item.deleteEmbeddedDocuments("ActiveEffect", [effect2.id]);
      });
      effect2.sheet?.render(true);
      return;
    }
    const actor = parent;
    let effect = actor.effects.find((e) => e.origin === this.item.uuid) ?? null;
    if (!effect) {
      const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [
        { ...aeData, origin: this.item.uuid }
      ]);
      effect = created ?? null;
    }
    if (!effect) return super._render(force, options);
    const syncHandler = async (doc, diff, hookOptions, userId) => {
      if (doc.id !== effect.id) return;
      if (userId !== game.user.id) return;
      if (doc.transfer === true) {
        await doc.update({ transfer: false });
        return;
      }
      await this.item.fromActiveEffect(doc);
      Hooks.off("updateActiveEffect", syncHandler);
    };
    Hooks.on("updateActiveEffect", syncHandler);
    effect.sheet?.render(true);
    return;
  }
}
export {
  ABFItemSheet as default
};
