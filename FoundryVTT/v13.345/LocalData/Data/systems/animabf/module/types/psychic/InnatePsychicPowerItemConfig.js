import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const InnatePsychicPowerItemConfig = ABFItemConfigFactory({
  type: ABFItems.INNATE_PSYCHIC_POWER,
  isInternal: true,
  fieldPath: ["psychic", "innatePsychicPowers"],
  selectors: {
    addItemButtonSelector: "add-innate-psychic-power",
    containerSelector: "#innate-psychic-powers-context-menu-container",
    rowSelector: ".innate-psychic-power-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.innatePsychicPower.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.INNATE_PSYCHIC_POWER,
      system: {
        effect: { value: "" },
        value: { value: 0 }
      }
    });
  }
});
export {
  InnatePsychicPowerItemConfig
};
