import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const SelectedSpellItemConfig = ABFItemConfigFactory({
  type: ABFItems.SELECTED_SPELL,
  isInternal: true,
  fieldPath: ["mystic", "selectedSpells"],
  selectors: {
    addItemButtonSelector: "add-selected-spell",
    containerSelector: "#selected-spells-context-menu-container",
    rowSelector: ".selected-spell-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.selectedSpell.content")
    });
    actor.createInnerItem({
      type: ABFItems.SELECTED_SPELL,
      name,
      system: { cost: { value: 0 } }
    });
  }
});
export {
  SelectedSpellItemConfig
};
