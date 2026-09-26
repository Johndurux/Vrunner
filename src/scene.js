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
// Fog is what hides the far end of the bed. Its colour is kept equal to
// scene.background on purpose: any mismatch draws a visible band across the
// horizon where one blends into the other, which is the seam the player
// reported between the buildings and the track.
scene.fog = new THREE.Fog(0x0e1117, 35, 140);

// Wide angle on purpose: at 62 the view was a narrow slot of track and the
// background buildings were cut off above the top of the frame. BASE_FOV is
// imported rather than repeated, because camera.js snaps the FOV back to it
// on every run start -- two separate literals here meant the run quietly
// started narrower than the lobby.
export const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 180);

// Ground height: rails and wooden ties top is at 0.22
export const GROUND_Y = 0.22;

// Camera target positions for transitions
export const CAM_LOBBY = { x: 0, y: 2.6, z: 5.2, lookY: 1.6 };
// Raised and pulled back a little: the taller eye line is what lets the
// background towers and the hanging billboards clear the top of the frame
// instead of being cropped. lookY rises to match so the horizon does not drop
// away as the view widens.
export const CAM_GAME  = { x: 0, y: 5.5, z: 7.8, lookY: 1.9, lookZ: -28 };
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
  // ── ROBINHOOD CHAIN branding ──
  { 
    main: 'ROBINHOOD', 
    sub: 'CHAIN TESTNET #46630', 
    color: '#FF3B4E',
    accent: '#FF3B4E'
  },
  { 
    main: '#46630', 
    sub: 'JOIN THE TESTNET NOW', 
    color: '#FF3B4E',
    accent: '#FF3B4E'
  },
  
  // ── VIBE/VIBE platform ──
  { 
    main: 'VIBE/VIBE', 
    sub: 'LAUNCH · TRADE · EARN', 
    color: '#7c5cff',
    accent: '#7c5cff'
  },
  { 
    main: 'VIBEVIBE.FUN', 
    sub: 'TESTNET DEX ON RH CHAIN', 
    color: '#7c5cff',
    accent: '#7c5cff'
  },
  
  // ── META ALCHEMIST ──
  { 
    main: 'META', 
    sub: '@META_ALCHEMIST · VIBE/VIBE', 
    color: '#00FF88',
    accent: '#00FF88'
  },
  { 
    main: 'ALCHEMIST', 
    sub: 'FOLLOW @META_ALCHEMIST', 
    color: '#00FF88',
    accent: '#00FF88'
  },
  
  // ── $VPLAY campaign ──
  { 
    main: '$VPLAY', 
    sub: 'RUN · EARN · CONTRIBUTE', 
    color: '#FFD700',
    accent: '#FFD700'
  },
  { 
    main: '$VPLAY', 
    sub: 'vrunner.vercel.app', 
    color: '#FFD700',
    accent: '#FFD700'
  },
  { 
    main: 'BUY $VPLAY', 
    sub: 'ON VIBEVIBE.FUN NOW', 
    color: '#f5a623',
    accent: '#f5a623'
  },
  
  // ── Game engagement ──
  { 
    main: 'REKT?', 
    sub: 'SLIDE UNDER THE CANDLE', 
    color: '#FF3B4E',
    accent: '#FF3B4E'
  },
  { 
    main: 'TOP RUNNER', 
    sub: 'POST SCORE @VIBEVIBEFUN', 
    color: '#00e5ff',
    accent: '#00e5ff'
  },
  { 
    main: 'WAGMI', 
    sub: 'ROBINHOOD CHAIN OR REKT', 
    color: '#00FF88',
    accent: '#00FF88'
  },
];
let _bbIdx = 0;

export function makeBillboardTexture(mainText, subText, colorHex) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  // Pure black background
  ctx.fillStyle = '#020305';
  ctx.fillRect(0, 0, 512, 256);

  // Scanline texture
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, 512, 2);
  }

  // Thick colored left bar (brand stripe)
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 14, 256);

  // Subtle color wash on right side
  const wash = ctx.createLinearGradient(14, 0, 512, 0);
  wash.addColorStop(0, colorHex + '22');
  wash.addColorStop(1, 'transparent');
  ctx.fillStyle = wash;
  ctx.fillRect(14, 0, 498, 256);

  // Top border line
  ctx.fillStyle = colorHex;
  ctx.fillRect(14, 0, 498, 3);

  // Bottom border line
  ctx.fillStyle = colorHex + '88';
  ctx.fillRect(14, 253, 498, 3);

  // Corner accent boxes
  ctx.fillStyle = colorHex;
  ctx.fillRect(14, 0, 32, 32);      // top-left
  ctx.fillRect(480, 224, 32, 32);   // bottom-right
  ctx.fillStyle = '#020305';
  ctx.fillRect(16, 2, 28, 28);
  ctx.fillRect(482, 226, 28, 28);

  // Small ticker label top-right
  ctx.fillStyle = colorHex + 'aa';
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('ROBINHOOD CHAIN', 504, 10);

  // Main text — large and impactful
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 64px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(mainText, 32, 110);

  // Sub text
  ctx.shadowBlur = 6;
  ctx.fillStyle = colorHex;
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText(subText, 32, 172);

  // Glitch line (random horizontal slice)
  if (Math.random() > 0.5) {
    const gy = 80 + Math.floor(Math.random() * 80);
    ctx.fillStyle = colorHex + '40';
    ctx.fillRect(32, gy, 300 + Math.random() * 100, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function buildRailChunk(zPos) {
  const g = new THREE.Group();
  g.position.z = zPos;

  // === GROUND: Multi-layer gravel bed with tile variation ===
  // The bed is 15.6 wide, not 9.2. The barrier walls sit at x = +/-4.85 and
  // the scenery is out at SIDE = 6.4, so a narrower slab left a strip of empty
  // space on each side with nothing behind it -- the solid black band the
  // player saw between the buildings and the track. It has to reach past the
  // scenery line or the seam comes back.
  const baseSlab = vox(15.6, 0.28, CHUNK_LEN, 0x111318, { y: -0.14 });
  g.add(baseSlab);

  // Alternating gravel tile rows
  for (let z = -CHUNK_LEN / 2; z < CHUNK_LEN / 2; z += 3.0) {
    const tileColor = (Math.floor(z / 3) % 2 === 0) ? 0x1c2030 : 0x181c28;
    // Matches the widened bed above, so the tiling does not leave its own
    // dark lip showing at the same place the bed was patched.
    const tile = vox(15.4, 0.06, 2.8, tileColor, { y: 0.01, z });
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
  // Only spawn billboards if zPos <= -20 (avoids cluttering the lobby pedestal)
  if (zPos <= -20) {
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

    // Second billboard on opposite side for high-distance chunks
    if (zPos <= -60) {
      const side2 = side * -1; // opposite side
      const xBase2 = side2 * 5.9;
      const bbData2 = BILLBOARD_DATA[(_bbIdx + 3) % BILLBOARD_DATA.length];

      const pole1b = vox(0.18, 4.0, 0.18, 0x2d3345, { x: xBase2, y: 2.0, z: -4 });
      const pole2b = vox(0.18, 4.0, 0.18, 0x2d3345, { x: xBase2, y: 2.0, z: 4 });
      const crossb = vox(0.14, 0.14, 8.2, 0x222738, { x: xBase2, y: 3.8, z: 0 });
      const panelGeo2 = new THREE.BoxGeometry(0.18, 2.2, 4.4);
      const tex2 = makeBillboardTexture(bbData2.main, bbData2.sub, bbData2.color);
      const matFace2 = new THREE.MeshBasicMaterial({ map: tex2 });
      const matSide2 = new THREE.MeshBasicMaterial({ color: 0x12151f });
      const mats2 = [matFace2, matFace2, matSide2, matSide2, matSide2, matSide2];
      const panelMesh2 = new THREE.Mesh(panelGeo2, mats2);
      panelMesh2.position.set(xBase2, 3.8, 0);
      g.add(pole1b, pole2b, crossb, panelMesh2);
    }
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
