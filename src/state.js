
// Mutable run state, kept in one object so no module can read a half-updated
// snapshot and so the whole shape stays visible in one place.

import * as THREE from 'three';
import { CAM_LOBBY } from './scene.js';
import { clock } from './timing.js';

export const G = {
  gameState: 'LOBBY',   // LOBBY | TRANSITION | RUNNING | GAMEOVER
  playerLane: 1,
  targetX: 0,
  playerY: 0,
  playerVy: 0,
  isGrounded: true,
  isSliding: false,
  slideTimer: null,
  slideTimeLeft: 0,
  isPaused: false,
  runStartTimer: null,
  runSpeed: 18,
  distance: 0,
  // Last whole-metre value written to the distance HUD. -1 rather than 0 so
  // the first frame of a run always writes, and it is reset with distance.
  shownM: -1,
  sessionCoins: 0,
  walletAddress: '',
  totalSavedCoins: 0,
  bestDist: 0,
  selectedCharIdx: 0,
  // Sound preference, restored from the save so a mute survives a reload.
  // Left undefined until restoreState() finds a stored preference.
  soundOn: undefined,
  // Metres per day/night half-cycle; daynight.js reads this instead of its own
  // constant so the cycle can be tuned from the one state object.
  dayNightSpan: 350,
  // Scenery. zoneSpan is metres per district, districtIdx is the district the
  // run is currently dressed in, and nextDistrict is the index to swap to the
  // moment the run crosses the boundary. Keeping them in G is what lets the
  // decor, the palette and the HUD agree without importing each other.
  zoneSpan: 250,
  districtIdx: 0,
  sceneryPending: false,
};

export function resetPlayerMotion() {
  G.isSliding = false;
  G.isGrounded = true;
  G.playerY = 0;
  G.playerVy = 0;
  G.slideTimeLeft = 0;
  if (G.slideTimer) {
    clearTimeout(G.slideTimer);
    G.slideTimer = null;
  }
}

export function updateCoinHud() {
  document.getElementById('hudCoins').textContent = String(G.sessionCoins);
  document.getElementById('topCoins').textContent = `${G.totalSavedCoins} $VPLAY`;
}

// Smooth camera transition targets. The camera lerps toward these every
// frame; the shake/FOV/roll passes nudge the result afterwards. They live in
// G rather than in their own export because a module cannot observe another
// module's `export let` after it is reassigned, and the values are mutated
// in place every frame.
G.camTargetPos = new THREE.Vector3(CAM_LOBBY.x, CAM_LOBBY.y, CAM_LOBBY.z);
G.camTargetLook = new THREE.Vector3(0, CAM_LOBBY.lookY, 0);

/**
 * Pause or resume the simulation.
 *
 * A backgrounded tab keeps accumulating clock delta even though
 * requestAnimationFrame is throttled, so the player used to run on — and
 * usually die — while the tab was hidden. Pausing also clears the slide timer,
 * so resuming never inherits a half-finished slide. On resume the clock delta
 * is dropped so no time is owed to the simulation.
 */
export function setPaused(p) {
  if (G.isPaused === p) return;
  G.isPaused = p;
  if (p) {
    resetPlayerMotion();
  } else {
    clock.getDelta(); // drop the accumulated gap
  }
}
