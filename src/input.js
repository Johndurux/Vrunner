// ── input.js ────────────────────────────────────────────────────────────
// Binds keyboard and touch to the three player actions.
//
// The touch handler reads clientX/clientY (viewport-relative, the same space
// the swipe math uses) rather than screenX/screenY, and ignores multi-touch so
// a pinch or a second finger cannot steer the run.
//
// This module owns keyboard and touch only. Every clickable button is bound
// in ui.js bindUi(); they used to be bound here too, and one click ran both
// copies so each button fired its handler twice. See bindInput below.
//

import { audio } from './audio.js';
import { switchLane, jumpAction, slideAction, dodgeAction } from './actions.js';

/** How close together two upward swipes must be to count as a dodge. */
const DOUBLE_TAP_MS = 260;

// Direction of the most recent lane input, so a dodge has somewhere to go even
// when the player presses the dodge key on its own. Declared at module scope,
// before the listeners below, so a keypress on the very first frame cannot
// hit the temporal dead zone.
let lastLaneDir = -1;

export function bindInput() {
  window.addEventListener('keydown', e => {
    // Prevent browser spacebar/arrow scrolling
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) || e.code === 'Space') {
      e.preventDefault();
    }
    audio.init();
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { lastLaneDir = -1; switchLane(-1); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { lastLaneDir = 1; switchLane(1); }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ' || e.code === 'Space') jumpAction();
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') slideAction();
    // REKT DODGE on Shift, aiming the same way the last lane input was.
    if (e.key === 'Shift' && !e.repeat) dodgeAction(lastLaneDir);
  });

  let touchX = 0, touchY = 0, touchActive = false;
  // REKT DODGE on touch: a second upward swipe within DOUBLE_TAP_MS of the
  // first. The window is short enough that it cannot fire accidentally during
  // a normal run of jumps, and long enough for a deliberate double swipe.
  let lastJumpTap = -1e9;
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
      if (dx > 35) { lastLaneDir = 1; switchLane(1); }
      else if (dx < -35) { lastLaneDir = -1; switchLane(-1); }
    } else if (dy < -35) {
      // Double-tap upward is the dodge gesture; a single tap still jumps.
      const now = performance.now();
      if (now - lastJumpTap < DOUBLE_TAP_MS) {
        lastJumpTap = -1e9;   // consume it, so a third tap does not dodge twice
        dodgeAction(lastLaneDir);
      } else {
        lastJumpTap = now;
        jumpAction();
      }
    } else if (dy > 35) {
      slideAction();
    }
  }, { passive: true });

  // ═══════════════════════════════════════════════════════════════
  //  UI EVENT BINDINGS
  // ═══════════════════════════════════════════════════════════════
  // The button bindings live in ui.js bindUi(). They were duplicated here,
  // so every one of them fired twice per click. The keyboard handlers below
  // are the only thing this module should own.
}
