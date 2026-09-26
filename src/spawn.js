// ── spawn.js ────────────────────────────────────────────────────────────
// Decides what a freshly recycled track row contains. One obstacle per row
// (so the track stays readable), and a power-up only roughly once every 40
// obstacle rows so it lands as a treat rather than noise.

import { LANES, scene } from './scene.js';
import { G } from './state.js';
import { puState, maybeSpawnPowerup } from './powerups.js';
import {
  activeObstacles, activeItems,
  createRedCandle, createMarginBarrier, createSecSign, createCoin, createComboGate,
} from './obstacles.js';

export function spawnRow(zPos) {
  const freeLanes = [0, 1, 2];
  const obsLane = freeLanes.splice(Math.floor(Math.random() * freeLanes.length), 1)[0];

  // Spawn 1 of 3 obstacle types:
  // 40% Tall Candle (Dodge) | 35% Low Barrier (Jump) | 25% Hanging SEC Sign (Slide)
  const r = Math.random();
  let obs;
  if (r < 0.40) obs = createRedCandle();
  else if (r < 0.75) obs = createMarginBarrier();
  else obs = createSecSign();

  // Past 800m, a row may be sealed with a combo: a jump target and a slide
  // target in the SAME row, so the player must handle both in one pass.
  // When the combo wins, the single obstacle is NOT spawned at all (the
  // collision loop has no `superseded` flag, so a flagged obstacle would
  // still collide).
  const useCombo = G.distance > 800 && Math.random() < 0.22;
  if (useCombo) obs = createComboGate();

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
