import { ABFItems } from "../../items/ABFItems.js";
import { openComplexInputDialog } from "../../utils/dialogs/openComplexInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const PsychicDisciplineItemConfig = ABFItemConfigFactory({
  type: ABFItems.PSYCHIC_DISCIPLINE,
  isInternal: false,
  fieldPath: ["psychic", "psychicDisciplines"],
  selectors: {
    addItemButtonSelector: "add-psychic-discipline",
    containerSelector: "#psychic-disciplines-context-menu-container",
    rowSelector: ".psychic-discipline-row"
  },
  onCreate: async (actor) => {
    const results = await openComplexInputDialog(actor, "newPsychicDiscipline");
    const name = results["new.psychicDiscipline.name"];
    const imbalance = results["new.psychicDiscipline.imbalance"];
    await actor.createItem({
      name,
      type: ABFItems.PSYCHIC_DISCIPLINE,
      system: { imbalance }
    });
  }
});
export {
  PsychicDisciplineItemConfig
};
