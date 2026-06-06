/**
 * Register hooks for masa (group) functionality.
 * Keeps both actor name and token names in sync with living member count.
 */
export const registerMasaHooks = () => {
  // Hook into actor updates to refresh name display for masas
  Hooks.on("updateActor", async (actor, changes, options, userId) => {
    const masaFlags = actor.flags?.animabf?.masa;
    if (!masaFlags?.isMasa) return;

    const lpChanged =
      changes.system?.characteristics?.secondaries?.lifePoints?.value !==
      undefined;
    if (!lpChanged) return;

    const masaData = actor.system.masa;
    if (!masaData) return;

    await updateMasaNames(null, actor, masaData);

    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
      await updateMasaNames(token, actor, masaData);
    }
  });

  // Hook into token creation to set initial name for masas
  Hooks.on("createToken", async (tokenDoc, options, userId) => {
    const actor = tokenDoc.actor;
    if (!actor) return;

    const masaFlags = actor.flags?.animabf?.masa;
    if (!masaFlags?.isMasa) return;

    const masaData = actor.system.masa;
    if (!masaData) return;

    await updateMasaNames(tokenDoc, actor, masaData);
  });
};

/**
 * Build the canonical masa name from the actor's base name and living count.
 */
const buildMasaName = (actor, masaData) => {
  const { livingMembers } = masaData;
  const baseName = actor.name.replace(/\s*\[\d+\]\s*$/, "");
  return `${baseName} [${livingMembers}]`;
};

/**
 * Update actor name and/or token name to reflect the current living member count.
 * Pass token=null to skip the token update (actor-only sync).
 */
const updateMasaNames = async (token, actor, masaData) => {
  const newName = buildMasaName(actor, masaData);

  if (actor.name !== newName) {
    await actor.update({ name: newName });
  }

  if (token && token.name !== newName) {
    await token.update({ name: newName });
  }
};
