// ═══════════════════════════════════════════════════════════════
//  POWER-UPS -- Web3 flavour
//  Durasi dihitung dari game time (dt), bukan setTimeout, supaya
//  power-up nggak berkurang durasinya ketika player pause.
//
//  Namanya dirombak dari padanan Subway Surfers (hoverboard /
//  magnet / multiplier) jadi versi bertema crypto, tapi mekaniknya
//  tetap sama supaya tidak mengubah sistem yang sudah jalan:
//    - DIAMOND HANDS SHIELD  (ganti hoverboard) -- kebal 1x tabrakan
//    - WHALE MAGNET          (ganti magnet)     -- tarik koin
//    - BULL RUN BOOST        (ganti multiplier) -- koin 2x + speed +15%
//    - REKT DODGE            (skill baru)       -- dash lane, sekali/run
//
//  Semua state hidup di puState, di-mutate in place. `export let`
//  akan bikin importer baca binding lama, jadi getter dipakai untuk
//  nilai yang bisa berubah seluruhnya (powerup, shieldGlow, charges).
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { activeItems } from './obstacles.js';
import { audio } from './audio.js';
import { scene, LANES } from './scene.js';
import { vox } from './voxel.js';

// Durasi tiap power-up, dalam detik game-time.
export const POWERUP_DUR = {
  shield: 8,    // DIAMOND HANDS SHIELD
  magnet: 6,    // WHALE MAGNET
  boost: 10,    // BULL RUN BOOST
};

// Label + warna untuk HUD, dipisah supaya updatePowerupHud() tidak
// menebak-nebak dari nama type.
const PU_META = {
  shield: { label: 'DIAMOND HANDS', color: '#4dd8ff', icon: '◆' },
  magnet: { label: 'WHALE MAGNET', color: '#ff5cd6', icon: '🐋' },
  boost:  { label: 'BULL RUN', color: '#4dff9e', icon: '▲' },
};

// ── REKT DODGE: chargekeeper ───────────────────────────────────────────────
// Setiap 200m dapat 1 charge, maksimal 2. Dipakai lewat dash instantaneous
// ke lane mana pun sambil kebal tabrakan selama 0.3 detik.
export const DODGE_SPAN = 200;    // meter per charge
export const DODGE_MAX = 2;      // charge maksimum sekaligus
export const DODGE_IFRAME = 0.3; // detik kebal setelah dash
const DODGE_DASH_TIME = 0.22;    // durasi animasi dash-nya

/**
 * Live state. Semua di-mutate in place (pickup set `powerup`, countdown
 * decrement `timeLeft`), jadi lived di belakang store kecil dengan getter.
 * @typedef {{type:string,timeLeft:number}} ActivePowerup
 */
export const puState = {
  powerup: null,        // { type, timeLeft }
  shieldHitsLeft: 0,    // obstacle crash yang bisa diserap shield
  shieldGlow: null,     // trail/halo biru berkilau di sekitar karakter
  spawnDebt: 20,        // row sampai power-up berikutnya di-roll
  // REKT DODGE
  dodgeCharges: 0,      // charge tersisa (maks DODGE_MAX)
  dashing: false,       // sedang di tengah animasi dash
  dashTimeLeft: 0,
  dashTargetX: 0,       // lane tujuan selama dash
  iframeLeft: 0,        // sisa durasi kebal tabrakan
};

/** @returns {ActivePowerup|null} power-up yang sedang aktif */
export const getPowerup = () => puState.powerup;

/** @returns {THREE.Object3D|null} mesh glow shield, kalau ada */
export const getShieldGlow = () => puState.shieldGlow;

/**
 * Sisa tabrakan yang bisa diserap power-up per-tabrakan.
 *
 * Di-rename dari getHoverboardHits -> getShieldHits. Alias lamanya masih
 * dipertahankan karena sudah jadi bagian dari permukaan modul, tapi bukan
 * karena collision.js memakainya: file itu membaca puState secara langsung.
 * @returns {number}
 */
export const getShieldHits = () => puState.shieldHitsLeft;

/** @deprecated alias ke getShieldHits, dipertahankan untuk kompatibilitas. @returns {number} */
export const getHoverboardHits = () => puState.shieldHitsLeft;

/** @returns {number} charge REKT DODGE yang tersisa */
export const getDodgeCharges = () => puState.dodgeCharges;

// ── Mesh pickup ────────────────────────────────────────────────────────────

/**
 * DIAMOND HANDS SHIELD -- kristal berlapis di atas alas, warna cyan.
 * Dipakai sebagai pengganti hoverboard di Sinai.
 * @returns {THREE.Group}
 */
export function createShield() {
  const g = new THREE.Group();
  g.userData = { type: 'shield', box: new THREE.Box3(), collected: false };
  // Alas: slab gelap, tipped sedikit, sebagai "alas display".
  const base = vox(0.9, 0.1, 0.9, 0x0e2430, { y: 0.72 });
  base.material = new THREE.MeshStandardMaterial({
    color: 0x0e2430, emissive: 0x08202c, emissiveIntensity: 0.5,
    metalness: 0.6, roughness: 0.4
  });
  // Empat kristal kecil mengelilingi inti, seperti diamond hands (genggaman).
  const gem = new THREE.MeshStandardMaterial({
    color: 0x4dd8ff, emissive: 0x2ba8e0, emissiveIntensity: 1.0,
    metalness: 0.7, roughness: 0.15, transparent: true, opacity: 0.92
  });
  const c1 = vox(0.34, 0.34, 0.34, 0x4dd8ff, { y: 1.05, x: -0.2, z: -0.2 });
  const c2 = vox(0.34, 0.34, 0.34, 0x4dd8ff, { y: 1.05, x: 0.2, z: -0.2 });
  const c3 = vox(0.34, 0.34, 0.34, 0x4dd8ff, { y: 1.05, x: -0.2, z: 0.2 });
  const c4 = vox(0.34, 0.34, 0.34, 0x4dd8ff, { y: 1.05, x: 0.2, z: 0.2 });
  [c1, c2, c3, c4].forEach(c => { c.material = gem; });
  // Inti yang lebih terang di tengah.
  const core = vox(0.3, 0.5, 0.3, 0xbdf1ff, { y: 1.2 });
  core.material = gem;
  g.add(base, c1, c2, c3, c4, core);
  return g;
}

/**
 * WHALE MAGNET -- magnet besar bertema paus, penggant magnet.
 * @returns {THREE.Group}
 */
export function createMagnet() {
  const g = new THREE.Group();
  g.userData = { type: 'magnet', box: new THREE.Box3(), collected: false };
  const core = vox(0.5, 0.5, 0.5, 0xff5cd6, { y: 0.95 });
  core.material = new THREE.MeshStandardMaterial({
    color: 0xff5cd6, emissive: 0xff2bb5, emissiveIntensity: 0.9,
    metalness: 0.5, roughness: 0.25
  });
  // Badan magnet: dua tiang + palang atas (bentuk U).
  const armL = vox(0.16, 0.7, 0.16, 0xe0e6f0, { y: 1.0, x: -0.34, z: -0.2 });
  const armR = vox(0.16, 0.7, 0.16, 0xe0e6f0, { y: 1.0, x: 0.34, z: -0.2 });
  const bar = vox(0.84, 0.16, 0.16, 0xe0e6f0, { y: 1.32, z: -0.2 });
  const tipL = vox(0.18, 0.16, 0.18, 0xff5cd6, { y: 0.68, x: -0.34, z: -0.2 });
  const tipR = vox(0.18, 0.16, 0.18, 0xff5cd6, { y: 0.68, x: 0.34, z: -0.2 });
  // Ekor "whale" (paus) kecil di belakang, biar tema magnet paus terbaca.
  const tail = vox(0.1, 0.34, 0.1, 0xff2bb5, { y: 1.3, z: 0.42, x: 0 });
  tail.rotation.x = 0.5;
  g.add(core, armL, armR, bar, tipL, tipR, tail);
  return g;
}

/**
 * BULL RUN BOOST -- candlestick hijau, pengganti multiplier.
 * @returns {THREE.Group}
 */
export function createBoost() {
  const g = new THREE.Group();
  g.userData = { type: 'boost', box: new THREE.Box3(), collected: false };
  // Badan candlestick: kotak tinggi.
  const body = vox(0.6, 1.0, 0.4, 0x1e5a3a, { y: 1.0 });
  body.material = new THREE.MeshStandardMaterial({
    color: 0x1e5a3a, emissive: 0x0e3a20, emissiveIntensity: 0.6,
    metalness: 0.3, roughness: 0.5
  });
  // Sumbu naik-hijau: bar tinggi berwarna hijau neon.
  const wickUp = vox(0.3, 0.5, 0.3, 0x4dff9e, { y: 1.75 });
  wickUp.material = new THREE.MeshStandardMaterial({
    color: 0x4dff9e, emissive: 0x2bd86b, emissiveIntensity: 1.1,
    metalness: 0.2, roughness: 0.3
  });
  // "Body" candlestick (batang naik) highlight.
  const bodyLit = vox(0.42, 0.36, 0.34, 0x8dffc0, { y: 0.95 });
  bodyLit.material = new THREE.MeshBasicMaterial({ color: 0x8dffc0 });
  // Sumbu bawah pendek.
  const wickDown = vox(0.2, 0.2, 0.2, 0x2bd86b, { y: 0.4 });
  g.add(body, wickUp, wickDown, bodyLit);
  return g;
}

/**
 * REKT DODGE -- ikon panah ke atas/bawah, hilang dari pickup lane
 * (dipanggil via double-tap, bukan lewat jalan), jadi tidak dipakai
 * sebagai item lahur. Tidak ada yang memanggilnya saat ini: aksi
 * double-tap (dodgeAction) cuma menggerakkan lane, tidak membangun ikon
 * ini, dan POWERUP_FACTORY tidak memuatnya karena type-nya bentrok
 * dengan createBoost. Fungsi ini disimpan sebagai bahan kalau nanti
 * ikon dodge benar-benar mau dimunculkan.
 * @returns {THREE.Group}
 */
export function createDodge() {
  const g = new THREE.Group();
  g.userData = { type: 'boost', box: new THREE.Box3(), collected: false };
  const core = vox(0.5, 0.5, 0.5, 0xf5a623, { y: 0.95 });
  core.material = new THREE.MeshStandardMaterial({
    color: 0xf5a623, emissive: 0xd07a10, emissiveIntensity: 0.8,
    metalness: 0.5, roughness: 0.3
  });
  g.add(core);
  return g;
}

/** Builder tiap power-up, di-index oleh type. */
export const POWERUP_FACTORY = {
  shield: createShield,
  magnet: createMagnet,
  boost: createBoost,
};

// ── Shield glow (DIAMOND HANDS) ────────────────────────────────────────────

/**
 * Halo/trail biru berkilau yang muncul di sekitar karakter saat
 * DIAMOND HANDS SHIELD aktif. Bertindak sebagai mesh additive yang
 * berputar & berdenyut.
 * @returns {THREE.Mesh}
 */
export function makeShieldGlow() {
  const grp = new THREE.Group();
  // Cincin cyan besar, additive, seolah aura.
  const ringGeo = new THREE.PlaneGeometry(3.0, 3.0);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x4dd8ff, transparent: true, opacity: 0.26,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  // Partikel kecil mengelilingi pemain sebagai "berkilau".
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xbdf1ff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const sparks = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), sparkMat);
    sp.userData = { a: (i / 6) * Math.PI * 2, r: 0.7 + Math.random() * 0.3, y: 0.5 + Math.random() * 0.6 };
    sparks.push(sp);
    grp.add(sp);
  }
  ring.userData.ring = true;
  grp.add(ring);
  grp.userData = { sparks, ring, ringMat, sparkMat };
  grp.visible = false;
  return grp;
}

/**
 * Pasang power-up yang baru saja dipicu ke state + pasang glow-nya.
 * @param {string} type  'shield' | 'magnet' | 'boost'
 * @returns {void}
 */
export function activatePowerup(type) {
  puState.powerup = { type, timeLeft: POWERUP_DUR[type] };
  if (type === 'shield') {
    // Shield ini direkomendasikan satu kali saja: 1 tabrakan. Prompt
    // -- "pemain kebal 1x tabrakan selama 8 detik".sekali saja; kalau habis, glow mati.
    puState.shieldHitsLeft = 1;
    if (!puState.shieldGlow) {
      puState.shieldGlow = makeShieldGlow();
      scene.add(puState.shieldGlow);
    }
    puState.shieldGlow.visible = true;
  }
  audio.powerup();
  updatePowerupHud();
}

/**
 * Akhiri power-up aktif + matikan glow-nya.
 * @returns {void}
 */
export function expirePowerup() {
  puState.powerup = null;
  puState.shieldHitsLeft = 0;
  if (puState.shieldGlow) puState.shieldGlow.visible = false;
  updatePowerupHud();
}

/**
 * Reset semua state power-up, termasuk charge REKT DODGE. Dipanggil
 * di awal run supaya charge & timer tidak nyisa dari run sebelumnya.
 * @returns {void}
 */
export function resetPowerups() {
  puState.powerup = null;
  puState.shieldHitsLeft = 0;
  puState.dodgeCharges = 0;
  puState.dashing = false;
  puState.dashTimeLeft = 0;
  puState.iframeLeft = 0;
  puState.spawnDebt = 20;
  if (puState.shieldGlow) puState.shieldGlow.visible = false;
  updatePowerupHud();
  updateDodgeHud();
}

// ── HUD ───────────────────────────────────────────────────────────────────

/**
 * Perbarui badge power-up di HUD: icon + label + countdown.
 * @returns {void}
 */
export function updatePowerupHud() {
  const el = document.getElementById('hudPowerup');
  const box = document.getElementById('hudPowerupBox');
  if (!el || !box) return;
  if (!puState.powerup) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const meta = PU_META[puState.powerup.type] || { label: 'BOOST', color: '#fff', icon: '★' };
  el.textContent = `${meta.icon} ${meta.label} ${puState.powerup.timeLeft.toFixed(1)}s`;
  el.style.color = meta.color;
}

/**
 * Perbarui indikator charge REKT DODGE (2 titik kecil terpisah di HUD).
 * @returns {void}
 */
export function updateDodgeHud() {
  const box = document.getElementById('hudDodgeBox');
  const el = document.getElementById('hudDodge');
  if (!el || !box) return;
  box.style.display = 'block';
  // Dua titik: terisi = charge tersedia, kosong = sudah dipakai.
  const filled = puState.dodgeCharges;
  el.textContent = '◆◆'.slice(0, filled) + '◇◇'.slice(0, DODGE_MAX - filled);
  el.style.color = filled > 0 ? '#f5a623' : 'rgba(255,255,255,0.3)';
}

// ── REKT DODGE: dash ke lane ───────────────────────────────────────────────

/**
 * Pemicu dash REKT DODGE. Memindahkan pemain ke lane yang diminta
 * secara instan & memberi iframe 0.3 detik. Mengembalikan true kalau
 * dash benar-benar terjadi.
 *
 * Lane tujuan dikunci ke lane valid terdekat. Kalau tidak ada charge
 * atau sedang dash, tidak terjadi apa-apa.
 * @param {number} targetLaneIdx  index lane tujuan (0,1,2)
 * @returns {boolean} true kalau dash terjadi
 */
export function triggerDodge(targetLaneIdx) {
  if (puState.dodgeCharges <= 0) return false;
  if (puState.dashing) return false;
  puState.dodgeCharges--;
  puState.dashing = true;
  puState.dashTimeLeft = DODGE_DASH_TIME;
  puState.dashTargetX = LANES[targetLaneIdx];
  puState.iframeLeft = DODGE_IFRAME;
  audio.powerup();
  updateDodgeHud();
  return true;
}

/**
 * Can the player dodge right now? Dipakai input.js untuk mengaktifkan
 * tombol / double-tap.
 * @returns {boolean}
 */
export function canDodge() {
  return puState.dodgeCharges > 0 && !puState.dashing;
}

// ── Tick per-frame ────────────────────────────────────────────────────────

/**
 * Tick semua power-up: run timer, refresh HUD, terapkan efek per-frame,
 * dan kelola REKT DODGE (charge meter + dash + iframe).
 *
 * @param {number} dt  frame delta in seconds, already clamped
 * @param {number} playerX  the player's committed lane x
 * @param {number} playerZ  the player's z on the track
 * @returns {void}
 */
export function updatePowerup(dt, playerX, playerZ) {
  // REKT DODGE dash: blend ke lane tujuan, selesai dalam dashTimeLeft.
  if (puState.dashing) {
    puState.dashTimeLeft -= dt;
    if (puState.dashTimeLeft <= 0) {
      puState.dashing = false;
      puState.dashTimeLeft = 0;
    }
  }
  // Iframe (kebal sesaat) Regardless dash, hitung mundur.
  if (puState.iframeLeft > 0) {
    puState.iframeLeft -= dt;
    if (puState.iframeLeft < 0) puState.iframeLeft = 0;
  }

  if (!puState.powerup) return;
  puState.powerup.timeLeft -= dt;
  if (puState.powerup.timeLeft <= 0) { expirePowerup(); return; }
  updatePowerupHud();

  // DIAMOND HANDS: glow biru berputar + denyut.
  if (puState.shieldGlow && puState.shieldGlow.visible) {
    const g = puState.shieldGlow;
    g.position.x = playerX;
    const t = performance.now() / 1000;
    const d = g.userData;
    // Ring denyut & berputar.
    d.ring.rotation.z = t * 1.4;
    d.ringMat.opacity = 0.20 + Math.sin(t * 4) * 0.08;
    // Partikel berputar mengelilingi pemain.
    for (const sp of d.sparks) {
      const a = sp.userData.a + t * 2.2;
      sp.position.set(
        playerX + Math.cos(a) * sp.userData.r,
        sp.userData.y,
        playerZ + Math.sin(a) * sp.userData.r
      );
      sp.lookAt(playerX, sp.userData.y, playerZ + 20);
    }
  }

  // WHALE MAGNET: tarik koin ke pemain (x/z plane), lalu pickup normal
  // di collision.js yang.collect. Radius 10m.
  if (puState.powerup.type === 'magnet') {
    for (let i = activeItems.length - 1; i >= 0; i--) {
      const it = activeItems[i];
      if (it.userData.type !== 'coin' || it.userData.collected) continue;
      const dx = playerX - it.position.x;
      const dz = playerZ - it.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 100) {           // 10m radius
        it.position.x += dx * 3.2 * dt;
        it.position.z += dz * 3.2 * dt;
        it.position.y += 0.6 * dt;  // drift up into the pickup box
      }
    }
  }
}

/**
 * Tick berbasis jarak: menambah charge REKT DODGE setiap DODGE_SPAN
 * meter. Dipanggil dari update.js tiap frame dengan G.distance.
 * @param {number} distance  total jarak dalam meter
 * @returns {void}
 */
export function tickDodgeCharge(distance) {
  // Dodge debt juga berbasis jarak, bukan real-time. Full cycle: satu
  // charge per DODGE_SPAN meter, maksimal DODGE_MAX charge.
  const earned = Math.floor((distance || 0) / DODGE_SPAN);
  const want = Math.min(DODGE_MAX, earned);
  if (want > puState.dodgeCharges) {
    puState.dodgeCharges = want;
    updateDodgeHud();
  }
}

/**
 * Kecepatan lari selama power-up boost.
 * @returns {number} multiplier (1 = normal)
 */
export function runSpeedBoost() {
  return puState.powerup && puState.powerup.type === 'boost' ? 1.15 : 1;
}

// Hard combo used past 800m: a tall wall you must jump, with a low beam
// hanging in the SAME row that forces a slide on the way down. The two
// parts are separate child groups but share one obstacle entry, so the
// existing activeObstacles/collision loop handles them as a unit.
function createComboGate() {
  const g = new THREE.Group();
  g.userData = { type: 'combo', cleared: false, box: new THREE.Box3() };

  // Jump part: a solid voxel wall, similar height to the red candle.
  const wall = vox(2.2, 3.2, 0.5, 0x8a3fd8, { y: 1.6 });
  wall.material = new THREE.MeshStandardMaterial({
    color: 0x8a3fd8, emissive: 0x5a1fb0, emissiveIntensity: 0.55,
    metalness: 0.3, roughness: 0.5
  });
  const capL = vox(0.5, 0.22, 0.56, 0xd8a8ff, { y: 3.3, x: -0.8 });
  const capR = vox(0.5, 0.22, 0.56, 0xd8a8ff, { y: 3.3, x: 0.8 });

  // Slide part: a low hanging beam with clearance underneath.
  const beam = vox(2.2, 1.5, 0.45, 0x2bd8ff, { y: 1.95, z: 1.6 });
  beam.material = new THREE.MeshStandardMaterial({
    color: 0x2bd8ff, emissive: 0x1aa8d8, emissiveIntensity: 0.6,
    metalness: 0.3, roughness: 0.5
  });
  const strip = vox(2.0, 0.14, 0.5, 0xffffff, { y: 1.18, z: 1.6 });
  strip.material = new THREE.MeshBasicMaterial({ color: 0xd8faff });

  g.add(wall, capL, capR, beam, strip);
  return g;
}

/**
 * Nilai koin per pickup. BULL RUN BOOST memberi 2x.
 * @returns {number} 1 atau 2
 */
export function coinValue() {
  return puState.powerup && puState.powerup.type === 'boost' ? 2 : 1;
}

/**
 * Sekali setiap ~40 baris obstacle, roll satu power-up.	item dibuat
 * dari factory, ditaruh di lane acak, dan dimasukkan ke activeItems
 * supaya collision.js yang trigger collect-nya.
 * @param {number} zPos  posisi z di mana item di-spawn
 * @returns {void}
 */
export function maybeSpawnPowerup(zPos) {
  if (puState.spawnDebt > 0) { puState.spawnDebt--; return; }
  const types = Object.keys(POWERUP_FACTORY);
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * 3);
  const item = POWERUP_FACTORY[type]();
  item.position.set(LANES[lane], 0, zPos);
  scene.add(item);
  activeItems.push(item);
  puState.spawnDebt = 28 + Math.floor(Math.random() * 24);   // 28-51 rows
}
