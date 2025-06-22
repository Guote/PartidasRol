import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const KiSkillItemConfig = ABFItemConfigFactory({
  type: ABFItems.KI_SKILL,
  isInternal: true,
  fieldPath: ["domine", "kiSkills"],
  selectors: {
    addItemButtonSelector: "add-ki-skill",
    containerSelector: "#ki-skills-context-menu-container",
    rowSelector: ".ki-skill-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.kiSkill.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.KI_SKILL
    });
  }
});
export {
  KiSkillItemConfig
};
