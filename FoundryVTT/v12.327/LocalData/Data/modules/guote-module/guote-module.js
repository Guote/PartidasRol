Hooks.on("combatTurnChange", (combat) => {
  console.log("combatTurnChange triggered");
  const combatantId = combat.current.combatantId;
  const combatant = combat.combatants.get(combatantId);
  const activeActor = game.actors.get(combatant.actorId);
  const activeToken = canvas.tokens.get(combatant.tokenId);
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );
  console.log({
    combatantId,
    combatant,
    activeActor,
    activeToken,
    isSomeoneMissing,
  });
});

/* Hooks.on("combatTurnChange", (combat, updateData) => {
  console.log("ASDASDASDASDASDASDASDASDASDASDAS - ", "updateCombat", {
    combat,
    updateData,
  });
  const { currToken } = getCurrentCombatant(combat);

  // Update surprise Status on Combat Start and from turn 2 onwards
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  if (
    (updateData?.round === 1 || updateData.hasOwnProperty("turn")) &&
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
}); */

/* Hooks.on("updateCombatant", function (combatant, data, options, userId) {
  console.log("✅ ASDASDASDASDASDASDASDASDASDASDAS - ", "updateCombatant", {
    combatant,
  });
  const combat = combatant.parent;
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  // Update surprise Status when last combatant rolls initiative
  if (!isSomeoneMissing) {
    applySurprise(combat);
  }
}); */

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
      if (hasStatusEffect(condPlus, token)) {
        removeStatusEffect(condPlus, token);
      }
      if (!hasStatusEffect(condMinus, token)) {
        applyStatusEffect(condMinus, token);
      }
    } else if (modSobFin > 0) {
      if (!hasStatusEffect(condPlus, token)) {
        applyStatusEffect(condPlus, token);
      }
      if (hasStatusEffect(condMinus, token)) {
        removeStatusEffect(condMinus, token);
      }
    } else {
      if (hasStatusEffect(condPlus, token)) {
        removeStatusEffect(condPlus, token);
      }
      if (hasStatusEffect(condMinus, token)) {
        removeStatusEffect(condMinus, token);
      }
    }
  }
}); */
