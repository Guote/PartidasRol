import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const AdvantageItemConfig = ABFItemConfigFactory({
  type: ABFItems.ADVANTAGE,
  isInternal: false,
  fieldPath: ["general", "advantages"],
  selectors: {
    addItemButtonSelector: "add-advantage",
    containerSelector: "#advantages-context-menu-container",
    rowSelector: ".advantage-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.advantage.content")
    });
    await actor.createItem({
      name,
      type: ABFItems.ADVANTAGE
    });
  }
});
export {
  AdvantageItemConfig
};
