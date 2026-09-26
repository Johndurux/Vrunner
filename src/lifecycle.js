// ── lifecycle.js ────────────────────────────────────────────────────────
// The three transitions that move the game between its states: into a run,
// back to the lobby, and the death screen. Each one is responsible for fully
// resetting what the other two rely on, so a run can never start or end
// carrying stale state from the last one.

import { BASE_FOV } from './camera.js';
import { roster } from './roster.js';
import { CHUNK_LEN, GROUND_Y, TOTAL_CHUNKS, trackChunks, buildRailChunk } from './scene.js';
import { disposeObject } from './utils.js';
import { CAM_LOBBY, CAM_GAME, scene } from './scene.js';
import { G, resetPlayerMotion, updateCoinHud } from './state.js';
import { activeObstacles, activeItems } from './obstacles.js';
import { audio } from './audio.js';
import { camFeel, resetCameraFeel } from './camera.js';
import { clearEntityList } from './utils.js';
import { createTrumpChaser, chaser } from './chaser.js';
import { resetPowerups, expirePowerup } from './powerups.js';
import { loadSave, writeSave } from './save.js';
import { rosterStatus } from './unlock.js';
import { renderLeaderboard } from './ui.js';
import { setCharacter, lobbyStage } from './roster.js';
import { spawnRow } from './spawn.js';
import { redressScenery } from './track.js';
import { currentDistrictIndex } from './zones.js';
import { resetDayNight } from './daynight.js';

/**
 * Fill the track pool on first boot. The original single-file build did this
 * inline right after buildRailChunk() was defined; splitting the file lost the
 * loop, which left trackChunks empty and made advanceTrack() a no-op over an
 * empty array. Building the pool here (not in scene.js) keeps the scenery
 * layer in play: every chunk is dressed for the current district as it is
 * created.
 * @returns {void}
 */
function buildTrackPool() {
  if (trackChunks.length > 0) return; // already built
  for (let i = 0; i < TOTAL_CHUNKS; i++) {
    trackChunks.push(buildRailChunk(-i * CHUNK_LEN));
  }
  redressScenery(currentDistrictIndex());
  // The day/night cycle owns the sky, fog and lights; districts only pick the
  // decor. Resetting the cycle here is what makes every run open in the same
  // light instead of resuming wherever the last one finished.
  resetDayNight();
}

export function startRunGame() {
  buildTrackPool();
  audio.init();
  audio.click();
  G.gameState = 'TRANSITION';
  resetPlayerMotion();

  document.getElementById('dashboardUI').classList.add('hidden');
  document.querySelector('.top-nav').style.display = 'none';
  document.getElementById('gameOverScreen').classList.remove('active');

  lobbyStage.visible = false;
  G.playerLane = 1;
  G.targetX = 0;
  G.runSpeed = 18;
  G.distance = 0;
  G.sessionCoins = 0;
  // The run always opens in the first district, so the scenery and the sky
  // match the fresh distance. redressScenery() is not needed here: a new run
  // has not crossed a boundary yet.
  G.districtIdx = 0;
  updateCoinHud();
  // Clear everything the previous run left behind: the active power-up, the
  // shield's free hit, the REKT DODGE charges and the spawn schedule. A new
  // run must never inherit a shield or a charge it did not earn.
  resetPowerups();
  // resetCameraFeel() clears the shake and snaps the FOV back to rest.
  resetCameraFeel();
  roster.mesh.rotation.y = Math.PI;
  roster.mesh.position.set(0, GROUND_Y, 0);

  clearEntityList(activeObstacles);
  clearEntityList(activeItems);

  trackChunks.forEach((c, idx) => { c.position.z = -idx * CHUNK_LEN; });
  for (let z = -50; z > -CHUNK_LEN * TOTAL_CHUNKS; z -= 16) spawnRow(z);

  if (chaser.mesh) { disposeObject(chaser.mesh); chaser.mesh = null; }
  chaser.mesh = createTrumpChaser();
  chaser.mesh.rotation.y = Math.PI;
  chaser.mesh.position.set(0, GROUND_Y, 2.3); // Runs directly behind the player in the same lane!
  // TEMP-ish: hidden through the lobby->game camera move. At z=2.3 the chaser
  // sits between the lobby and game cameras, so while the camera lerps it
  // fills the frame and hides the track. Revealed only once the run is live.
  chaser.mesh.visible = false;
  scene.add(chaser.mesh);
  chaser.active = true;
  chaser.phase = 0;

  G.camTargetPos.set(CAM_GAME.x, CAM_GAME.y, CAM_GAME.z);
  G.camTargetLook.set(0, CAM_GAME.lookY, CAM_GAME.lookZ);

  if (G.runStartTimer) clearTimeout(G.runStartTimer);
  G.runStartTimer = setTimeout(() => {
    G.runStartTimer = null;
    if (G.gameState === 'TRANSITION') {
      G.gameState = 'RUNNING';
      // The camera has finished its move, so the chaser can no longer eclipse
      // the track on its way to position.
      if (chaser.mesh) chaser.mesh.visible = true;
      document.getElementById('gameHUD').classList.add('active');
    }
  }, 700);
}

export function returnToLobby() {
  buildTrackPool();
  audio.click();
  G.gameState = 'LOBBY';
  if (G.runStartTimer) {
    clearTimeout(G.runStartTimer);
    G.runStartTimer = null;
  }
  resetPlayerMotion();
  document.getElementById('gameHUD').classList.remove('active');
  document.getElementById('gameOverScreen').classList.remove('active');
  document.getElementById('dashboardUI').classList.remove('hidden');
  document.querySelector('.top-nav').style.display = 'flex';

  lobbyStage.visible = true;
  roster.mesh.position.set(0, 0.8, 0);
  roster.mesh.rotation.y = 0;

  clearEntityList(activeObstacles);
  clearEntityList(activeItems);

  // Cleanly reset track chunk positions so lobby is always pristine
  trackChunks.forEach((c, idx) => { c.position.z = -idx * CHUNK_LEN; });

  if (chaser.mesh) { disposeObject(chaser.mesh); chaser.mesh = null; }
  chaser.active = false;

  G.camTargetPos.set(CAM_LOBBY.x, CAM_LOBBY.y, CAM_LOBBY.z);
  G.camTargetLook.set(0, CAM_LOBBY.lookY, 0);
  updateCoinHud();
}

export function triggerGameOver() {
  if (G.gameState !== 'RUNNING' && G.gameState !== 'TRANSITION') return;
  G.gameState = 'GAMEOVER';
  audio.crash();
  resetPlayerMotion();
  // Stop the power-up timers and pull the hoverboard glow down, so the
  // death screen is not left with a running countdown and a glowing shield.
  expirePowerup();

  // Trump lunges forward to catch player
  if (chaser.mesh) {
    chaser.mesh.position.set(roster.mesh.position.x, GROUND_Y, 0.9);
  }
  chaser.active = false;

  // The unlock gates read G.totalSavedCoins and G.bestDist, so the in-memory
  // figures are brought up to date here rather than left for the next reload
  // to pick up out of localStorage. The snapshot is taken before this run's
  // coins are counted, so only genuinely new unlocks get flagged as NEW.
  const beforeCoins = G.totalSavedCoins;
  const beforeDist = G.bestDist;
  G.totalSavedCoins += G.sessionCoins;
  G.bestDist = Math.max(G.bestDist, Math.floor(G.distance));
  const wasLocked = rosterStatus(beforeCoins, beforeDist)
    .map((r) => r.unlocked);
  const earned = rosterStatus(G.totalSavedCoins, G.bestDist)
    .filter((r, i) => r.unlocked && !wasLocked[i])
    .map((r) => r.character.id);
  if (earned.length) {
    const set = window.__vrJustEarned || new Set();
    earned.forEach(id => set.add(id));
    window.__vrJustEarned = set;
  }

  const save = loadSave();
  const scores = Array.isArray(save.scores) ? save.scores.slice() : [];
  scores.push({
    addr: G.walletAddress || 'you',
    dist: Math.floor(G.distance),
    coins: G.sessionCoins,
    at: Date.now()
  });
  scores.sort((a, b) => b.dist - a.dist);
  writeSave({
    coins: G.totalSavedCoins,
    wallet: G.walletAddress,
    scores: scores.slice(0, 10),
    bestDist: G.bestDist
  });
  renderLeaderboard();
  updateCoinHud();

  document.getElementById('overDist').textContent = `${Math.floor(G.distance)}m`;
  document.getElementById('overCoins').textContent = G.sessionCoins;
  document.getElementById('gameHUD').classList.remove('active');
  document.getElementById('gameOverScreen').classList.add('active');
}
