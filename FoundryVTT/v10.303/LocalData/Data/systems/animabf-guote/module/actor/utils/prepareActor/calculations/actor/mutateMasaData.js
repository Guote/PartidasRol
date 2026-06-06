export const calculateLivingMembers = (currentLp, lpPerMember, totalMembers) => {
  if (lpPerMember <= 0) return totalMembers;
  return Math.min(totalMembers, Math.max(0, Math.ceil(currentLp / lpPerMember)));
};

/**
 * Calculate and mutate masa (group) data for actors that are masas.
 * Access living members via: actor.system.masa.livingMembers
 */
export const mutateMasaData = (data, actor) => {
  data.masa = data.masa || {
    isMasa: false,
    totalMembers: 0,
    lpPerMember: 0,
    livingMembers: 0,
  };

  const masaFlags = actor.flags?.animabf?.masa;
  if (!masaFlags?.isMasa) return;

  const { totalMembers, lpPerMember } = masaFlags;
  const currentLp = data.characteristics.secondaries.lifePoints.value;

  data.masa = {
    isMasa: true,
    totalMembers,
    lpPerMember,
    livingMembers: calculateLivingMembers(currentLp, lpPerMember, totalMembers),
  };
};
