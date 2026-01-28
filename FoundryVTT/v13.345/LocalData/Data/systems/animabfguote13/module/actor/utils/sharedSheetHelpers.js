import { ABFItems } from "../../items/ABFItems.js";
import { INITIAL_EFFECT_DATA } from "../../types/effects/EffectItemConfig.js";
import { getFieldValueFromPath } from "./prepareItems/util/getFieldValueFromPath.js";
import { getUpdateObjectFromPath } from "./prepareItems/util/getUpdateObjectFromPath.js";
import { ABFDialogs } from "../../dialogs/ABFDialogs.js";
import { Logger } from "../../../utils/log.js";

/**
 * Shared helper functions for both ABFActorSheet and ABFActorSheetClean
 */
export const SharedSheetHelpers = {
  /**
   * Get width based on whether actor has spells
   * @param {ABFActor} actor
   * @returns {number}
   */
  getWidthDependingFromContent(actor) {
    if (actor.items.filter((i) => i.type === ABFItems.SPELL).length > 0) {
      return 1300;
    }
    return 1000;
  },

  /**
   * Display actor image in popout window
   * @param {ABFActor} actor
   */
  displayActorImagePopout(actor) {
    const imagePopout = new ImagePopout(actor.img, {
      title: actor.name,
      uuid: actor.uuid
    });
    imagePopout.render(true);
  },

  /**
   * Get linked ActiveEffect for an effect item
   * @param {ABFActor} actor
   * @param {Item} item
   * @returns {ActiveEffect|null}
   */
  getLinkedEffect(actor, item) {
    if (!item) return null;
    return actor.effects.find((e) => e.origin === item.uuid) ?? null;
  },

  /**
   * Ensure an ActiveEffect exists for an effect item
   * @param {ABFActor} actor
   * @param {Item} item
   * @returns {Promise<ActiveEffect|null>}
   */
  async ensureEffectForItem(actor, item) {
    if (!item) return null;
    let effect = SharedSheetHelpers.getLinkedEffect(actor, item);
    if (effect) return effect;

    const rawBaseData = item.system?.effectData ?? {};
    const { origin, ...baseData } = rawBaseData;
    const data = foundry.utils.mergeObject(
      {
        name: item.name,
        icon: item.img || "icons/svg/aura.svg",
        disabled: !item.system?.active,
        origin: item.uuid
      },
      baseData,
      { inplace: false }
    );
    const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return created ?? null;
  },

  /**
   * Setup sync between effect item and ActiveEffect
   * @param {Item} item
   * @param {ActiveEffect} effect
   */
  setupEffectSync(item, effect) {
    const handler = async (doc, diff, options, userId) => {
      if (doc.id !== effect.id) return;
      if (userId !== game.user.id) return;
      if (doc.transfer === true) {
        await doc.update({ transfer: false });
        return;
      }
      const obj = doc.toObject();
      const { _id, _key, parent, ...clean } = obj;
      await item.update({ "system.effectData": clean });
      await item.update({ "system.active": !doc.disabled });
      Hooks.off("updateActiveEffect", handler);
    };
    Hooks.on("updateActiveEffect", handler);
  },

  /**
   * Handle effect control actions
   * @param {ActorSheet} sheet
   * @param {Event} event
   * @returns {Promise<void>}
   */
  async handleEffectControl(sheet, event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const li = a.closest(".effect");
    const itemId = li?.dataset.itemId;
    const item = itemId ? sheet.actor.items.get(itemId) : null;

    switch (action) {
      case "create": {
        const name = game.i18n.localize("anima.effects.newEffect") ?? "New Effect";
        const [created] = await sheet.actor.createEmbeddedDocuments("Item", [
          {
            type: ABFItems.EFFECT,
            name,
            system: INITIAL_EFFECT_DATA
          }
        ]);
        if (created?.sheet) created.sheet.render(true);
        return;
      }
      case "edit": {
        if (!item) return;
        const effect = await SharedSheetHelpers.ensureEffectForItem(sheet.actor, item);
        if (!effect) return;
        SharedSheetHelpers.setupEffectSync(item, effect);
        return effect.sheet?.render(true);
      }
      case "delete": {
        if (!itemId) return;
        const item2 = sheet.actor.items.get(itemId);
        if (!item2) return;
        const effect = SharedSheetHelpers.getLinkedEffect(sheet.actor, item2);
        const deletions = [];
        deletions.push(sheet.actor.deleteEmbeddedDocuments("Item", [itemId]));
        if (effect) {
          deletions.push(sheet.actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]));
        }
        return Promise.all(deletions);
      }
      case "toggle": {
        if (!item) return;
        const newActive = !item.system.active;
        await item.update({ "system.active": newActive });
        const effect = SharedSheetHelpers.getLinkedEffect(sheet.actor, item);
        if (effect) {
          await effect.update({ disabled: !newActive });
        }
        return;
      }
      default:
        return;
    }
  },

  /**
   * Build contextual menu for item configuration
   * @param {ActorSheet} sheet
   * @param {Object} itemConfig
   * @returns {ContextMenu}
   */
  buildCommonContextualMenu(sheet, itemConfig) {
    const {
      selectors: { containerSelector, rowSelector },
      fieldPath,
      hideDeleteRow
    } = itemConfig;
    const deleteRowMessage = itemConfig.contextMenuConfig?.customDeleteRowMessage ??
      game.i18n.localize("contextualMenu.common.options.delete");
    const customCallbackFn = itemConfig.onDelete;
    const otherItems = itemConfig.contextMenuConfig?.buildExtraOptionsInContextMenu?.(sheet.actor) ?? [];

    if (!itemConfig.isInternal && itemConfig.hasSheet) {
      otherItems.push({
        name: game.i18n.localize("contextualMenu.common.options.edit"),
        icon: '<i class="fas fa-edit fa-fw"></i>',
        callback: (target) => {
          const { itemId } = target[0].dataset;
          if (itemId) {
            const item = sheet.actor.items.get(itemId);
            if (item?.sheet) {
              item.sheet.render(true);
            } else {
              Logger.warn("Item sheet was not found for item:", item);
            }
          } else {
            Logger.warn("Item ID was not found for target:", target);
          }
        }
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
            customCallbackFn(sheet.actor, target);
          } else {
            const id = target[0].dataset.itemId;
            if (!id) {
              throw new Error(
                "Data id missing. Are you sure to set data-item-id to rows?"
              );
            }
            ABFDialogs.confirm(
              game.i18n.localize("dialogs.items.delete.title"),
              game.i18n.localize("dialogs.items.delete.body"),
              {
                onConfirm: () => {
                  if (fieldPath) {
                    if (sheet.actor.getEmbeddedDocument("Item", id)) {
                      sheet.actor.deleteEmbeddedDocuments("Item", [id]);
                    } else {
                      let items = getFieldValueFromPath(sheet.actor.system, fieldPath);
                      items = items.filter((item) => item._id !== id);
                      const dataToUpdate = {
                        system: getUpdateObjectFromPath(items, fieldPath)
                      };
                      sheet.actor.update(dataToUpdate);
                    }
                  }
                }
              }
            );
          }
        }
      });
    }

    return new ContextMenu(sheet.element.find(containerSelector), rowSelector, [
      ...otherItems
    ]);
  }
};
