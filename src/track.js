// ── track.js ────────────────────────────────────────────────────────────
// The endless track is a fixed pool of chunks that slide toward the player and
// wrap around to the far end, spawning a fresh obstacle row on each wrap.
// Pooling is what makes the track endless without allocating per row.
import { trackChunks, CHUNK_LEN } from './scene.js';
import { spawnRow } from './spawn.js';

/**
 * Slide every chunk toward the player, wrapping any that pass the camera back
 * to the far end and repopulating it.
 * @param {number} moveZ  world units travelled this frame
 * @returns {void}
 */
export function advanceTrack(moveZ) {
  // Infinite Track Pooling
  trackChunks.forEach(chunk => {
    chunk.position.z += moveZ;
    if (chunk.position.z > CHUNK_LEN) {
      let minZ = 0;
      trackChunks.forEach(c => { if (c.position.z < minZ) minZ = c.position.z; });
      chunk.position.z = minZ - CHUNK_LEN;
      spawnRow(chunk.position.z);
    }
  });

  // Bounding box collision calculation
}
