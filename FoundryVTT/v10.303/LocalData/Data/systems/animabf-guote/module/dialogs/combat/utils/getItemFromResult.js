/**
 * Returns the item (weapon, spell, or psychic power) referenced by a combat result object.
 *
 * @param {object} actor - The FoundryVTT actor whose items are searched.
 * @param {object} result - A combat result with shape { type, values }.
 *   - type "combat"  → values.weaponUsed (item _id)
 *   - type "mystic"  → values.spellUsed  (item _id)
 *   - type "psychic" → values.powerUsed  (item _id)
 *   - type "summon"  → values.summonUsed (item _id)
 * @returns {object|undefined} The matched item, or undefined if not found.
 */
export function getItemFromResult(actor, result) {
  switch (result.type) {
    case "combat": {
      const { weapons } = actor.system.combat;
      return weapons.find((w) => w._id === result.values.weaponUsed);
    }
    case "mystic": {
      const { spells } = actor.system.mystic;
      return spells.find((w) => w._id === result.values.spellUsed);
    }
    case "psychic": {
      const powers = actor.system.psychic.psychicPowers;
      return powers.find((w) => w._id === result.values.powerUsed);
    }
    case "summon": {
      return actor.items.get(result.values.summonUsed);
    }
    default:
      return undefined;
  }
}
