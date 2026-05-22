import { createDesarmadoWeapon } from "../../actor/utils/createDesarmadoWeapon.js";

// Foundry macro: window.ABFMacros.addDesarmado()

/**
 * Adds Desarmado to actors that don't have it, or marks it isDefault on actors
 * that have it by name but without the flag. Operates on selected tokens, or
 * all player-character actors if nothing is selected.
 */
export const addDesarmadoMacro = async () => {
  const selectedActors = canvas.tokens.controlled
    .map(t => t.actor)
    .filter(Boolean);

  const actors = selectedActors.length > 0
    ? selectedActors
    : game.actors.filter(a => a.type === "character");

  if (actors.length === 0) {
    ui.notifications.warn("No hay actores seleccionados ni personajes en el mundo.");
    return;
  }

  let added = 0, updated = 0, skipped = 0;

  for (const actor of actors) {
    const weapons = actor.items.filter(i => i.type === "weapon");
    const existing = weapons.find(
      w => w.name.toLowerCase() === "desarmado" || w.name.toLowerCase() === "unarmed"
    );

    if (existing) {
      if (existing.system?.isDefault?.value) {
        skipped++;
        continue;
      }
      // Already have Desarmado but without the flag — just mark it
      await existing.update({
        "system.isDefault.value": true,
        "system.isShown.value": true,
        "system.equipped.value": true,
      });
      updated++;
    } else {
      await createDesarmadoWeapon(actor);
      added++;
    }
  }

  ui.notifications.info(
    `Desarmado: ${added} añadidos, ${updated} actualizados, ${skipped} ya tenían el arma.`
  );
};
