import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import ABFFoundryRoll from "../rolls/ABFFoundryRoll.js";
import { splitAsActorAndItemChanges } from "./utils/splitAsActorAndItemChanges.js";
import { unflat } from "./utils/unflat.js";
import { ALL_ITEM_CONFIGURATIONS } from "./utils/prepareItems/constants.js";
import { INITIAL_EFFECT_DATA } from "../types/effects/EffectItemConfig.js";
import { getFieldValueFromPath } from "./utils/prepareItems/util/getFieldValueFromPath.js";
import { getUpdateObjectFromPath } from "./utils/prepareItems/util/getUpdateObjectFromPath.js";
import { ABFItems } from "../items/ABFItems.js";
import { ABFDialogs } from "../dialogs/ABFDialogs.js";
import { Logger } from "../../utils/log.js";
import "../utils/constants.js";
import { ABFSettingsKeys } from "../../utils/registerSettings.js";
import { createClickHandlers } from "./utils/createClickHandlers.js";
import { SharedSheetHelpers } from "./utils/sharedSheetHelpers.js";

class ABFActorSheet extends ActorSheet {
  i18n;
  constructor(actor, options) {
    super(actor, options);
    this.i18n = game.i18n;
    this.position.width = SharedSheetHelpers.getWidthDependingFromContent(this.actor);
  }
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      ...{
        classes: [game.animabfguote13.id, "sheet", "actor"],
        template: "systems/animabfguote13/templates/actor/actor-sheet.hbs",
        width: 1e3,
        height: 850,
        submitOnChange: true,
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        tabs: [
          {
            navSelector: ".sheet-tabs",
            contentSelector: ".sheet-body",
            initial: "main"
          },
          {
            navSelector: ".mystic-tabs",
            contentSelector: ".mystic-body",
            initial: "mystic-main"
          },
          {
            navSelector: ".general-tabs",
            contentSelector: ".general-body",
            initial: "general-first"
          },
          {
            navSelector: ".psychic-tabs",
            contentSelector: ".psychic-body",
            initial: "psychic-main"
          }
        ]
      }
    };
  }
  get template() {
    return "systems/animabfguote13/templates/actor/actor-sheet.hbs";
  }

  get id() {
    return "animabfguote13.ABFActorSheet";
  }
  async close(options) {
    super.close(options);
    this.position.width = SharedSheetHelpers.getWidthDependingFromContent(this.actor);
  }
  async _render(force, options = {}) {
    if (force && this.actor.testUserPermission(game.user, "LIMITED", { exact: true })) {
      SharedSheetHelpers.displayActorImagePopout(this.actor);
      return;
    }
    return super._render(force, options);
  }
  async getData(options) {
    const sheet = await super.getData(options);
    const actor = this.actor;
    if (actor?.type === "character") {
      await actor.prepareDerivedData();
      sheet.system = actor.system;
    }
    sheet.config = CONFIG.config;
    const permissions = game.settings.get(
      game.animabfguote13.id,
      ABFSettingsKeys.MODIFY_DICE_FORMULAS_PERMISSION
    );
    sheet.canModifyDice = permissions?.[game.user.role] === true;
    const effectItems = actor.items.filter((i) => i && i.type === ABFItems.EFFECT);
    sheet.effects = effectItems;
    console.log("EFFECT ITEMS EN SHEET", sheet.effects);
    return sheet;
  }
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;
    const handler = (ev) => this._onDragStart(ev);
    html.find(".rollable").click((e) => {
      this._onRoll(e);
    });
    html.find(".contractible-button").click((e) => {
      const { contractibleItemId } = e.currentTarget.dataset;
      if (contractibleItemId) {
        const ui = this.actor.system.ui;
        ui.contractibleItems = {
          ...ui.contractibleItems,
          [contractibleItemId]: !ui.contractibleItems[contractibleItemId]
        };
        this.actor.update({ system: { ui } });
      }
    });
    for (const item of Object.values(ALL_ITEM_CONFIGURATIONS)) {
      SharedSheetHelpers.buildCommonContextualMenu(this, item);
      html.find(item.selectors.rowSelector).each((_, row) => {
        row.setAttribute("draggable", "true");
        row.addEventListener("dragstart", handler, false);
      });
      html.find(`[data-on-click="${item.selectors.addItemButtonSelector}"]`).click(() => {
        item.onCreate(this.actor);
      });
    }
    const clickHandlers = createClickHandlers(this);
    html.find("[data-on-click]").click((e) => {
      const key = e.currentTarget.dataset.onClick;
      const handler2 = clickHandlers[key];
      if (handler2) handler2(e);
      else console.warn(`No handler for data-on-click="${key}"`);
    });
    html.find(".effect-control").click((e) => SharedSheetHelpers.handleEffectControl(this, e));
  }
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const { dataset } = element;
    if (dataset.roll) {
      const label = dataset.label ? `Rolling ${dataset.label}` : "";
      const mod = await openModDialog();
      let formula = `${dataset.roll}+ ${mod}`;
      if (parseInt(dataset.extra) >= 200) {
        formula = formula.replace(
          this.actor.system.general.diceSettings.abilityDie.value,
          this.actor.system.general.diceSettings.abilityMasteryDie.value
        );
      }
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }
  protected;
  async _updateObject(event, formData) {
    Object.keys(formData).forEach((key) => {
      if (key.includes("quality")) {
        formData[key] = parseInt(formData[key], 10);
      }
    });
    const [actorChanges, itemChanges] = splitAsActorAndItemChanges(formData);
    await this.updateItems(itemChanges);
    return super._updateObject(event, actorChanges);
  }
  async updateItems(_changes) {
    if (!_changes || Object.keys(_changes).length === 0) return;
    const changes = unflat(_changes);
    for (const item of Object.values(ALL_ITEM_CONFIGURATIONS)) {
      const fromDynamicChanges = item.getFromDynamicChanges(changes);
      if (fromDynamicChanges) {
        await item.onUpdate(this.actor, fromDynamicChanges);
      }
    }
  }
  async _onDropItem(event, data) {
    const created = await super._onDropItem(event, data);
    const items = Array.isArray(created) ? created : created ? [created] : [];
    for (const item of items) {
      if (item.type !== ABFItems.EFFECT) continue;
      await item.update({
        "system.active": false,
        "system.effectData.disabled": true
      });
      await SharedSheetHelpers.ensureEffectForItem(this.actor, item);
    }
    return created;
  }
}
export {
  ABFActorSheet as default
};
