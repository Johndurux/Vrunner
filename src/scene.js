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

export const CAMPAIGN_OVERHEAD_DATA = [
  {
    title: "ROBINHOOD CHAIN",
    sub: "OFFICIAL TESTNET #46630 // EVM",
    badge: "NETWORK",
    color: "#FF3B4E",
    glow: "#FF3B4E"
  },
  {
    title: "META ALCHEMIST",
    sub: "@META_ALCHEMIST · ARCHITECT OF $VPLAY",
    badge: "FOUNDER",
    color: "#00FF88",
    glow: "#00FF88"
  },
  {
    title: "VIBEVIBE.FUN",
    sub: "THE PREMIER TESTNET MEME DEX · TRADE NOW",
    badge: "PLATFORM",
    color: "#00DDFF",
    glow: "#00DDFF"
  },
  {
    title: "$VPLAY TOKEN",
    sub: "RUN · EARN · CONTRIBUTE TO TESTNET VIBE",
    badge: "TICKER",
    color: "#FFD000",
    glow: "#FFD000"
  },
  {
    title: "BUY $VPLAY",
    sub: "FAUCET & SWAP ACTIVE ON VIBEVIBE.FUN",
    badge: "CAMPAIGN",
    color: "#FF6B00",
    glow: "#FF6B00"
  },
  {
    title: "46,630 BLOCKS",
    sub: "CONTRIBUTE YOUR TXS TO ROBINHOOD CHAIN",
    badge: "MISSION",
    color: "#FF3B4E",
    glow: "#FF3B4E"
  }
];
let _overheadIdx = 0;

export function makeOverheadBannerTexture(item) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#06020c';
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  ctx.strokeStyle = item.color;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1012, 244);

  ctx.fillStyle = item.color;
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillRect(0, 242, 1024, 14);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 36, 36);
  ctx.fillRect(1024 - 36, 0, 36, 36);
  ctx.fillRect(0, 256 - 36, 36, 36);
  ctx.fillRect(1024 - 36, 256 - 36, 36, 36);

  ctx.strokeStyle = item.color;
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 36, 36);
  ctx.strokeRect(1024 - 36, 0, 36, 36);

  ctx.fillStyle = item.color;
  ctx.fillRect(50, 26, 160, 34);
  ctx.fillStyle = '#000000';
  ctx.font = '900 18px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.badge, 130, 43);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('CHAIN ID #46630 // TESTNET', 960, 43);

  ctx.shadowColor = item.glow;
  ctx.shadowBlur = 35;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 84px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.title, 512, 120);

  ctx.shadowBlur = 10;
  ctx.fillStyle = item.color;
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillText(item.sub, 512, 195);

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
    // Raised pillars to height 8.0 (y=4.0) so the beam sits at y=8.0
    const archPillarL = vox(0.45, 8.0, 0.45, 0x1e2334, { x: -4.85, y: 4.0, z });
    const archPillarR = vox(0.45, 8.0, 0.45, 0x1e2334, { x: 4.85, y: 4.0, z });
    const archBeam = vox(9.8, 0.5, 0.5, 0x1e2334, { x: 0, y: 8.0, z });
    
    const neonColor = (Math.floor(z / 18) % 2 === 0) ? 0x00e5ff : 0xe0643a;
    const neonStrip = vox(9.6, 0.12, 0.14, neonColor, { x: 0, y: 7.7, z });
    neonStrip.material = new THREE.MeshBasicMaterial({ color: neonColor });
    const sigL = vox(0.32, 0.32, 0.32, neonColor, { x: -4.85, y: 7.5, z });
    const sigR = vox(0.32, 0.32, 0.32, neonColor, { x: 4.85, y: 7.5, z });
    sigL.material = new THREE.MeshBasicMaterial({ color: neonColor });
    sigR.material = new THREE.MeshBasicMaterial({ color: neonColor });
    
    g.add(archPillarL, archPillarR, archBeam, neonStrip, sigL, sigR);

    // OVERHEAD CAMPAIGN BANNER ACROSS ALL 3 TRACKS
    if (zPos <= -10) {
      const bannerData = CAMPAIGN_OVERHEAD_DATA[_overheadIdx % CAMPAIGN_OVERHEAD_DATA.length];
      _overheadIdx++;

      // Width: 8.6, Height: 2.2, Depth: 0.2
      const bannerGeo = new THREE.BoxGeometry(8.6, 2.2, 0.2);
      const bannerTex = makeOverheadBannerTexture(bannerData);
      
      const matFace = new THREE.MeshBasicMaterial({ map: bannerTex });
      const matFrame = new THREE.MeshBasicMaterial({ color: 0x11051a });
      const bannerMats = [matFrame, matFrame, matFrame, matFrame, matFace, matFace];
      const bannerMesh = new THREE.Mesh(bannerGeo, bannerMats);
      
      // Raised banner to y=6.8 (bottom edge is 5.7, safely clearing the camera at y=5.5)
      bannerMesh.position.set(0, 6.8, z); 
      g.add(bannerMesh);

      // Suspension cables linking beam to banner plate
      const cableL = vox(0.08, 0.9, 0.08, 0x444455, { x: -3.2, y: 7.6, z });
      const cableR = vox(0.08, 0.9, 0.08, 0x444455, { x: 3.2, y: 7.6, z });
      g.add(cableL, cableR);
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
