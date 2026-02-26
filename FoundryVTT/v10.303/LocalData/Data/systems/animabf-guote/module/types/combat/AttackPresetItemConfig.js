import { ABFItems } from "../../items/ABFItems.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";

/**
 * Initial data for a new attack preset.
 * @readonly
 */
export const INITIAL_ATTACK_PRESET_DATA = {
  attackType: { value: "combat" },
  withoutRoll: { value: false },
  showRoll: { value: true },
  isAccumulation: { value: false },
  accumulationCount: { value: 0 },
  combat: {
    modifier: { value: 0 },
    fatigueUsed: { value: 0 },
    weaponUsed: { value: "" },
    criticSelected: { value: "-" },
    damageBonus: { value: 0 },
    ignoredTA: { value: 0 },
  },
  mystic: {
    modifier: { value: 0 },
    projectionType: { value: "normal" },
    spellUsed: { value: "" },
    spellGrade: { value: "base" },
    critic: { value: "-" },
    damage: { value: 0 },
    ignoredTA: { value: 0 },
  },
  psychic: {
    modifier: { value: 0 },
    potentialBonus: { value: 0 },
    powerUsed: { value: "" },
    critic: { value: "-" },
    damage: { value: 0 },
    ignoredTA: { value: 0 },
  },
  summon: {
    modifier: { value: 0 },
    summonUsed: { value: "" },
    critic: { value: "impact" },
    ignoredTA: { value: 0 },
  },
};

/** @type {import("../Items").AttackPresetItemConfig} */
export const AttackPresetItemConfig = ABFItemConfigFactory({
  type: ABFItems.ATTACK_PRESET,
  isInternal: false,
  hasSheet: false,
  defaultValue: INITIAL_ATTACK_PRESET_DATA,
  fieldPath: ["combat", "attackPresets"],
  selectors: {
    addItemButtonSelector: "add-attack-preset",
    containerSelector: "#attack-presets-context-menu-container",
    rowSelector: ".attack-preset-row",
  },
  onCreate: async (actor) => {
    // Presets are created from the attack dialog, not from this button
    // This is just a fallback
    const itemData = {
      name: game.i18n.localize("anima.ui.combat.newPreset"),
      type: ABFItems.ATTACK_PRESET,
      system: INITIAL_ATTACK_PRESET_DATA,
    };
    await actor.createItem(itemData);
  },
});
