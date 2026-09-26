// ── roster.js ───────────────────────────────────────────────────────────
// Character selection: the lobby pedestal, the preview mesh standing on it,
// and the roster list in the dashboard. The selected character is also the one
// used during a run.

import { G } from './state.js';
import * as THREE from 'three';
import { CHARACTERS } from './characters.js';
import { audio } from './audio.js';
import { scene, GROUND_Y } from './scene.js';
import { vox, disposeObject } from './utils.js';
import { writeSave, loadSave } from './save.js';
import { isUnlocked } from './unlock.js';

export const lobbyStage = new THREE.Group();
// Kept small on purpose: at 3.2u across it filled most of a portrait viewport
// and the ring's edge cut across the character's feet.
export const pedestal = vox(2.1, 0.36, 2.1, 0x181c28, { y: 0.32 });
export const pedRing = vox(2.25, 0.08, 2.25, 0xe0643a, { y: 0.5 });
pedRing.material = new THREE.MeshBasicMaterial({ color: 0xe0643a });
lobbyStage.add(pedestal, pedRing);
scene.add(lobbyStage);
export const roster = { mesh: null };

/**
 * Swap the active character.
 *
 * A locked character is refused rather than quietly equipped: the roster
 * renders a locked entry as clickable-looking, and letting it through would
 * hand the player a body they have not earned. The guard lives here, in the
 * one function every entry point goes through, so the roster modal and any
 * future keyboard shortcut cannot bypass it.
 * @param {number} idx index into CHARACTERS
 * @returns {boolean} whether the swap happened
 */
export function setCharacter(idx) {
  const data = CHARACTERS[idx];
  if (!data) return false;
  if (!isUnlocked(data, G.totalSavedCoins, G.bestDist)) {
    audio.click();
    return false;
  }
  if (roster.mesh) disposeObject(roster.mesh);
  G.selectedCharIdx = idx;
  roster.mesh = data.build();
  roster.mesh.position.set(0, 0.8, 0);
  roster.mesh.scale.set(1, 1, 1);
  scene.add(roster.mesh);

  document.getElementById('lobbyHeroName').textContent = data.name;
  document.getElementById('lobbyHeroRole').textContent = data.role;
  pedRing.material.color.set(data.color);
  document.querySelectorAll('.roster-item').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  // Persist only after the swap actually happened. Writing on the locked
  // path would store a character the player does not have equipped.
  writeSave({ selectedCharIdx: idx });
  return true;
}
