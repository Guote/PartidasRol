import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const SummonItemConfig = ABFItemConfigFactory({
  type: ABFItems.SUMMON,
  isInternal: true,
  fieldPath: ["mystic", "summons"],
  selectors: {
    addItemButtonSelector: "add-summon",
    containerSelector: "#summons-context-menu-container",
    rowSelector: ".summon-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.summon.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.SUMMON
    });
  }
});
export {
  SummonItemConfig
};
