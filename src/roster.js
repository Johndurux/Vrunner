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

export const lobbyStage = new THREE.Group();
export const pedestal = vox(3.2, 0.5, 3.2, 0x181c28, { y: 0.45 });
export const pedRing = vox(3.4, 0.1, 3.4, 0xe0643a, { y: 0.72 });
pedRing.material = new THREE.MeshBasicMaterial({ color: 0xe0643a });
lobbyStage.add(pedestal, pedRing);
scene.add(lobbyStage);
export const roster = { mesh: null };

export function setCharacter(idx) {
  if (roster.mesh) disposeObject(roster.mesh);
  G.selectedCharIdx = idx;
  const data = CHARACTERS[idx];
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
}
