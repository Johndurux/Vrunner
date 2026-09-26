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
import { dodgeAction, switchLane, slideAction, jumpAction } from './actions.js';
import { bindUi, bindRoster, openModal, closeModals, modals, renderRoster } from './ui.js';
import { UNLOCK_RULES, isUnlocked, meetsPart, requirementText, shortfall, rosterStatus, newlyUnlocked } from './unlock.js';
import { camFeel, triggerScreenShake, resetCameraFeel } from './camera.js';
import { clock, MAX_DT } from './timing.js';
import {
  puState, coinValue, activatePowerup, expirePowerup, runSpeedBoost, getPowerup,
  triggerDodge, canDodge, tickDodgeCharge, resetPowerups,
  DODGE_MAX, DODGE_IFRAME, POWERUP_DUR,
} from './powerups.js';
import { dayNight, updateDayNight, resetDayNight,
         MODES as DAYNIGHT_MODES, DAYNIGHT_FADE } from './daynight.js';
import { chaser } from './chaser.js';
import { renderer, scene, camera, LANES, trackChunks, TOTAL_CHUNKS,
         CAM_GAME, ambientLight, dirLight, rimLight } from './scene.js';
import { voxelCacheStats } from './voxel.js';
import { restoreState, loadSave, writeSave } from './save.js';
import { roster, setCharacter } from './roster.js';
import { update } from './update.js';
import { startRunGame, returnToLobby } from './lifecycle.js';
import { DISTRICTS, currentDistrict, currentDistrictIndex, applyDistrict, districtChange, districtReadout } from './zones.js';
import { dressChunk } from './deco.js';

window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', () => setPaused(false));
document.addEventListener('visibilitychange', () => setPaused(document.hidden));

// ── WEBGL CONTEXT LOSS ─────────────────────────────────────────────────────
// Chromium drops a WebGL context when the GPU process is overwhelmed, and the
// most reliable way to make that happen to a full-rate game is to run a screen
// recorder at the same time: the encoder and the renderer contend for the same
// GPU, and once the process is over budget the browser takes the context back
// rather than dropping frames. The symptom is a frozen or half-drawn canvas
// while the page's own JavaScript keeps running.
//
// MAX_DT does not help here. It clamps the simulation's delta time, so a slow
// frame is survived, but once the context is gone renderer.render() draws
// nothing at all -- no delta time to clamp. Without these handlers the run
// silently continues on a dead canvas and the distance counter climbs anyway.
const contextLostEl = document.getElementById('contextLost');
let contextLost = false;

function showContextNotice(show) {
  if (contextLostEl) contextLostEl.style.display = show ? 'flex' : 'none';
}

renderer.domElement.addEventListener('webglcontextlost', (e) => {
  // preventDefault is what makes the browser attempt a restore at all; without
  // it the context is gone for good and webglcontextrestored never fires.
  e.preventDefault();
  contextLost = true;
  setPaused(true);
  showContextNotice(true);
}, false);

renderer.domElement.addEventListener('webglcontextrestored', () => {
  // Three.js rebuilds its own GPU state on this event; the scene graph and
  // every mesh in it survive, so the only thing to do is resume.
  contextLost = false;
  showContextNotice(false);
  // Only resume if the page is actually the one being looked at. A context
  // loss often rides along with the tab losing focus, and unpausing there
  // would start the run again inside a tab nobody can see -- which then runs
  // on to a game over the moment the window comes back.
  if (!document.hidden) setPaused(false);
}, false);

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
    // `hits` keeps its old name so the existing power-up suite still reads
    // the shield's remaining charges; the dodge fields below are new.
    hits: puState.shieldHitsLeft,
    shieldGlow: !!(puState.shieldGlow && puState.shieldGlow.visible),
    dodgeCharges: puState.dodgeCharges,
    dashing: puState.dashing,
    iframeLeft: +puState.iframeLeft.toFixed(3),
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

/**
 * Turn the character gates off for this session, so a locked body can be
 * inspected without banking the coins and distance it normally needs. The
 * same thing happens at load time with `?unlock=all` in the URL. Passing
 * false puts the gates back; nothing here writes to the save, so a reload
 * returns to the real progression state.
 * @param {boolean} [on=true]
 */
window.__vrUnlockAll = function (on = true) {
  window.__vrUnlockAllOn = !!on;
  return window.__vrUnlockAllOn;
};

// Modules the automated power-up tests need to reach, grouped as the harness
// expects them. Test-only surface: nothing in the game imports this.
// Test-only surface. Built inside a try/catch because a single wrong name here
// throws while the literal is being constructed, which leaves window.__vrScope
// undefined and makes every later failure look like a game bug instead of a
// typo. The catch reports which key failed.
window.__vrScope = null;
try {
window.__vrScope = {
  __store: { G },
  __pu: { puState, coinValue, activatePowerup, expirePowerup, runSpeedBoost, getPowerup,
          triggerDodge, canDodge, tickDodgeCharge, resetPowerups,
          DODGE_MAX, DODGE_IFRAME, POWERUP_DUR },
  __day: { dayNight, updateDayNight, resetDayNight,
           MODES: DAYNIGHT_MODES, DAYNIGHT_FADE },
  // The round-4 report asked for these to be observable: the layout fix needs
  // the camera rig constants, the day/night fix needs the lights it drives,
  // and the chaser timing fix needs the chaser itself.
  __layout: { CAM_GAME, chaser, ambientLight, dirLight, rimLight },
  __ob: { activeObstacles, activeItems, createRedCandle, createCoin, createComboGate },
  __scene: { scene, fog: scene.fog, camera, renderer, LANES, trackChunks, TOTAL_CHUNKS, voxelCacheStats },
  __cam: { camFeel, triggerScreenShake, resetCameraFeel },
  __act: { dodgeAction, switchLane, slideAction, jumpAction, startRunGame, returnToLobby },
  __unlock: { UNLOCK_RULES, isUnlocked, meetsPart, requirementText, shortfall, rosterStatus, newlyUnlocked },
  __roster: { setCharacter, roster },
  __ui: { openModal, closeModals, modals, renderRoster },
  __save: { loadSave, writeSave },
  __zone: { DISTRICTS, currentDistrict, currentDistrictIndex, applyDistrict, districtChange, districtReadout, __dressChunk: dressChunk }
};
} catch (e) {
  window.__vrScopeError = String(e);
  console.error('__vrScope build failed:', e);
}

function animate() {
  requestAnimationFrame(animate);
  // Skip the draw while the context is gone: calling into a lost context
  // throws in some drivers and is wasted work in the rest.
  if (contextLost) return;
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
bindRoster(setCharacter);
bindInput();
animate();
