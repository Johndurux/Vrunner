// ── timing.js ───────────────────────────────────────────────────────────
// The single game clock. Everything time-based reads from here so pausing,
// and the clamping of a stuttered frame, apply uniformly.

import * as THREE from 'three';

export const clock = new THREE.Clock();

/** Longest simulation step we will take, in seconds.
 *  Without this a backgrounded tab or a breakpoint hands the simulation a
 *  multi-second delta, which would teleport obstacles through the player. */
export const MAX_DT = 0.1;
