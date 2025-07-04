import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const InventoryItemItemConfig = ABFItemConfigFactory({
  type: ABFItems.INVENTORY_ITEM,
  isInternal: true,
  fieldPath: ["general", "inventory"],
  selectors: {
    addItemButtonSelector: "add-inventory-item",
    containerSelector: "#inventory-items-context-menu-container",
    rowSelector: ".inventory-item-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.inventoryItem.content")
    });
    actor.createInnerItem({
      type: ABFItems.INVENTORY_ITEM,
      name,
      system: {
        amount: { value: 0 },
        weight: { value: 0 }
      }
    });
  }
});
export {
  InventoryItemItemConfig
};
