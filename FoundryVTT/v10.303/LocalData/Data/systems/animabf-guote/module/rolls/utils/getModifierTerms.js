/**
 * Returns modifier values and labels for use in roll formulas, based on the modifier type.
 * Single combined term per type; label localized from lang/es.json.
 * @param {object} actorSystem - actor.system
 * @param {string} modifierType - "attack" | "defense" | "general" | "general-negative" | "general-negative-half" | "initiative" | "none"
 * @returns {{ values: number[], labels: string[] }}
 */
export const getModifierTerms = (actorSystem, modifierType) => {
  const mods = actorSystem.general.modifiers;
  const L = (key) => game.i18n.localize(key);
  switch (modifierType) {
    case "attack":
      return {
        values: [mods.modFinal.attack.final.value ?? 0],
        labels: [L("anima.ui.modifiers.types.attack")],
      };
    case "defense":
      return {
        values: [mods.modFinal.defense.final.value ?? 0],
        labels: [L("anima.ui.modifiers.types.defense")],
      };
    case "general":
      return {
        values: [mods.modFinal.general.final.value ?? 0],
        labels: [L("anima.ui.modifiers.types.general")],
      };
    case "initiative":
      return {
        values: [mods.modFinal.initiative ?? 0],
        labels: [L("anima.ui.modifiers.types.initiative")],
      };
    case "general-negative":
      return {
        values: [mods.modFinal.generalNegative ?? 0],
        labels: [L("anima.ui.modifiers.types.generalNegative")],
      };
    case "general-negative-half":
      return {
        values: [mods.modFinal.generalNegativeHalf ?? 0],
        labels: [L("anima.ui.modifiers.types.generalNegativeHalf")],
      };
    case "none":
    default:
      return { values: [], labels: [] };
  }
};
