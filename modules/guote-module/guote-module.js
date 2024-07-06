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
Hooks.on("updateActor", (actor, updateData, options, userId) => {
  if (game.user.isGM) {
    let modSobFin = actor.system.general.modifiers.modSobrenatural.final.value;
    let token = actor.getActiveTokens()[0];
    let condPlus = "Fortalecimiento";
    let condMinus = "Debilitación";

    console.log("uopdating actor ", { actor, updateData, modSobFin });

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
});
