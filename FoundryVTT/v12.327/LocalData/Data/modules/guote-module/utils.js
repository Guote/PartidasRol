function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getActorFromCombatant = (combatant) => {
  return game.actors.get(combatant.actorId);
};

export const getTokenFromCombatant = (combatant) => {
  return canvas.tokens.get(combatant.tokenId);
};
export const getCurrentCombatant = (combat) => {
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
export const getMainOwner = (tokenOrActor) => {
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
  const hasEffect = hasStatusEffect(effectName, token);
  if (!hasEffect || !extraCondition) return;

  const actorName = token?.name || token?.actor?.name;
  const macroToTrigger = game.macros.find((m) => m.name === macroName);
  console.log(
    `Actor ${actorName}, with tokenId ${token.id} has ${effectName} active. Triggering macro ${macroName}`
  );
  await macroToTrigger.execute({ token: token });
};

export const applySurprise = (combat) => {
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

      if (!shouldBeSurprised && hasStatusEffect(effectName, token)) {
        removeStatusEffect(effectName, token);
      }

      if (
        shouldBeSurprised &&
        !hasStatusEffect(effectName, token) &&
        !hasStatusEffect(preveerName, token)
      ) {
        applyStatusEffect(effectName, token);
      }
    });
  }
};

export const triggerMaintenanceMacro = (combat, delta) => {
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

export function hasStatusEffect(token, effectId) {
  console.log("hasStatusEffect", { token, effectId });
  return token?.actor?.effects.some(
    (e) => e.flags?.core?.statusId === effectId
  );
}

// Active effects manipulation
export async function applyStatusEffect(token, effectId) {
  const effect = CONFIG.statusEffects.find(
    (e) => e.flags?.core?.statusId === effectId
  );
  if (!effect) return;

  await token.actor?.createEmbeddedDocuments("ActiveEffect", [
    {
      label: effect.label,
      icon: effect.icon,
      changes: effect.changes,
      duration: effect.duration ?? {},
      flags: {
        core: { statusId: effectId },
        ...effect.flags,
      },
      origin: token.actor.uuid,
      disabled: false,
      transfer: false,
    },
  ]);
}

export async function removeStatusEffect(token, effectId) {
  const effect = token?.actor?.effects.find(
    (e) => e.flags?.core?.statusId === effectId
  );
  if (effect) {
    await effect.delete();
  }
}
