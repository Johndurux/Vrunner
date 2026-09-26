// ── voxel.js ────────────────────────────────────────────────────────────
// The one primitive every mesh in the game is built from. Kept in its own
// leaf module so both the scene and the entity factories can use it without
// importing each other.

import * as THREE from 'three';

/**
 * A single shaded box.
 * @param {number} w width
 * @param {number} h height
 * @param {number} d depth
 * @param {number} color  hex colour
 * @param {{x?:number,y?:number,z?:number}} [at] centre offset
 * @returns {THREE.Mesh}
 */
export function vox(w, h, d, color, { x = 0, y = 0, z = 0 } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
