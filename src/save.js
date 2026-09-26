// ── save.js ─────────────────────────────────────────────────────────────
// Local persistence. Still localStorage, but it now also stores the character
// selection, so the roster pick and sound setting survive a reload.

import { G } from './state.js';

export const SAVE_KEY = 'vibe-runner-save';

/** Read the save blob, or an empty object when there is nothing stored yet. */
export function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); }
  catch { return {}; }
}

/** Merge `patch` into the save blob. Never throws: a full or blocked
 *  localStorage just means progress is not persisted this session. */
export function writeSave(patch) {
  const next = { ...loadSave(), ...patch };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
  return next;
}

/** Seed the state object from the stored save. Called once at boot. */
export function restoreState() {
  const s = loadSave();
  G.walletAddress = s.wallet || '';
  G.totalSavedCoins = Number(s.coins || 0);
  G.bestDist = Number(s.bestDist || 0);
  return s;
}
