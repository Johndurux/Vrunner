// ── unlock.js ────────────────────────────────────────────────────────────
// Which characters the player has earned, and what is still owed.
//
// Progress lives in the save blob, so the answer is a pure function of two
// numbers: coins banked and best distance. Keeping the thresholds here, away
// from both the roster data and the DOM, means the roster modal and the
// in-game character swap can ask the same question and never disagree.

import { CHARACTERS } from './characters.js';

/**
 * Requirements per character, keyed by id. A character with no entry is
 * available from the start.
 *
 * The curve is deliberately gentle at the front and then climbs: the first
 * unlock should land inside a normal first session, the last one should need
 * a player who has actually kept running. Distance gates exist because a
 * player can bank coins by farming short safe runs, and those should not
 * open the whole roster on their own.
 */
export const UNLOCK_RULES = {
  mist:     { coins: 40,  dist: 120 },
  pip:      { coins: 90,  dist: 260 },
  honey:    { coins: 180, dist: 480 },
  goggles:  { coins: 300, dist: 700 },
  captain:  { coins: 480, dist: 1000 },
  lavender: { coins: 720, dist: 1400 },
  tux:      { coins: 1050, dist: 1900 },
  mrhat:    { coins: 1500, dist: 2600 },
};

const LABEL = {
  coins: (n) => `${n} $VIBE`,
  dist: (n) => `${n}m`,
};

/**
 * Has this character been earned?
 * @param {{id: string}} character
 * @param {number} coins total coins banked, ever
 * @param {number} dist  best single-run distance, metres
 */
export function isUnlocked(character, coins, dist) {
  const rule = UNLOCK_RULES[character.id];
  if (!rule) return true;
  return coins >= rule.coins && dist >= rule.dist;
}

/**
 * Whether a single requirement is met, so the roster can show progress on one
 * half of a two-part gate instead of only the finished state.
 * @param {'coins'|'dist'} part
 * @param {{id: string}} character
 * @param {number} value coins banked or best distance
 */
export function meetsPart(part, character, value) {
  const rule = UNLOCK_RULES[character.id];
  if (!rule) return true;
  return value >= rule[part];
}

/**
 * The requirement text for a locked character, e.g. "180 $VIBE + 480m".
 * Returns an empty string for a character that needs no unlocking.
 * @param {{id: string}} character
 */
export function requirementText(character) {
  const rule = UNLOCK_RULES[character.id];
  if (!rule) return '';
  return `${LABEL.coins(rule.coins)} + ${LABEL.dist(rule.dist)}`;
}

/**
 * How much of a two-part gate is still outstanding, for the progress hint.
 * @param {{id: string}} character
 * @param {number} coins
 * @param {number} dist
 */
export function shortfall(character, coins, dist) {
  const rule = UNLOCK_RULES[character.id];
  if (!rule) return null;
  if (isUnlocked(character, coins, dist)) return null;
  return {
    coins: Math.max(0, rule.coins - coins),
    dist: Math.max(0, rule.dist - dist),
  };
}

/**
 * The whole roster, annotated with the player's progress. `unlocked` here is
 * the effective value for this save, which is what the UI renders; the static
 * `unlocked` field on the character data is only the "no requirement" default.
 * @param {number} coins
 * @param {number} dist
 */
export function rosterStatus(coins, dist) {
  return CHARACTERS.map((c, idx) => {
    const unlocked = isUnlocked(c, coins, dist);
    return {
      index: idx,
      character: c,
      unlocked,
      // A starting character has no gate, so it reads UNLOCKED outright.
      status: unlocked ? 'UNLOCKED' : 'LOCKED',
      requirement: requirementText(c),
      coinsMet: meetsPart('coins', c, coins),
      distMet: meetsPart('dist', c, dist),
      remaining: shortfall(c, coins, dist),
    };
  });
}

/**
 * Does earning progress change anything the player can see right now? Called
 * after a run is banked so the roster can be rebuilt and, if a new character
 * opened up, announced.
 * @param {number} coins
 * @param {number} dist
 */
export function newlyUnlocked(coins, dist) {
  return rosterStatus(coins, dist)
    .filter((r) => r.unlocked)
    .map((r) => r.character);
}
