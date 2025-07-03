import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const SpellMaintenanceItemConfig = ABFItemConfigFactory({
  type: ABFItems.SPELL_MAINTENANCE,
  isInternal: true,
  fieldPath: ["mystic", "spellMaintenances"],
  selectors: {
    addItemButtonSelector: "add-spell-maintenance",
    containerSelector: "#spell-maintenances-context-menu-container",
    rowSelector: ".spell-maintenance-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.spellMaintenance.content")
    });
    actor.createInnerItem({
      type: ABFItems.SPELL_MAINTENANCE,
      name,
      system: { cost: { value: 0 } }
    });
  }
});
export {
  SpellMaintenanceItemConfig
};
