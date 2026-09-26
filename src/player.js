// ── player.js ───────────────────────────────────────────────────────────
// The player mesh's own motion: lane lerp, jump gravity, the slide squash and
// the run / air pose. Split out of update() so the animation rules can be read
// without wading through the simulation.
import { G } from './state.js';
import { GROUND_Y } from './scene.js';

/**
 * @param {THREE.Object3D} mesh  the rendered character
 * @param {number} dt  frame delta in seconds
 * @param {number} t  elapsed game time, drives the run cycle
 * @returns {void}
 */
export function updatePlayerMotion(mesh, dt, t) {
  // Smooth Lane Transition
  mesh.position.x += (G.targetX - mesh.position.x) * 14 * dt;

  // Jump & Gravity Physics
  if (!G.isGrounded) {
    G.playerY += G.playerVy * dt;
    G.playerVy -= 38 * dt; // Snappy crisp gravity curve
    if (G.playerY <= 0) {
      G.playerY = 0;
      G.playerVy = 0;
      G.isGrounded = true;
    }
  }

  // Apply visual Y and sliding squish
  if (G.isSliding) {
    mesh.scale.set(1.2, 0.45, 1.2);
    mesh.position.y = GROUND_Y + G.playerY;
  } else {
    mesh.scale.set(1, 1, 1);
    mesh.position.y = GROUND_Y + G.playerY;
  }

  // Running vs Air Jump pose
  if (G.isGrounded && !G.isSliding) {
    if (mesh.legL) {
      const runFreq = t * (G.runSpeed * 0.7);
      mesh.legL.rotation.x = Math.sin(runFreq) * 0.7;
      mesh.legR.rotation.x = -Math.sin(runFreq) * 0.7;
      mesh.armL.rotation.x = -Math.sin(runFreq) * 0.6;
      mesh.armR.rotation.x = Math.sin(runFreq) * 0.6;
    }
  } else if (!G.isGrounded) {
    // Mid-air tuck pose (Subway Surfers jump silhouette)
    if (mesh.legL) {
      mesh.legL.rotation.x = 0.6;
      mesh.legR.rotation.x = -0.5;
      mesh.armL.rotation.x = -0.9;
      mesh.armR.rotation.x = -0.9;
    }
  }
}
