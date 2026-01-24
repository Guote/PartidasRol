import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
import { ElanPowerItemConfig } from "./ElanPowerItemConfig.js";
const ElanItemConfig = ABFItemConfigFactory({
  type: ABFItems.ELAN,
  isInternal: true,
  fieldPath: ["general", "elan"],
  selectors: {
    addItemButtonSelector: "add-elan",
    containerSelector: "#elan-context-menu-container",
    rowSelector: ".elan-row .base"
  },
  contextMenuConfig: {
    buildExtraOptionsInContextMenu: (actor) => [
      {
        name: game.i18n.localize("contextualMenu.elan.options.addPower"),
        icon: '<i class="fa fa-plus" aria-hidden="true"></i>',
        callback: (target) => {
          const { itemId } = target[0].dataset;
          if (!itemId) throw new Error("elanId missing");
          ElanPowerItemConfig.onCreate(actor, itemId);
        }
      }
    ]
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.elan.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.ELAN,
      system: {
        level: { value: 0 },
        powers: []
      }
    });
  },
  onUpdate: async (actor, changes) => {
    for (const id of Object.keys(changes)) {
      const { name, system } = changes[id];
      const elan = actor.getInnerItem(ABFItems.ELAN, id);
      await actor.updateInnerItem({
        type: ABFItems.ELAN,
        id,
        name,
        system: { ...elan.system, ...system }
      });
    }
  }
});
export {
  ElanItemConfig
};
