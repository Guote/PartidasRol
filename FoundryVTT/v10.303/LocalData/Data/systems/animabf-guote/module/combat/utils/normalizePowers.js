/**
 * Normalises the `powers` field of a summon item, which may be stored
 * as an Array (new items) or a plain Object keyed by index (legacy Foundry storage).
 * @param {Array|Object|null} raw
 * @returns {Array}
 */
export const normalizePowers = (raw) =>
    Array.isArray(raw) ? raw : (raw ? Object.values(raw) : []);
