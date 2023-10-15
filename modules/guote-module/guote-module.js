const getActorFromCombatant = (combatant) => {
  return game.actors.get(combatant.actorId);
};
const getTokenFronCombatant = (combatant) => {
  return canvas.tokens.get(combatant.tokenId);
};

const triggerMacroIfActiveEffect = ({ actor, effectName, macroName }) => {
  const macroToTrigger = game.macros.find((m) => m.name === macroName);

  const hasEffect = game.cub.hasCondition(effectName, actor);

  if (hasEffect && !game.user.isGM) {
    console.log(
      `Actor ${actor.name}, has ${effectName} active. Triggering macro ${macroName}`
    );
    macroToTrigger.execute();
  }
};

const applySurprise = (combat) => {
  // Constants
  const effectName = "Sorpresa";
  const preveerName = "Preveer Sorpresa";

  // On round start, wait for everyone to roll
  let isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  if (combat && combat.started) {
    if (isSomeoneMissing) {
      return setTimeout(() => {
        console.log("Waiting for every combatant to roll Initiative");
        applySurprise(combat);
      }, "3000");
    }
    // Get surprised actors and apply effect
    let currentInitiative = game.combat?.combatants?.get(
      game.combat.current.combatantId
    ).initiative;

    combat.combatants.forEach((comb) => {
      const token = getTokenFronCombatant(comb);
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
  if (combat.flags.world.newRound === true && delta?.round) {
    combat.combatants.contents.forEach((comb) => {
      const actor = getActorFromCombatant(comb);
      const currentUserId = game.userId;

      if (actor.ownership[currentUserId] !== 3 || game.user.isGM) {
        return;
      }

      triggerMacroIfActiveEffect({
        actor: actor,
        effectName: "Usando Ki",
        macroName: "Mantenimiento: Ki",
      });
      triggerMacroIfActiveEffect({
        actor: actor,
        effectName: "Usando Zeon",
        macroName: "Mantenimiento: Zeon",
      });
    });
  }
};

Hooks.on("updateCombat", async (combat, delta) => {
  // Trigger accumulation and maintenance macros
  triggerMaintenanceMacro(combat, delta);

  // Apply surprise effect
  applySurprise(combat);
});
