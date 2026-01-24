import { ABFItems } from "../../items/ABFItems.js";
import "./SpellItemConfig.js";
import { openComplexInputDialog } from "../../utils/dialogs/openComplexInputDialog.js";
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
    const results = await openComplexInputDialog(actor, "newSelectedSpell");
    const spellID = results["new.selectedSpell.id"];
    const spellGrade = results["new.selectedSpell.grade"];
    const spell = actor.system.mystic.spells.find((i) => i._id == spellID);
    if (!spell) {
      return;
    }
    const name = spell.name;
    const maintenanceCost = spell.system.grades[spellGrade].maintenanceCost.value;
    await actor.createInnerItem({
      name,
      type: ABFItems.SELECTED_SPELL,
      system: {
        grade: { value: spellGrade },
        cost: { value: maintenanceCost }
      }
    });
  }
});
export {
  SelectedSpellItemConfig
};
