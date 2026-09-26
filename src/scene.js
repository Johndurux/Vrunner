// ── scene.js ────────────────────────────────────────────────────────────
// Renderer, scene graph, camera, lights and the track/billboard geometry
// pool. Everything that exists before a single frame runs.
//

import * as THREE from 'three';
import { vox } from './voxel.js';

export const canvas = document.getElementById('webgl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1117);
scene.fog = new THREE.Fog(0x0e1117, 35, 140);

// Subway Surfers Wide-Angle Camera Perspective (FOV 65 for expansive depth and panoramic track vision)
export const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 180);

// Ground height: rails and wooden ties top is at 0.22
export const GROUND_Y = 0.22;

// Camera target positions for transitions
export const CAM_LOBBY = { x: 0, y: 2.6, z: 5.2, lookY: 1.6 };
export const CAM_GAME  = { x: 0, y: 4.6, z: 7.2, lookY: 1.2, lookZ: -25 };
camera.position.set(CAM_LOBBY.x, CAM_LOBBY.y, CAM_LOBBY.z);
camera.lookAt(0, CAM_LOBBY.lookY, 0);

// Lights
export const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.75);
scene.add(ambientLight);

export const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(8, 16, 10);
dirLight.castShadow = true;
scene.add(dirLight);

export const rimLight = new THREE.DirectionalLight(0x7c5cff, 0.5);
rimLight.position.set(-8, 6, -10);
scene.add(rimLight);

// ── 3-LANE RAILROAD TRACKS (VOXEL SUBWAY SURF STYLE) ──
export const LANES = [-2.2, 0, 2.2];
export const CHUNK_LEN = 36;
export const TOTAL_CHUNKS = 5;
export const trackChunks = [];

export const BILLBOARD_DATA = [
  { main: '$VIBE', sub: 'TO THE MOON 🚀', color: '#f5a623' },
  { main: 'ROBINHOOD', sub: 'CHAIN #46630', color: '#00e5ff' },
  { main: 'MARGIN CALL', sub: 'NO MERCY ⚠️', color: '#ff3366' },
  { main: 'BUY THE DIP', sub: 'WAGMI FOREVER', color: '#00ff88' },
  { main: 'LIQUIDATION', sub: 'AVOID THE CANDLE', color: '#ff9900' },
  { main: 'SEC CAUTION', sub: 'SLIDE UNDER LASER', color: '#7c5cff' },
];
let _bbIdx = 0;

export function makeBillboardTexture(mainText, subText, colorHex) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  // Dark background
  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(0, 0, 512, 256);

  // Grid cyber pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // Neon outer border
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 244);

  // Glow fill
  ctx.fillStyle = colorHex + '18';
  ctx.fillRect(12, 12, 488, 232);

  // Main Text
  ctx.fillStyle = colorHex;
  ctx.font = '800 52px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 18;
  ctx.fillText(mainText, 256, 105);

  // Subtitle
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.fillText(subText, 256, 175);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function buildRailChunk(zPos) {
  const g = new THREE.Group();
  g.position.z = zPos;

  // === GROUND: Multi-layer gravel bed with tile variation ===
  const baseSlab = vox(9.2, 0.28, CHUNK_LEN, 0x111318, { y: -0.14 });
  g.add(baseSlab);

  // Alternating gravel tile rows
  for (let z = -CHUNK_LEN / 2; z < CHUNK_LEN / 2; z += 3.0) {
    const tileColor = (Math.floor(z / 3) % 2 === 0) ? 0x1c2030 : 0x181c28;
    const tile = vox(9.0, 0.06, 2.8, tileColor, { y: 0.01, z });
    g.add(tile);
  }

  // === WOODEN RAILROAD TIES ===
  for (let z = -CHUNK_LEN / 2; z < CHUNK_LEN / 2; z += 1.8) {
    const shade = 0x3d2817 + (Math.floor(Math.random() * 3) * 0x020100);
    const tie = vox(7.8, 0.18, 0.65, shade, { y: 0.07, z });
    const capL = vox(0.25, 0.22, 0.65, 0x2a1a0d, { x: -3.75, y: 0.09, z });
    const capR = vox(0.25, 0.22, 0.65, 0x2a1a0d, { x: 3.75, y: 0.09, z });
    g.add(tie, capL, capR);
  }

  // === 3 PAIRS OF STEEL RAILS ===
  LANES.forEach(laneX => {
    const railL = vox(0.14, 0.22, CHUNK_LEN, 0x7a8490, { x: laneX - 0.55, y: 0.20 });
    const railR = vox(0.14, 0.22, CHUNK_LEN, 0x7a8490, { x: laneX + 0.55, y: 0.20 });
    const shineL = vox(0.08, 0.05, CHUNK_LEN, 0xd0d8e0, { x: laneX - 0.55, y: 0.33 });
    const shineR = vox(0.08, 0.05, CHUNK_LEN, 0xd0d8e0, { x: laneX + 0.55, y: 0.33 });
    shineL.material = new THREE.MeshBasicMaterial({ color: 0xd0d8e0 });
    shineR.material = new THREE.MeshBasicMaterial({ color: 0xd0d8e0 });
    g.add(railL, railR, shineL, shineR);
  });

  // === SIDE CONCRETE BARRIER WALLS ===
  const wallL = vox(0.55, 1.4, CHUNK_LEN, 0x252a38, { x: -4.85, y: 0.7 });
  const wallR = vox(0.55, 1.4, CHUNK_LEN, 0x252a38, { x: 4.85, y: 0.7 });
  const grimeL = vox(0.06, 0.2, CHUNK_LEN, 0x1a1e2b, { x: -4.59, y: 0.9 });
  const grimeR = vox(0.06, 0.2, CHUNK_LEN, 0x1a1e2b, { x: 4.59, y: 0.9 });
  const capTopL = vox(0.6, 0.12, CHUNK_LEN, 0x3a4258, { x: -4.85, y: 1.46 });
  const capTopR = vox(0.6, 0.12, CHUNK_LEN, 0x3a4258, { x: 4.85, y: 1.46 });
  g.add(wallL, wallR, grimeL, grimeR, capTopL, capTopR);

  // === OVERHEAD TUNNEL ARCHES every 18 units ===
  for (let z = -CHUNK_LEN / 2 + 5; z < CHUNK_LEN / 2; z += 18) {
    const archPillarL = vox(0.45, 4.8, 0.45, 0x1e2334, { x: -4.85, y: 2.4, z });
    const archPillarR = vox(0.45, 4.8, 0.45, 0x1e2334, { x: 4.85, y: 2.4, z });
    const archBeam = vox(9.8, 0.5, 0.5, 0x1e2334, { x: 0, y: 4.85, z });
    const neonColor = (Math.floor(z / 18) % 2 === 0) ? 0x00e5ff : 0xe0643a;
    const neonStrip = vox(9.6, 0.12, 0.14, neonColor, { x: 0, y: 4.58, z });
    neonStrip.material = new THREE.MeshBasicMaterial({ color: neonColor });
    const sigL = vox(0.32, 0.32, 0.32, neonColor, { x: -4.85, y: 4.45, z });
    const sigR = vox(0.32, 0.32, 0.32, neonColor, { x: 4.85, y: 4.45, z });
    sigL.material = new THREE.MeshBasicMaterial({ color: neonColor });
    sigR.material = new THREE.MeshBasicMaterial({ color: neonColor });
    g.add(archPillarL, archPillarR, archBeam, neonStrip, sigL, sigR);
  }

  // === REAL GLOWING BILLBOARD SIGNS ===
  // Only spawn billboards if zPos <= -40 (avoids cluttering the lobby pedestal)
  if (zPos <= -40) {
    const side = (_bbIdx % 2 === 0) ? -1 : 1;
    const xBase = side * 5.9;
    const bbData = BILLBOARD_DATA[_bbIdx % BILLBOARD_DATA.length];
    _bbIdx++;

    // Twin support truss pillars
    const pole1 = vox(0.18, 4.0, 0.18, 0x2d3345, { x: xBase, y: 2.0, z: -4 });
    const pole2 = vox(0.18, 4.0, 0.18, 0x2d3345, { x: xBase, y: 2.0, z: 4 });
    const cross = vox(0.14, 0.14, 8.2, 0x222738, { x: xBase, y: 3.8, z: 0 });

    // Billboard panel with canvas texture
    const panelGeo = new THREE.BoxGeometry(0.18, 2.2, 4.4);
    const tex = makeBillboardTexture(bbData.main, bbData.sub, bbData.color);
    const matSide = new THREE.MeshBasicMaterial({ color: 0x12151f });
    const matFace = new THREE.MeshBasicMaterial({ map: tex });
    // Materials for [right, left, top, bottom, front, back]
    const mats = [matFace, matFace, matSide, matSide, matSide, matSide];
    const panelMesh = new THREE.Mesh(panelGeo, mats);
    panelMesh.position.set(xBase, 3.8, 0);

    g.add(pole1, pole2, cross, panelMesh);
  }

  // === FLOOR EDGE YELLOW SAFETY LINES ===
  const safeLineL = vox(0.18, 0.05, CHUNK_LEN, 0xf5d130, { x: -3.8, y: 0.05 });
  const safeLineR = vox(0.18, 0.05, CHUNK_LEN, 0xf5d130, { x: 3.8, y: 0.05 });
  safeLineL.material = new THREE.MeshBasicMaterial({ color: 0xf5d130 });
  safeLineR.material = new THREE.MeshBasicMaterial({ color: 0xf5d130 });
  g.add(safeLineL, safeLineR);

  scene.add(g);
  return g;
}
