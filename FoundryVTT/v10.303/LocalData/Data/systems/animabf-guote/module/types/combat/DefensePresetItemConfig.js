import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";

/**
 * Initial data for a new defense preset.
 * @readonly
 */
export const INITIAL_DEFENSE_PRESET_DATA = {
  defenseType: { value: "combat" },
  combat: {
    modifier: { value: 0 },
    fatigue: { value: 0 },
    weaponUsed: { value: "" },
    method: { value: "dodge" },
    atBonus: { value: 0 },
  },
  mystic: {
    modifier: { value: 0 },
    projectionType: { value: "defensive" },
    spellUsed: { value: "" },
    spellGrade: { value: "base" },
  },
  psychic: {
    modifier: { value: 0 },
    potentialBonus: { value: 0 },
    powerUsed: { value: "" },
  },
  summon: {
    modifier: { value: 0 },
    summonUsed: { value: "" },
  },
};

/** @type {import("../Items").DefensePresetItemConfig} */
export const DefensePresetItemConfig = ABFItemConfigFactory({
  type: ABFItems.DEFENSE_PRESET,
  isInternal: false,
  hasSheet: false,
  defaultValue: INITIAL_DEFENSE_PRESET_DATA,
  fieldPath: ["combat", "defensePresets"],
  selectors: {
    addItemButtonSelector: "add-defense-preset",
    containerSelector: "#defense-presets-context-menu-container",
    rowSelector: ".defense-preset-row",
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("anima.dialogs.items.defensePreset.content"),
    });
    if (!name) return;
    const itemData = {
      name,
      type: ABFItems.DEFENSE_PRESET,
      system: INITIAL_DEFENSE_PRESET_DATA,
    };
    await actor.createItem(itemData);
  },
});
