// ── ATMOSPHERE & ZONES (feature 9) ────────────────────────────────────────
// The run walks through three districts. Each one owns a sky colour, a fog
// colour and how far the fog reaches; the district is chosen from the
// distance travelled so the palette shifts as the player gets deeper into
// the run. Everything here reads the shared G store instead of owning
// private state, so the track, the decor and the renderer all agree on
// which district they are in without passing a value around.

import * as THREE from 'three';
import { G } from './state.js';
import { dayNight } from './daynight.js';

/**
 * A district: sky, fog and the two decor builders that belong to it.
 * @typedef {{name:string, sky:number, fog:number, fogNear:number, fogFar:number,
 *            laneLight:number, groundTint:number}} District
 */

/** @type {District[]} */
export const DISTRICTS = [
  {
    name: 'Kota Malam',
    sky: 0x1a1410,
    fog: 0x1d1712,
    fogNear: 35,
    fogFar: 150,
    laneLight: 0xfff0b0, // sodium street lamps
    groundTint: 0x111318,
  },
  {
    name: 'Terowongan Neon',
    sky: 0x140a2e,
    fog: 0x170d33,
    fogNear: 28,
    fogFar: 128,
    laneLight: 0x36e0ff, // cyan/purple neon strips
    groundTint: 0x101220,
  },
  {
    name: 'Data Center Crypto',
    sky: 0x06231d,
    fog: 0x082b23,
    fogNear: 32,
    fogFar: 142,
    laneLight: 0x4dff9e, // server rack glow
    groundTint: 0x0e1418,
  },
  {
    // The fourth district opens the sky back up after two enclosed zones.
    // Haze rather than darkness, so the container stacks and crane silhouettes
    // read against something lighter than the data center's black.
    name: 'HARBOUR DOCKS',
    sky: 0x14202b,
    fog: 0x182633,
    fogNear: 26,
    fogFar: 118,
    laneLight: 0xffe0a0, // sodium floodlights
    groundTint: 0x101820,
  },
];

/** Distance in metres between district changes. */
export const ZONE_SPAN = 250;

/** Longest district name, used to size the HUD readout. */
const NAME_PAD = 18;

/**
 * The district the run is currently in.
 * @returns {District}
 */
export function currentDistrict() {
  const span = G.zoneSpan || ZONE_SPAN;
  const idx = Math.floor((G.distance || 0) / span) % DISTRICTS.length;
  return DISTRICTS[idx];
}

/**
 * The index of the current district, 0-based and wrapped.
 * @returns {number}
 */
export function currentDistrictIndex() {
  const span = G.zoneSpan || ZONE_SPAN;
  const idx = Math.floor((G.distance || 0) / span) % DISTRICTS.length;
  return idx < 0 ? 0 : idx;
}

/**
 * How much the district is allowed to tint the sky and fog, given the light
 * level right now.
 *
 * At night the district palette is the whole story and is used at full
 * strength. In daylight a night sky would look like a mistake, so the
 * district only tints -- the day/night cycle keeps the base colour. This is
 * what stops a daylight run from snapping to three different black skies as
 * it crosses district boundaries.
 * @param {{neon:number, sky:number}} mode  the live day/night palette
 * @returns {number} 0..1
 */
function tintWeight(mode) {
  const neon = mode && Number.isFinite(mode.neon) ? mode.neon : 1;
  // Daylight drowns out the district hue, so the district pushes harder there.
  // The 0.3 floor is the point though: at a weight of exactly 0 the three
  // districts rendered as the same sky, which quietly deleted the whole zone
  // system. Night still keeps its own tint, just a gentler one.
  return 0.3 + 0.7 * (1 - Math.min(1, neon / 0.6));
}

/**
 * Push the current district's tint into the sky and fog, on top of whatever
 * the day/night cycle last set.
 *
 * Daylight owns the base colour and the light; the district owns the hue. They
 * are applied in that order, so the district can never override the time of
 * day, only colour it.
 * @param {THREE.Scene} scene
 * @param {THREE.Fog} fog
 * @returns {void}
 */
export function applyDistrict(scene, fog) {
  const d = currentDistrict();
  const mode = dayNight();
  const w = tintWeight(mode);

  // Blend toward the district's own colour rather than replacing with it.
  const sky = blend(scene.background, d.sky, w);
  const fogCol = blend(fog.color, d.fog, w);
  scene.background = new THREE.Color(sky);
  fog.color = new THREE.Color(fogCol);
  // Reach follows the district: the neon tunnel is meant to feel tighter than
  // the open skyline, and that difference is part of the district's identity.
  fog.near = d.fogNear + (fog.near - d.fogNear) * w;
  fog.far = d.fogFar + (fog.far - d.fogFar) * w;
}

/**
 * Mix a THREE.Color toward a hex colour.
 * @param {THREE.Color} from  current colour (read, not mutated)
 * @param {number} to  target hex
 * @param {number} t  0..1
 * @returns {number} packed 0xRRGGBB
 */
function blend(from, to, t) {
  // Two hazards, both of which used to render the sky pure black:
  //
  // 1. A non-finite weight: |0 on NaN is 0, so the district vanished with no
  //    error anywhere. Clamp to "no tint" instead.
  // 2. Reading from.r/from.g/from.b and re-packing by hand. THREE.Color stores
  //    components in the working (linear) colour space when colour management
  //    is on, so from.r for 0x0e1117 is ~0.0035, and round(0.0035 * 255) is 0.
  //    At t=0 the function therefore returned black instead of the colour it
  //    was supposed to pass through untouched.
  //
  // Do the mix with Color.lerp, which handles the space correctly, and return
  // early when there is nothing to do.
  if (!Number.isFinite(t)) t = 0;
  if (t <= 0) return from.getHex();
  if (t >= 1) return to;
  return _tmp.copy(from).lerp(new THREE.Color(to), t).getHex();
}

/** Scratch colour so the per-frame tint allocates nothing. */
const _tmp = new THREE.Color();

/**
 * True when the district changed since the last call, and records the new
 * one. Lets the caller do the expensive rebuild exactly once per crossing.
 * @param {number} lastIdx  index observed by the previous call
 * @returns {{changed:boolean, index:number, name:string}}
 */
export function districtChange(lastIdx) {
  const idx = currentDistrictIndex();
  if (idx === lastIdx) return { changed: false, index: idx, name: DISTRICTS[idx].name };
  return { changed: true, index: idx, name: DISTRICTS[idx].name };
}

/**
 * Text for the HUD readout, e.g. "Terowongan Neon · 120/250m".
 * @returns {string}
 */
export function districtReadout() {
  const d = currentDistrict();
  const span = G.zoneSpan || ZONE_SPAN;
  const into = Math.floor((G.distance || 0) % span);
  return `${d.name} · ${into}/${span}m`;
}

/**
 * Width of the widest readout, so the HUD element can be sized once instead
 * of reflowed every frame.
 * @returns {number}
 */
export function districtReadoutWidth() {
  return districtReadout().length * NAME_PAD;
}
