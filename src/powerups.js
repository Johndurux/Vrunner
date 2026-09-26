// ═══════════════════════════════════════════════════════════════
//  POWER-UPS
//  Durasi dihitung dari game time (dt), bukan setTimeout, supaya
//  power-up nggak berkurang durasinya ketika player pause.
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { activeItems } from './obstacles.js';
import { audio } from './audio.js';
import { scene, LANES } from './scene.js';
import { vox } from './voxel.js';

export const POWERUP_DUR = { hoverboard: 8, magnet: 6, multiplier: 10 };
// Live state. These are mutated in place (a pickup sets `powerup`, the
// countdown decrements `timeLeft`), so they live behind a tiny store with
// getters: an `export let` would leave importers reading a stale binding.
export const puState = {
  powerup: null,           // { type, timeLeft }
  hoverboardHitsLeft: 0,   // obstacle crashes the board can absorb
  shieldGlow: null,        // additive glow mesh under the player's feet
  spawnDebt: 20            // rows until the next power-up rolls
};
export const getPowerup = () => puState.powerup;
export const getShieldGlow = () => puState.shieldGlow;
export const getHoverboardHits = () => puState.hoverboardHitsLeft;

export function createHoverboard() {
  const g = new THREE.Group();
  g.userData = { type: 'hoverboard', box: new THREE.Box3(), collected: false };
  const deck = vox(1.25, 0.13, 2.0, 0x22e0c8, { y: 0.72 });
  deck.material = new THREE.MeshStandardMaterial({
    color: 0x22e0c8, emissive: 0x0fbfa8, emissiveIntensity: 0.85,
    metalness: 0.4, roughness: 0.35
  });
  const nose = vox(0.9, 0.1, 0.4, 0x9ffff0, { y: 0.8, z: -0.95 });
  const finL = vox(0.1, 0.3, 0.5, 0x0fbfa8, { y: 0.95, x: -0.5 });
  const finR = vox(0.1, 0.3, 0.5, 0x0fbfa8, { y: 0.95, x: 0.5 });
  g.add(deck, nose, finL, finR);
  return g;
}

export function createMagnet() {
  const g = new THREE.Group();
  g.userData = { type: 'magnet', box: new THREE.Box3(), collected: false };
  const core = vox(0.5, 0.5, 0.5, 0xff5cd6, { y: 0.95 });
  core.material = new THREE.MeshStandardMaterial({
    color: 0xff5cd6, emissive: 0xff2bb5, emissiveIntensity: 0.9,
    metalness: 0.5, roughness: 0.25
  });
  // U-shaped magnet body: two uprights joined by a crossbar.
  const armL = vox(0.16, 0.7, 0.16, 0xe0e6f0, { y: 1.0, x: -0.34, z: -0.2 });
  const armR = vox(0.16, 0.7, 0.16, 0xe0e6f0, { y: 1.0, x: 0.34, z: -0.2 });
  const bar = vox(0.84, 0.16, 0.16, 0xe0e6f0, { y: 1.32, z: -0.2 });
  const tipL = vox(0.18, 0.16, 0.18, 0xff5cd6, { y: 0.68, x: -0.34, z: -0.2 });
  const tipR = vox(0.18, 0.16, 0.18, 0xff5cd6, { y: 0.68, x: 0.34, z: -0.2 });
  g.add(core, armL, armR, bar, tipL, tipR);
  return g;
}

export function createMultiplier() {
  const g = new THREE.Group();
  g.userData = { type: 'multiplier', box: new THREE.Box3(), collected: false };
  const body = vox(0.85, 0.85, 0.22, 0x7c5cff, { y: 0.95 });
  body.material = new THREE.MeshStandardMaterial({
    color: 0x7c5cff, emissive: 0x5a3cff, emissiveIntensity: 0.9,
    metalness: 0.45, roughness: 0.3
  });
  // Stylised "x2" from plain voxels: a diagonal bar plus a 2.
  const slash = vox(0.12, 0.5, 0.06, 0xffffff, { y: 0.95, z: 0.16 });
  slash.rotation.z = 0.6;
  const d1 = vox(0.3, 0.11, 0.06, 0xffffff, { y: 1.22, x: 0.18, z: 0.16 });
  const d2 = vox(0.3, 0.11, 0.06, 0xffffff, { y: 0.96, x: 0.18, z: 0.16 });
  const d3 = vox(0.11, 0.3, 0.06, 0xffffff, { y: 0.83, x: 0.32, z: 0.16 });
  g.add(body, slash, d1, d2, d3);
  return g;
}

export const POWERUP_FACTORY = {
  hoverboard: createHoverboard,
  magnet: createMagnet,
  multiplier: createMultiplier
};

export function makeShieldGlow() {
  const geo = new THREE.PlaneGeometry(3.0, 3.0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x22e0c8, transparent: true, opacity: 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  m.visible = false;
  return m;
}

export function activatePowerup(type) {
  puState.powerup = { type, timeLeft: POWERUP_DUR[type] };
  if (type === 'hoverboard') {
    puState.hoverboardHitsLeft = 1;
    if (!puState.shieldGlow) {
      puState.shieldGlow = makeShieldGlow();
      scene.add(puState.shieldGlow);
    }
    puState.shieldGlow.visible = true;
  }
  audio.powerup();
  updatePowerupHud();
}

export function expirePowerup() {
  puState.powerup = null;
  puState.hoverboardHitsLeft = 0;
  if (puState.shieldGlow) puState.shieldGlow.visible = false;
  updatePowerupHud();
}

export function updatePowerupHud() {
  const el = document.getElementById('hudPowerup');
  const box = document.getElementById('hudPowerupBox');
  if (!el || !box) return;
  if (!puState.powerup) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  el.textContent = `${puState.powerup.type === 'multiplier' ? 'x2 ' : ''}${puState.powerup.timeLeft.toFixed(1)}s`;
  el.style.color = puState.powerup.type === 'hoverboard' ? '#22e0c8'
    : puState.powerup.type === 'magnet' ? '#ff5cd6' : '#7c5cff';
}

/**
 * Tick the active power-up: run its timer, refresh the HUD badge, and apply
 * its per-frame effect.
 * @param {number} dt  frame delta in seconds, already clamped
 * @param {number} playerX  the player's committed lane x
 * @param {number} playerZ  the player's z on the track
 * @returns {void}
 */
export function updatePowerup(dt, playerX, playerZ) {
  if (!puState.powerup) return;
  puState.powerup.timeLeft -= dt;
  if (puState.powerup.timeLeft <= 0) { expirePowerup(); return; }
  updatePowerupHud();

  // Hoverboard speed boost is applied in the speed calc (see runSpeedBoost).
  if (puState.shieldGlow && puState.shieldGlow.visible) {
    puState.shieldGlow.position.x = playerX;
    puState.shieldGlow.material.opacity = 0.22 + Math.sin(performance.now() / 160) * 0.09;
  }

  // Coin magnet: pull nearby coins to the player, then let the normal
  // intersectsBox pickup in updateCollisions() collect them. The pull is on
  // the x/z plane the coins actually travel in; `playerZ` is the player's z,
  // NOT their jump height.
  if (puState.powerup.type === 'magnet') {
    for (let i = activeItems.length - 1; i >= 0; i--) {
      const it = activeItems[i];
      if (it.userData.type !== 'coin' || it.userData.collected) continue;
      const dx = playerX - it.position.x;
      const dz = playerZ - it.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 100) {           // 10m radius
        it.position.x += dx * 3.2 * dt;
        it.position.z += dz * 3.2 * dt;
        it.position.y += 0.6 * dt;  // drift up into the pickup box
      }
    }
  }
}

export function runSpeedBoost() {
  return puState.powerup && puState.powerup.type === 'hoverboard' ? 1.2 : 1;
}

// Hard combo used past 800m: a tall wall you must jump, with a low beam
// hanging in the SAME row that forces a slide on the way down. The two
// parts are separate child groups but share one obstacle entry, so the
// existing activeObstacles/collision loop handles them as a unit.
function createComboGate() {
  const g = new THREE.Group();
  g.userData = { type: 'combo', cleared: false, box: new THREE.Box3() };

  // Jump part: a solid voxel wall, similar height to the red candle.
  const wall = vox(2.2, 3.2, 0.5, 0x8a3fd8, { y: 1.6 });
  wall.material = new THREE.MeshStandardMaterial({
    color: 0x8a3fd8, emissive: 0x5a1fb0, emissiveIntensity: 0.55,
    metalness: 0.3, roughness: 0.5
  });
  const capL = vox(0.5, 0.22, 0.56, 0xd8a8ff, { y: 3.3, x: -0.8 });
  const capR = vox(0.5, 0.22, 0.56, 0xd8a8ff, { y: 3.3, x: 0.8 });

  // Slide part: a low hanging beam with clearance underneath.
  const beam = vox(2.2, 1.5, 0.45, 0x2bd8ff, { y: 1.95, z: 1.6 });
  beam.material = new THREE.MeshStandardMaterial({
    color: 0x2bd8ff, emissive: 0x1aa8d8, emissiveIntensity: 0.6,
    metalness: 0.3, roughness: 0.5
  });
  const strip = vox(2.0, 0.14, 0.5, 0xffffff, { y: 1.18, z: 1.6 });
  strip.material = new THREE.MeshBasicMaterial({ color: 0xd8faff });

  g.add(wall, capL, capR, beam, strip);
  return g;
}

export function coinValue() {
  return puState.powerup && puState.powerup.type === 'multiplier' ? 2 : 1;
}

// One obstacle per row, and only rarely a power-up: roughly one
// power-up per ~40 obstacle rows so it stays a treat instead of noise.
puState.spawnDebt = 20;   // rows until the next power-up rolls
export function maybeSpawnPowerup(zPos) {
  if (puState.spawnDebt > 0) { puState.spawnDebt--; return; }
  const types = Object.keys(POWERUP_FACTORY);
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * 3);
  const item = POWERUP_FACTORY[type]();
  item.position.set(LANES[lane], 0, zPos);
  scene.add(item);
  activeItems.push(item);
  puState.spawnDebt = 28 + Math.floor(Math.random() * 24);   // 28-51 rows
}
