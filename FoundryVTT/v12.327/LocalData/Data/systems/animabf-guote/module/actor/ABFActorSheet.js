import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import ABFFoundryRoll from "../rolls/ABFFoundryRoll.js";
import { splitAsActorAndItemChanges } from "./utils/splitAsActorAndItemChanges.js";
import { unflat } from "./utils/unflat.js";
import { ALL_ITEM_CONFIGURATIONS } from "./utils/prepareItems/constants.js";
import { getFieldValueFromPath } from "./utils/prepareItems/util/getFieldValueFromPath.js";
import { getUpdateObjectFromPath } from "./utils/prepareItems/util/getUpdateObjectFromPath.js";
import { ABFItems } from "../items/ABFItems.js";
import { ABFDialogs } from "../dialogs/ABFDialogs.js";
import { ABFSystemName } from "../../animabf-guote.name.js";
import { sveltify } from "../../svelte/sveltify.js";
import SpellBoard from "../../svelte/components/spellBoard.svelte.js";
import { Logger } from "../../utils/log.js";
import { getFormula } from "../rolls/utils/getFormula.js";
class ABFActorSheet extends sveltify(
  /** @type {TFormApplication} */
  ActorSheet
) {
  i18n;
  constructor(actor, options) {
    super(actor, options);
    this.i18n = game.i18n;
    this.position.width = this.getWidthDependingFromContent();
  }
  static get svelteDescriptors() {
    return [{ SvelteComponent: SpellBoard, selector: "#svelte-spell-board" }];
  }
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      ...{
        classes: ["abf", "sheet", "actor"],
        template: `systems/${ABFSystemName}/templates/actor/actor-sheet.hbs`,
        width: 1e3,
        height: 850,
        submitOnChange: true,
        viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
        tabs: [
          {
            navSelector: ".sheet-tabs",
            contentSelector: ".sheet-body",
            initial: "main",
          },
          {
            navSelector: ".mystic-tabs",
            contentSelector: ".mystic-body",
            initial: "mystic-main",
          },
          {
            navSelector: ".general-tabs",
            contentSelector: ".general-body",
            initial: "general-first",
          },
          {
            navSelector: ".psychic-tabs",
            contentSelector: ".psychic-body",
            initial: "psychic-main",
          },
        ],
      },
    };
  }
  get template() {
    return `systems/${ABFSystemName}/templates/actor/actor-sheet.hbs`;
  }
  async close(options) {
    super.close(options);
    this.position.width = this.getWidthDependingFromContent();
  }
  getWidthDependingFromContent() {
    if (this.actor.items.filter((i) => i.type === ABFItems.SPELL).length > 0) {
      return 1300;
    }
    return 1e3;
  }
  async _render(force, options = {}) {
    if (
      force &&
      this.actor.testUserPermission(game.user, "LIMITED", { exact: true })
    ) {
      this.displayActorImagePopout();
      return;
    }
    return super._render(force, options);
  }
  displayActorImagePopout() {
    const imagePopout = new ImagePopout(this.actor.img, {
      title: this.actor.name,
      uuid: this.actor.uuid,
    });
    imagePopout.render(true);
  }
  async getData(options) {
    const sheet = await super.getData(options);
    if (this.actor.type === "character") {
      await sheet.actor.prepareDerivedData();
      sheet.system = sheet.actor.system;
    }
    sheet.config = CONFIG.config;
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
          [contractibleItemId]: !ui.contractibleItems[contractibleItemId],
        };
        this.actor.update({ system: { ui } });
      }
    });
    for (const item of Object.values(ALL_ITEM_CONFIGURATIONS)) {
      this.buildCommonContextualMenu(item);
      html.find(item.selectors.rowSelector).each((_, row) => {
        row.setAttribute("draggable", "true");
        row.addEventListener("dragstart", handler, false);
      });
      html
        .find(`[data-on-click="${item.selectors.addItemButtonSelector}"]`)
        .click(() => {
          item.onCreate(this.actor);
        });
    }
  }
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const { dataset } = element;
    if (dataset.roll) {
      const label = dataset.label ? `Rolling ${dataset.label}` : "";
      const mod = await openModDialog();
      /* let formula = `${dataset.roll}+ ${mod}`; */
      let formula = getFormula({
        dice: dataset.roll,
        values: [dataset.rollvalue, mod],
        labels: [`${dataset.label}`, "Mod"],
      });
      console.log({ element, dataset });
      if (formula.includes("10TO100")) {
        let totalLevel = this.actor.system.general.levels.reduce(
          (sum, item) => sum + (item.system.level || 0),
          0
        );
        formula = getFormula({
          dice: dataset.roll,
          values: [dataset.rollvalue, totalLevel * 10, mod],
          labels: [`${dataset.label}`, "Nivel", "Mod"],
        }).replace("10TO100", "");
      }
      if (parseInt(dataset.extra) >= 200)
        formula = formula.replace("xa", "xamastery");
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
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
  buildCommonContextualMenu = (itemConfig) => {
    const {
      selectors: { containerSelector, rowSelector },
      fieldPath,
      hideDeleteRow,
    } = itemConfig;
    const deleteRowMessage =
      itemConfig.contextMenuConfig?.customDeleteRowMessage ??
      this.i18n.localize("contextualMenu.common.options.delete");
    const customCallbackFn = itemConfig.onDelete;
    const otherItems =
      itemConfig.contextMenuConfig?.buildExtraOptionsInContextMenu?.(
        this.actor
      ) ?? [];
    if (!itemConfig.isInternal && itemConfig.hasSheet) {
      otherItems.push({
        name: this.i18n.localize("contextualMenu.common.options.edit"),
        icon: '<i class="fas fa-edit fa-fw"></i>',
        callback: (target) => {
          const { itemId } = target[0].dataset;
          if (itemId) {
            const item = this.actor.items.get(itemId);
            if (item?.sheet) {
              item.sheet.render(true);
            } else {
              Logger.warn("Item sheet was not found for item:", item);
            }
          } else {
            Logger.warn("Item ID was not found for target:", target);
          }
        },
      });
    }
    if (!hideDeleteRow) {
      otherItems.push({
        name: deleteRowMessage,
        icon: '<i class="fas fa-trash fa-fw"></i>',
        callback: (target) => {
          if (!customCallbackFn && !fieldPath) {
            Logger.warn(
              `buildCommonContextualMenu: no custom callback and configuration set, could not delete the item: ${itemConfig.type}`
            );
          }
          if (customCallbackFn) {
            customCallbackFn(this.actor, target);
          } else {
            const id = target[0].dataset.itemId;
            if (!id) {
              throw new Error(
                "Data id missing. Are you sure to set data-item-id to rows?"
              );
            }
            ABFDialogs.confirm(
              this.i18n.localize("dialogs.items.delete.title"),
              this.i18n.localize("dialogs.items.delete.body"),
              {
                onConfirm: () => {
                  if (fieldPath) {
                    if (this.actor.getEmbeddedDocument("Item", id)) {
                      this.actor.deleteEmbeddedDocuments("Item", [id]);
                    } else {
                      let items = getFieldValueFromPath(
                        this.actor.system,
                        fieldPath
                      );
                      items = items.filter((item) => item._id !== id);
                      const dataToUpdate = {
                        system: getUpdateObjectFromPath(items, fieldPath),
                      };
                      this.actor.update(dataToUpdate);
                    }
                  }
                },
              }
            );
          }
        },
      });
    }
    return new ContextMenu($(containerSelector), rowSelector, [...otherItems]);
  };
}
export { ABFActorSheet as default };
