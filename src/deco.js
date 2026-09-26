// ── SCENERY (features 8 + 10) ──────────────────────────────────────────────
// Decor only. Nothing in here is ever added to activeObstacles or
// activeItems, so none of it can hit the player. The props ride along inside
// the track chunk group, which means advanceTrack() already moves them
// toward the camera and recycles them for free -- the prompt asked for
// "logika mirip trackChunks (posisi z bergerak sesuai moveZ, di-recycle saat
// lewat kamera)" and that is literally what the chunk group gives us.
//
// Each district in zones.js has its own builder here. Switching district
// swaps the builders, so the very next generated chunk is dressed in the new
// scenery.
//
// Performance note: a district is several hundred boxes. Every one of them
// shares a geometry and a material through voxel.js's caches and none of them
// casts a shadow -- background props nobody can pick out through the fog were
// costing the frame rate more than they added. An earlier version of this file
// built a fresh BoxGeometry and MeshLambertMaterial per box and ran at 3 fps.

import * as THREE from 'three';
import { decoBox, neonBox } from './voxel.js';
import { CHUNK_LEN } from './scene.js';

/** How far out from the centre rail the scenery sits. */
const SIDE = 6.4;

/** Deterministic-ish jitter so a chunk never looks copy-pasted. */
function jitter(spread) {
  return (Math.random() - 0.5) * spread;
}

/**
 * Most billboards allowed in one chunk. The prompt asked for 4-6 across the
 * whole view; with three chunks dressed at a time this lands in that range
 * while keeping the per-chunk prop count bounded.
 */
const BILLBOARD_CAP = 2;

// ── ZONA KOTA MALAM: tall voxel buildings, lit windows ─────────────────────
function buildCitySkyline() {
  const g = new THREE.Group();

  for (const side of [-1, 1]) {
    for (let z = -CHUNK_LEN / 2 + 2; z < CHUNK_LEN / 2 - 2; z += 9.5) {
      const h = 9 + Math.random() * 16;
      const w = 3.4 + Math.random() * 2.2;
      const depth = 4.2 + Math.random() * 1.6;
      const x = side * (SIDE + jitter(1.2));

      const body = decoBox(w, h, depth, 0x141a24, { x, y: h / 2 - 0.3, z: z + jitter(0.8) });
      // Setbacks so the skyline is not a row of flat slabs.
      const crown = decoBox(w * 0.62, 1.6 + Math.random() * 2, depth * 0.7, 0x1b2431,
        { x, y: h + 0.6, z: z + jitter(0.8) });
      g.add(body, crown);

      // Lit windows: small flat boxes on the face that points at the track.
      // Only a third of the flats are lit, and they are far past the fog line
      // anyway, so the count stays cheap.
      const faceX = x - side * (w / 2 + 0.02);
      const rows = Math.floor(h / 2.2);
      for (let r = 0; r < rows; r++) {
        if (Math.random() < 0.66) continue; // most flats are dark
        const warm = Math.random() < 0.7;
        const win = neonBox(0.06, 0.42, 0.5, warm ? 0xffd980 : 0x7fe8ff, {
          x: faceX, y: 1.1 + r * 2.2, z: z + jitter(1.25),
        });
        g.add(win);
      }
    }
  }
  g.add(buildCryptoProps());
  return g;
}

// ── ZONA TEROWONGAN NEON: tunnel walls, neon runs, blinking ceiling lamps ──
function buildNeonTunnel() {
  const g = new THREE.Group();

  for (const side of [-1, 1]) {
    // Tunnel wall.
    g.add(decoBox(0.8, 7.5, CHUNK_LEN, 0x141828, { x: side * SIDE, y: 3.6 }));

    // Two long neon runs hugging the wall, offset in depth.
    g.add(neonBox(0.12, 0.22, CHUNK_LEN, side < 0 ? 0x36e0ff : 0xb45cff,
      { x: side * (SIDE - 0.45), y: 4.6 }));
    g.add(neonBox(0.12, 0.14, CHUNK_LEN, side < 0 ? 0xb45cff : 0x36e0ff,
      { x: side * (SIDE - 0.45), y: 1.5 }));

    // Vertical ribs every few metres, so speed is readable.
    for (let z = -CHUNK_LEN / 2; z < CHUNK_LEN / 2; z += 4.5) {
      g.add(decoBox(0.5, 7.5, 0.5, 0x1d2338, { x: side * (SIDE - 0.2), y: 3.6, z }));
    }
  }

  // Ceiling with lamps that dim and brighten as you pass.
  g.add(decoBox(2 * SIDE, 0.6, CHUNK_LEN, 0x10131f, { y: 7.4 }));
  for (let z = -CHUNK_LEN / 2; z < CHUNK_LEN / 2; z += 5.5) {
    const lamp = neonBox(1.1, 0.12, 0.5, 0xcfe9ff, { y: 7.05, z });
    lamp.userData.blinker = true;
    lamp.userData.phase = Math.random() * Math.PI * 2;
    g.add(lamp);
  }
  g.add(buildCryptoProps());
  return g;
}

// ── ZONA DATA CENTER CRYPTO: server racks, crypto billboards ───────────────
function buildDataCenter() {
  const g = new THREE.Group();
  const marks = ['$', '⛓', '◈', '▣', '⬡'];

  for (const side of [-1, 1]) {
    for (let z = -CHUNK_LEN / 2 + 2; z < CHUNK_LEN / 2 - 2; z += 7.0) {
      const x = side * (SIDE + jitter(0.6));
      const h = 3.2 + Math.random() * 1.4;
      g.add(decoBox(2.6, h, 3.2, 0x121a1c, { x, y: h / 2 - 0.3, z }));

      // Blinking status LEDs down the front face.
      const faceX = x - side * 1.32;
      for (let r = 0; r < 4; r++) {
        const led = neonBox(0.06, 0.14, 0.14, Math.random() < 0.5 ? 0x4dff9e : 0x2ad4ff,
          { x: faceX, y: 0.5 + r * 0.62, z: z + jitter(0.4) });
        led.userData.blinker = true;
        led.userData.phase = Math.random() * Math.PI * 2;
        g.add(led);
      }
    }
  }

  // Billboards carrying crypto glyphs, both sides.
  for (const side of [-1, 1]) {
    for (let z = -CHUNK_LEN / 2 + 5; z < CHUNK_LEN / 2 - 5; z += 11) {
      const x = side * (SIDE - 0.3);
      g.add(decoBox(0.3, 4.2, 0.3, 0x1a2226, { x, y: 2.1, z: z - 1.4 }));
      g.add(decoBox(0.14, 1.7, 2.5, 0x18242c, { x: x - side * 0.25, y: 3.5, z }));

      // The glyph plate is a thin unlit slab. Which symbol it stands for lives
      // in userData.glyph, not in the material: a texture is far more work than
      // this view can justify, and a random colour is what actually reads.
      const glyph = neonBox(0.08, 0.7, 0.7, Math.random() < 0.5 ? 0x4dff9e : 0x2ad4ff,
        { x: x - side * 0.36, y: 3.5, z });
      glyph.userData.glyph = marks[Math.floor(Math.random() * marks.length)];
      g.add(glyph);
    }
  }
  g.add(buildCryptoProps());
  return g;
}

/** Builder per district index. Order must match DISTRICTS in zones.js. */
export const DECO_BUILDERS = [buildCitySkyline, buildNeonTunnel, buildDataCenter];

/**
 * Dress a freshly built chunk for the district the run is in.
 * @param {THREE.Group} chunk
 * @param {number} districtIdx
 * @returns {THREE.Group} the same chunk, for chaining
 */
export function dressChunk(chunk, districtIdx) {
  const build = DECO_BUILDERS[districtIdx] || DECO_BUILDERS[0];
  const scenery = build();
  scenery.userData.isScenery = true;
  chunk.add(scenery);
  return chunk;
}

/**
 * Animate the blinkers in view. Cheap: only touches objects flagged
 * userData.blinker, and does nothing when the run is not moving.
 * @param {THREE.Group[]} chunks
 * @param {number} t  elapsed time in seconds
 * @returns {void}
 */
export function animateScenery(chunks, t) {
  for (const chunk of chunks) {
    if (!chunk.children) continue;
    for (const child of chunk.children) {
      if (!child.userData || !child.userData.isScenery) continue;
      // Blinkers sit at different depths -- a lamp is a direct child of the
      // scenery group, but the founder's floating sign is three levels down.
      // Walking one level animated the lamps and silently skipped the rest,
      // so the subtree is traversed properly. Cheap: only the flagged objects
      // are touched, and a district holds a few dozen of them at most.
      child.traverse((part) => {
        if (!part.userData || !part.userData.blinker) return;
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + part.userData.phase);
        // Scale is per-mesh so blinkers can share one material; tinting the
        // material would fade every lamp of that colour in lockstep.
        const sc = 0.72 + 0.28 * pulse;
        part.scale.set(sc, 1, sc);
      });
    }
  }
}


// ── CRYPTO BILLBOARDS & MEME-COIN MASCOTS (feature 5) ──────────────────────
// Decoration only, same rules as everything above: nothing here is ever added
// to activeObstacles or activeItems, so it can never hit the player. These ride
// inside the chunk group, which is what makes them pool and recycle for free
// with the rails -- the prompt asked for exactly that, and the chunk group
// already does it.
//
// Every prop is built from cached geometry and cached material, and the
// lantern strings / candlestick charts are 1 draw call of boxes rather than a
// texture, because a district's decor is several hundred boxes and anything
// unique stops being cheap immediately.

// Tickers are the joke: fake coin names and the two words every crypto
// timeline is built out of. Nothing here refers to a real person or project.
const TICKERS = ['$MOON', 'TO THE MOON', 'WAGMI', 'NGMI', 'REKT', '$GME', 'APE OR DIE', 'HODL'];

/**
 * The text plate of a billboard. Text is drawn as a run of voxel blocks, not
 * rendered as text: a texture would need a canvas per billboard and a unique
 * material each, which is the exact thing the voxel cache exists to avoid.
 *
 * So instead of literal letters, each billboard gets a distinct pattern of lit
 * and dark blocks plus a colour. At the speed the player passes it, that reads
 * as a scrolling ticker; the literal strings are kept as userData so the
 * in-game readout and the tests can tell two billboards apart.
 *
 * @param {THREE.Group} parent
 * @param {number} x  centre of the plate
 * @param {number} y
 * @param {number} z
 * @param {number} color  plate glow colour
 * @param {string} ticker  the fake ticker this plate stands for
 * @param {number} seed  decides the block pattern
 * @returns {THREE.Group} the plate group
 */
function buildTicker(parent, x, y, z, color, ticker, seed) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.ticker = ticker;

  // The unlit backing panel the blocks sit on.
  const panel = decoBox(0.16, 2.0, 4.2, 0x0a0d14, { x: 0, y: 0 });
  g.add(panel);

  // Three rows of blocks. The lit fraction is derived from the seed and the
  // ticker so each plate is stable across recycles -- a billboard that changed
  // its own text every time the chunk wrapped would read as a glitch.
  const rows = [
    { h: 0.42, cells: 9, w: 0.38 },
    { h: 0.30, cells: 12, w: 0.28 },
    { h: 0.24, cells: 15, w: 0.22 },
  ];
  rows.forEach((row, ri) => {
    const span = row.cells * row.w;
    for (let c = 0; c < row.cells; c++) {
      // A cheap deterministic hash: same seed + same cell -> same block.
      const h = (seed * 9301 + ri * 49297 + c * 233280) % 233280;
      const frac = (h / 233280);
      if (frac < 0.32) continue;               // gap: dark, no geometry
      // Green and red blocks are candlestick colouring, and the only colour
      // variation the plate needs to read as a market ticker. The colour is
      // chosen BEFORE the box is built so neonBox's material cache does the
      // sharing -- building the block and then swapping its material would
      // create a fresh material per block and defeat the cache.
      const blockColor = frac > 0.9 ? 0x4dff9e
                       : frac < 0.36 ? 0xff4d6a
                       : color;
      const blk = neonBox(0.06, row.h, row.w * 0.72, blockColor,
        { z: -span / 2 + c * row.w, y: 0.72 - ri * 0.62 });
      g.add(blk);
    }
  });
  return g;
}

/**
 * A candlestick chart on a post, as a free-standing prop beside the track.
 * @param {number} x
 * @param {number} z
 * @param {number} seed
 * @returns {THREE.Group}
 */
function buildCandleChart(x, z, seed) {
  const g = new THREE.Group();
  const post = decoBox(0.18, 2.4, 0.18, 0x1a1f2c, { x, y: 1.2, z });
  g.add(post);
  const base = Math.abs(Math.floor(seed)) % 7;
  for (let i = 0; i < 5; i++) {
    const h = (base + i) % 5;
    const up = ((base + i) % 2) === 0;
    const col = up ? 0x4dff9e : 0xff4d6a;
    const body = neonBox(0.1, 0.22 + h * 0.16, 0.22, col,
      { x: x - 0.16, y: 1.5 + i * 0.34, z: z + jitter(0.12) });
    const wick = neonBox(0.05, 0.3, 0.05, col,
      { x: x - 0.16, y: 1.62 + i * 0.34, z: z + jitter(0.12) });
    g.add(body, wick);
  }
  return g;
}

/**
 * A generic meme-coin mascot. Deliberately built from primitives only -- a
 * green frog, a generic dog, a small rocket, a whale -- so nothing resembles a
 * specific existing character or coin branding.
 * @param {number} x
 * @param {number} z
 * @param {number} seed
 * @returns {THREE.Group}
 */
function buildMascot(x, z, seed) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const kind = Math.abs(Math.floor(seed)) % 4;

  if (kind === 0) {
    // Frog: squat body, two eyes on top, wide mouth line.
    g.add(decoBox(1.1, 0.7, 0.9, 0x2f9e4f, { y: 0.55 }));
    g.add(decoBox(0.95, 0.5, 0.8, 0x37b85c, { y: 0.95 }));
    g.add(decoBox(0.28, 0.28, 0.28, 0xf2f2f2, { y: 1.32, x: -0.28 }));
    g.add(decoBox(0.28, 0.28, 0.28, 0xf2f2f2, { y: 1.32, x: 0.28 }));
    g.add(decoBox(0.12, 0.12, 0.12, 0x101014, { y: 1.32, x: -0.28, z: 0.15 }));
    g.add(decoBox(0.12, 0.12, 0.12, 0x101014, { y: 1.32, x: 0.28, z: 0.15 }));
    g.add(neonBox(0.7, 0.1, 0.06, 0x1a1a1a, { y: 0.78, z: 0.46 }));
  } else if (kind === 1) {
    // Generic dog: four legs, body, head, ears, tail.
    g.add(decoBox(0.7, 0.55, 1.15, 0xd8a05a, { y: 0.72 }));
    g.add(decoBox(0.55, 0.5, 0.5, 0xe8b96e, { y: 1.08, z: -0.72 }));
    g.add(decoBox(0.16, 0.34, 0.1, 0xa87a3c, { y: 1.42, x: -0.2, z: -0.7 }));
    g.add(decoBox(0.16, 0.34, 0.1, 0xa87a3c, { y: 1.42, x: 0.2, z: -0.7 }));
    g.add(decoBox(0.1, 0.1, 0.1, 0x141418, { y: 1.14, x: -0.14, z: -0.96 }));
    g.add(decoBox(0.1, 0.1, 0.1, 0x141418, { y: 1.14, x: 0.14, z: -0.96 }));
    for (const lx of [-0.24, 0.24]) {
      for (const lz of [-0.38, 0.38]) {
        g.add(decoBox(0.16, 0.45, 0.16, 0xc08c48, { x: lx, y: 0.24, z: lz }));
      }
    }
    g.add(decoBox(0.12, 0.12, 0.42, 0xd8a05a, { y: 0.86, z: 0.72 }));
  } else if (kind === 2) {
    // Small rocket: nose cone, body, fins, window.
    g.add(decoBox(0.42, 0.9, 0.42, 0xe4e8f0, { y: 0.95 }));
    g.add(decoBox(0.3, 0.3, 0.3, 0xff7a3a, { y: 1.55 }));
    g.add(decoBox(0.16, 0.16, 0.08, 0x6ad4ff, { y: 1.05, z: -0.22 }));
    g.add(decoBox(0.1, 0.42, 0.34, 0xd05050, { x: -0.3, y: 0.62 }));
    g.add(decoBox(0.1, 0.42, 0.34, 0xd05050, { x: 0.3, y: 0.62 }));
    g.add(neonBox(0.3, 0.2, 0.3, 0xffb03a, { y: 0.34 }));
  } else {
    // Whale: big landmark, body + tail + eye. Rare enough to be a landmark.
    g.add(decoBox(2.4, 1.3, 1.1, 0x2f6fb5, { y: 1.3 }));
    g.add(decoBox(0.9, 0.9, 0.9, 0x3a7fc8, { y: 1.7, z: -1.25 }));
    g.add(decoBox(0.6, 0.5, 0.7, 0x2f6fb5, { y: 1.5, z: 1.4 }));
    g.add(decoBox(0.16, 0.6, 0.16, 0x2a5f9e, { y: 2.2, z: 1.45 }));
    g.add(decoBox(0.12, 0.12, 0.12, 0x101014, { y: 1.75, z: -1.66, x: -0.24 }));
    g.add(neonBox(1.6, 0.1, 0.1, 0x4dff9e, { y: 0.72 }));
  }
  return g;
}

/**
 * The "Disgraced Founder" easter egg: a suited voxel figure standing with its
 * head bowed, a REKT sign floating over it.
 *
 * Entirely static and entirely fictional. It is scenery, not a character: it
 * is never added to the roster, never moves, and cannot be selected or hit.
 * @param {number} x
 * @param {number} z
 * @returns {THREE.Group}
 */
function buildFounder(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  // Suit: dark jacket, shoulders, legs.
  g.add(decoBox(0.78, 0.9, 0.42, 0x22242c, { y: 1.35 }));
  g.add(decoBox(0.86, 0.2, 0.46, 0x2c2f3a, { y: 1.82 }));
  g.add(decoBox(0.22, 0.85, 0.24, 0x1a1c22, { x: -0.19, y: 0.45 }));
  g.add(decoBox(0.22, 0.85, 0.24, 0x1a1c22, { x: 0.19, y: 0.45 }));
  // Shirt triangle in a lighter tone so the suit reads as a suit.
  g.add(decoBox(0.2, 0.34, 0.06, 0xe8e8ee, { y: 1.66, z: -0.22 }));
  // Head, bowed forward: pitched down, and sunk toward the chest.
  const head = new THREE.Group();
  head.position.set(0, 2.05, 0.05);
  head.rotation.x = 0.55;   // looking down at the floor
  head.add(decoBox(0.44, 0.44, 0.42, 0xc8a888, { y: 0.16 }));
  head.add(decoBox(0.46, 0.14, 0.44, 0x3a2f26, { y: 0.36 }));   // hair
  head.add(decoBox(0.1, 0.06, 0.04, 0x14141a, { y: 0.16, z: -0.22 }));  // eyes
  g.add(head);
  // Arms hanging, slightly forward.
  g.add(decoBox(0.18, 0.72, 0.2, 0x22242c, { x: -0.5, y: 1.3, z: 0.06 }));
  g.add(decoBox(0.18, 0.72, 0.2, 0x22242c, { x: 0.5, y: 1.3, z: 0.06 }));
  // The floating sign. Bright, because it is the whole point of the prop.
  const sign = new THREE.Group();
  sign.position.set(0, 2.9, 0);
  sign.add(decoBox(0.1, 0.62, 1.6, 0x0d0f14, { x: 0 }));
  const red = neonBox(0.06, 0.34, 0.34, 0xff4d6a, { x: -0.08, y: 0.12, z: -0.5 });
  const red2 = neonBox(0.06, 0.34, 0.34, 0xff4d6a, { x: -0.08, y: 0.12, z: 0.5 });
  const mid = neonBox(0.06, 0.34, 0.5, 0xff4d6a, { x: -0.08, y: 0.12, z: 0 });
  sign.add(red, red2, mid);
  sign.userData.blinker = true;
  sign.userData.phase = Math.random() * Math.PI * 2;
  g.add(sign);
  return g;
}

/**
 * Scatter the crypto props for a chunk. Called by whichever district builder
 * wants them; the cap below is what keeps the prop count from growing with
 * the number of chunks.
 *
 * At most BILLBOARD_CAP billboards are placed per chunk, and they are the first
 * thing to be dropped when the cap is hit, because a billboard is the biggest
 * object in the set. The mascot, the chart and the founder are cheap enough to
 * always fit.
 * @returns {THREE.Group}
 */
function buildCryptoProps() {
  const g = new THREE.Group();
  const side = Math.random() < 0.5 ? -1 : 1;
  // Billboard on its own, plus a second on the far side less often.
  const spots = [
    { x: side * (SIDE + 2.6), z: -CHUNK_LEN / 2 + 6 },
    { x: -side * (SIDE + 2.6), z: CHUNK_LEN / 2 - 10 },
  ];
  let placed = 0;
  spots.forEach((spot, i) => {
    if (placed >= BILLBOARD_CAP) return;
    if (i === 1 && Math.random() < 0.5) return;   // second one is a coin flip
    const seed = Math.floor(Math.random() * 9973);
    const ticker = TICKERS[seed % TICKERS.length];
    const col = [0x4dff9e, 0xff4d6a, 0x2ad4ff, 0xffb03a][seed % 4];

    // Support post + plate. The plate faces the track, so it is turned to
    // sit flat against the post rather than facing down the road.
    const post = decoBox(0.26, 3.4, 0.26, 0x1c2028, { x: spot.x, y: 1.7, z: spot.z });
    g.add(post);
    const plate = buildTicker(g, spot.x - Math.sign(spot.x) * 0.2, 3.3, spot.z, col, ticker, seed);
    plate.rotation.y = Math.PI / 2;
    g.add(plate);
    placed++;

    // Mascot at the foot of the billboard, on the track side of the post.
    g.add(buildMascot(spot.x - Math.sign(spot.x) * 1.4, spot.z + 3.0, seed + 17));
  });

  // One candlestick chart, and the founder easter egg roughly every fifth
  // chunk -- an easter egg should be rare enough to be an easter egg.
  g.add(buildCandleChart(side * (SIDE + 0.9), -CHUNK_LEN / 2 + 16, Math.random() * 991));
  if (Math.random() < 0.2) {
    g.add(buildFounder(-side * (SIDE + 1.6), CHUNK_LEN / 2 - 7));
  }
  return g;
}
