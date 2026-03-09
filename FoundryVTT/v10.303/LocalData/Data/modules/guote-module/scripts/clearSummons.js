const selectedActor = (canvas.tokens.controlled[0]?.actor) ?? game.user.character;

if (!selectedActor) {
  ui.notifications.warn("Selecciona un token o asigna un personaje al usuario.");
  return;
}

// Summons in this system are stored as plain data in system.mystic.summons,
// not as embedded Foundry Items — use actor.update() to clear them.
const summons = selectedActor.system?.mystic?.summons || [];

if (summons.length === 0) {
  ui.notifications.info(`${selectedActor.name}: no tiene invocaciones que borrar.`);
  return;
}

await selectedActor.update({ 'system.mystic.summons': [] });
ui.notifications.info(`${selectedActor.name}: ${summons.length} invocación(es) eliminada(s).`);
