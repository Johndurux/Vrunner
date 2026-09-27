// ── spawn.js ────────────────────────────────────────────────────────────
// Decides what a freshly recycled track row contains. One obstacle per row
// (so the track stays readable), and a power-up only roughly once every 40
// obstacle rows so it lands as a treat rather than noise.

import { LANES, scene, buildRailChunk } from './scene.js';
import { dressChunk } from './deco.js';
import { currentDistrictIndex } from './zones.js';
import { G } from './state.js';
import { puState, maybeSpawnPowerup } from './powerups.js';
import {
  activeObstacles, activeItems,
  createRedCandle, createMarginBarrier, createSecSign, createCoin, createComboGate,
} from './obstacles.js';

export function spawnRow(zPos) {
  // Onboarding curve: The first 45 meters should be a fun warm-up runway!
  // In the first 35m (z > -36), spawn NO obstacles so the player
  // has breathing room to get into the flow and collect initial $VPLAY coins.
  const isInitialRunway = (G.distance < 10 && zPos > -36);
  if (isInitialRunway) {
    // Pure coin runway: spawn coins in center or adjacent lane
    const coinLane = (Math.abs(zPos) < 24) ? 1 : Math.floor(Math.random() * 3);
    for (let i = 0; i < 3; i++) {
      const c = createCoin();
      c.position.set(LANES[coinLane], 0, zPos + (i * 2.2) - 2.2);
      scene.add(c);
      activeItems.push(c);
    }
    return;
  }

  const freeLanes = [0, 1, 2];
  const obsLane = freeLanes.splice(Math.floor(Math.random() * freeLanes.length), 1)[0];

  // Spawn obstacle:
  // For early distance (< 50m), keep it gentle: low margin barrier (Jump) only, leaving 2 lanes wide open
  let obs;
  if (G.distance < 50 && zPos > -60) {
    obs = createMarginBarrier();
  } else {
    // Standard mix:
    // 40% Tall Candle (Dodge) | 35% Low Barrier (Jump) | 25% Hanging SEC Sign (Slide)
    const r = Math.random();
    if (r < 0.40) obs = createRedCandle();
    else if (r < 0.75) obs = createMarginBarrier();
    else obs = createSecSign();

    // Past 800m, a row may be sealed with a combo
    const useCombo = G.distance > 800 && Math.random() < 0.22;
    if (useCombo) obs = createComboGate();
  }

  obs.position.set(LANES[obsLane], 0, zPos);
  scene.add(obs);
  activeObstacles.push(obs);

  // Spawn coins in one of the other free lanes
  const coinLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
  for (let i = 0; i < 3; i++) {
    const c = createCoin();
    c.position.set(LANES[coinLane], 0, zPos + (i * 2.2) - 2.2);
    scene.add(c);
    activeItems.push(c);
  }
  maybeSpawnPowerup(zPos);
}

/**
 * Build one track chunk and dress it in the district's scenery.
 *
 * The scenery is a child of the chunk group, so advanceTrack() moves it with
 * the rails and recycles it when the chunk wraps -- no separate pooling and
 * no collision bookkeeping, which is exactly what feature 10 asked for.
 * @param {number} zPos
 * @returns {THREE.Group} the chunk
 */
export function buildDressedChunk(zPos) {
  const chunk = buildRailChunk(zPos);
  dressChunk(chunk, currentDistrictIndex());
  return chunk;
}
