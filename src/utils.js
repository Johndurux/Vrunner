// ── utils.js ────────────────────────────────────────────────────────────
// Teardown helpers. Removing a mesh from the scene is not enough: its
// geometry and materials have to be disposed too, or a long run leaks GPU
// memory until the tab dies. The obstacle and item pools churn constantly, so
// this runs on every recycle.

import { scene } from './scene.js';
import { vox } from './voxel.js';

export function disposeObject(obj) {
  if (!obj) return;
  scene.remove(obj);
  obj.traverse(child => {
    // Resources handed out by voxel.js are shared between every mesh that
    // asked for the same dimensions or colour, so disposing one would strip
    // the GPU buffers out from under all the others. Anything the cache owns
    // is flagged and left alone; only per-instance resources are freed.
    if (child.geometry && !child.geometry.userData.shared) child.geometry.dispose();
    const mats = child.material
      ? (Array.isArray(child.material) ? child.material : [child.material])
      : [];
    mats.forEach(m => { if (!m.userData.shared) m.dispose?.(); });
  });
}

export function clearEntityList(list) {
  list.forEach(disposeObject);
  list.length = 0;
}

export { vox };
