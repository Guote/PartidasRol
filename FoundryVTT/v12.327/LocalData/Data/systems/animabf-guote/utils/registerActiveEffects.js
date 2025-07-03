export const registerActiveEffects = async () => {
  const pack = game.packs.get("animabf-guote.status-effects");
  if (!pack) {
    console.error("❌ Could not find compendium: animabf-guote.status-effects");
    return;
  }

  const effects = await pack.getDocuments();

  for (const effect of effects) {
    if (!effect) continue;

    CONFIG.statusEffects.push({
      id: effect.id,
      label: effect.name || effect.label,
      icon: effect.icon,
      changes: effect.changes,
      duration: effect.duration,
      flags: {
        core: { statusId: effect.id },
        "animabf-guote": { fromCompendium: true },
      },
    });
  }

  console.log(
    `✅ Registered ${effects.length} custom status effects from compendium.`
  );
};
