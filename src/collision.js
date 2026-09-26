// ── collision.js ────────────────────────────────────────────────────────
// All hit detection, in one place. Two passes per frame: obstacles first
// (they can end the run), then collectables.
//
// Every zone test is SWEPT rather than a point sample. `dt` is clamped to
// 0.1s and the speed cap is 36, so one step can move the world 3.6m while the
// hit zone is only 1.1m wide. Testing just the post-move position let
// obstacles tunnel straight through the player with no hit registered at all,
// so each test runs against the whole interval the entity travelled.
import * as THREE from 'three';
import { updateCoinHud } from './state.js';
import { activeObstacles, activeItems } from './obstacles.js';
import { disposeObject } from './utils.js';
import { audio } from './audio.js';
import { G } from './state.js';
import { LANES } from './scene.js';
import { puState, coinValue, activatePowerup } from './powerups.js';
import { triggerScreenShake } from './camera.js';
import { triggerGameOver } from './lifecycle.js';

const playerBox = new THREE.Box3();

/**
 * Advance every obstacle and collectable by `moveZ`, then resolve hits.
 * @param {number} dt  frame delta in seconds, already clamped
 * @param {number} moveZ  world units travelled this frame
 * @param {THREE.Object3D} mesh  the player mesh, for its bounding box
 * @returns {void}
 */
export function updateCollisions(dt, moveZ, mesh) {
  playerBox.setFromObject(mesh);
  // Shrink slightly so grazing an obstacle does not count as a hit.
  playerBox.expandByScalar(-0.16);
  // Use the player's COMMITTED lane for collision, not the mesh's
  // interpolated x. The mesh lerps toward G.targetX at 14*dt, so between
  // the keypress and the arrival there was a window where the player
  // was visually still in the old lane while G.playerLane had already
  // flipped, causing unavoidable hits on the newly-entered lane.
  const playerX = LANES[G.playerLane];

  // Check Obstacles
  for (let i = activeObstacles.length - 1; i >= 0; i--) {
    const obs = activeObstacles[i];
    // Remember where the obstacle started this frame. At low frame rates
    // (or with the hoverboard boost) moveZ can exceed the width of the hit
    // zone, and testing only the end position let obstacles tunnel clean
    // through the player with no hit ever registered. Every zone test
    // below therefore runs against the whole travelled interval.
    const zPrev = obs.position.z;
    obs.position.z += moveZ;

    // If obstacle already cleared, skip collision
    if (obs.userData.cleared) {
      if (obs.position.z > 8) {
        disposeObject(obs);
        activeObstacles.splice(i, 1);
      }
      continue;
    }

    const sameLane = Math.abs(playerX - obs.position.x) < 1.0;
    // Swept interval: the zone test passes if EITHER the previous or the
    // new position is inside it, i.e. the obstacle crossed the player at
    // any point during this frame.
    const zMin = Math.min(zPrev, obs.position.z);
    const zMax = Math.max(zPrev, obs.position.z);
    const approaching = zMin <= 0.6 && zMax >= -3.5;
    const inHitZone = zMax >= -0.55 && zMin <= 0.55;

    // Proactive clearance while approaching
    if (sameLane && approaching) {
      // Jump over barrier: if player is airborne (jumping: G.playerY > 0.12 or moving upward)
      if (obs.userData.type === 'barrier' && (!G.isGrounded || G.playerY > 0.12 || G.playerVy > 0)) {
        obs.userData.cleared = true;
        continue;
      }
      // Jump over the tall red candle. The candle body is 3.4m tall, so
      // unlike the low barrier it needs REAL height (jump apex is
      // 16.5^2 / (2*38) = 3.58m) rather than merely being airborne.
      // Without this branch the candle had no clear path at all and
      // could only be avoided by changing lanes.
      if (obs.userData.type === 'redcandle' && G.playerY > 2.2) {
        obs.userData.cleared = true;
        continue;
      }
      // Slide under SEC sign, or leap over it
      if (obs.userData.type === 'secsign' && (G.isSliding || (!G.isGrounded && G.playerY > 0.8))) {
        obs.userData.cleared = true;
        continue;
      }
      // Combo gate: clear it by jumping over the wall part (real height,
      // like the red candle) OR by sliding under the beam part. Because
      // both parts share one obstacle entry, either response clears the
      // whole gate.
      if (obs.userData.type === 'combo' && (G.playerY > 2.2 || G.isSliding)) {
        obs.userData.cleared = true;
        continue;
      }
    }

    // Near-miss: an obstacle in our lane that we only just squeezed past.
    // Plays once, on the frame the obstacle leaves the hit zone, so the
    // player hears a reward for a close call instead of a generic thud.
    if (sameLane && !obs.userData.nearMissed && !obs.userData.cleared
        && zMin > 0.55 && zMax < 1.6) {
      obs.userData.nearMissed = true;
      audio.nearMiss();
    }

    // Direct crash!
    if (sameLane && inHitZone) {
      // Hoverboard absorbs exactly one collision, then breaks.
      if (puState.hoverboardHitsLeft > 0) {
        puState.hoverboardHitsLeft--;
        obs.userData.cleared = true;
        if (puState.hoverboardHitsLeft === 0 && puState.shieldGlow) puState.shieldGlow.visible = false;
        triggerScreenShake(0.18, 0.45);
        audio.crash();
        continue;
      }
      triggerScreenShake(0.15, 0.5);
      triggerGameOver();
      return;
    }

    if (obs.position.z > 8) {
      disposeObject(obs);
      activeObstacles.splice(i, 1);
    }
  }

  // Check Coins & Power-ups
  for (let i = activeItems.length - 1; i >= 0; i--) {
    const item = activeItems[i];
    // Same swept-interval concern as obstacles: a large moveZ could step
    // the item clean past the player's box. Keep a copy so the test can
    // also cover the slice the item travelled through.
    const ziPrev = item.position.z;
    item.position.z += moveZ;
    item.rotation.y += 3.5 * dt;
    item.userData.box.setFromObject(item);

    // Widen the box along z to cover the swept slice, so a fast-moving
    // coin cannot be skipped between two frames.
    if (!item.userData.collected) {
      const halfZ = (item.userData.box.max.z - item.userData.box.min.z) / 2;
      item.userData.box.min.z = Math.min(item.userData.box.min.z,
                                      ziPrev - halfZ);
      item.userData.box.max.z = Math.max(item.userData.box.max.z,
                                      ziPrev + halfZ);
    }

    if (!item.userData.collected && playerBox.intersectsBox(item.userData.box)) {
      item.userData.collected = true;
      const isCoin = item.userData.type === 'coin';
      if (isCoin) {
        // The multiplier doubles coin value; updateCoinHud() keeps the
        // HUD in sync with the counter.
        G.sessionCoins += coinValue();
        updateCoinHud();
        audio.coin();
      } else {
        activatePowerup(item.userData.type);
      }
      disposeObject(item);
      activeItems.splice(i, 1);
      continue;
    }
    if (item.position.z > 8) {
      disposeObject(item);
      activeItems.splice(i, 1);
    }
  }
}
