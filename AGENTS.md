# AGENTS.md — Vrunner

A three-lane endless runner themed around trading losses. Three.js, no build
step, no framework, no dependencies to install. Read this before changing
anything: the constraints below are not style preferences, they are the reason
several past refactors were reverted.

## What this is

- `index.html` — the only page. Markup, CSS and the importmap all live here.
- `src/` — 27 ES modules, ~4,200 lines, loaded directly by the browser.
- Deployed to Vercel as static files (`vercel.json`: `buildCommand: null`,
  `outputDirectory: "."`).
- Three.js 0.160.0 comes from jsDelivr through an importmap, so `import * as
  THREE from 'three'` works in any module with no bundler involved.

There is **no `package.json`**, no test runner, no linter and no CI. Do not add
any of them unless the user asks. Adding a build step means the Vercel deploy
breaks, because the current config assumes the repo *is* the artifact.

## Hard rules

1. **Never restructure what already works.** Collision, spawn, track chunks,
   the HUD and the render loop are load-bearing. Additive changes are welcome;
   a rewrite of a working subsystem is not.
2. **Keep the module count at 27.** The user has been asked and agreed.
3. **One file per concern, but do not merge modules.** Line count is not a
   problem to solve.
4. **Do not change the game's balance numbers** to make a bug go away. The
   unlock thresholds, the power-up durations, the lane spacing, the speeds and
   the district span are all deliberate. If something is wrong with them, say
   so and let the user decide.
5. **Verify against the running build, not against your reading of the code.**
   Exit code 0 and a plausible diff prove nothing here. Load the page, read the
   state, look at the pixels.
6. **Do not put secrets in the repo.** `.env*` is gitignored; keep it that way.
   Vercel and GitHub tokens live in the user's local config, never in a file
   that gets committed.

## State and data flow

Everything reads and writes one shared store, `G`, exported from
`src/state.js`. Modules import it directly:

```js
import { G } from './state.js';
```

`G` holds `gameState` (`'LOBBY'` | `'TRANSITION'` | `'RUNNING'` | `'GAMEOVER'`),
`distance`, `runSpeed`, `playerLane`, `playerY`, `isSliding`, `isPaused`,
`sessionCoins`, `selectedCharIdx`, and the camera target vectors.

`G` is a **live object**, not a snapshot. Two consequences that have caused real
bugs:

- A module cannot observe another module's `export let` after it is reassigned.
  That is why the camera feel values live in one mutable `camFeel` object
  instead of separate bindings (`src/camera.js`).
- Mutating a `G` field is the way to change game state. Do not shadow it with a
  local copy, and do not pass values around when a module can just read `G`.

## Frame order

`main.js:animate()` calls `update(dt, mesh)` then `renderer.render()`. Inside
`update()` the order matters and is not interchangeable:

1. Camera smoothing — runs in **every** state, including the lobby.
2. `stepRun` → `stepFeel` — only when `gameState === 'RUNNING'`.
3. `updateDayNight(dt)` — writes the base sky, fog and lights.
4. `applyDistrict(scene, scene.fog)` — tints those with the district's hue.

Steps 3 and 4 must stay in that order. Day/night owns the base colour and the
light level; the district only owns the hue. Reversed, every district renders
with the same sky and the whole zone system quietly disappears.

`MAX_DT` (`src/timing.js`, 0.1s) clamps the simulation step so a throttled tab
or a breakpoint cannot teleport obstacles through the player. It does **not**
cover a lost WebGL context — that is handled separately in `main.js` via
`webglcontextlost` / `webglcontextrestored`.

## Three.js traps in this codebase

- **Colour management.** `THREE.Color` stores components in linear working
  space. Reading `from.r` and re-packing by hand (`r * 255 | 0`) yields ~0 for
  dark colours and returns black. Mix with `Color.lerp`, or return the colour
  untouched when the weight is 0. See `blend()` in `src/zones.js`, which
  documents this at length.
- **Shared resources.** `src/voxel.js` hands the same geometry and material
  instance to every mesh that asks for the same dimensions or colour. Disposing
  one strips the GPU buffers out from under all the others. Anything the cache
  owns is flagged `userData.shared`; `disposeObject()` in `src/utils.js` skips
  those. Do not dispose a cached resource directly.
- **Materials are arrays.** `child.material` is sometimes an array. Every
  material loop in this repo handles both shapes; new code must too.
- **Opacity needs per-instance materials.** `makeFadeable()` in
  `src/collision.js` clones materials before fading, because the cache shares
  them and all candles would otherwise blink in unison.

## Collision

All zone tests are **swept**, not point-sampled. With `dt` clamped to 0.1s and
a speed cap of 36, one step can move the world 3.6m while the hit zone is
1.1m wide — a point test lets obstacles tunnel through the player with no hit
registered at all.

The test also uses the player's **committed lane** (`LANES[G.playerLane]`), not
the mesh's interpolated `x`. The mesh lerps toward the target, so between
keypress and arrival there is a window where the mesh is still in the old lane
while `G.playerLane` has already flipped, producing hits that were unavoidable.

`LANES` is `[-2.2, 0, 2.2]`.

## Save data

`src/save.js` is the only place that touches `localStorage`. `restoreState()`
reads the blob into `G`; `writeSave()` writes back. Anything worth surviving a
reload has to be listed in **both** — a field that is only written is silently
reset on the next load, which is exactly the bug that shipped once already.

Note `writeSave({selectedCharIdx: idx})` is called from `setCharacter()`. It
merges one key into the existing blob, so it is one write per swap, not a loop.
The call sits *after* the early returns on purpose: writing on the locked path
would persist a character the player does not have equipped.

## One owner per button

Every clickable button is bound in **one** place: `bindUi()` in `src/ui.js`.
`bindInput()` in `src/input.js` owns keyboard and touch only and must not
register a `click` listener on a `btn*` id.

`main.js` calls both, and the character arrows were bound in both places with
identical bodies, so one click ran two handlers and the selection jumped two
characters instead of one. Check for a second `getElementById('btn...')` before
adding a binding.

Pause follows the same rule. `shouldPause()` in `main.js` is the only thing
that decides, from three recorded conditions (`windowBlurred`, `document.hidden`,
`contextLost`); the `blur`, `focus` and `visibilitychange` listeners only record
their own flag and re-ask. Do not call `setPaused()` from an event handler
directly — the handlers used to disagree and the game could stick paused after
the player came back, because `setPaused()` returns early when the value is
unchanged and so the last writer simply won.

## Testing

There is no automated test suite in the repo. The user has harnesses outside
it (Playwright + Camoufox, driving a real browser) and the game exposes a test
surface on `window.__vrScope` for them. It is a **test-only** object — nothing
in the game imports it, and it must stay that way.

`window.__vrScope` is built inside a `try/catch` in `main.js`, because one wrong
name in the object literal throws while the literal is being constructed, which
leaves `__vrScope` undefined and makes every later failure look like a game bug
instead of a typo. If you add a key, the catch reports which one failed.

To check a change, drive the real page. Do not assert on a mock.

## Known issues

- **WebGL context loss under screen recording.** Chromium hands the context back
  when its GPU process is over budget, and running a screen recorder on the
  same tab is a reliable way to get there. The handlers in `main.js` pause the
  run and show a notice, but the exact root cause was never confirmed — the
  original capture was on Windows/Brave with a recorder extension, which could
  not be reproduced in a headless Linux harness. If this is reported again, do
  not assume the handler is sufficient.
- **Vercel Deployment Protection** is still enabled on the project. The
  `vrunner.vercel.app` alias is open; the `*-johnduruxs-projects.vercel.app`
  form serves a login page. Always verify against the former.
- **On-chain work is parked** at the user's instruction. Do not start it.

## Deploying

Vercel CLI, project `vibe-runner`. The user pushes; deploy only when asked.

`buildCommand: null` and `outputDirectory: "."` are what make the static host
work. Removing either breaks the deploy. Note the CLI can hang on this
machine — run it backgrounded with a timeout.

Verify a deploy by fetching the actual files and checking their contents, not
by trusting the exit code or the output.
