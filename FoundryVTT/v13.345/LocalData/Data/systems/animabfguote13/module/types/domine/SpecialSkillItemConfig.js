import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const SpecialSkillItemConfig = ABFItemConfigFactory({
  type: ABFItems.SPECIAL_SKILL,
  isInternal: true,
  fieldPath: ["domine", "specialSkills"],
  selectors: {
    addItemButtonSelector: "add-special-skill",
    containerSelector: "#special-skills-context-menu-container",
    rowSelector: ".special-skill-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.specialSkill.content")
    });
    await actor.createInnerItem({
      name,
      type: ABFItems.SPECIAL_SKILL
    });
  }
});
export {
  SpecialSkillItemConfig
};
