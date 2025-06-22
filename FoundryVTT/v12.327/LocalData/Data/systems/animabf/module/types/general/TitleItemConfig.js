import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const TitleItemConfig = ABFItemConfigFactory({
  type: ABFItems.TITLE,
  isInternal: true,
  fieldPath: ["general", "titles"],
  selectors: {
    addItemButtonSelector: "add-title",
    containerSelector: "#titles-context-menu-container",
    rowSelector: ".title-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.title.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.TITLE
    });
  }
});
export {
  TitleItemConfig
};
