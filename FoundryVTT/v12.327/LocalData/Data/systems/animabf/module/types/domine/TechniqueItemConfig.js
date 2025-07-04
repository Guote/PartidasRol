import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const INITIAL_TECHNIQUE_DATA = {
  description: { value: "" },
  level: { value: 0 },
  strength: { value: 0 },
  agility: { value: 0 },
  dexterity: { value: 0 },
  constitution: { value: 0 },
  willPower: { value: 0 },
  power: { value: 0 },
  martialKnowledge: { value: 0 }
};
const TechniqueItemConfig = ABFItemConfigFactory({
  type: ABFItems.TECHNIQUE,
  isInternal: false,
  fieldPath: ["domine", "techniques"],
  selectors: {
    addItemButtonSelector: "add-technique",
    containerSelector: "#techniques-context-menu-container",
    rowSelector: ".technique-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.technique.content")
    });
    await actor.createItem({
      name,
      type: ABFItems.TECHNIQUE,
      system: INITIAL_TECHNIQUE_DATA
    });
  },
  // TODO: This should go inside prepareItem, as in spellItemConfig. Same for other TextEditors
  // That it's called also when opening the standalone sheet.
  onAttach: async (actor, technique) => {
    technique.system.enrichedDescription = await TextEditor.enrichHTML(
      technique.system.description?.value ?? "",
      {
        async: true
      }
    );
  }
});
export {
  INITIAL_TECHNIQUE_DATA,
  TechniqueItemConfig
};
