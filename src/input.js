// ── input.js ────────────────────────────────────────────────────────────
// Binds keyboard and touch to the three player actions.
//
// The touch handler reads clientX/clientY (viewport-relative, the same space
// the swipe math uses) rather than screenX/screenY, and ignores multi-touch so
// a pinch or a second finger cannot steer the run.
//

import { CHARACTERS } from './characters.js';
import { audio } from './audio.js';
import { setCharacter, roster } from './roster.js';
import { startRunGame, returnToLobby } from './lifecycle.js';
import { switchLane, jumpAction, slideAction } from './actions.js';

export function bindInput() {
  window.addEventListener('keydown', e => {
    // Prevent browser spacebar/arrow scrolling
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) || e.code === 'Space') {
      e.preventDefault();
    }
    audio.init();
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') switchLane(-1);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') switchLane(1);
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ' || e.code === 'Space') jumpAction();
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') slideAction();
  });

  let touchX = 0, touchY = 0, touchActive = false;
  window.addEventListener('touchstart', e => {
    audio.init();
    // Multi-touch: only track a single finger. Without this guard a pinch or
    // two-finger gesture feeds two different touchend events into the same
    // touchX/touchY pair and fires a spurious lane change.
    if (e.touches.length !== 1) { touchActive = false; return; }
    touchActive = true;
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', e => {
    if (!touchActive) return;
    touchActive = false;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchX;
    const dy = t.clientY - touchY;
    // clientX/clientY, not screenX/screenY: screenX is in physical screen
    // coordinates, which are offset whenever the page is scrolled or zoomed,
    // so swipes could land on the wrong lane (or a different screen).
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 35) switchLane(1);
      else if (dx < -35) switchLane(-1);
    } else {
      if (dy < -35) jumpAction();
      else if (dy > 35) slideAction();
    }
  }, { passive: true });

  // ═══════════════════════════════════════════════════════════════
  //  UI EVENT BINDINGS
  // ═══════════════════════════════════════════════════════════════
  document.getElementById('btnPlayGame').addEventListener('click', startRunGame);
  document.getElementById('btnRestartRun').addEventListener('click', startRunGame);
  document.getElementById('btnBackLobby').addEventListener('click', returnToLobby);

  // Character Switchers (Lobby)
  document.getElementById('btnPrevChar').addEventListener('click', () => {
    audio.click();
    const nextIdx = (roster.selectedIdx - 1 + CHARACTERS.length) % CHARACTERS.length;
    setCharacter(nextIdx);
  });
  document.getElementById('btnNextChar').addEventListener('click', () => {
    audio.click();
    const nextIdx = (roster.selectedIdx + 1) % CHARACTERS.length;
    setCharacter(nextIdx);
  });
}
