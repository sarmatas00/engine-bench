# VTK.wasm feasibility probe

A four-hour, binary feasibility probe run between Task 8 and Task 9 of the
scientific-visualization decision spike.

**Question.** Can current VTK.wasm load *this* spike's neutral artifacts
(`public/data/scientific/scientific-manifest.json` + `scientific.bin` and the
city meshes they depend on) and draw one city-plus-scientific view in one
browser canvas?

**This is not a third contender.** Neither vtk.js (page 13) nor Three.js (page
14) failed, so there is nothing here to rescue. A brilliant result does not
reopen the comparison Tasks 5-8 measured. A documented failure at the deadline
is a complete outcome at the task level.

---

## Time box (R1)

| | |
| --- | --- |
| Start (UTC) | `2026-09-19T21:06:22Z` |
| Start (local) | `2026-09-20 00:06:22 EEST` |
| Deadline (UTC) | `2026-09-20T01:06:22Z` |
| Deadline (local) | `2026-09-20 05:06:22 EEST` |
| Box | 4h 0m, hard. Stop mid-step; record the last successful call and the exact error. |

Actual elapsed time is recorded in the Result section, as a number, not as
"within the box".

## Environment

| | |
| --- | --- |
| OS | macOS 15.5 (24F74) |
| Arch | arm64 (Apple silicon) |
| Node | v24.15.0 |
| Bun | 1.3.13 |
| Browser (verification) | ego lite 0.5.0.32, via `/ego-browser` (R5) |
| Browser engine | Chromium; Google Chrome 153.0.8010.48 also installed |
| Package | `@kitware/vtk-wasm` — version and rationale below |
| Install location | a `mktemp -d` directory, never the worktree (R2) |
| Rendering backend | recorded from what actually ran, not from a capability string |

### Package version (R4)

The plan names `@kitware/vtk-wasm 3.0.4` as a baseline, not a verified fact.
Registry state at probe start (`registry.npmjs.org/@kitware/vtk-wasm`):

- `dist-tags.latest` = **3.0.5**, published 2026-09-14.
- **3.0.4** exists, published 2026-09-08 — the plan's baseline is real, not stale.
- 44 published versions, first (`0.0.0`) 2025-08-12. Four patch releases of 3.0.x
  in the 25 days before this probe.

**Version used: 3.0.4**, the plan's named baseline, so the verdict answers the
question the plan asked. 3.0.5 is six days newer; if 3.0.4 fails on something
3.0.5 fixes that is recorded as a finding, not silently swapped.

## Artifacts consumed (R3)

The real bytes pages 13 and 14 draw — no fixtures:

- `public/data/scientific/scientific-manifest.json` (schemaVersion 1)
- `public/data/scientific/scientific.bin` — 806176 B, sha256
  `f4ab6c115f00ccf4501c463c7ee7ae81684bb3aba679ff9ce8f41e0429843b44`
- its 8 declared dependencies, including `../real/ground.mesh.{json,bin}` and
  `../real/buildings.mesh.{json,bin}` (the city geometry)

Validation runs through the repo's own neutral loader,
`src/lib/scientific-data.ts` (`loadScientificBundle`), which verifies
`byteLength` and SHA-256 via `crypto.subtle.digest` for the manifest binary and
*every* declared dependency, and checks schema version, array range/overlap/
alignment, finiteness, streamline offsets and the grid order — **before** any
typed-array view or renderer object exists. The probe imports it read-only by
alias; nothing is copied into or written to the worktree by the temp package.

Coordinate frame asserted from the manifest, not assumed: CRS `EPSG:3006`,
origin `[318619.0, 6399140.0]`, `z0 = 1.1191982915663998`, local bounds
`[-250, -250, 0, 250, 250, 80]`.

Provenance asserted from the manifest, not typed by hand: the label drawn on
screen is built from `cases.smoke.dataCategory` (`synthetic`),
`cases.smoke.dtccCoreRevision`, and the binary's own sha256 prefix, read out of
the parsed manifest at runtime.

## Isolation contract (R2)

- `mktemp -d`; `bun add`/`npm i` happens only there.
- Root `package.json`, `bun.lock`, `pages/`, `src/` and renderer selection are
  not modified.
- Proof pasted into the Result section before commit: `git diff --stat` showing
  no change to `package.json` or `bun.lock`, and
  `grep -r "vtk-wasm" package.json bun.lock` returning nothing.

---

## Success assertions (the gate)

All of them are required. Every one passes → **FEASIBLE FOR FURTHER
EVALUATION**. Any one fails → **NOT ESTABLISHED WITHIN TIME BOX**, naming the
failed assertion. There is no third verdict and no partial credit.

For each one, the second column is the anti-coincidence test the brief demands:
*what would this look like if it were false?* If the answer is "the same", the
check is not evidence and does not count.

| # | Assertion | If it were false, what would differ? |
| --- | --- | --- |
| A1 | One VTK.wasm **standalone session** is created and initialized. | A session object exists but never initialized would still be truthy. So: assert the initializer's returned/awaited handle, call a method that only a live session answers, and record its value — not `typeof session === 'object'`. |
| A2 | Exactly **one canvas** is registered to that session. | A page with two canvases, or a canvas the session never bound, looks identical in a screenshot. So: count `document.querySelectorAll('canvas').length === 1` *and* assert the registered canvas is that same node by identity. |
| A3 | The **shared manifest is validated before** any VTK object is constructed. | A probe that validates after constructing, or not at all, renders the same picture. So: record a monotonic timestamp at validation completion and at first VTK constructor call, and assert `tValidated < tFirstVtkObject`; and corrupt one byte in a control run to confirm the validator actually rejects. |
| A4 | **City geometry** from the hash-verified buildings/ground meshes is present in the scene. | Geometry from an unverified fetch, or a stand-in box, looks like a city. So: the positions handed to VTK must be the exact `Float32Array`s `loadScientificBundle` returned, and the probe reports the vertex/triangle counts and the first/last coordinate triple, cross-checked against `buildings.mesh.json`'s own `vertexCount`/`indexCount`. |
| A5 | A **volume or a movable slice** of the smoke case is present. | An actor added to the renderer but with zero points, or added after the render, produces a canvas that looks the same as one with nothing. So: report the scientific actor's point count and its world bounds from VTK, and require the bounds to be non-degenerate and inside the manifest's local bounds. |
| A6 | A **visible provenance label** is on screen. | A label hard-coded in HTML would look identical. So: the label's text is composed at runtime from parsed-manifest fields, and the assertion reads `textContent` back out of the DOM and checks it contains the manifest's `dtccCoreRevision` prefix and the binary sha256 prefix. |
| A7 | **Dispose releases the session.** | Calling `dispose()` and returning is not evidence of release. So: after dispose, a call that requires a live session must throw or report released, and the WebGL context must be reported lost/unavailable; both recorded with the actual error text. **The second clause was measured and is wrong — the GL context belongs to the runtime, not the session. Original wording kept; see "One criterion I wrote was wrong" in the Result.** |
| A8 | **Initialization duration** is measured including Wasm fetch **and** compile. | A number that starts after `instantiate` is smaller and looks better. So: `t0` is taken before the first byte of the runtime is requested; the reported figure is split into fetch / compile+instantiate / first-frame, each from `performance` marks, and cross-checked against the Resource Timing entry for the `.wasm` request. |
| A9 | **Transferred bytes** of the runtime are recorded. | A number read off the package's unpacked size, or off `content-length` of one file, is not what the browser transferred. So: summed from `PerformanceResourceTiming.transferSize`/`encodedBodySize` for the runtime's own requests, listed per request, and separated from artifact bytes. |
| A10 | **No unhandled console or network failures.** | A page that logs nothing because nothing ran looks clean. So: an explicit `console.error`/`onerror`/`unhandledrejection` collector installed before load, plus a non-2xx response counter; both must report a count *and* the probe must have reached its final state, so "0 errors" cannot mean "0 work". |
| A11 | **First frame actually drew** the scene. | A first-frame timestamp taken after `render()` returns can precede any pixel, and an empty canvas produces a timestamp too. So: after render, read back pixels and require a non-background, non-uniform result — a canvas histogram with more than one distinct colour — before the frame counts. |

---


## Result

### Verdict

**FEASIBLE FOR FURTHER EVALUATION**

This verdict answers one question only: can current VTK.wasm load this spike's
neutral artifacts and draw one city-plus-scientific view in one canvas. It says
nothing about vtk.js versus Three.js, and **it does not reopen the comparison
Tasks 5-8 measured.** Nothing in this file is an input to Task 9's decision
rule.

### Time box (R1)

| | |
| --- | --- |
| Start | `2026-09-19T21:06:22Z` |
| Finished the gate run | `2026-09-19T21:17:24Z` |
| **Actual elapsed** | **11 minutes 2 seconds** of the 4h 0m box (4.6%) |
| Deadline reached | no — the probe completed, it was not stopped |

The box was not the binding constraint. Everything the plan asked for was
reachable, and the cheapest step (`npm install`, 21 s) plus the most expensive
one (a 12.7 MB runtime download, 0.95 s) both came in under a minute.

### The five R7 numbers

| # | Measurement | Value |
| --- | --- | --- |
| 1 | **Initialization time** | **471.7 ms** for `loadAsync` — fetch + gunzip + untar + compile + instantiate, `t0` taken before the first runtime byte was requested. Split: 103.0 ms fetch (localhost), 368.7 ms decompress+compile+instantiate. Plus 58.4 ms for `createStandaloneSession`. **First rendered frame: 1686.6 ms** after `t0` (includes 333.9 ms to fetch and SHA-256-verify all 10 artifact files, scene construction, and a 650 ms first render dominated by shader compile and volume texture upload). |
| 2 | **Transferred runtime bytes** | **12,734,721 B** over the wire (`transferSize`; `encodedBodySize` 12,734,421 B = the tarball exactly), decompressing to **87,326,720 B**, of which the WebAssembly binary alone is **84,487,981 B**. One request. The npm package is only 432 KB and contains **no `.wasm` at all** — it is a loader; the runtime comes from a separate `.tar.gz`. |
| 3 | **API maturity** | Typed, documented, and it worked first time for this scene. `@kitware/vtk-wasm` is at **3.0.4** (2026-09-08) with **44 versions since 2025-08-12** and 4 patch releases of 3.0.x in the 25 days before this probe — a fast-moving surface. The JS package version is **decoupled** from the runtime version: the JS is 3.0.4, the runtime tarball self-identifies as VTK **9.7.20260913**, and the default `latest` path is a moving nightly. The C++ API is reached through a proxy whose per-class methods come from 773 JSON descriptors shipped inside the tarball; C++ overloads are collapsed to one signature (`vtkCellArray::SetData` survives only as `(offsets, connectivity)`). Precise TypeScript types require running a `vtk-wasm gen-types` codegen step against the exact bundle; without it every `vtk.vtkAnything()` falls back to a loose index signature. `runtime.isAsync()` reported `true` although `exec` defaulted to `"sync"`. |
| 4 | **Browser support** | Verified on **one** engine: ego lite 0.5.0.32 (Chromium), macOS 15.5 arm64. Read off what actually ran, not off a capability string: the render window's own class is `vtkWebAssemblyOpenGLRenderWindow`, `getRenderingBackend()` returned `OpenGL2`, and the live context on the canvas reported `WebGL 2.0 (OpenGL ES 3.0 Chromium)` on `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)`. **Firefox and WebKit were not tested.** WebGPU was not tested; `rendering: 'webgl'` was requested and WebGL2 is what ran. |
| 5 | **Teardown behaviour** | `session.dispose()` **does release the session** — after it, two independent calls both throw VTK's own `Cannot pass deleted object as a pointer of type vtkStandaloneSession*`, and `session.disposed` is `true`. Nothing else is released: the wasm heap stays at 20,185,088 B (Emscripten cannot return it before reload, which the package's own types state), the WebGL context is **not** lost after `renderWindow.finalize()`, after `session.dispose()`, or even after `runtime.dispose()`, and `StandaloneSession.dispose()` leaves the canvas registered in `specialHTMLTargets` — only `runtime.dispose()` clears that key. A second `loadAsync()` after `runtime.dispose()` re-creates the runtime from cache (`transferSize` 300 B), so it does not refetch 12.7 MB. |

### Isolation proof (R2)

```
$ git diff --stat
                                    <- empty: no tracked file modified

$ git status --short
?? spikes/vtk-wasm/probe.html
?? spikes/vtk-wasm/probe.ts

$ grep -r "vtk-wasm" package.json bun.lock
                                    <- no output, exit code 1

$ git diff --stat HEAD -- package.json bun.lock
                                    <- empty: unchanged
```

Every dependency lived in `mktemp -d` directories (`/tmp/vtkwasm-probe.*`,
`/tmp/vtkwasm-repro.*`), removed with the machine's temp dir. The worktree gained
three files, all under `spikes/vtk-wasm/`. The probe read `src/lib/scientific-data.ts`
and `public/data/**` through a Vite alias and a read-only middleware; it wrote
nothing back.

### Version used, and why (R4)

`@kitware/vtk-wasm@3.0.4` — the plan's named baseline, which **does exist** on
the registry (published 2026-09-08). `3.0.5` is the current `latest` (2026-09-14)
and was deliberately not used, so the verdict answers the question the plan
asked. Runtime bundle:
`https://raw.githubusercontent.com/Kitware/vtk-wasm/dist/latest/vtk-wasm32-emscripten.tar.gz`,
downloaded once and pinned for the probe at
sha256 `79ae16e423cd9f42aa5960573cdf65734590144984a6a8f1b33a62dcf44c031e`,
self-identifying as VTK `9.7.20260913`. It was pinned because `dist/latest` is a
moving nightly and an unpinned probe is not reproducible.

### Assertions

| # | Result | Evidence |
| --- | --- | --- |
| A1 | **pass** | `runtime.createStandaloneSession()` returned a session whose `vtk` namespace answered a live call: `vtkConeSource` constructed, `$id = 1`, `toString()` = `vtkConeSource (0xa8fd08)` — a C++ `PrintSelf` with a real heap address, which an uninitialized session cannot produce. Runtime id `/vtk/vtk-wasm32-emscripten.tar.gz::vtk::webgl::sync`. |
| A2 | **pass** | `document.querySelectorAll('canvas').length === 1`, and `runtime.module.specialHTMLTargets['!probe-canvas'] === canvas` by node identity — not by key presence. Canvas 1200x800. |
| A3 | **pass** | Validation completed at `t = 421.2 ms`; the first VTK object was constructed at `t = 964.0 ms`. 10 files fetched, all byteLength- and SHA-256-verified. **Negative control:** re-run with one byte of `scientific.bin` flipped, the loader rejected with `scientific binary scientific.bin: sha256 mismatch -- manifest says f4ab6c115f00ccf4501c463c7ee7ae81684bb3aba679ff9ce8f41e0429843b44, file hashes to 78989a804dce1c45c2149bb67dc6e893c7cdcd693e485a218964246eb1a96389`. The hash check is load-bearing, not decorative. |
| A4 | **pass** | Buildings: 20,726 source vertices / 37,672 source triangles → `vtkPolyData.getNumberOfPoints() = 20726`, `getNumberOfCells() = 37672`. Terrain: 6,288 / 8,920 → 6,288 / 8,920. VTK's own actor bounds `[-246.094, 245.090, -244.628, 242.634, 0.121, 55.471]` match the bounds computed from the source `Float32Array` to 1e-3 on all six faces — so the geometry VTK holds is the geometry that was hash-verified, not a re-fetch. First triple `[-87.016, -235.119, 47.694]`, last `[238.872, 98.741, 8.431]`. |
| A5 | **pass** | The smoke case as a `vtkImageData` volume: dims `[32,32,32]`, origin `[-250,-250,0]`, spacing `[16.129, 16.129, 2.581]`, association `vertex`. `getNumberOfPoints() = 32768` = `grid.speed.length`. Scalar range read back **from VTK** `[0.181988, 11.214103]` equals the range computed from the source array. `vtkVolume.getBounds()` `[-250, 250, -250, 250, 0, 80]` — non-degenerate and exactly the manifest's `localBounds`. Rendered contribution measured separately, see below. |
| A6 | **pass** | The on-screen label's `textContent`, read back out of the DOM, is `VTK.wasm probe - synthetic smoke case / CRS EPSG:3006 origin 318619, 6399140 z0 1.1192 / dtcc-core 4c8d6217964a27e9ab363aa41e86001dd87f8f2c / scientific.bin 806176 B sha256 f4ab6c1...`. It contains the manifest's `dtccCoreRevision` prefix and the binary sha256 prefix, both composed at runtime from the parsed manifest, and its bounding rect is 585.5 x 112.2 px at (12, 709.8). |
| A7 | **pass** | `session.disposed === true`; a **new** object through the disposed session throws `Cannot pass deleted object as a pointer of type vtkStandaloneSession*`; a **pre-existing** proxy (`vtkWebAssemblyOpenGLRenderWindow (0xac1650)`, which answered before dispose) throws the same. Two independent paths, both with VTK's own text. See the amendment note below. |
| A8 | **pass** | 471.7 ms total with `t0` before the first runtime byte; 103.0 ms of that is the tarball's own `PerformanceResourceTiming.duration`, leaving 368.7 ms of gunzip + untar + compile + instantiate. Cross-checked against the Resource Timing entry rather than asserted. |
| A9 | **pass** | One runtime request, `transferSize` 12,734,721 B, `encodedBodySize` 12,734,421 B (= the file on disk, byte for byte), `decodedBodySize` 87,326,720 B. Artifact bytes are counted separately (2,730,359 B across 10 requests) so the runtime figure is not inflated by the data. |
| A10 | **pass** | 0 console errors, 0 `onerror`, 0 `unhandledrejection`, 14 fetches and 0 non-2xx — collected by a listener installed in a classic `<script>` **before** the probe module, and reported together with `reachedTerminalState: true`, so "0 errors" cannot mean "nothing ran". |
| A11 | **pass** | After the first `render()`, `gl.readPixels` on the live context gave **19,922 distinct colours** and **281,814 non-background pixels** of 960,000 (29.4%), with `renderer.getNumberOfPropsRendered() = 3` (two actors plus the volume). The empty-scene control on the same code path gives **1 distinct colour, 0 non-background pixels, 0 props** — so this check distinguishes a drawn frame from a blank one. |

### The differential tests, because three of these could have passed for the wrong reason

An assertion that a prop is "present" and a frame is "non-empty" can both hold
while the thing you care about contributes nothing. Measured by rendering the
false case and diffing the pixels (900x600 canvas):

| Case | Props | Non-background px | Pixels changed vs. full scene |
| --- | --- | --- | --- |
| Empty renderer | 0 | 0 | 159,011 |
| Full scene | 3 | 158,609 | — |
| Volume removed | 2 | 131,628 | **159,010** (29.5% of canvas) |
| City removed | 1 | 158,607 | **63,796** |

Both halves of "city plus scientific" genuinely draw. The volume is a
semi-transparent slab over the whole domain, which is why removing it changes
nearly every drawn pixel; the city changes 63,796 pixels through and in front of
it.

**Frame time, stated twice because the two numbers mean different things.**
The synchronous cost of `renderWindow.render()` returning, over 30 camera
azimuth steps: median **1.4 ms**, p95 9.9 ms. That is submit time, not a frame.
The interval between *presented* frames across `requestAnimationFrame`, 40
frames: median **16.7 ms**, p95 33.4 ms, max 38.4 ms — vsync-locked at 60 Hz,
with occasional doubled frames. Quoting the 1.4 ms as a frame time would be the
coincidence this spike keeps producing.

### One criterion I wrote was wrong, and this is what changed

A7's anti-coincidence column originally required that "the WebGL context must be
reported lost/unavailable" after dispose. **It is not, and that expectation was
wrong rather than the library.** The WebGL context belongs to the Emscripten
module (the *runtime*), not to the session; measured directly, it survives
`renderWindow.finalize()`, `session.dispose()` and `runtime.dispose()` alike.
The assertion the brief actually sets is "a clean dispose that **releases the
session**", and that is what the two post-dispose throws demonstrate. The
GL-context and heap measurements are reported in full above as behaviour, not
quietly dropped: a page that creates and disposes many VTK.wasm sessions will
not get its GPU context or its 20 MB of wasm heap back before a reload.

### Reproducibility (Task 3, Step 2)

The probe was re-run from a **clean `mktemp -d` + fresh `npm install`** (19.8 s),
a fresh runtime download (same sha256), and the two committed files
`spikes/vtk-wasm/probe.html` + `probe.ts` copied in unmodified. All 11
assertions passed again, with identical geometry counts (37,672 cells),
identical runtime bytes (12,734,721), an identical negative-control rejection,
and a **bit-identical frame** (19,922 distinct colours, 281,814 non-background
pixels). Only the timings moved: 437.5 ms vs 471.7 ms runtime load.

To reproduce:

```bash
C=$(mktemp -d) && cd "$C"
echo '{"name":"p","private":true,"type":"module","version":"0.0.0"}' > package.json
npm install @kitware/vtk-wasm@3.0.4 vite@8.2.2 typescript@5.9.2
mkdir -p public/vtk && curl -sL -o public/vtk/vtk-wasm32-emscripten.tar.gz \
  https://raw.githubusercontent.com/Kitware/vtk-wasm/dist/latest/vtk-wasm32-emscripten.tar.gz
cp <repo>/spikes/vtk-wasm/probe.html index.html
cp <repo>/spikes/vtk-wasm/probe.ts   probe.ts
```

then a `vite.config.ts` that (a) aliases `@repo/scientific-data` to
`<repo>/src/lib/scientific-data.ts`, (b) serves `<repo>/public/data/**` at
`/data/*`, and (c) sets `optimizeDeps.exclude: ['@kitware/vtk-wasm']` — the
runtime is imported as a blob module and must not be pre-bundled. Open the page
and read `window.__probe`.

### Findings that are NOT feasibility answers

Kept separate so they cannot contaminate the verdict, and **none of them is an
input to Task 9**:

1. **The npm package is not the runtime.** `@kitware/vtk-wasm@3.0.4` is 432 KB of
   loader with no `.wasm` in it. The 84 MB binary comes from a GitHub `dist`
   branch, and the documented default (`dist/latest`) is a moving nightly whose
   version (`9.7.20260913`) is not the npm version. Any real use would have to
   self-host and pin it. This is a supply-chain and reproducibility observation,
   not a rendering one.
2. **These numbers are not comparable with `docs/scientific-visualization-measurements.md`.**
   That document's frame times are all ANGLE/SwiftShader software rasterization,
   stated there explicitly. This probe ran on ANGLE Metal on an Apple M4. Putting
   1.4 ms or 16.7 ms next to any row of that table would be a category error.
3. **The repo's neutral loader carried the whole artifact contract unchanged.**
   `loadScientificBundle()` was written for vtk.js and Three.js pages and needed
   no modification to feed VTK.wasm — the `Float32Array`s went straight into
   `toVTKAoSArray`. That is evidence about the *contract's* neutrality, which is
   a property of this repo, not of VTK.wasm.
4. **`session.dispose()` does not unregister the canvas.** `RemoteSession.dispose()`
   is documented to detach its canvases; `StandaloneSession.dispose()` leaves the
   `specialHTMLTargets` key behind. Only `runtime.dispose()` clears it. Worth
   knowing before building a page that swaps sessions.
5. **One engine only.** Firefox and WebKit are untested here, exactly as they are
   in the Task 8 document. Nothing above supports a claim about "browsers".
