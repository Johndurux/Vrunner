// ── chaser.js ───────────────────────────────────────────────────────────
// The rival that runs directly behind the player in the same lane. Purely
// visual pressure: it never collides and never affects the run.

import * as THREE from 'three';
import { GROUND_Y, scene } from './scene.js';
import { disposeObject } from './utils.js';
import { vox } from './utils.js';

export function createTrumpChaser() {
  const g = new THREE.Group();
  g.scale.set(0.85, 0.85, 0.85); // Full body clearly visible in frame

  // Body — navy blue suit jacket
  const body = vox(1.18, 1.25, 0.85, 0x1a264a, { y: 1.28 });
  g.add(body);

  // White collared shirt
  const collar = vox(0.55, 0.24, 0.88, 0xf8f9fa, { y: 1.95 });
  g.add(collar);

  // Iconic Long Red Tie
  const tie = vox(0.24, 0.96, 0.12, 0xdc143c, { y: 1.48, z: 0.44 });
  tie.material = new THREE.MeshBasicMaterial({ color: 0xdc143c });
  g.add(tie);

  // Legs — dark navy suit trousers
  const legL = new THREE.Group(); legL.position.set(-0.28, 0.72, 0);
  legL.add(vox(0.42, 0.72, 0.46, 0x141d3b, { y: -0.36 }));
  legL.add(vox(0.44, 0.22, 0.54, 0x0f1118, { y: -0.66, z: 0.04 })); // shoes
  const legR = new THREE.Group(); legR.position.set(0.28, 0.72, 0);
  legR.add(vox(0.42, 0.72, 0.46, 0x141d3b, { y: -0.36 }));
  legR.add(vox(0.44, 0.22, 0.54, 0x0f1118, { y: -0.66, z: 0.04 })); // shoes
  g.legL = legL; g.legR = legR;
  g.add(legL, legR);

  // Arms — navy suit sleeves + orange hands
  const armL = new THREE.Group(); armL.position.set(-0.72, 1.62, 0);
  armL.add(vox(0.32, 0.74, 0.34, 0x1a264a, { y: -0.32 }));
  armL.add(vox(0.28, 0.28, 0.28, 0xf29b4e, { y: -0.74 }));
  const armR = new THREE.Group(); armR.position.set(0.72, 1.62, 0);
  armR.add(vox(0.32, 0.74, 0.34, 0x1a264a, { y: -0.32 }));
  armR.add(vox(0.28, 0.28, 0.28, 0xf29b4e, { y: -0.74 }));
  g.armL = armL; g.armR = armR;
  g.add(armL, armR);

  // Head — big, signature orange-tanned skin
  const head = vox(1.08, 0.98, 0.94, 0xf29b4e, { y: 2.58 });
  g.add(head);

  // Angry focused eyes
  const eyeL = vox(0.18, 0.12, 0.06, 0x11131a, { x: -0.24, y: 2.68, z: 0.48 });
  const eyeR = vox(0.18, 0.12, 0.06, 0x11131a, { x: 0.24, y: 2.68, z: 0.48 });
  // White eye highlights
  const eyeWhL = vox(0.26, 0.18, 0.04, 0xffffff, { x: -0.24, y: 2.68, z: 0.47 });
  const eyeWhR = vox(0.26, 0.18, 0.04, 0xffffff, { x: 0.24, y: 2.68, z: 0.47 });
  g.add(eyeWhL, eyeWhR, eyeL, eyeR);

  // Pursed lips
  const mouth = vox(0.36, 0.1, 0.06, 0xba5a2e, { y: 2.38, z: 0.48 });
  g.add(mouth);

  // SIGNATURE BLONDE COMBOVER HAIR
  const hairBase = vox(1.18, 0.34, 1.05, 0xf7e06d, { y: 3.14 });
  const hairSwoop = vox(1.26, 0.42, 0.44, 0xf7e06d, { x: -0.06, y: 3.24, z: -0.36 });
  const hairTop   = vox(1.02, 0.28, 0.88, 0xf4d547, { x: 0.04, y: 3.42 });
  const hairPeak  = vox(0.68, 0.24, 0.58, 0xf5cf36, { x: 0.14, y: 3.62, z: 0.12 });
  g.add(hairBase, hairSwoop, hairTop, hairPeak);

  return g;
}

export const chaser = { mesh: null, active: false, phase: 0 };
