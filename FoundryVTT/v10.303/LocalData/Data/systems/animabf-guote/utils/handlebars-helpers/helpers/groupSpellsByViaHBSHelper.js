/**
 * Handlebars helper: groups a flat spell array by via, sorted alphabetically within each group.
 * Via order matches the grimoire tab order (primary spheres first, then subvias).
 * Returns: Array<{ via: string, label: string, spells: spell[] }>
 */
const VIA_ORDER = [
  'freeAccess',
  'light', 'darkness',
  'creation', 'destruction',
  'fire', 'water',
  'air', 'earth',
  'essence',
  'illusion', 'necromancy',
  'blood', 'chaos', 'death', 'dreams', 'emptiness',
  'knowledge', 'literae', 'musical', 'nobility', 'peace',
  'sin', 'threshold', 'time', 'war'
];

export const groupSpellsByViaHBSHelper = {
  name: 'groupSpellsByVia',
  fn: (spells) => {
    const groups = new Map();

    for (const spell of (spells ?? [])) {
      const via = spell.system?.via?.value || 'other';
      if (!groups.has(via)) groups.set(via, []);
      groups.get(via).push(spell);
    }

    // Sort alphabetically within each group
    for (const spellList of groups.values()) {
      spellList.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Build result in defined via order
    const result = [];
    for (const via of VIA_ORDER) {
      if (groups.has(via)) {
        const label = game.i18n.localize(`anima.ui.mystic.spell.via.${via}.title`);
        result.push({ via, label, spells: groups.get(via) });
        groups.delete(via);
      }
    }

    // Any remaining vias not in the standard order
    for (const [via, spellList] of groups) {
      result.push({ via, label: via, spells: spellList });
    }

    return result;
  }
};
