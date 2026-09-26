// ── ATMOSPHERE & ZONES (feature 9) ────────────────────────────────────────
// The run walks through three districts. Each one owns a sky colour, a fog
// colour and how far the fog reaches; the district is chosen from the
// distance travelled so the palette shifts as the player gets deeper into
// the run. Everything here reads the shared G store instead of owning
// private state, so the track, the decor and the renderer all agree on
// which district they are in without passing a value around.

import * as THREE from 'three';
import { G } from './state.js';

/**
 * A district: sky, fog and the two decor builders that belong to it.
 * @typedef {{name:string, sky:number, fog:number, fogNear:number, fogFar:number,
 *            laneLight:number, groundTint:number}} District
 */

/** @type {District[]} */
export const DISTRICTS = [
  {
    name: 'Kota Malam',
    sky: 0x0b0d12,
    fog: 0x0d1017,
    fogNear: 35,
    fogFar: 150,
    laneLight: 0xfff0b0, // sodium street lamps
    groundTint: 0x111318,
  },
  {
    name: 'Terowongan Neon',
    sky: 0x080a12,
    fog: 0x0a0c1a,
    fogNear: 28,
    fogFar: 128,
    laneLight: 0x36e0ff, // cyan/purple neon strips
    groundTint: 0x101220,
  },
  {
    name: 'Data Center Crypto',
    sky: 0x0a0e14,
    fog: 0x0b1218,
    fogNear: 32,
    fogFar: 142,
    laneLight: 0x4dff9e, // server rack glow
    groundTint: 0x0e1418,
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
 * Push the current district's palette into the scene. Called when a new
 * track chunk is generated, which is the moment the prompt asks for the
 * change to be visible: "langsung ganti saat chunk baru di-generate".
 * @param {THREE.Scene} scene
 * @param {THREE.Fog} fog
 * @returns {void}
 */
export function applyDistrict(scene, fog) {
  const d = currentDistrict();
  scene.background = new THREE.Color(d.sky);
  fog.color = new THREE.Color(d.fog);
  fog.near = d.fogNear;
  fog.far = d.fogFar;
}

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
