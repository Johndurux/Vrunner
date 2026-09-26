// ── ui.js ───────────────────────────────────────────────────────────────
// Dashboard and death-screen DOM: the modal stack, the roster list, the
// wallet button and the leaderboard table.
//

import { CHARACTERS } from './characters.js';
import { G, updateCoinHud } from './state.js';
import { audio } from './audio.js';
import { loadSave, writeSave } from './save.js';

export const modals = {
  roster: document.getElementById('modalRoster'),
  leaderboard: document.getElementById('modalLeaderboard'),
  settings: document.getElementById('modalSettings')
};

export function openModal(m) {
  audio.click();
  m.classList.add('open');
}
export function closeModals() {
  audio.click();
  Object.values(modals).forEach(m => m.classList.remove('open'));
}

export const rosterList = document.getElementById('rosterList');

export function shortAddr(addr) {
  if (!addr || addr === 'you') return 'you';
  if (addr.startsWith('DEMO-')) return addr; // placeholder label, keep whole
  if (addr.includes('...')) return addr;
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function paintWalletBtn() {
  const btn = document.getElementById('connectWalletBtn');
  if (!G.walletAddress) return;
  btn.textContent = shortAddr(G.walletAddress);
  btn.style.borderColor = '#00e5ff';
  btn.style.color = '#00e5ff';
}

export function renderLeaderboard() {
  const leadRows = document.getElementById('leaderboardRows');
  leadRows.innerHTML = '';
  // The five rows below are PLACEHOLDER entries, not real players. They are
  // labelled so nobody mistakes the board for live on-chain data. Replace
  // this array with a fetch() of your testnet contract when the on-chain
  // layer lands.
  const seed = [
    { addr: 'DEMO-1', dist: 2840, coins: 490, demo: true },
    { addr: 'DEMO-2', dist: 2150, coins: 340, demo: true },
    { addr: 'DEMO-3', dist: 1890, coins: 280, demo: true },
    { addr: 'DEMO-4', dist: 1420, coins: 190, demo: true },
    { addr: 'DEMO-5', dist: 1100, coins: 145, demo: true },
  ];
  const mine = (loadSave().scores || []).map(s => ({
    addr: s.addr,
    dist: s.dist,
    coins: s.coins,
    you: true
  }));
  const merged = [...seed, ...mine].sort((a, b) => b.dist - a.dist).slice(0, 8);
  merged.forEach((l, i) => {
    const rank = `#${i + 1}`;
    const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const tr = document.createElement('tr');
    // Mark the placeholder rows so the board cannot be read as live
    // on-chain data. Real scores render normally.
    const label = l.you
      ? `${shortAddr(l.addr)} (you)`
      : (l.demo ? `${shortAddr(l.addr)} (demo)` : shortAddr(l.addr));
    tr.innerHTML = `
      <td class="${rankCls}">${rank}</td>
      <td>${label}</td>
      <td style="color:#fff; font-weight:700;">${Number(l.dist).toLocaleString()}m</td>
      <td style="color:#f5a623;">${l.coins}</td>
    `;
    leadRows.appendChild(tr);
  });
}

/**
 * Wire every click handler in the dashboard: play, restart, character
 * carousel, sound toggle, nav modals, wallet connect and share.
 *
 * The three callbacks are injected rather than imported. lifecycle.js owns
 * startRunGame/returnToLobby and roster.js owns setCharacter, and both of
 * those modules need things from here, so importing them directly would close
 * a cycle: ui -> lifecycle -> ui. Passing them in from main.js, which sits
 * above both, keeps this module a leaf.
 *
 * @param {object} wiring
 * @param {() => void} wiring.startRunGame  begin a run
 * @param {() => void} wiring.returnToLobby  back out of a run
 * @param {(index: number) => void} wiring.setCharacter  swap the roster pick
 * @returns {void}
 */
export function bindUi({ startRunGame, returnToLobby, setCharacter }) {
  //  UI EVENT BINDINGS
  // ═══════════════════════════════════════════════════════════════
  document.getElementById('btnPlayGame').addEventListener('click', startRunGame);
  document.getElementById('btnRestartRun').addEventListener('click', startRunGame);
  document.getElementById('btnBackLobby').addEventListener('click', returnToLobby);

  // Character Switchers (Lobby)
  document.getElementById('btnPrevChar').addEventListener('click', () => {
    audio.click();
    const nextIdx = (G.selectedCharIdx - 1 + CHARACTERS.length) % CHARACTERS.length;
    setCharacter(nextIdx);
  });
  document.getElementById('btnNextChar').addEventListener('click', () => {
    audio.click();
    const nextIdx = (G.selectedCharIdx + 1) % CHARACTERS.length;
    setCharacter(nextIdx);
  });

  // Modals
  const modals = {
    roster: document.getElementById('modalRoster'),
    leaderboard: document.getElementById('modalLeaderboard'),
    settings: document.getElementById('modalSettings')
  };

  function openModal(m) {
    audio.click();
    m.classList.add('open');
  }
  function closeModals() {
    audio.click();
    Object.values(modals).forEach(m => m.classList.remove('open'));
  }

  document.getElementById('navTwitter').addEventListener('click', () => {
    audio.click();
    window.open('https://x.com/vibevibefun', '_blank', 'noopener,noreferrer');
  });

  document.getElementById('toggleSoundBtn').addEventListener('click', function() {
    audio.enabled = !audio.enabled;
    this.textContent = audio.enabled ? 'ON' : 'OFF';
    if (audio.enabled) {
      audio.init();
      audio.click();
    }
  });
  document.getElementById('navRoster').addEventListener('click', () => openModal(modals.roster));
  document.getElementById('navLeaderboard').addEventListener('click', () => openModal(modals.leaderboard));
  document.getElementById('navSettings').addEventListener('click', () => openModal(modals.settings));
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeModals));

  // Populate Roster Modal
  const rosterList = document.getElementById('rosterList');
  CHARACTERS.forEach((c, idx) => {
    const item = document.createElement('div');
    item.className = 'roster-item' + (idx === G.selectedCharIdx ? ' selected' : '');
    item.style.setProperty('--c', c.color);
    item.innerHTML = `
      <div class="roster-avatar">${c.avatarChar}</div>
      <div class="roster-name">${c.name}</div>
      <div class="roster-status">${c.unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
    `;
    item.addEventListener('click', () => {
      setCharacter(idx);
      document.querySelectorAll('.roster-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      closeModals();
    });
    rosterList.appendChild(item);
  });

  function shortAddr(addr) {
    if (!addr || addr === 'you') return 'you';
    if (addr.startsWith('DEMO-')) return addr; // placeholder label, keep whole
    if (addr.includes('...')) return addr;
    if (addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function paintWalletBtn() {
    const btn = document.getElementById('connectWalletBtn');
    if (!G.walletAddress) return;
    btn.textContent = shortAddr(G.walletAddress);
    btn.style.borderColor = '#00e5ff';
    btn.style.color = '#00e5ff';
  }

  renderLeaderboard();
  paintWalletBtn();
  updateCoinHud();

  document.getElementById('connectWalletBtn').addEventListener('click', async function() {
    audio.click();
    if (!window.ethereum) {
      this.textContent = 'No Wallet';
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      G.walletAddress = accounts[0] || '';
      writeSave({ wallet: G.walletAddress, coins: G.totalSavedCoins });
      paintWalletBtn();
    } catch {
      this.textContent = 'Connect Wallet';
    }
  });

  // Share on Twitter / X
  document.getElementById('btnShareX').addEventListener('click', () => {
    const text = `Just ran ${Math.floor(G.distance)}m and banked ${G.sessionCoins} $VIBE in Vibe Runner on @vibevibefun Robinhood Chain testnet! 🏃💨 Can you beat my highscore? #RobinhoodChain #VibeVibe`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  });
}
