let aemi = game.actors.find((a) => a.name === "Aemi");

if (!_token) throw new Error("Selecciona un token");
if (typeof token !== "undefined") {
  // Scope defined in external macro or module
  currentToken = token;
  currentActor = token.actor;
} else if (canvas.tokens.controlled?.[0]) {
  currentToken = canvas.tokens.controlled[0];
  currentActor = currentToken.document.actor;
} else {
  let defaultActorId = game.users.get(game.userId)._source.character;
  currentActor = game.actors.get(defaultActorId);
}
if (currentActor !== aemi) throw new Error("Selecciona el token de Aemi");

const macroCookies = aemi.system?.macroCookies?.sangreSidhe;

const applyTint = (tintColor = "#ffffff") => {
  canvas.tokens.controlled.forEach((token) => {
    const currentTint = token.document.tint || "ffffff";
    const newTint = currentTint === tintColor ? "ffffff" : tintColor;
    token.document.update({ tint: newTint });
  });
};
const removeCondition = (condition, actor) => {
  game.cub.hasCondition(condition, actor) &&
    game.cub.removeCondition(condition, actor);
};
const addCondition = (condition, actor) => {
  !game.cub.hasCondition(condition, actor) &&
    game.cub.addCondition(condition, actor);
};

const macroStates = [-1, 0, 1];
const currentMacroState = macroCookies || 0;
let message;

const toggleSangre = {
  [1]: () => {
    aemi.update({
      "system.macroCookies.sangreSidhe": -1,
      "system.general.settings.openRolls.value": 0,
      "system.general.settings.fumbles.value": 11,
    });
    /* applyTint("#708090"); */
    message =
      "Sangre Sidhe: Recién desactivada. El destino se cobrará lo robado.";
    removeCondition("Sangre Sidhe", aemi);
    addCondition("Sangre Sidhe Mal", aemi);
  },
  [-1]: () => {
    aemi.update({
      "system.macroCookies.sangreSidhe": 0,
      "system.general.settings.openRolls.value": 0,
      "system.general.settings.fumbles.value": 0,
    });
    /* applyTint("#ffffff"); */
    message = "Sangre Sidhe: Neutral";
    removeCondition("Sangre Sidhe", aemi);
    removeCondition("Sangre Sidhe Mal", aemi);
  },
  [0]: () => {
    aemi.update({
      "system.macroCookies.sangreSidhe": 1,
      "system.general.settings.openRolls.value": 85,
      "system.general.settings.fumbles.value": 0,
    });
    /* applyTint("#ff0000"); */
    message = "Sangre Sidhe: Activada";
    addCondition("Sangre Sidhe", aemi);
    removeCondition("Sangre Sidhe Mal", aemi);
  },
};

toggleSangre[currentMacroState]();

ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ token: actor }),
  flavor: `${message}`,
  whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
});
