// ── lifecycle.js ────────────────────────────────────────────────────────
// The three transitions that move the game between its states: into a run,
// back to the lobby, and the death screen. Each one is responsible for fully
// resetting what the other two rely on, so a run can never start or end
// carrying stale state from the last one.

import { BASE_FOV } from './camera.js';
import { roster } from './roster.js';
import { CHUNK_LEN, GROUND_Y, TOTAL_CHUNKS, trackChunks } from './scene.js';
import { disposeObject } from './utils.js';
import { CAM_LOBBY, CAM_GAME, scene } from './scene.js';
import { G, resetPlayerMotion, updateCoinHud } from './state.js';
import { activeObstacles, activeItems } from './obstacles.js';
import { audio } from './audio.js';
import { camFeel, resetCameraFeel } from './camera.js';
import { clearEntityList } from './utils.js';
import { createTrumpChaser, chaser } from './chaser.js';
import { expirePowerup, puState } from './powerups.js';
import { loadSave, writeSave } from './save.js';
import { renderLeaderboard } from './ui.js';
import { setCharacter, lobbyStage } from './roster.js';
import { spawnRow } from './spawn.js';

export function startRunGame() {
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
  updateCoinHud();
  // Clear any power-up left over from the previous run, and reset the
  // hoverboard shield so a new run never starts with a free hit.
  expirePowerup();
  puState.spawnDebt = 20;
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
      document.getElementById('gameHUD').classList.add('active');
    }
  }, 700);
}

export function returnToLobby() {
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

  G.totalSavedCoins += G.sessionCoins;
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
    bestDist: Math.max(Number(save.bestDist || 0), Math.floor(G.distance))
  });
  renderLeaderboard();
  updateCoinHud();

  document.getElementById('overDist').textContent = `${Math.floor(G.distance)}m`;
  document.getElementById('overCoins').textContent = G.sessionCoins;
  document.getElementById('gameHUD').classList.remove('active');
  document.getElementById('gameOverScreen').classList.add('active');
}
