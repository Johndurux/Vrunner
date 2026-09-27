// ── characters.js ───────────────────────────────────────────────────────
// The character roster. Each entry is data plus a `build()` that returns the
// voxel mesh, so adding a character never touches game logic.
//

import * as THREE from 'three';
import { vox } from './voxel.js';

export const CHARACTERS = [
  {
    id: 'armor',
    name: 'ARMOR',
    role: 'Gold Mecha · Glow Visor',
    color: '#c7a458',
    avatarChar: 'A',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.24, 0.42, 0);
      legL.add(vox(0.36, 0.16, 0.44, 0x1c1a1b, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.28, 0.5, 0.3, 0xefe9dc, { y: -0.05 }));

      const legR = new THREE.Group(); legR.position.set(0.24, 0.42, 0);
      legR.add(vox(0.36, 0.16, 0.44, 0x1c1a1b, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.28, 0.5, 0.3, 0xefe9dc, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(1.0, 0.82, 0.78, 0xc7a458, { y: 0.95 });
      const grill1 = vox(0.65, 0.1, 0.05, 0x1c1a1b, { y: 1.12, z: 0.4 });
      const grill2 = vox(0.65, 0.1, 0.05, 0x1c1a1b, { y: 0.88, z: 0.4 });
      const backStripe = vox(0.18, 0.65, 0.04, 0x1c1a1b, { y: 0.95, z: -0.40 });
      g.add(body, grill1, grill2, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.62, 0.98, 0);
      armL.add(vox(0.24, 0.58, 0.24, 0xc7a458, { y: -0.15 }));
      armL.add(vox(0.26, 0.18, 0.26, 0xefe9dc, { y: -0.45 }));

      const armR = new THREE.Group(); armR.position.set(0.62, 0.98, 0);
      armR.add(vox(0.24, 0.58, 0.24, 0xc7a458, { y: -0.15 }));
      armR.add(vox(0.26, 0.18, 0.26, 0xefe9dc, { y: -0.45 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.08, 0.96, 1.05, 0xc7a458, { y: 1.9 });
      const eyeL = vox(0.24, 0.24, 0.05, 0xffd772, { x: -0.26, y: 1.94, z: 0.54 });
      const eyeR = vox(0.24, 0.24, 0.05, 0xffd772, { x: 0.26, y: 1.94, z: 0.54 });
      eyeL.material = new THREE.MeshBasicMaterial({ color: 0xffd772 });
      eyeR.material = new THREE.MeshBasicMaterial({ color: 0xffd772 });

      const earL = vox(0.12, 0.6, 0.18, 0xece2c8, { x: -0.58, y: 2.3, z: -0.1 });
      const earR = vox(0.12, 0.6, 0.18, 0xece2c8, { x: 0.58, y: 2.3, z: -0.1 });
      const backBun = vox(0.18, 0.35, 0.14, 0x1c1a1b, { y: 1.90, z: -0.53 });
      g.add(head, eyeL, eyeR, earL, earR, backBun);
      return g;
    }
  },
  {
    id: 'mist',
    name: 'MIST',
    role: 'Ghost Skull · Cyan Translucent',
    color: '#62f2cc',
    avatarChar: 'M',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const ghostMat = new THREE.MeshLambertMaterial({ color: 0x6fe3c3, transparent: true, opacity: 0.72 });

      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.3), ghostMat));
      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.3), ghostMat));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.8, 0.76), ghostMat);
      body.position.y = 0.95;
      g.add(body);

      const armL = new THREE.Group(); armL.position.set(-0.58, 0.98, 0);
      armL.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), ghostMat));
      const armR = new THREE.Group(); armR.position.set(0.58, 0.98, 0);
      armR.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), ghostMat));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.96, 1.02), ghostMat);
      head.position.y = 1.9;
      const eyeL = vox(0.26, 0.3, 0.08, 0x125f4b, { x: -0.24, y: 1.94, z: 0.5 });
      const eyeR = vox(0.26, 0.3, 0.08, 0x125f4b, { x: 0.24, y: 1.94, z: 0.5 });
      const mouthHole = vox(0.28, 0.2, 0.08, 0x125f4b, { y: 1.62, z: 0.5 });
      const topNodes = vox(0.3, 0.22, 0.3, 0x6fe3c3, { y: 2.45 });
      const backBun = vox(0.18, 0.35, 0.14, 0x125f4b, { y: 1.90, z: -0.52 });
      g.add(head, eyeL, eyeR, mouthHole, topNodes, backBun);
      return g;
    }
  },
  {
    id: 'pip',
    name: 'PIP',
    role: 'Cute Folk · Pink Bun',
    color: '#f2a7bc',
    avatarChar: 'P',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0x1c1a1b, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0x2a2224, { y: -0.05 }));

      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0x1c1a1b, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0x2a2224, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.9, 0.78, 0.74, 0xf2a7bc, { y: 0.95 });
      const stripe = vox(0.18, 0.65, 0.04, 0xf3ece2, { y: 0.95, z: 0.38 });
      const backStripe = vox(0.18, 0.65, 0.04, 0xf3ece2, { y: 0.95, z: -0.38 });
      g.add(body, stripe, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.56, 0.98, 0);
      armL.add(vox(0.22, 0.6, 0.22, 0xf2a7bc, { y: -0.15 }));
      const armR = new THREE.Group(); armR.position.set(0.56, 0.98, 0);
      armR.add(vox(0.22, 0.6, 0.22, 0xf2a7bc, { y: -0.15 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.05, 0.94, 1.0, 0xf2a7bc, { y: 1.88 });
      const eyeL = vox(0.34, 0.34, 0.04, 0xf3efe6, { x: -0.26, y: 1.92, z: 0.52 });
      const eyeR = vox(0.34, 0.34, 0.04, 0xf3efe6, { x: 0.26, y: 1.92, z: 0.52 });
      const pupL = vox(0.14, 0.14, 0.06, 0x1c1a1b, { x: -0.24, y: 1.9, z: 0.54 });
      const pupR = vox(0.14, 0.14, 0.06, 0x1c1a1b, { x: 0.24, y: 1.9, z: 0.54 });
      const ribbon = vox(0.3, 0.18, 0.24, 0xe8607f, { y: 2.44 });
      const bun = vox(0.18, 0.35, 0.18, 0xeee6da, { y: 2.65 });
      const backBun = vox(0.18, 0.35, 0.14, 0xeee6da, { y: 1.90, z: -0.50 });
      g.add(head, eyeL, eyeR, pupL, pupR, ribbon, bun, backBun);
      return g;
    }
  },
  {
    id: 'honey',
    name: 'HONEY',
    role: 'Bee Folk · Cyan Gloves',
    color: '#f0d44d',
    avatarChar: 'H',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0x141112, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0x2b1e22, { y: -0.05 }));

      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0x141112, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0x2b1e22, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.92, 0.8, 0.76, 0x2b1e22, { y: 0.95 });
      const beeStripe = vox(0.94, 0.24, 0.78, 0xf0d44d, { y: 1.05 });
      const backStripe = vox(0.18, 0.65, 0.04, 0xf0d44d, { y: 0.95, z: -0.39 });
      g.add(body, beeStripe, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.58, 0.98, 0);
      armL.add(vox(0.24, 0.58, 0.24, 0xf0d44d, { y: -0.15 }));
      armL.add(vox(0.26, 0.18, 0.26, 0x3fd7ea, { y: -0.45 }));

      const armR = new THREE.Group(); armR.position.set(0.58, 0.98, 0);
      armR.add(vox(0.24, 0.58, 0.24, 0xf0d44d, { y: -0.15 }));
      armR.add(vox(0.26, 0.18, 0.26, 0x3fd7ea, { y: -0.45 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.06, 0.94, 1.02, 0xf0d44d, { y: 1.88 });
      const eyeL = vox(0.34, 0.34, 0.04, 0xf3efe6, { x: -0.26, y: 1.92, z: 0.52 });
      const eyeR = vox(0.34, 0.34, 0.04, 0xf3efe6, { x: 0.26, y: 1.92, z: 0.52 });
      const pupL = vox(0.14, 0.14, 0.06, 0x1c1a1b, { x: -0.24, y: 1.9, z: 0.54 });
      const pupR = vox(0.14, 0.14, 0.06, 0x1c1a1b, { x: 0.24, y: 1.9, z: 0.54 });
      const antL = vox(0.14, 0.32, 0.14, 0x1c1a1b, { x: -0.32, y: 2.45 });
      const antR = vox(0.14, 0.32, 0.14, 0x1c1a1b, { x: 0.32, y: 2.45 });
      const backBun = vox(0.18, 0.35, 0.14, 0x2b1e22, { y: 1.90, z: -0.52 });
      g.add(head, eyeL, eyeR, pupL, pupR, antL, antR, backBun);
      return g;
    }
  },
  {
    id: 'goggles',
    name: 'GOGGLES',
    role: 'Steampunk Engineer',
    color: '#6a4a2c',
    avatarChar: 'G',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0x161616, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0x22324a, { y: -0.05 }));
      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0x161616, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0x22324a, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.94, 0.8, 0.78, 0x5a3a22, { y: 0.95 });
      const belt = vox(0.96, 0.16, 0.8, 0xd8432d, { y: 0.7 });
      const backStripe = vox(0.18, 0.65, 0.04, 0xd8432d, { y: 0.95, z: -0.40 });
      g.add(body, belt, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.58, 0.98, 0);
      armL.add(vox(0.24, 0.58, 0.24, 0x6a4a2c, { y: -0.15 }));
      const armR = new THREE.Group(); armR.position.set(0.58, 0.98, 0);
      armR.add(vox(0.24, 0.58, 0.24, 0x6a4a2c, { y: -0.15 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.08, 0.95, 1.05, 0x6a4a2c, { y: 1.88 });
      const goggleFrame = vox(1.12, 0.42, 0.2, 0x6b6a3c, { y: 1.95, z: 0.5 });
      const lensL = vox(0.32, 0.32, 0.06, 0xd7f58a, { x: -0.26, y: 1.95, z: 0.6 });
      const lensR = vox(0.32, 0.32, 0.06, 0xd7f58a, { x: 0.26, y: 1.95, z: 0.6 });
      lensL.material = new THREE.MeshBasicMaterial({ color: 0xd7f58a });
      lensR.material = new THREE.MeshBasicMaterial({ color: 0xd7f58a });
      const backBun = vox(0.18, 0.35, 0.14, 0xd8432d, { y: 1.90, z: -0.53 });
      g.add(head, goggleFrame, lensL, lensR, backBun);
      return g;
    }
  },
  {
    id: 'captain',
    name: 'CAPTAIN',
    role: 'Army Officer · Green Cap',
    color: '#2a74bd',
    avatarChar: 'C',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0xe9c64a, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0x2a74bd, { y: -0.05 }));
      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0xe9c64a, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0x2a74bd, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.96, 0.82, 0.78, 0x2a74bd, { y: 0.95 });
      const greenCoat = vox(0.98, 0.3, 0.8, 0x25623a, { y: 1.05 });
      const backStripe = vox(0.18, 0.65, 0.04, 0xe9c64a, { y: 0.95, z: -0.40 });
      g.add(body, greenCoat, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.6, 0.98, 0);
      armL.add(vox(0.24, 0.6, 0.24, 0x2a74bd, { y: -0.15 }));
      const armR = new THREE.Group(); armR.position.set(0.6, 0.98, 0);
      armR.add(vox(0.24, 0.6, 0.24, 0x2a74bd, { y: -0.15 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.08, 0.94, 1.04, 0x2a74bd, { y: 1.88 });
      const capBrim = vox(1.2, 0.16, 0.5, 0x6b6440, { y: 2.35, z: 0.25 });
      const capTop = vox(1.08, 0.35, 1.0, 0x6b6440, { y: 2.48 });
      const eyeL = vox(0.28, 0.24, 0.04, 0xffd772, { x: -0.24, y: 1.92, z: 0.53 });
      const eyeR = vox(0.28, 0.24, 0.04, 0xffd772, { x: 0.24, y: 1.92, z: 0.53 });
      eyeL.material = new THREE.MeshBasicMaterial({ color: 0xffd772 });
      eyeR.material = new THREE.MeshBasicMaterial({ color: 0xffd772 });
      const backBun = vox(0.18, 0.35, 0.14, 0xe9c64a, { y: 1.90, z: -0.53 });
      g.add(head, capBrim, capTop, eyeL, eyeR, backBun);
      return g;
    }
  },
  {
    id: 'lavender',
    name: 'LAVENDER',
    role: 'Purple Bunny · Dreamer',
    color: '#b08be0',
    avatarChar: 'L',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0x9a70d6, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0xb08be0, { y: -0.05 }));
      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0x9a70d6, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0xb08be0, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.92, 0.8, 0.76, 0xb08be0, { y: 0.95 });
      const belly = vox(0.65, 0.55, 0.05, 0xdcc8f5, { y: 0.95, z: 0.39 });
      const backStripe = vox(0.18, 0.65, 0.04, 0xdcc8f5, { y: 0.95, z: -0.39 });
      g.add(body, belly, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.58, 0.98, 0);
      armL.add(vox(0.24, 0.6, 0.24, 0xb08be0, { y: -0.15 }));
      const armR = new THREE.Group(); armR.position.set(0.58, 0.98, 0);
      armR.add(vox(0.24, 0.6, 0.24, 0xb08be0, { y: -0.15 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.06, 0.95, 1.02, 0xb08be0, { y: 1.88 });
      const eyeL = vox(0.32, 0.32, 0.04, 0xefe6fb, { x: -0.26, y: 1.92, z: 0.52 });
      const eyeR = vox(0.32, 0.32, 0.04, 0xefe6fb, { x: 0.26, y: 1.92, z: 0.52 });
      const pupL = vox(0.14, 0.14, 0.06, 0x6d4fa0, { x: -0.24, y: 1.9, z: 0.54 });
      const pupR = vox(0.14, 0.14, 0.06, 0x6d4fa0, { x: 0.24, y: 1.9, z: 0.54 });
      const earL = vox(0.2, 0.6, 0.18, 0x9a70d6, { x: -0.28, y: 2.6 });
      const earR = vox(0.2, 0.6, 0.18, 0x9a70d6, { x: 0.28, y: 2.6 });
      const backBun = vox(0.18, 0.35, 0.14, 0xdcc8f5, { y: 1.90, z: -0.52 });
      g.add(head, eyeL, eyeR, pupL, pupR, earL, earR, backBun);
      return g;
    }
  },
  {
    id: 'tux',
    name: 'TUX',
    role: 'Dark Purple · Cyan Tie',
    color: '#5b36a0',
    avatarChar: 'T',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0x1f1d22, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0x1f1d22, { y: -0.05 }));
      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0x1f1d22, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0x1f1d22, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.94, 0.8, 0.76, 0x4d2d8e, { y: 0.95 });
      const tieKnot = vox(0.22, 0.16, 0.06, 0x3fe2ec, { y: 1.15, z: 0.39 });
      const tieBody = vox(0.14, 0.38, 0.06, 0x3fe2ec, { y: 0.95, z: 0.39 });
      tieKnot.material = new THREE.MeshBasicMaterial({ color: 0x3fe2ec });
      tieBody.material = new THREE.MeshBasicMaterial({ color: 0x3fe2ec });
      const backStripe = vox(0.18, 0.65, 0.04, 0x3fe2ec, { y: 0.95, z: -0.39 });
      g.add(body, tieKnot, tieBody, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.58, 0.98, 0);
      armL.add(vox(0.24, 0.58, 0.24, 0x5b36a0, { y: -0.15 }));
      armL.add(vox(0.26, 0.18, 0.26, 0xe8e4dc, { y: -0.45 }));
      const armR = new THREE.Group(); armR.position.set(0.58, 0.98, 0);
      armR.add(vox(0.24, 0.58, 0.24, 0x5b36a0, { y: -0.15 }));
      armR.add(vox(0.26, 0.18, 0.26, 0xe8e4dc, { y: -0.45 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.08, 0.95, 1.04, 0x5b36a0, { y: 1.88 });
      const eyeL = vox(0.32, 0.32, 0.04, 0xf3efe6, { x: -0.26, y: 1.92, z: 0.52 });
      const eyeR = vox(0.32, 0.32, 0.04, 0xf3efe6, { x: 0.26, y: 1.92, z: 0.52 });
      const pupL = vox(0.14, 0.14, 0.06, 0x1c1a1b, { x: -0.24, y: 1.9, z: 0.54 });
      const pupR = vox(0.14, 0.14, 0.06, 0x1c1a1b, { x: 0.24, y: 1.9, z: 0.54 });
      const hairL = vox(0.18, 0.24, 0.24, 0x1f2420, { x: -0.2, y: 2.45 });
      const hairR = vox(0.18, 0.24, 0.24, 0x1f2420, { x: 0.2, y: 2.45 });
      const backBun = vox(0.18, 0.35, 0.14, 0x3fe2ec, { y: 1.90, z: -0.53 });
      g.add(head, eyeL, eyeR, pupL, pupR, hairL, hairR, backBun);
      return g;
    }
  },
  {
    id: 'mrhat',
    name: 'MR. HAT',
    role: 'Dapper Gent · Emerald Cap',
    color: '#b89c5e',
    avatarChar: 'M',
    unlocked: true,
    build: () => {
      const g = new THREE.Group();
      const legL = new THREE.Group(); legL.position.set(-0.22, 0.42, 0);
      legL.add(vox(0.34, 0.16, 0.44, 0x2fb58f, { y: -0.34, z: 0.04 }));
      legL.add(vox(0.26, 0.5, 0.28, 0xb89c5e, { y: -0.05 }));
      const legR = new THREE.Group(); legR.position.set(0.22, 0.42, 0);
      legR.add(vox(0.34, 0.16, 0.44, 0x2fb58f, { y: -0.34, z: 0.04 }));
      legR.add(vox(0.26, 0.5, 0.28, 0xb89c5e, { y: -0.05 }));
      g.add(legL, legR); g.legL = legL; g.legR = legR;

      const body = vox(0.92, 0.8, 0.76, 0xb89c5e, { y: 0.95 });
      const greenVest = vox(0.94, 0.24, 0.78, 0x2fb58f, { y: 0.95 });
      const backStripe = vox(0.18, 0.65, 0.04, 0x2fb58f, { y: 0.95, z: -0.40 });
      g.add(body, greenVest, backStripe);

      const armL = new THREE.Group(); armL.position.set(-0.58, 0.98, 0);
      armL.add(vox(0.24, 0.58, 0.24, 0xb89c5e, { y: -0.15 }));
      armL.add(vox(0.26, 0.18, 0.26, 0xe8e4dc, { y: -0.45 }));
      const armR = new THREE.Group(); armR.position.set(0.58, 0.98, 0);
      armR.add(vox(0.24, 0.58, 0.24, 0xb89c5e, { y: -0.15 }));
      armR.add(vox(0.26, 0.18, 0.26, 0xe8e4dc, { y: -0.45 }));
      g.add(armL, armR); g.armL = armL; g.armR = armR;

      const head = vox(1.06, 0.94, 1.02, 0xb89c5e, { y: 1.88 });
      const hatBrim = vox(1.28, 0.12, 0.54, 0x2fb58f, { y: 2.36, z: 0.26 });
      const hatTop = vox(1.1, 0.32, 1.0, 0xece6d6, { y: 2.48 });
      const eyeL = vox(0.32, 0.32, 0.04, 0xf7f5ef, { x: -0.26, y: 1.92, z: 0.52 });
      const eyeR = vox(0.32, 0.32, 0.04, 0xf7f5ef, { x: 0.26, y: 1.92, z: 0.52 });
      const pupL = vox(0.14, 0.14, 0.06, 0x9a948a, { x: -0.24, y: 1.9, z: 0.54 });
      const pupR = vox(0.14, 0.14, 0.06, 0x9a948a, { x: 0.24, y: 1.9, z: 0.54 });
      const backBun = vox(0.18, 0.35, 0.14, 0x2fb58f, { y: 1.90, z: -0.52 });
      g.add(head, hatBrim, hatTop, eyeL, eyeR, pupL, pupR, backBun);
      return g;
    }
  }
];

export function getCharacterSvg(c) {
  const id = c.id;
  if (id === 'armor') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="10" y="14" width="28" height="24" rx="2" fill="#c7a458"/><rect x="8" y="8" width="4" height="12" fill="#ece2c8"/><rect x="36" y="8" width="4" height="12" fill="#ece2c8"/><rect x="14" y="20" width="7" height="7" rx="1" fill="#ffd772"/><rect x="27" y="20" width="7" height="7" rx="1" fill="#ffd772"/><rect x="16" y="31" width="16" height="3" fill="#1c1a1b"/></svg>`;
  }
  if (id === 'mist') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="11" y="12" width="26" height="26" rx="4" fill="#62f2cc"/><rect x="15" y="20" width="6" height="8" rx="1" fill="#0d1b2a"/><rect x="27" y="20" width="6" height="8" rx="1" fill="#0d1b2a"/><rect x="20" y="31" width="8" height="3" fill="#0d1b2a"/></svg>`;
  }
  if (id === 'pip') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><polygon points="12,14 16,6 20,14" fill="#ff6289"/><polygon points="28,14 32,6 36,14" fill="#ff6289"/><rect x="12" y="14" width="24" height="22" rx="3" fill="#ff6289"/><rect x="16" y="21" width="5" height="5" fill="#ffffff"/><rect x="27" y="21" width="5" height="5" fill="#ffffff"/><rect x="17" y="22" width="3" height="3" fill="#1c1a1b"/><rect x="28" y="22" width="3" height="3" fill="#1c1a1b"/><polygon points="23,28 25,28 24,30" fill="#ffffff"/></svg>`;
  }
  if (id === 'honey') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><circle cx="13" cy="13" r="5" fill="#f5c842"/><circle cx="35" cy="13" r="5" fill="#f5c842"/><rect x="11" y="14" width="26" height="24" rx="3" fill="#f5c842"/><rect x="15" y="21" width="5" height="5" fill="#1c1a1b"/><rect x="28" y="21" width="5" height="5" fill="#1c1a1b"/><rect x="18" y="27" width="12" height="8" rx="2" fill="#fff5ea"/><rect x="22" y="29" width="4" height="3" rx="1" fill="#1c1a1b"/></svg>`;
  }
  if (id === 'goggles') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="11" y="13" width="26" height="24" rx="2" fill="#00e5ff"/><rect x="8" y="19" width="32" height="10" rx="2" fill="#111"/><rect x="11" y="21" width="11" height="6" fill="#ffe600"/><rect x="26" y="21" width="11" height="6" fill="#ffe600"/><rect x="20" y="32" width="8" height="2" fill="#007799"/></svg>`;
  }
  if (id === 'captain') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="10" y="8" width="28" height="8" rx="2" fill="#112244"/><rect x="21" y="10" width="6" height="5" fill="#ffd700"/><rect x="11" y="16" width="26" height="22" rx="2" fill="#3d72ff"/><rect x="15" y="23" width="5" height="5" fill="#ffffff"/><rect x="28" y="23" width="5" height="5" fill="#ffffff"/><rect x="17" y="24" width="3" height="3" fill="#111"/><rect x="30" y="24" width="3" height="3" fill="#111"/><rect x="18" y="31" width="12" height="2" fill="#ffd700"/></svg>`;
  }
  if (id === 'lavender') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="11" y="13" width="26" height="24" rx="3" fill="#a87ffb"/><rect x="14" y="21" width="7" height="6" rx="1" fill="#00ffcc"/><rect x="27" y="21" width="7" height="6" rx="1" fill="#00ffcc"/><rect x="8" y="20" width="3" height="8" fill="#e0c3fc"/><rect x="37" y="20" width="3" height="8" fill="#e0c3fc"/><rect x="19" y="31" width="10" height="3" fill="#5a189a"/></svg>`;
  }
  if (id === 'tux') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="11" y="12" width="26" height="26" rx="4" fill="#2a2a2a"/><rect x="16" y="18" width="16" height="18" rx="2" fill="#ffffff"/><circle cx="19" cy="22" r="2" fill="#111"/><circle cx="29" cy="22" r="2" fill="#111"/><polygon points="21,26 27,26 24,30" fill="#ff8800"/><polygon points="20,33 24,31 28,33 24,35" fill="#ff3b4e"/></svg>`;
  }
  if (id === 'mrhat') {
    return `<svg viewBox="0 0 48 48" width="36" height="36"><rect x="14" y="6" width="20" height="12" fill="#1c1a1b"/><rect x="14" y="16" width="20" height="3" fill="#ff3b4e"/><rect x="9" y="18" width="30" height="3" rx="1" fill="#1c1a1b"/><rect x="12" y="21" width="24" height="18" rx="2" fill="#e0643a"/><rect x="15" y="26" width="5" height="5" fill="#1c1a1b"/><rect x="28" y="26" width="5" height="5" fill="#1c1a1b"/><path d="M19,33 Q24,37 29,33" stroke="#1c1a1b" stroke-width="2" fill="none"/></svg>`;
  }
  return c.avatarChar || c.name.charAt(0);
}
