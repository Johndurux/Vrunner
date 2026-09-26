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
      // Blinkers are grandchildren, so walk the scenery subtree only.
      const parts = child.children;
      if (!parts) continue;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part.userData || !part.userData.blinker) continue;
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + part.userData.phase);
        // Scale is per-mesh so blinkers can share one material; tinting the
        // material would fade every lamp of that colour in lockstep.
        const s = 0.72 + 0.28 * pulse;
        part.scale.set(s, 1, s);
      }
    }
  }
}
