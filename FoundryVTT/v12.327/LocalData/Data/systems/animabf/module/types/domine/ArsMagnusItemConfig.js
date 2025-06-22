import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const ArsMagnusItemConfig = ABFItemConfigFactory({
  type: ABFItems.ARS_MAGNUS,
  isInternal: true,
  fieldPath: ["domine", "arsMagnus"],
  selectors: {
    addItemButtonSelector: "add-ars-magnus",
    containerSelector: "#ars-magnus-context-menu-container",
    rowSelector: ".ars-magnus-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.arsMagnus.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.ARS_MAGNUS
    });
  }
});
export {
  ArsMagnusItemConfig
};
