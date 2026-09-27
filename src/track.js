// ── track.js ────────────────────────────────────────────────────────────
// The endless track is a fixed pool of chunks that slide toward the player and
// wrap around to the far end, spawning a fresh obstacle row on each wrap.
// Pooling is what makes the track endless without allocating per row.
import { trackChunks, CHUNK_LEN } from './scene.js';
import { spawnRow } from './spawn.js';
import { dressChunk } from './deco.js';
import { districtChange } from './zones.js';
import { G } from './state.js';
import { disposeObject } from './utils.js';

/**
 * Throw away a chunk's scenery subtree. Leaving it for the collector would
 * keep re-uploading the same boxes on every district crossing.
 *
 * The teardown goes through disposeObject() rather than disposing directly,
 * because none of this scenery is per-chunk: every box comes from the shared
 * geometry and material caches in voxel.js, which flag what they hand out.
 * Disposing here unconditionally freed those cached buffers, and the other
 * chunks still drawing the same boxes lost them -- so scenery went dark as
 * blank or broken geometry at every district crossing (every 250m). The
 * helper skips cache-owned resources and only frees genuinely private ones.
 * @param {THREE.Group} chunk
 * @returns {void}
 */
function stripScenery(chunk) {
  for (let i = chunk.children.length - 1; i >= 0; i--) {
    const child = chunk.children[i];
    if (!child.userData || !child.userData.isScenery) continue;
    disposeObject(child);
    chunk.remove(child);
  }
}

/**
 * Re-dress every pooled chunk for a new district. Only the wrap check and a
 * district crossing call this, so the cost is a few times per run, not per
 * frame.
 * @param {number} districtIdx
 * @returns {void}
 */
export function redressScenery(districtIdx) {
  for (const chunk of trackChunks) {
    stripScenery(chunk);
    dressChunk(chunk, districtIdx);
  }
}

/**
 * Slide every chunk toward the player, wrapping any that pass the camera back
 * to the far end and repopulating it.
 *
 * District changes are handled here rather than in the render loop because
 * this is the moment a new chunk appears: the prompt asks for the scenery to
 * swap as the chunk is generated, not to cross-fade mid-stride.
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

  // Swap the scenery and the sky palette when the run enters a new district.
  const change = districtChange(G.districtIdx);
  if (change.changed) {
    G.districtIdx = change.index;
    redressScenery(change.index);
  }
}
