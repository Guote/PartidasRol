import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const CreatureItemConfig = ABFItemConfigFactory({
  type: ABFItems.CREATURE,
  isInternal: true,
  fieldPath: ["domine", "creatures"],
  selectors: {
    addItemButtonSelector: "add-creature",
    containerSelector: "#creatures-context-menu-container",
    rowSelector: ".creature-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.creature.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.CREATURE,
      system: {
        earth: {
          value: false
        },
        fire: {
          value: false
        },
        metal: {
          value: false
        },
        water: {
          value: false
        },
        wood: {
          value: false
        }
      }
    });
  }
});
export {
  CreatureItemConfig
};
