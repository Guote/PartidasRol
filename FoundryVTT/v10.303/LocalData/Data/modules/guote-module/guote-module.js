
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getActorFromCombatant = (combatant) => {
  return game.actors.get(combatant.actorId);
};

const getTokenFromCombatant = (combatant) => {
  return canvas.tokens.get(combatant.tokenId);
};
const getCurrentCombatant = (combat) => {
  const combatantId = combat.current.combatantId;
  const combatant = combat.combatants.get(combatantId);
  const activeActor = game.actors.get(combatant.actorId);
  const activeToken = canvas.tokens.get(combatant.tokenId);

  return {
    currCombatant: combatant,
    currActor: activeActor,
    currToken: activeToken,
  };
};
const getMainOwner = (tokenOrActor) => {
  const ownsership = tokenOrActor?.actor?.ownership || tokenOrActor.ownership;
  const activeOwnersId = Object.keys(ownsership).filter(
    (id) => ownsership[id] === 3 && game.users.get(id).active
  );
  return {
    activeOwnersId: activeOwnersId,
  };
};

const triggerMacroIfActiveEffect = async ({
  token,
  effectName,
  macroName,
  extraCondition = true,
}) => {
  const hasEffect = game.cub.hasCondition(effectName, token);
  if (!hasEffect || !extraCondition) return;

  const actorName = token?.name || token?.actor?.name;
  const macroToTrigger = game.macros.find((m) => m.name === macroName);
  console.log(
    `Actor ${actorName}, with tokenId ${token.id} has ${effectName} active. Triggering macro ${macroName}`
  );
  await macroToTrigger.execute({ token: token });
};

const applySurprise = (combat) => {
  // Constants
  const effectName = "Sorpresa";
  const preveerName = "Preveer Sorpresa";

  // Apply only from the GM side
  if (combat && combat.started && game.user.isGM) {
    // Get surprised actors and apply effect
    let currentInitiative = game.combat?.combatants?.get(
      game.combat.current.combatantId
    ).initiative;

    combat.combatants.forEach((comb) => {
      const token = getTokenFromCombatant(comb);
      const shouldBeSurprised = currentInitiative >= comb.initiative + 150;

      if (!shouldBeSurprised && game.cub.hasCondition(effectName, token)) {
        game.cub.removeCondition(effectName, token);
      }

      if (
        shouldBeSurprised &&
        !game.cub.hasCondition(effectName, token) &&
        !game.cub.hasCondition(preveerName, token)
      ) {
        game.cub.addCondition(effectName, token);
      }
    });
  }
};

const triggerMaintenanceMacro = (combat, delta) => {
  // Trigger macros on round start if specific effect is active
  combat.combatants.contents.forEach((comb) => {
    const token = getTokenFromCombatant(comb);
    const { activeOwnersId } = getMainOwner(token);
    const extraCondition =
      (token.isOwner && !game.user.isGM) ||
      (game.user.isGM && activeOwnersId.length === 1);

    triggerMacroIfActiveEffect({
      token: token,
      effectName: "Usando Ki",
      macroName: "Mantenimiento: Ki",
      extraCondition: extraCondition,
    });
    triggerMacroIfActiveEffect({
      token: token,
      effectName: "Usando Zeon",
      macroName: "Mantenimiento: Zeon",
      extraCondition: extraCondition,
    });
  });
};

Hooks.on("updateCombat", async (combat, delta) => {
  const { currToken } = getCurrentCombatant(combat);

  // Update surprise Status on Combat Start and from turn 2 onwards
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  if (
    (delta?.round === 1 || delta.hasOwnProperty("turn")) &&
    !isSomeoneMissing
  ) {
    applySurprise(combat);
  }

  // Trigger macros for current combatant
  // Trigger accumulation and maintenance macros on round start, before rolling
  if (combat.flags.world.newRound === true && delta?.round) {
    triggerMaintenanceMacro(combat, delta);
  }
  // Trigger macro on turn start for current actor
  const conditionEnLlamas = "En Llamas";
  const { activeOwnersId } = getMainOwner(currToken);
  triggerMacroIfActiveEffect({
    token: currToken,
    effectName: conditionEnLlamas,
    macroName: conditionEnLlamas,
    extraCondition:
      currToken.isOwner && (activeOwnersId.length === 1 || !game.user.isGM),
  });
});

Hooks.on("updateCombatant", async function (combatant, data, options, userId) {
  const combat = combatant.parent;
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  // Update surprise Status when last combatant rolls initiative
  if (!isSomeoneMissing) {
    applySurprise(combat);
  }
});

// Apply conditions. To be run only from GM side
/* Hooks.on("updateActor", (actor, updateData, options, userId) => {
  if (game.user.isGM) {
    let modSobFin = actor.system.general.modifiers.modSobrenatural.final.value;
    let token = actor.getActiveTokens()[0];
    let condPlus = "Fortalecimiento";
    let condMinus = "Debilitación";

    console.log("updating actor ", { actor, updateData, modSobFin });

    if (!token) return

    if (modSobFin < 0) {
      // Should have - and not +
      if (game.cub.hasCondition(condPlus, token)) {
        game.cub.removeCondition(condPlus, token);
      }
      if (!game.cub.hasCondition(condMinus, token)) {
        game.cub.addCondition(condMinus, token);
      }
    } else if (modSobFin > 0) {
      if (!game.cub.hasCondition(condPlus, token)) {
        game.cub.addCondition(condPlus, token);
      }
      if (game.cub.hasCondition(condMinus, token)) {
        game.cub.removeCondition(condMinus, token);
      }
    } else {
      if (game.cub.hasCondition(condPlus, token)) {
        game.cub.removeCondition(condPlus, token);
      }
      if (game.cub.hasCondition(condMinus, token)) {
        game.cub.removeCondition(condMinus, token);
      }
    }
  }
}); */

/*********************************************************************************** 
 * Merge Simple Calendar and SmallTime Styles
 **********************************************************************************/
// Merge Simple Calendar and SmallTime styles
// 1. Define your time-based color stops in minutes (0–1440). For example:
const COLOR_STOPS = [
  { time: 0, color: "#000000" }, // midnight
  { time: 288, color: "#351984" }, // ~4:48  AM (20% of day)
  { time: 432, color: "#db5a23" }, // ~7:12  AM (30%)
  { time: 504, color: "#d19621" }, // ~8:24  AM (35%)
  { time: 576, color: "#25c5ed" }, // ~9:36  AM (40%)
  { time: 864, color: "#25c5ed" }, // ~14:24 PM (60%)
  { time: 1008, color: "#d19621" }, // ~16:48 PM (70%)
  { time: 1080, color: "#db5a23" }, // ~18:00 PM (75%)
  { time: 1152, color: "#351984" }, // ~19:12 PM (80%)
  { time: 1440, color: "#000000" }, // next midnight
];

// Converts a hex color (#RRGGBB) into [r,g,b] array.
function parseColor(hex) {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

// Linearly interpolates between two [r,g,b] colors with fraction t in [0..1].
function interpolateColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// Given a dayTime in minutes (0..1439), find the interpolated color.
function getTimeColor(dayTime) {
  // Find the two COLOR_STOPS we’re between
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const stop1 = COLOR_STOPS[i];
    const stop2 = COLOR_STOPS[i + 1];
    if (dayTime >= stop1.time && dayTime <= stop2.time) {
      // fraction of the way from stop1 to stop2
      const t = (dayTime - stop1.time) / (stop2.time - stop1.time);
      const c1 = parseColor(stop1.color);
      const c2 = parseColor(stop2.color);
      const [r, g, b] = interpolateColor(c1, c2, t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  // Fallback if none found (shouldn’t happen if stops cover 0..1440)
  return COLOR_STOPS[0].color;
}
Hooks.on("updateWorldTime", (currentWorldTime) => {
  const dayTime = Math.trunc((currentWorldTime % 86400) / 60);
  const timeColor = getTimeColor(dayTime);

  // Grab the Simple Calendar pop-up and its header
  const scCompactWindow = document.getElementById("fsc-if");
  if (!scCompactWindow) return;
  const headerEl = scCompactWindow.querySelector("header.window-header");
  if (!headerEl) return;

  console.log({dayTime, timeColor})
  headerEl.style.backgroundColor = timeColor;
});
