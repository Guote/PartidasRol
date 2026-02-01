/**
 * Register hooks for masa (group) functionality.
 * Updates token name to show living members count.
 */
export const registerMasaHooks = () => {
  // Hook into actor updates to refresh token display for masas
  Hooks.on("updateActor", async (actor, changes, options, userId) => {
    // Only process if this is a masa and LP changed
    const masaFlags = actor.flags?.animabf?.masa;
    if (!masaFlags?.isMasa) return;

    const lpChanged =
      changes.system?.characteristics?.secondaries?.lifePoints?.value !==
      undefined;
    if (!lpChanged) return;

    // Get the updated masa data (calculated in prepareActor)
    const masaData = actor.system.masa;
    if (!masaData) return;

    // Update all tokens linked to this actor
    const tokens = actor.getActiveTokens();
    for (const token of tokens) {
      await updateMasaTokenName(token, actor, masaData);
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

    await updateMasaTokenName(tokenDoc, actor, masaData);
  });
};

/**
 * Update a token's name to show living members count.
 * Format: "Base Name x5 [3]" where 3 is living members
 */
const updateMasaTokenName = async (token, actor, masaData) => {
  const { totalMembers, livingMembers } = masaData;

  // Extract base name (remove any existing member count suffix)
  let baseName = actor.name;
  // Remove existing [X] suffix if present
  baseName = baseName.replace(/\s*\[\d+\]\s*$/, "");

  // Build new name with living members count
  const newName = `${baseName} [${livingMembers}]`;

  // Only update if name actually changed
  if (token.name !== newName) {
    await token.update({ name: newName });
  }
};
