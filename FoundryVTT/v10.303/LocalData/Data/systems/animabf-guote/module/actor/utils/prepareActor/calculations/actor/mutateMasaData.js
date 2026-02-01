/**
 * Calculate and mutate masa (group) data for actors that are masas.
 * This calculates the number of living members based on current LP.
 *
 * Access living members via: actor.system.masa.livingMembers
 */
export const mutateMasaData = (data, actor) => {
  // Initialize masa data structure
  data.masa = data.masa || {
    isMasa: false,
    totalMembers: 0,
    lpPerMember: 0,
    livingMembers: 0,
  };

  // Check if this actor is a masa
  const masaFlags = actor.flags?.animabf?.masa;
  if (!masaFlags?.isMasa) {
    return;
  }

  const { totalMembers, lpPerMember } = masaFlags;
  const currentLp = data.characteristics.secondaries.lifePoints.value;

  // Calculate living members (minimum 0, maximum totalMembers)
  const livingMembers =
    lpPerMember > 0
      ? Math.min(totalMembers, Math.max(0, Math.ceil(currentLp / lpPerMember)))
      : totalMembers;

  // Store in system data for easy access
  data.masa = {
    isMasa: true,
    totalMembers: totalMembers,
    lpPerMember: lpPerMember,
    livingMembers: livingMembers,
  };
};
