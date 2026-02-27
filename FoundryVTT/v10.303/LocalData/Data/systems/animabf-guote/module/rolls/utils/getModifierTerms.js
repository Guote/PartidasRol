/**
 * Returns modifier values and labels for use in roll formulas, based on the modifier type.
 * @param {object} actorSystem - actor.system
 * @param {string} modifierType - "attack" | "defense" | "general" | "general-negative" | "initiative"
 * @returns {{ values: number[], labels: string[] }}
 */
export const getModifierTerms = (actorSystem, modifierType) => {
  const mods = actorSystem.general.modifiers;
  switch (modifierType) {
    case "attack": {
      const modFis = mods.modFinal.attack.fis ?? 0;
      const modSob = mods.modFinal.attack.sob ?? 0;
      const modManiobras = (mods.modFinal.attack.final.value ?? 0) - modFis - modSob;
      return {
        values: [modFis, modSob, modManiobras],
        labels: ["Mod. Físico", "Mod. Sobrenat.", "Mod. Maniobras"],
      };
    }
    case "defense": {
      const modFis = mods.modFinal.defense.fis ?? 0;
      const modSob = mods.modFinal.defense.sob ?? 0;
      const modManiobras = (mods.modFinal.defense.final.value ?? 0) - modFis - modSob;
      return {
        values: [modFis, modSob, modManiobras],
        labels: ["Mod. Físico", "Mod. Sobrenat.", "Mod. Maniobras"],
      };
    }
    case "general":
      return {
        values: [mods.modFisico.final.value ?? 0, mods.modSobrenatural.final.value ?? 0],
        labels: ["Mod. Físico", "Mod. Sobrenat."],
      };
    // Only penalties apply (e.g. magic/psychic projection, psychic potential)
    case "general-negative":
      return {
        values: [Math.min(0, mods.modFisico.final.value ?? 0), Math.min(0, mods.modSobrenatural.final.value ?? 0)],
        labels: ["Mod. Físico", "Mod. Sobrenat."],
      };
    case "initiative":
      return {
        values: [Math.floor((mods.modFinal.general.final.value ?? 0) / 10) * 5],
        labels: ["Mod. Global"],
      };
    default:
      return { values: [], labels: [] };
  }
};
