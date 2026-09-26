// ── update.js ───────────────────────────────────────────────────────────
// The per-frame simulation, split into ordered passes so each has one job:
//
//   1. guard    the pause check, plus the camera lerp that runs in every state
//   2. lobby    idle-bob the character on the pedestal
//   3. run      timers, speed ramp, distance, player motion, track streaming,
//               hit detection, camera tracking
//   4. feel     power-up tick, FOV + roll + shake, the chaser
//
// The character mesh is threaded through as an argument rather than imported,
// so the lobby can pass its preview mesh and a run passes the live one.
import * as THREE from 'three';
import { roster } from './roster.js';
import { puState, runSpeedBoost, updatePowerup } from './powerups.js';
import { CAM_GAME, GROUND_Y, LANES } from './scene.js';
import { updateCameraRoll, updateScreenShake, updateSpeedFov } from './camera.js';
import { chaser } from './chaser.js';
import { G } from './state.js';
import { clock } from './timing.js';
import { camera } from './scene.js';
import { updatePlayerMotion } from './player.js';
import { advanceTrack } from './track.js';
import { updateCollisions } from './collision.js';
import { animateScenery } from './deco.js';
import { applyDistrict } from './zones.js';
import { trackChunks, scene } from './scene.js';

/**
 * Idle-bob the lobby preview mesh.
 * @param {THREE.Object3D} mesh
 * @param {number} t  elapsed game time
 * @returns {void}
 */
function stepLobby(mesh, t) {
  if (roster.mesh) {
    // Idle floating & gentle rotation standing above pedestal
    roster.mesh.position.set(0, 0.8 + Math.sin(t * 1.5) * 0.05, 0);
    roster.mesh.rotation.y = Math.sin(t * 0.8) * 0.25;
  }
  return;
}

/**
 * Everything that only happens while a run is in progress.
 * @param {number} dt  frame delta in seconds, already clamped
 * @param {number} t  elapsed game time
 * @param {THREE.Object3D} mesh  the live player mesh
 * @returns {void}
 */
function stepRun(dt, t, mesh) {
  // Slide timer runs on game time so a backgrounded tab cannot expire it.
  if (G.isSliding) {
    G.slideTimeLeft -= dt;
    if (G.slideTimeLeft <= 0) {
      G.isSliding = false;
      G.slideTimeLeft = 0;
    }
  }
  // The hoverboard adds 20% on top of the G.distance-scaled speed. The
  // speed cap moves out while it is active so the boost cannot push the
  // scene past what the track spawner can keep up with.
  const cap = puState.powerup && puState.powerup.type === 'hoverboard' ? 43 : 36;
  G.runSpeed = Math.min(cap, (18 + (G.distance / 120)) * runSpeedBoost());
  const moveZ = G.runSpeed * dt;
  G.distance += moveZ;

  document.getElementById('hudDistance').innerHTML = `${Math.floor(G.distance)}<span>m</span>`;

    updatePlayerMotion(mesh, dt, t);
    advanceTrack(moveZ);
    // Obstacles can end the run, so they resolve before collectables.
    updateCollisions(dt, moveZ, mesh);

    // Camera tracks the player, lifted by the jump arc.
  G.camTargetPos.x = roster.mesh.position.x * 0.4;
  G.camTargetPos.y = CAM_GAME.y + (G.playerY * 0.4);
  G.camTargetLook.x = roster.mesh.position.x * 0.2;
  G.camTargetLook.y = CAM_GAME.lookY + (G.playerY * 0.25);
}

/**
 * Power-up timers, camera feel and the chaser. Runs last so it sees the
 * post-collision state: a shield save shows its glow on the same frame.
 * @param {number} dt  frame delta in seconds, already clamped
 * @param {number} t  elapsed game time
 * @param {THREE.Object3D} mesh  the live player mesh
 * @returns {void}
 */
function stepFeel(dt, t, mesh) {
  // Power-up tick: timers, magnet pull and the hoverboard glow. Driven by
  // game time, so pausing freezes the countdown instead of eating it.
  updatePowerup(dt, LANES[G.playerLane], mesh.position.z);

  // Camera feel: FOV follows speed, roll follows the lane, shake decays.
  updateSpeedFov(dt);
  updateCameraRoll(dt);
  updateScreenShake(dt);

  // === TRUMP CHASER UPDATE (SUBWAY SURFERS STYLE) ===
  if (chaser.active && chaser.mesh) {
    chaser.phase += dt;

    // Trump tracks behind the player in the same lane
    chaser.mesh.position.x += (roster.mesh.position.x - chaser.mesh.position.x) * 5.0 * dt;
    chaser.mesh.position.y = GROUND_Y;

    // Subway Surfers mechanic:
    // Start of run (G.distance < 35m): Trump chases behind (z = 3.0m) for the intro thrill!
    // After 35m: Player outruns him, Trump drops safely off-screen behind camera (z = 8.8m) so character and tracks are 100% unobstructed!
    const targetZ = G.distance < 35 ? 3.0 : 8.8;
    chaser.mesh.position.z += (targetZ - chaser.mesh.position.z) * 2.5 * dt;

    // Animated running legs & arms
    if (chaser.mesh.legL) {
      const cf = chaser.phase * (G.runSpeed * 0.7);
      chaser.mesh.legL.rotation.x = Math.sin(cf) * 0.75;
      chaser.mesh.legR.rotation.x = -Math.sin(cf) * 0.75;
      chaser.mesh.armL.rotation.x = -Math.sin(cf) * 0.6;
      chaser.mesh.armR.rotation.x = Math.sin(cf) * 0.6;
    }
  }
}

/**
 * One simulation step.
 * @param {number} dt  frame delta in seconds, already clamped by the caller
 * @param {THREE.Object3D} mesh  the player mesh for the current state
 * @returns {void}
 */
export function update(dt, mesh) {
  const t = clock.getElapsedTime();
  if (G.isPaused) return; // frozen: no distance, no collision, no death

  // Camera smoothing runs in every state, including the lobby.
  camera.position.lerp(G.camTargetPos, 8 * dt);
  camera.lookAt(G.camTargetLook);

  if (G.gameState === 'LOBBY') { stepLobby(mesh, t); return; }
  if (G.gameState !== 'RUNNING') return;

  stepRun(dt, t, mesh);
  stepFeel(dt, t, mesh);

  // Scenery blinkers and the sky palette are cosmetic, so they live at the
  // end of the pass: if the run ended this frame, they still settle.
  applyDistrict(scene, scene.fog);
  animateScenery(trackChunks, t);
}
