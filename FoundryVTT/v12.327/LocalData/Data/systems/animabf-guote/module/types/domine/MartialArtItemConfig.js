import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const MartialArtItemConfig = ABFItemConfigFactory({
  type: ABFItems.MARTIAL_ART,
  isInternal: true,
  fieldPath: ["domine", "martialArts"],
  selectors: {
    addItemButtonSelector: "add-martial-art",
    containerSelector: "#martial-arts-context-menu-container",
    rowSelector: ".martial-art-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.martialArt.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.MARTIAL_ART,
      system: {
        grade: { value: "" }
      }
    });
  }
});
export {
  MartialArtItemConfig
};
