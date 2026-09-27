// ── daynight.js ──────────────────────────────────────────────────────────
// The day/night cycle. Independent of the districts in zones.js: districts
// decide *what* the buildings look like, this decides *how much light* there
// is. The two are crossed -- every district gets a day and a night version --
// so the run's palette changes on both axes without either system knowing
// about the other.
//
// The cycle is driven by distance rather than the wall clock, so a run always
// plays out the same way and a backgrounded tab cannot skip to night.

import * as THREE from 'three';
import { G } from './state.js';
import { ambientLight, dirLight, rimLight, scene } from './scene.js';

/** Metres of running per half-cycle: night -> day -> night. */
export const DAYNIGHT_SPAN = 350;

/** How long the fade between one mode and the next takes, in seconds. */
export const DAYNIGHT_FADE = 4.0;

/**
 * The two palettes. Everything the mode changes lives here so the lerp below
 * has a single source of truth and no value is duplicated in two places.
 *
 * `neon` scales every emissive material in the scene, which is how the
 * cyan/orange/purple glow is dialled back in daylight without rebuilding
 * the geometry.
 */
export const MODES = {
  night: {
    label: 'MALAM',
    sky: 0x0b0d12,
    fog: 0x0d1017,
    fogNear: 35,
    fogFar: 150,
    ambient: 0.55,
    ambientColor: 0xfff5e6,
    dir: 1.1,
    dirColor: 0xdfe6ff,
    rim: 0.5,
    rimColor: 0x7c5cff,
    neon: 1.0,
    lightY: 16,
  },
  day: {
    label: 'SIANG',
    // A warm late-afternoon sky rather than flat cyan: it keeps the brand's
    // orange identity instead of turning the game into a blue rectangle.
    sky: 0x9fd0ea,
    fog: 0xf0c48a,
    fogNear: 45,
    fogFar: 190,
    ambient: 1.15,
    ambientColor: 0xfff3e0,
    dir: 2.1,
    dirColor: 0xfff2d0,
    rim: 0.18,
    rimColor: 0xa8d8ff,
    neon: 0.22,
    lightY: 24,
  },
};

/**
 * Live interpolation state. Mutated in place each frame; exposed through
 * `dayNight()` because a module cannot observe another module's `export let`
 * once it is reassigned.
 */
const state = {
  from: MODES.night,
  to: MODES.night,
  mix: 1,          // 0 = fully `from`, 1 = fully `to`
  idx: 0,          // which mode the cycle is heading toward
  lastModeIndex: 0,
  changed: false,
  scanTick: 0,      // frame counter for the throttled emissive re-scan
};

/**
 * The live mode, both for the HUD and for the district tint.
 *
 * `neon` has to be included here: zones.js reads `mode.neon` to decide how hard
 * to push the district colour over the sky. Exposing only the three HUD fields
 * left `mode.neon` undefined, `tintWeight` returned NaN, and `blend` turned
 * the whole sky and fog black -- districts silently stopped existing.
 * @returns {{label:string, night:boolean, mix:number, neon:number}} a HUD-friendly summary
 */
export const dayNight = () => {
  const live = liveMode();
  return {
    label: state.idx === 1 ? MODES.day.label : MODES.night.label,
    night: state.idx === 0,
    mix: state.mix,
    neon: live.neon,
  };
};

/**
 * The mode the run is heading toward, from distance travelled.
 * @returns {0|1} 0 = night, 1 = day
 */
/**
 * The interpolated palette fields at the current mix, so a caller can read a
 * live value rather than the raw `from`/`to` entries.
 * @returns {{neon:number}} fields the district tint needs
 */
function liveMode() {
  const a = state.from, b = state.to, t = state.mix;
  return { neon: a.neon + (b.neon - a.neon) * t };
}

function targetMode() {
  const span = G.dayNightSpan || DAYNIGHT_SPAN;
  return (Math.floor((G.distance || 0) / span) % 2) ? 1 : 0;
}

/**
 * Every material whose emissive colour should respond to the time of day,
 * kept as a Set so a material that is already registered is not stored twice.
 *
 * This is a growing registry, not a one-shot snapshot. Obstacles and power-ups
 * mint their own MeshStandardMaterial every time they spawn, so anything
 * collected at the first frame is stale the moment the next obstacle appears:
 * those materials would keep their full night brightness in daylight while the
 * scenery dimmed correctly.
 */
const neonMats = new Map();

/** Frames between emissive re-scans. See collectEmissive for why it is not 1. */
const SCAN_EVERY = 20;

/**
 * Register every emissive material currently in the graph that is not already
 * known, and record its untouched intensity as the baseline to scale from.
 *
 * Walking the whole graph is not free and applyMode runs every frame, so the
 * caller only does this every SCAN_EVERY frames. A material that appears
 * between two walks joins the next one, a fraction of a second late, which is
 * far below what anyone could see.
 * @param {THREE.Object3D} root
 * @returns {number} how many new materials were registered
 */
function collectEmissive(root) {
  let found = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      // A black emissive is invisible whatever the intensity, so tracking it
      // would only grow the registry for no visual effect.
      if (!m || !m.emissive) continue;
      if (m.emissive.r === 0 && m.emissive.g === 0 && m.emissive.b === 0) continue;
      if (neonMats.has(m)) continue;
      neonMats.set(m, m.emissiveIntensity ?? 1);
      found++;
    }
  });
  return found;
}

/**
 * Start the cycle over. Called at the start of a run so a new run always
 * begins at night on the first segment rather than inheriting last run's time.
 * @returns {void}
 */
export function resetDayNight() {
  state.idx = 0;
  state.from = MODES.night;
  state.to = MODES.night;
  state.mix = 1;
  state.lastModeIndex = 0;
  state.changed = false;
  // The registry holds strong references to materials. A run clears the scene,
  // so those materials are gone and holding them would leak one per spawn for
  // the life of the page. Dropping the map lets the next frame re-collect
  // whatever the new run actually built.
  neonMats.clear();
  // Zeroing the counter makes the next frame an immediate scan, so a new run
  // does not open with a few frames of unlit scenery.
  state.scanTick = 0;
}

/**
 * Advance the cycle and push the interpolated palette into the scene.
 *
 * The fade is time-based rather than tied to the distance boundary so the
 * transition always looks the same speed no matter how fast the player is
 * running when they cross it.
 * @param {number} dt  frame delta in seconds, already clamped
 * @returns {void}
 */
export function updateDayNight(dt) {
  const want = targetMode();
  if (want !== state.lastModeIndex) {
    // Cross the boundary: start a new fade from wherever the last one got to.
    state.from = state.mix < 1
      ? lerpModes(state.from, state.to, state.mix)
      : state.to;
    state.to = want === 1 ? MODES.day : MODES.night;
    state.mix = 0;
    state.lastModeIndex = want;
    state.idx = want;
    state.changed = true;
  }
  if (state.mix < 1) {
    state.mix = Math.min(1, state.mix + dt / DAYNIGHT_FADE);
  }

  const m = lerpModes(state.from, state.to, easeInOut(state.mix));
  applyMode(m);
}

/** Smoothstep, so the light fades in and out instead of ramping linearly. */
function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/**
 * Blend two mode palettes.
 * @param {typeof MODES.night} a
 * @param {typeof MODES.night} b
 * @param {number} t  0..1
 */
function lerpModes(a, b, t) {
  return {
    label: t < 0.5 ? a.label : b.label,
    sky: blendHex(a.sky, b.sky, t),
    fog: blendHex(a.fog, b.fog, t),
    fogNear: a.fogNear + (b.fogNear - a.fogNear) * t,
    fogFar: a.fogFar + (b.fogFar - a.fogFar) * t,
    ambient: a.ambient + (b.ambient - a.ambient) * t,
    ambientColor: blendHex(a.ambientColor, b.ambientColor, t),
    dir: a.dir + (b.dir - a.dir) * t,
    dirColor: blendHex(a.dirColor, b.dirColor, t),
    rim: a.rim + (b.rim - a.rim) * t,
    rimColor: blendHex(a.rimColor, b.rimColor, t),
    neon: a.neon + (b.neon - a.neon) * t,
    lightY: a.lightY + (b.lightY - a.lightY) * t,
  };
}

/** Mix two packed 0xRRGGBB colours. @returns {number} */
function blendHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) | 0) << 16)
       | (((ag + (bg - ag) * t) | 0) << 8)
       | ((ab + (bb - ab) * t) | 0);
}

/**
 * Push a blended palette into the renderer.
 * @param {ReturnType<typeof lerpModes>} m
 * @returns {void}
 */
function applyMode(m) {
  scene.background = new THREE.Color(m.sky);
  if (scene.fog) {
    scene.fog.color = new THREE.Color(m.fog);
    scene.fog.near = m.fogNear;
    scene.fog.far = m.fogFar;
  }
  ambientLight.intensity = m.ambient;
  ambientLight.color = new THREE.Color(m.ambientColor);
  dirLight.intensity = m.dir;
  dirLight.color = new THREE.Color(m.dirColor);
  dirLight.position.y = m.lightY;
  rimLight.intensity = m.rim;
  rimLight.color = new THREE.Color(m.rimColor);

  // Emissive surfaces carry the night's neon. Scaling them down is what keeps
  // the daylight pass looking lit rather than washed out, while the brand
  // colours still read as accents.
  //
  // Obstacles and power-ups mint their own material on every spawn, so the
  // registry has to keep picking up newcomers rather than being taken once and
  // left stale for the rest of the page. The walk is throttled: a graph this
  // size is a few hundred nodes, and doing it every frame would cost more than
  // the rest of the lighting put together.
  if (state.scanTick++ % SCAN_EVERY === 0) collectEmissive(scene);
  const k = m.neon;
  for (const [mat, base] of neonMats) {
    mat.emissiveIntensity = base * k;
  }
}
