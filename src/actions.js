// ── actions.js ──────────────────────────────────────────────────────────
// The three player verbs: change lane, jump, slide. Each one owns both the
// input check (is the game in a state that accepts it) and the state change.
//

import * as THREE from 'three';
import { GROUND_Y } from './scene.js';
import { G } from './state.js';
import { LANES } from './scene.js';
import { activeObstacles } from './obstacles.js';
import { audio } from './audio.js';
import { roster } from './roster.js';
import { triggerDodge, canDodge, DODGE_IFRAME } from './powerups.js';

export function switchLane(dir) {
  if (G.gameState !== 'RUNNING') return;
  const next = THREE.MathUtils.clamp(G.playerLane + dir, 0, 2);
  if (next !== G.playerLane) {
    G.playerLane = next;
    G.targetX = LANES[G.playerLane];
    audio.dodge();
  }
}

export function jumpAction() {
  if (G.gameState !== 'RUNNING') return;
  if (G.isGrounded) {
    G.isSliding = false;
    if (G.slideTimer) { clearTimeout(G.slideTimer); G.slideTimer = null; }
    G.playerVy = 16.5; // High snappy responsive jump
    G.isGrounded = false;
    audio.jump();
    G.slideTimeLeft = 0; // cancel any in-flight slide when jumping

    // Proactive Jump Clearance: hurdles in this lane that are ALREADY
    // inside the hit zone get marked cleared immediately. The previous
    // range (z >= -5.5 && z <= 0.8) pre-cleared obstacles up to 5.5m in
    // front of the player, which let you clear a barrier you had not
    // even reached yet, and pre-cleared the tall candle too.
    activeObstacles.forEach(obs => {
      const sameLane = Math.abs(LANES[G.playerLane] - obs.position.x) < 1.1;
      const inHitZone = obs.position.z >= -0.55 && obs.position.z <= 0.55;
      if (sameLane && inHitZone && (obs.userData.type === 'barrier' || obs.userData.type === 'secsign')) {
        obs.userData.cleared = true; // Safely cleared! Can never kill player upon landing
      }
    });
  }
}

export function slideAction() {
  if (G.gameState !== 'RUNNING') return;
  if (!G.isSliding) {
    G.isSliding = true;
    // Fast-fall: drive the fall directly instead of adding -24 on top of
    // gravity (-38*dt), which used to ACCELERATE the drop. The previous
    // `G.playerVy = -24` assignment compounded with gravity and made
    // jump-then-slide land harder and higher than a plain jump.
    if (!G.isGrounded) {
      G.isGrounded = true;
      G.playerY = 0;
      G.playerVy = 0;
      roster.mesh.scale.set(1, 1, 1);
      roster.mesh.position.y = GROUND_Y;
    }
    if (G.slideTimer) clearTimeout(G.slideTimer);
    G.slideTimer = null;
    // Slide duration is decremented in update() from game time, not from a
    // wall-clock setTimeout. With setTimeout the slide kept running while
    // the tab was backgrounded and expired before the player ever saw it.
    G.slideTimeLeft = 0.55;

    // Proactive Slide Clearance: the SEC sign is ALREADY in the hit zone.
    // The previous range (z >= -5.5 && z <= 0.8) pre-cleared signs up to
    // 5.5m in front of the player, sliding through empty track.
    activeObstacles.forEach(obs => {
      const sameLane = Math.abs(LANES[G.playerLane] - obs.position.x) < 1.1;
      const inHitZone = obs.position.z >= -0.55 && obs.position.z <= 0.55;
      if (sameLane && inHitZone && obs.userData.type === 'secsign') {
        obs.userData.cleared = true; // Safely slid underneath!
      }
    });
  }
}

/**
 * REKT DODGE: dash to any lane instantly, with a short window of invulnerability.
 *
 * The lane argument is the lane the player is steering toward, not a cycle
 * count: dodging left from lane 2 lands in lane 1, and dodging left again
 * from lane 1 lands in lane 0, so the gesture always goes where the player was
 * already heading. The dodge itself is charged, not timed, so the whole thing
 * is a no-op without a charge.
 *
 * @param {number} dir  -1 for the lane to the left, +1 for the right
 * @returns {boolean} true if a dodge was spent
 */
export function dodgeAction(dir) {
  if (G.gameState !== 'RUNNING') return false;
  if (!canDodge()) return false;

  // Already at the edge: dodge in place rather than refusing, because the
  // charge is the thing the player paid for and losing it to a no-op at the
  // wall lane would read as a bug.
  const target = THREE.MathUtils.clamp(G.playerLane + dir, 0, 2);
  if (!triggerDodge(target)) return false;

  // Commit the lane at once. The mesh is snapped by the dash, so waiting for
  // the normal 14*dt lerp would leave the player visually behind the obstacle
  // they just paid to pass through.
  G.playerLane = target;
  G.targetX = LANES[target];
  roster.mesh.position.x = LANES[target];
  audio.dodge();
  return true;
}
