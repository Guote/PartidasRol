import { ABFItems } from "../../items/ABFItems.js";
import { openComplexInputDialog } from "../../utils/dialogs/openComplexInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const INITIAL_MENTAL_PATTERN_DATA = {
  bonus: { value: "" },
  penalty: { value: "" }
};
const MentalPatternItemConfig = ABFItemConfigFactory({
  type: ABFItems.MENTAL_PATTERN,
  isInternal: false,
  fieldPath: ["psychic", "mentalPatterns"],
  selectors: {
    addItemButtonSelector: "add-mental-pattern",
    containerSelector: "#mental-patterns-context-menu-container",
    rowSelector: ".mental-pattern-row"
  },
  onCreate: async (actor) => {
    const results = await openComplexInputDialog(actor, "newMentalPattern");
    const name = results["new.mentalPattern.name"];
    await actor.createItem({
      name,
      type: ABFItems.MENTAL_PATTERN,
      system: INITIAL_MENTAL_PATTERN_DATA
    });
  }
});
export {
  INITIAL_MENTAL_PATTERN_DATA,
  MentalPatternItemConfig
};
