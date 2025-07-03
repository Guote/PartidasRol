import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const ArmorLocation = {
  COMPLETE: "complete",
  NIGHTDRESS: "nightdress",
  BREASTPLATE: "breastplate",
  HEAD: "head"
};
const ArmorType = {
  SOFT: "soft",
  HARD: "hard",
  NATURAL: "natural"
};
const derivedFieldInitialData = {
  base: { value: 0 },
  final: { value: 0 }
};
const INITIAL_ARMOR_DATA = {
  cut: derivedFieldInitialData,
  impact: derivedFieldInitialData,
  thrust: derivedFieldInitialData,
  heat: derivedFieldInitialData,
  electricity: derivedFieldInitialData,
  cold: derivedFieldInitialData,
  energy: derivedFieldInitialData,
  integrity: derivedFieldInitialData,
  presence: derivedFieldInitialData,
  wearArmorRequirement: derivedFieldInitialData,
  movementRestriction: derivedFieldInitialData,
  naturalPenalty: derivedFieldInitialData,
  perceptionPenalty: derivedFieldInitialData,
  isEnchanted: { value: false },
  type: { value: ArmorType.SOFT },
  localization: { value: ArmorLocation.BREASTPLATE },
  quality: { value: 0 },
  equipped: { value: false }
};
const ArmorItemConfig = ABFItemConfigFactory({
  type: ABFItems.ARMOR,
  isInternal: false,
  hasSheet: true,
  defaultValue: INITIAL_ARMOR_DATA,
  fieldPath: ["combat", "armors"],
  selectors: {
    addItemButtonSelector: "add-armor",
    containerSelector: "#armors-context-menu-container",
    rowSelector: ".armor-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.armors.content")
    });
    const itemData = {
      name,
      type: ABFItems.ARMOR,
      system: INITIAL_ARMOR_DATA
    };
    await actor.createItem(itemData);
  }
});
export {
  ArmorItemConfig,
  ArmorLocation,
  ArmorType,
  INITIAL_ARMOR_DATA
};
