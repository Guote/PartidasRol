import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const DisadvantageItemConfig = ABFItemConfigFactory({
  type: ABFItems.DISADVANTAGE,
  isInternal: false,
  fieldPath: ["general", "disadvantages"],
  selectors: {
    addItemButtonSelector: "add-disadvantage",
    containerSelector: "#disadvantages-context-menu-container",
    rowSelector: ".disadvantage-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.disadvantage.content")
    });
    await actor.createItem({
      name,
      type: ABFItems.DISADVANTAGE
    });
  }
});
export {
  DisadvantageItemConfig
};
