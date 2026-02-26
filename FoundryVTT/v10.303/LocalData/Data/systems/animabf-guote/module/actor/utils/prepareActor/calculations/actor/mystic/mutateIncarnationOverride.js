/**
 * When an incarnation is active, override the character's combat/projection stats
 * with max(own, incarnation) for: turno (initiative), HA (attack), HD (block/dodge),
 * magicProjection, and psychicProjection.
 *
 * Must run AFTER mutateCombatData, mutateMysticData, mutatePsychicData, and mutateInitiative.
 */
export const mutateIncarnationOverride = (data) => {
    const incarnations = data.mystic?.incarnations;
    if (!incarnations || !Array.isArray(incarnations)) return;

    const active = incarnations.find(inc => inc.system?.active?.value);
    if (!active) return;

    const inc = active.system;

    // Initiative / Turno
    const initiative = data.characteristics?.secondaries?.initiative;
    if (initiative && inc.turno?.value) {
        initiative.final.value = Math.max(initiative.final.value, inc.turno.value);
    }

    // HA (Attack)
    const attack = data.combat?.attack;
    if (attack && inc.ha?.value) {
        attack.final.value = Math.max(attack.final.value, inc.ha.value);
    }

    // HD (Block and Dodge)
    const block = data.combat?.block;
    if (block && inc.hd?.value) {
        block.final.value = Math.max(block.final.value, inc.hd.value);
    }
    const dodge = data.combat?.dodge;
    if (dodge && inc.hd?.value) {
        dodge.final.value = Math.max(dodge.final.value, inc.hd.value);
    }

    // Magic Projection
    const magicProj = data.mystic?.magicProjection;
    if (magicProj && inc.magicProjection?.value) {
        magicProj.final.value = Math.max(magicProj.final.value, inc.magicProjection.value);
        if (magicProj.imbalance) {
            magicProj.imbalance.offensive.final.value = Math.max(magicProj.imbalance.offensive.final.value, inc.magicProjection.value);
            magicProj.imbalance.defensive.final.value = Math.max(magicProj.imbalance.defensive.final.value, inc.magicProjection.value);
        }
    }

    // Psychic Projection
    const psychicProj = data.psychic?.psychicProjection;
    if (psychicProj && inc.psychicProjection?.value) {
        psychicProj.final.value = Math.max(psychicProj.final.value, inc.psychicProjection.value);
        if (psychicProj.imbalance) {
            psychicProj.imbalance.offensive.final.value = Math.max(psychicProj.imbalance.offensive.final.value, inc.psychicProjection.value);
            psychicProj.imbalance.defensive.final.value = Math.max(psychicProj.imbalance.defensive.final.value, inc.psychicProjection.value);
        }
    }
};
