import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const LevelItemConfig = ABFItemConfigFactory({
  type: ABFItems.LEVEL,
  isInternal: true,
  fieldPath: ["general", "levels"],
  selectors: {
    addItemButtonSelector: "add-level",
    containerSelector: "#level-context-menu-container",
    rowSelector: ".level-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.level.content")
    });
    actor.createInnerItem({ type: ABFItems.LEVEL, name, system: { level: 0 } });
  }
});
export {
  LevelItemConfig
};
