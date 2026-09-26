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
    if (child.geometry) child.geometry.dispose();
    const mats = child.material
      ? (Array.isArray(child.material) ? child.material : [child.material])
      : [];
    mats.forEach(m => m.dispose?.());
  });
}

export function clearEntityList(list) {
  list.forEach(disposeObject);
  list.length = 0;
}

export { vox };
