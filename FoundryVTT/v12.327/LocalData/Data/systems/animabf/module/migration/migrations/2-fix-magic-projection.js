const Migration2MagicProjection = {
  version: 2,
  title: "Magic Projection Removed",
  description: "We remove the main magic projection.In case the magic imbalance is 0, we put the main projection value on both offensive and defensive imbalance.",
  updateActor(actor) {
    if (actor.system.mystic.magicProjection.imbalance.offensive.base.value === 0) {
      actor.system.mystic.magicProjection.imbalance.offensive.base.value = actor.system.mystic.magicProjection.base.value;
    }
    if (actor.system.mystic.magicProjection.imbalance.defensive.base.value === 0) {
      actor.system.mystic.magicProjection.imbalance.defensive.base.value = actor.system.mystic.magicProjection.base.value;
    }
    return actor;
  }
};
export {
  Migration2MagicProjection
};
