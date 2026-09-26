// ── obstacles.js ────────────────────────────────────────────────────────
// Factories for everything that spawns on the track: obstacles, coins and the
// combo gate. Each returns a THREE.Group tagged with userData.type, which is
// what the collision pass switches on.
//

import * as THREE from 'three';
import { vox } from './voxel.js';

export const activeObstacles = [];
export const activeItems = [];

// 1. TALL OBSTACLE (Wajib Pindah Jalur) — Red Liquidation Candlestick
export function createRedCandle() {
  const g = new THREE.Group();
  g.userData = { type: 'redcandle', cleared: false, box: new THREE.Box3() };
  const body = vox(1.3, 3.4, 1.3, 0xf8312f, { y: 1.7 });
  const topWick = vox(0.14, 1.4, 0.14, 0xd0c8c0, { y: 4.1 });
  const btmWick = vox(0.14, 0.9, 0.14, 0xd0c8c0, { y: 0.45 });
  // Red danger glow on candle body
  body.material = new THREE.MeshStandardMaterial({
    color: 0xf8312f,
    emissive: 0xcc1111,
    emissiveIntensity: 0.4
  });
  g.add(body, topWick, btmWick);
  return g;
}

// 2. LOW OBSTACLE (Wajib Diloncati) — Margin Call Hazard Barrier
export function createMarginBarrier() {
  const g = new THREE.Group();
  g.userData = { type: 'barrier', cleared: false, box: new THREE.Box3() };

  const postL = vox(0.24, 0.65, 0.24, 0x303545, { x: -0.88, y: 0.32 });
  const postR = vox(0.24, 0.65, 0.24, 0x303545, { x: 0.88, y: 0.32 });
  // Yellow crossbar
  const bar = vox(1.96, 0.26, 0.18, 0xf5d130, { y: 0.52 });
  bar.material = new THREE.MeshBasicMaterial({ color: 0xf5d130 });

  // Black caution stripes
  const stripe1 = vox(0.28, 0.28, 0.20, 0x111318, { x: -0.5, y: 0.52 });
  const stripe2 = vox(0.28, 0.28, 0.20, 0x111318, { x: 0.0, y: 0.52 });
  const stripe3 = vox(0.28, 0.28, 0.20, 0x111318, { x: 0.5, y: 0.52 });

  g.add(postL, postR, bar, stripe1, stripe2, stripe3);
  return g;
}

// 3. HANGING OBSTACLE (Wajib Sliding/Merunduk) — SEC Warning Laser Sign
export function createSecSign() {
  const g = new THREE.Group();
  g.userData = { type: 'secsign', cleared: false, box: new THREE.Box3() };

  // Two hanging side rods from ceiling
  const rodL = vox(0.12, 2.2, 0.12, 0x444b60, { x: -0.92, y: 2.7 });
  const rodR = vox(0.12, 2.2, 0.12, 0x444b60, { x: 0.92, y: 2.7 });

  // Horizontal caution sign board hanging between y = 1.35 and 2.05 (clearance underneath = 1.2m!)
  const signBoard = vox(2.0, 0.68, 0.18, 0x141824, { y: 1.7 });
  const laserStrip = vox(1.96, 0.14, 0.22, 0x00e5ff, { y: 1.45 });
  laserStrip.material = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const laserTop = vox(1.96, 0.14, 0.22, 0x00e5ff, { y: 1.95 });
  laserTop.material = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

  // Glowing text banner "SEC"
  const secTag = vox(0.8, 0.28, 0.24, 0xff3366, { y: 1.7 });
  secTag.material = new THREE.MeshBasicMaterial({ color: 0xff3366 });

  g.add(rodL, rodR, signBoard, laserStrip, laserTop, secTag);
  return g;
}

// 4. SHINY CRYPTO GOLD COIN ($VIBE Coin)
export function createCoin() {
  const g = new THREE.Group();
  g.userData = { type: 'coin', box: new THREE.Box3(), collected: false };

  const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20);
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    metalness: 0.35,
    roughness: 0.25,
    emissive: 0xf5a623,
    emissiveIntensity: 0.45
  });
  const m = new THREE.Mesh(coinGeo, coinMat);
  m.rotation.x = Math.PI / 2;
  m.position.y = 0.9;

  // Inner embossed star/center
  const star = vox(0.2, 0.2, 0.14, 0xffffff, { y: 0.9 });
  star.material = new THREE.MeshBasicMaterial({ color: 0xfff0aa });

  g.add(m, star);
  return g;
}

export function createComboGate() {
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
