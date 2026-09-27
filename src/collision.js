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
 * Opacity has to be set on a material, and the material cache in voxel.js
 * hands the SAME instance to every red candle -- so fading there would make
 * all of them blink together. Each obstacle therefore gets a private clone of
 * its materials the first time it is asked to fade. The clone is not flagged
 * shared, so disposeObject() frees it when the obstacle is recycled.
 * @param {THREE.Object3D} obj
 * @returns {void}
 */
function makeFadeable(obj) {
  obj.traverse((child) => {
    if (!child.isMesh || !child.material || child.userData.__ownMat) return;
    const src = Array.isArray(child.material) ? child.material : [child.material];
    const own = src.map(m => {
      const c = m.clone();
      c.transparent = true;
      delete c.userData.shared;
      return c;
    });
    child.material = Array.isArray(child.material) ? own : own[0];
    child.userData.__ownMat = true;
  });
}

/**
 * Fade an obstacle as it nears the camera, then let the normal disposal rule
 * take it away.
 *
 * The player used to see obstacles swell up and fill the frame right before
 * they vanished: disposal was at z > 8 while the camera sits at z = 7.8, so an
 * obstacle was still fully drawn right beside the lens. Fading it out over the
 * last few metres removes the pop without moving the disposal point, which the
 * swept collision test depends on.
 * @param {THREE.Object3D} obs
 * @param {number} z  current z
 * @returns {void}
 */
function fadeObstacle(obs, z) {
  // Fully visible at 4m out, gone by the time it passes the camera.
  const t = Math.max(0, Math.min(1, (z - 0.5) / 3.5));
  const a = t * t; // ease in, so the last metre dissolves instead of blinking
  if (t < 0.999) makeFadeable(obs);
  obs.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      if (child.userData.__ownMat) m.opacity = a;
    }
  });
}


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
    // Dissolve on the way past the camera, before disposal.
    if (obs.position.z > 0.5) fadeObstacle(obs, obs.position.z);

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
      // DIAMOND HANDS SHIELD absorbs exactly one collision, then breaks.
      // The 0.3s dodge i-frames sit in front of this: during a REKT DODGE
      // dash the player passes straight through obstacles, which is the whole
      // point of spending a charge on a combo.
      if (puState.iframeLeft > 0) continue;
      if (puState.shieldHitsLeft > 0) {
        puState.shieldHitsLeft--;
        obs.userData.cleared = true;
        if (puState.shieldHitsLeft === 0 && puState.shieldGlow) puState.shieldGlow.visible = false;
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

    // Soft magnetic pull: If player is near the coin's lane and approaching
    if (!item.userData.collected && item.userData.type === 'coin') {
      const dx = playerX - item.position.x;
      const dz = -item.position.z;
      if (Math.abs(dx) < 1.35 && dz > -0.5 && dz < 6.5) {
        item.position.x += dx * 8.5 * dt;
        item.position.y += ((mesh.position.y + 0.6) - item.position.y) * 8.5 * dt;
      }
    }

    if (!item.userData.collected && playerBox.intersectsBox(item.userData.box)) {
      item.userData.collected = true;
      const isCoin = item.userData.type === 'coin';
      if (isCoin) {
        // The multiplier doubles coin value; updateCoinHud() keeps the
        // HUD in sync with the counter.
        const val = coinValue();
        G.sessionCoins += val;
        updateCoinHud();
        audio.coin();
        if (typeof window !== 'undefined' && window.__spawnCoinFloat) {
          window.__spawnCoinFloat(val);
        }
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
