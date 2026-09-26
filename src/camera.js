// ── camera.js ───────────────────────────────────────────────────────────
// Screen shake, speed-driven FOV and lane roll. The three passes that make
// the run feel like it has weight and speed rather than sliding along.
//
// All three decay on game time, so pausing freezes them exactly like the
// rest of the run. The state lives in one object rather than separate `let`
// bindings: a module cannot observe another module's `export let` after it is
// reassigned, so a caller would keep reading a stale value.
import { G } from './state.js';
import { roster } from './roster.js';
import { camera, LANES } from './scene.js';
import { runSpeedBoost } from './powerups.js';

/**
 * The FOV the camera rests at; updateSpeedFov() opens it up with speed.
 * The scene builds its camera at 70 and resetCameraFeel() snaps it back here
 * on every run, so these two must stay equal or the first frame of a run
 * differs from the lobby.
 */
export const BASE_FOV = 70;

export const camFeel = {
  shakeTimeLeft: 0,
  shakeDuration: 0,
  shakeAmp: 0,
  baseFov: BASE_FOV,
  currentFov: BASE_FOV,
};

/**
 * Kick the camera. Never shortens an in-flight shake: a new impact extends
 * the current one rather than restarting it.
 * @param {number} duration  seconds of shake left after the impact
 * @param {number} amplitude  peak positional offset, in world units
 * @returns {void}
 */
export function triggerScreenShake(duration, amplitude) {
  camFeel.shakeTimeLeft = Math.max(camFeel.shakeTimeLeft, duration);
  camFeel.shakeDuration = Math.max(camFeel.shakeDuration, duration);
  camFeel.shakeAmp = Math.max(camFeel.shakeAmp, amplitude);
}

/** Clear shake and snap the FOV back to rest, for a fresh run. */
export function resetCameraFeel() {
  camFeel.shakeTimeLeft = 0;
  camFeel.shakeDuration = 0;
  camFeel.shakeAmp = 0;
  camFeel.currentFov = camFeel.baseFov;
  camera.fov = camFeel.baseFov;
  camera.updateProjectionMatrix();
}

/**
 * Decay the shake and apply the current offset.
 * @param {number} dt  frame delta in seconds, already clamped
 * @returns {void}
 */
export function updateScreenShake(dt) {
  if (camFeel.shakeTimeLeft <= 0) { camFeel.shakeAmp = 0; return; }
  camFeel.shakeTimeLeft -= dt;
  const k = camFeel.shakeDuration > 0 ? Math.max(0, camFeel.shakeTimeLeft / camFeel.shakeDuration) : 0;
  // Decaying random offset, scaled by remaining shake time.
  const amp = camFeel.shakeAmp * k * k;
  camera.position.x = G.camTargetPos.x + (Math.random() * 2 - 1) * amp;
  camera.position.y = G.camTargetPos.y + (Math.random() * 2 - 1) * amp;
  if (camFeel.shakeTimeLeft <= 0) camFeel.shakeAmp = 0;
}

export function updateSpeedFov(dt) {
  // FOV opens up as the run speeds up: runSpeed 18 -> base, 36 -> base + 8.
  const target = camFeel.baseFov + (Math.min(G.runSpeed, 36) - 18) / 18 * 8 * runSpeedBoost();
  camFeel.currentFov += (target - camFeel.currentFov) * Math.min(1, 4 * dt);   // smooth lerp
  if (Math.abs(camera.fov - camFeel.currentFov) > 0.01) {
    camera.fov = camFeel.currentFov;
    camera.updateProjectionMatrix();
  }
}

export function updateCameraRoll(dt) {
  // Small roll toward the lane the player just moved into. Derived from the
  // lane target so it eases in with the same curve as the mesh.
  const laneDelta = LANES[G.playerLane] - roster.mesh.position.x;
  const targetRoll = Math.max(-0.09, Math.min(0.09, -laneDelta * 0.05));
  camera.rotation.z += (targetRoll - camera.rotation.z) * Math.min(1, 5 * dt);
}
