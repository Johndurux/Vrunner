// ── main.js ─────────────────────────────────────────────────────────────
// Boot. Wires the modules together, installs the window-level listeners and
// starts the render loop. Deliberately thin: the game rules live in the
// modules, not here.

// Pause when the tab loses focus. A backgrounded tab keeps accumulating clock
// delta even though requestAnimationFrame is throttled, so without this the
// player runs on — and usually dies — while hidden.

import { G, setPaused } from './state.js';
import { activeObstacles, activeItems, createRedCandle, createCoin, createComboGate } from './obstacles.js';
import { bindInput } from './input.js';
import { bindUi } from './ui.js';
import { camFeel, triggerScreenShake } from './camera.js';
import { clock, MAX_DT } from './timing.js';
import { puState, coinValue, activatePowerup, expirePowerup, runSpeedBoost, getPowerup } from './powerups.js';
import { renderer, scene, camera, LANES, trackChunks, TOTAL_CHUNKS } from './scene.js';
import { voxelCacheStats } from './voxel.js';
import { restoreState } from './save.js';
import { roster, setCharacter } from './roster.js';
import { update } from './update.js';
import { startRunGame, returnToLobby } from './lifecycle.js';
import { DISTRICTS, currentDistrict, currentDistrictIndex, applyDistrict, districtChange, districtReadout } from './zones.js';
import { dressChunk } from './deco.js';

window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', () => setPaused(false));
document.addEventListener('visibilitychange', () => setPaused(document.hidden));

/** Snapshot of the state the behavioural tests read. */
function debugState() {
  return {
    isPaused: G.isPaused, isSliding: G.isSliding, gameState: G.gameState,
    distance: G.distance, playerY: G.playerY, playerLane: G.playerLane,
    slideTimeLeft: G.slideTimeLeft, sessionCoins: G.sessionCoins,
    runSpeed: G.runSpeed,
    powerup: puState.powerup
      ? { type: puState.powerup.type, timeLeft: +puState.powerup.timeLeft.toFixed(2) }
      : null,
    hits: puState.hoverboardHitsLeft,
    coinValue: coinValue(),
    fov: +camera.fov.toFixed(2),
    camRoll: +camera.rotation.z.toFixed(4),
    shake: +camFeel.shakeTimeLeft.toFixed(3),
    obsTypes: activeObstacles.map(o => o.userData.type),
    itemTypes: activeItems.map(i => i.userData.type)
  };
}

/**
 * Debug bridge for the automated tests: evaluates a snippet INSIDE the module
 * scope so it can reach module-private bindings. The harness cannot read
 * window.* from here (isolated world), hence this indirection.
 *
 * This must be a direct `eval`, not `new Function`. A Function constructor
 * body is compiled in global scope and would see none of this module's
 * bindings, which is exactly the gap this bridge exists to close. The IIFE
 * wrapper keeps eval's lexical scope while still giving the snippet a `return`
 * to hand a value back, and a fresh one per call so a snippet may declare
 * locals freely.
 * @param {string} code  statement body, may end in `return <expr>`
 * @returns {{ok: boolean, value?: *, error?: string}}
 */
window.__vrRun = (code) => {
  try { return { ok: true, value: eval('(function(){' + code + '})()') }; }
  catch (e) { return { ok: false, error: String(e) }; }
};
window.__vrState = debugState;

// Modules the automated power-up tests need to reach, grouped as the harness
// expects them. Test-only surface: nothing in the game imports this.
window.__vrScope = {
  __store: { G },
  __pu: { puState, coinValue, activatePowerup, expirePowerup, runSpeedBoost, getPowerup },
  __ob: { activeObstacles, activeItems, createRedCandle, createCoin, createComboGate },
  __scene: { scene, fog: scene.fog, camera, renderer, LANES, trackChunks, TOTAL_CHUNKS, voxelCacheStats },
  __cam: { camFeel, triggerScreenShake },
  __zone: { DISTRICTS, currentDistrict, currentDistrictIndex, applyDistrict, districtChange, districtReadout, __dressChunk: dressChunk }
};

function animate() {
  requestAnimationFrame(animate);
  update(Math.min(clock.getDelta(), MAX_DT), roster.mesh);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

restoreState();
// Build the player's mesh before the first frame. Without this roster.mesh
// stays null and every frame that reads it throws.
setCharacter(G.selectedCharIdx);
// ui.js is a leaf: it takes the callbacks it needs from here, so ui -> lifecycle
// and ui -> roster never become import cycles.
bindUi({ startRunGame, returnToLobby, setCharacter });
bindInput();
animate();
