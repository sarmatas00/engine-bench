# Scientific visualization: vtk.js 36.12.1 against Three.js 0.185.1

Measured evidence for the scientific-visualization decision spike, Task 8.

**This document chooses nothing.** It records what was measured, on what
surface, with what spread, and what could not be measured and why. The decision
rule is applied in Task 9, against this table. If you find a recommendation
below, it is a defect.

Regenerate every number here with:

```
bun run measure:scientific
```

which builds the pages and drives them through `scripts/measure-scientific.ts`,
writing the full machine-readable record — every frame time, every GL counter,
every bundle byte, every rejection — to `.cache/scientific-measurements.json`,
**and a per-session copy to `.cache/sessions/<generatedAt>.json`**.
The pure aggregation layer that script exposes is unit-tested in
`tests/unit/scientific-probes.test.ts`.

The per-session copy exists because the rolling file is overwritten by every
run, and the frame-time section below is a comparison *across* sessions. Sessions
**A and D predate the archive and have no surviving machine-readable record** —
their rows were transcribed from the run output at the time and cannot be
re-checked the way every other row here can. Sessions B, C, E, F and G can.
Stated rather than quietly left as a gap, since a table whose rows differ in how
well they can be audited should say which ones.

**Every number in this document comes out of that one command**, including the
bundle-size row, which was previously computed by an ad hoc shell command and
pasted in — so the sentence above used to be false for that row, and its gzip
figures could not be reproduced because the one-off had used a different zlib
build from the one quoted. Gzip totals are `Bun.gzipSync` at its default level,
named because it matters: a `node:zlib` run of the same input differs by a few
bytes and a Python `zlib` run by more. Treat them as an indicative wire size for
comparing the two pages on one tool, not as a prediction of what a given CDN
emits.

The one exception, stated rather than hidden: the **data-copy** row is counted
by inspection, not by the script, and every site it counts is cited by file and
line below so the count can be disagreed with.

---

## The measurement surface. Quote it with every number.

| | |
|---|---|
| Browser | chromium via Playwright 1.63.0, `--use-gl=angle --use-angle=swiftshader` |
| Rasterizer | **ANGLE/SwiftShader — software.** No GPU took part in any frame time here. |
| Harness viewport | 1280x800, `deviceScaleFactor` 1 |
| Benchmark drawing buffer | **1280x720, asserted per run, not trusted** (see below) |
| Context attributes | identical on both pages: `antialias:true`, `depth:true`, `alpha:true`, `preserveDrawingBuffer:false` |
| Camera path | `orbit-v1` — 30 unrecorded warmup frames, then 180 forced frames, one azimuth orbit |
| Runs | 3 cold browser contexts per page, **interleaved** vtk.js, Three.js, vtk.js, Three.js, vtk.js, Three.js |
| Sessions | five (A, B, D, E on this machine; C by an independent reviewer). **E is the record**; all five are tabulated under "Frame time". |
| Date of record | 2026-09-19 |

Three cold contexts per page are **interleaved, not sequential**. This is not
style: a sequential three-then-three run earlier in the spike showed a 15% p50
drop that turned out to be machine drift, and only an interleaved re-run caught
it. The order is written into the JSON as `harness.interleavedOrder`.

`renderSurfaceBenchmark` is **asserted**, never footnoted. Each page's header is
a different height, so the canvas each page is left with differs; frame time
scales with pixels. A run whose benchmark-phase record is not exactly 1280x720
is rejected. Both pages keep the benchmark-phase record under its own key
precisely so this can be checked after the run, rather than being overwritten
by the interactive record that the restore writes moments later.

### When a run is rejected

A rejected run is reported as rejected. It is never silently retried into a
passing one, and no statistic is computed from it — the aggregator returns
`cpu: null` on rejection, so a p50 over a partial run cannot reach the record.
The rules, all in `judgeRun`:

- `probe.scientific.status` is not `ready`
- `measurementValid` is false
- the CPU sample array is not exactly 180 long (the **validity gate**; the
  driver already excluded the 30 warmup frames, so this gates the shape of what
  it returned rather than performing an exclusion)
- any CPU sample is not a finite number, any is negative, or the p50 is not
  above zero — **a count is not enough.** Measured against a count-only gate:
  180 samples of 0 ms were accepted and published a p50 of 0 with an *infinite*
  minimum sustained FPS and a `meets-target` verdict; 180 samples of −5 ms were
  accepted at −200 FPS; 179 good samples plus one `NaN` were accepted. A run
  that never timed anything is not a fast run.
- `renderSurfaceBenchmark` is missing, is from the interactive phase, or differs
  from 1280x720 **in either dimension**
- GL or DOM object counters moved across the 100 no-resize control cycles, **or
  the growth record is missing any of the six counters** — an empty record would
  otherwise pass the leak gate by having nothing that could move
- **the page does not publish `gpuSampleStats` at all.** This is a page defect,
  not a browser capability, and it is reported as one: with the field stripped
  from both built pages, all six runs are rejected and the script exits
  non-zero. Before this was separated from "the value is null", a page missing
  the field produced an *accepted* run captioned "this browser does not expose
  `EXT_disjoint_timer_query_webgl2`" — a false statement about the browser,
  emitted by the very check that exists to catch the page defect.
- the GPU sample rejection rate exceeds 10%, `gpuSampleStats.kept` disagrees
  with the length of the published GPU array, or a null tally arrives beside a
  non-null GPU array

**Of the six runs in the record session, zero were rejected**, and the same held
in every other session.

---

## The evidence table

Two renderers, same artifacts, same bundle, same shared probe and benchmark
code, same pinned surface. Medians are across the three accepted runs per page.

| | vtk.js 36.12.1 | Three.js 0.185.1 |
|---|---|---|
| **Correctness** | 23 genuinely cross-renderer assertions agree (see below) | same 23 |
| **Browsers** | chromium + firefox green; WebKit untested | chromium + firefox green; WebKit untested |
| **Load, navigation to `ready`** | median **109 ms** (192 / 108 / 109) | median **140 ms** (157 / 138 / 140) |
| **CPU frame p50** | median **158.4 ms** (158.4 / 159.3 / 153.8) | median **151.2 ms** (164.8 / 151.2 / 150.3) |
| **CPU frame p95** | median **188.3 ms** (312.6 / 188.3 / 181.9) | median **175.5 ms** (231.1 / 175.5 / 175.2) |
| **CPU frame min** | median **143.9 ms** (145.3 / 142.5 / 143.9) | median **139.2 ms** (141.2 / 139.2 / 139.1) |
| **CPU frame max** | 1286.0 / 259.7 / 213.6 ms | 419.7 / 201.3 / 211.3 ms |
| **GPU frame p50** | 158.3 / 159.2 / 153.5 ms | 164.9 / 151.3 / 150.4 ms |
| **GPU frame p95** | 311.9 / 188.3 / 181.5 ms | 227.3 / 175.7 / 175.2 ms |
| **GPU samples kept** | 180 of 180, every run, tally published | 180 of 180, every run, tally published |
| **Minimum sustained FPS** (1000 / p95) — **SwiftShader; NOT a renderer result, see below** | 3.2 / 5.3 / 5.5 — below 20 on every run | 4.3 / 5.7 / 5.7 — below 20 on every run |
| **Page code fetched** (uncompressed; the harness serves no gzip) | 1,166,378 B of JS over 8 requests | 675,460 B of JS over 6 requests |
| **Data fetched** | 3,251,647 B over 11 requests | **identical**: 3,251,647 B over 11 requests |
| **`dist` bundle, on disk** (`Bun.gzipSync`, default level) | 1,168,299 B raw / **315,376 B gzip**, 9 files | 677,411 B raw / **181,229 B gzip**, 7 files |
| **JS heap after a run** (chromium only) | 16.1 / 18.2 / 17.1 MB | 11.9 / 11.9 / 11.9 MB |
| **Resources, 100 control cycles, no resize** | **flat** — 0 on all six counters, all runs | **flat** — 0 on all six counters, all runs |
| **Resources, 8 drawing-buffer resizes** | **+8 textures, +8 framebuffers, +8 renderbuffers** — one each per resize, never recovered | **0, 0, 0** |
| **Code burden, TypeScript** — **comments included, see below** | 1,381 unique non-blank lines (1,659 non-blank, of which **570 comments, 34%**) | 2,063 unique non-blank lines (2,447 non-blank, of which **860 comments, 35%**) |
| **Code burden, custom GLSL** | **0 lines. 0 shaders.** | **9 shaders, 144 non-blank lines, 128 substantive as compiled, 85 distinct lines owned, 0 reused verbatim** |
| **Data copies into renderer format** | 3 (2 mesh cell arrays, 1 streamline cell array) | 2 (1 streamline index array, 1 per-vertex colour array) |
| **Public API entry points** (each page's own `probe.apis`) | **13** public `@kitware/vtk.js/...` modules + 2 rendering-profile imports | **21**: 19 core classes + **2 `three/addons/*` modules** |
| **Experimental APIs** | 0 | 0 |
| **Private APIs** | 0 | 0 by import, but **1 internal shader-chunk dependency** and 1 undocumented renderer behaviour relied on (below) |

---

## Frame time: no winner, and the sign of the gap is not stable

**The gap between the two renderers changes sign between sessions.** Six
independent sessions of the same script on the same machine, each three cold
contexts per page, interleaved:

| Session | vtk.js p50 median | Three.js p50 median | Gap | Slower |
|---|---|---|---|---|
| A | 154.4 ms (164.5 / 154.2 / 154.4) | 151.4 ms (150.9 / 151.6 / 151.4) | 2.0% | vtk.js |
| B | 153.7 ms (153.7 / 155.5 / 152.9) | 149.9 ms (149.9 / 150.1 / 149.3) | 2.5% | vtk.js |
| C *(independent reviewer, quiet machine)* | 157.5 ms (157.5 / 153.2 / 159.1) | **163.2 ms** (150.2 / 163.2 / 164.6) | 3.6% | **Three.js** |
| D | 153.1 ms (156.0 / 153.1 / 152.9) | 150.1 ms (149.9 / 150.1 / 150.9) | 2.0% | vtk.js |
| E *(record)* | 158.4 ms (158.4 / 159.3 / 153.8) | 151.2 ms (164.8 / 151.2 / 150.3) | 4.8% | vtk.js |
| F *(independent reviewer, quiet machine)* | 162.7 ms (156.1 / 168.4 / 162.7) | 151.9 ms (150.3 / 161.6 / 151.9) | 7.1% | vtk.js |
| G *(controller, after the gate fixes)* | 153.9 ms (153.5 / 153.9 / 154.1) | 149.9 ms (149.9 / 149.6 / 150.8) | 2.7% | vtk.js |

**There is no frame-time winner on this scene**, and this document does not
manufacture one in either direction. The gap runs from **2.0% to 7.1%** and **its
sign is not stable**: six sessions put vtk.js behind, one puts Three.js behind.
A margin that changes direction between sessions of the same script on the same
machine is not a property of a renderer.

Within-condition spread — the same page, three cold contexts, minutes apart, one
machine — is why. Measured range: **0.4% to 9.6%**. The 9.6% appeared for
Three.js twice, independently: session C (150.2, then 163.2 and 164.6) and
session E (164.8, then 151.2 and 150.3). Earlier in the spike the spread reached
**18%**.

So: **the cross-renderer gap spans 2.0-7.1%, the within-condition spread spans
0.4-9.6%, and the sign reverses in one session of seven.** The two ranges overlap
across most of their length, which is the whole finding.

An earlier draft of this section compressed that into a single ratio — "the
largest spread measured is twice the largest gap measured". It was arithmetically
true of the five sessions then in hand and **false by the sixth**, which pushed
the gap to 7.1% and the ratio to 1.36x. It is recorded here because it is this
spike's recurring defect in its purest form, committed *in the fix for a previous
instance of itself*: a number that is right only by coincidence of when it was
taken. Ranges move as sessions accumulate; a ratio of two extremes lurches.

Read the low figures as a floor on the noise, never as its size. Any single
session's 0.4% spread is a statement about that session's quiet, not about the
renderer — and quoting one would be this spike's recurring defect in its purest
form: a number that is right only by coincidence of when it was taken. That floor
has already moved once: it was 0.5% until session G measured 0.4%.

The parity suite deliberately asserts nothing about frame times for the same
reason.

### `cpuMin` is published, and it does not settle the question either

`cpuMin` is the statistic that survives a contended machine best: the p50 moves
and the floor moves less. It is published because it is the most stable number
here — **not** because it carries a direction.

| Session | vtk.js floor | Three.js floor | Bands |
|---|---|---|---|
| A | 143.4–146.5 ms | 139.7–141.4 ms | separated |
| B | 144.8–145.0 ms | 139.7–140.2 ms | separated |
| C | 144.4–145.9 ms | **139.8–148.2 ms** | **overlapping** |
| D | 142.4–143.4 ms | 138.3–140.0 ms | separated |
| E *(record)* | 142.5–145.3 ms | 139.1–141.2 ms | separated |

Session F is absent from this table on purpose: it was run to test the frame-time
claim above and its per-run floors were not recorded, so there is no row to
publish. Five floor rows, six p50 rows — the difference is what was measured, not
a selection.

In session C the Three.js floor moved **8.4 ms across three cold contexts** and
swallowed the vtk.js band whole. A separation that holds in four sessions and
vanishes in the fifth is not a separation, and nothing here should be read as
one. NOTES.md records `cpuMin` at 141–149 ms across twelve earlier quiet runs on
both renderers; the floors measured here run as low as 138.3 ms, which extends
that band downward rather than contradicting it.

One outlier is worth naming rather than smoothing: in session B, vtk.js run 2
had a p95 of 247.0 ms and a max of 697.2 ms against its own p50 of 155.5 ms. Its
`cpuMin` was 145.0 ms — indistinguishable from its siblings. A single stalled
frame, not a different renderer.

### GPU frame time is CPU frame time here, and that is expected

Every run had a working `EXT_disjoint_timer_query_webgl2` and kept **180 of 180
samples with 0 rejected**, on both pages, and both pages published the tally, so
that `180 of 180` is a positive statement and not an absence read as a success.
The GPU p50 lands **under a third of a millisecond** from the CPU p50 on every
run: 0.285 ms at worst in the record session (vtk.js run 3, 153.800 against
153.515), 0.302 ms at worst across all sessions.

That agreement is **not independent confirmation of the frame cost**. Under
SwiftShader the "GPU" is the same CPU, and each page ends every frame with a
one-pixel readback that forces completion, so the two clocks are timing nearly
the same work. It does confirm that the frames were actually waited on rather
than merely submitted. Read the GPU row as a consistency check, not a second
measurement.

### The FPS classification says something about the harness, not about the renderers

Minimum sustained FPS — defined here as `1000 / p95`, the rate held for 95% of
frames — is **3.2 to 5.7 on both renderers** in the record session, and never
above 5.9 in any session. Against the spec's bands (at least
30 FPS is the target, sustained below 20 FPS fails the interactive-MVP
requirement, between is qualified), **every run on both renderers lands in
`fails-interactive-mvp`**.

Both land there, by the same margin, on a **software rasterizer**. This row
characterises ANGLE/SwiftShader at a 1280x720 volume-rendered scene. It does not
characterise either library on target hardware, and it does not separate them.
No GPU-hardware measurement exists in this spike; see "What is unavailable".

`1000/p95` rather than `1000/max` is a choice with a consequence, and the
record session shows its size: vtk.js run 1 has a max of **1286.0 ms** against a
p95 of 312.6 ms and a p50 of 158.4 ms. A max-based figure would report 0.8 FPS
for that run. One scheduler stall is not a sustained frame rate. `max` is
published beside it so the stall stays visible rather than being smoothed
away — and the unit tests pin the distinction, because a fixture where p50, p95
and max happen to coincide would let the implementation swap one for another
undetected.

---

## Resource growth: a real difference, favouring Three.js

Two different measurements, kept apart on purpose.

**Across 100 deterministic control cycles with no resize in them**, both
renderers are flat: buffers, textures, render targets, renderbuffers, listeners
and observers all moved by exactly 0, on all six runs of the record session and
on every run of every session. This is the gate — growth here rejects the run,
and the gate now also rejects a growth record that is *missing* counters, since
an empty record would otherwise satisfy it vacuously.

**Across 8 drawing-buffer resizes**, vtk.js 36.12.1 grows by **+8 textures, +8
framebuffers and +8 renderbuffers** — one of each per resize, reproduced
identically on all three of its runs, in all six sessions where growth was
recorded (A-E and G; session F was run to test the frame-time claim only), and in both
orderings of the sweep against the control cycles — and never recovers them. Three.js
0.185.1 grows by **0, 0, 0**. This is a **result**, not a gate: rejecting
vtk.js's runs for it would turn one of the spike's three findings into an
outage.

Growth tracks resizes only. It does not track frames, slice rebuilds or case
switches — the 100-cycle result above is the evidence for that, since those
cycles drive all three and move nothing.

---

## A harness property, belonging to neither renderer

The **first** drawing-buffer resize after 100 control cycles takes tens of
seconds to reach the page's `ResizeObserver`, while every later one takes
**0.25 s**. Measured under the identical protocol on **both** pages: 61 s and
50.6 s on page 13, **49.3 s on page 14**. The 100 cycles return in under two
seconds of JavaScript time but leave roughly 600 renders queued in SwiftShader,
and the resize waits behind the queue — the same property NOTES.md:534 records
for `gl.finish()`: work is submitted, not completed.

**This is a rasterizer and harness artifact, not a renderer observation**, and
it is recorded here rather than inside the resource-growth section because
putting a both-pages artifact inside a section that favours one of them is how
the spike's 12% frame-time phantom happened. The script runs its resize sweep
before the control cycles and records the wait per resize. Anything that drives
these pages by waiting on a resize needs a timeout in the minutes, not the
seconds.

---

## Maintenance burden: ownership, not capability

Three.js has no volume renderer. `three/addons/shaders/VolumeShader.js` supplies
maximum-intensity and isosurface modes only — not the transparent front-to-back
compositing this scene needs — so page 14 hand-writes the compositor and a
two-pass opaque depth stop. vtk.js ships `vtkVolumeMapper`; page 13 writes no
GLSL at all.

Measured at runtime by the page itself (`window.__bench.probe.glslBurden`, so it
counts what the GPU actually compiles rather than what the source file looks
like):

```
9 shaders, 144 non-blank lines, 128 substantive as compiled, 85 distinct lines
owned. Textually identical to the stock addon: 11 lines. Reused verbatim: 0.
```

**The zero needs its structure stated, or it misleads in the other direction.**

- All 11 of the textually identical lines are `void main() {` or
  `precision highp float;`. That is why verbatim reuse computes to 0 — it is a
  true number about boilerplate, not a claim that nothing was learned from the
  addon.
- About **12 of the 85** are the shared colormap (`COLORMAP_GLSL`, 12 non-blank
  lines), charged to this page because they are compiled into its fragment
  shaders, though `src/lib` owns them and page 13 uses the same ramp on the CPU.
- About **5** are verification scaffolding that never runs in a frame — the
  round-trip shaders that let the page assert its own texture wiring.
- `#include <packing>` pulls `perspectiveDepthToViewZ` out of Three.js's own
  chunk library. That is real reuse and **it is not counted anywhere in the 85**.
- The ray/AABB slab intersection, the bounded march with a hard `MAX_STEPS`, the
  clim normalisation, the sampler-helper factoring and the half-texel centring
  are the stock addon's algorithm **re-typed rather than reused**. The
  compositor and the depth stop are genuinely new.

A static cross-check over the page's own source literals counts 78 distinct
GLSL lines; it reads 7 fewer than the runtime figure because it sees
`${COLORMAP_GLSL}` as one placeholder line instead of the twelve it expands to,
and because expansion makes a few lines coincide. The runtime figure is the one
of record.

### The mechanism is the same on both pages

**Both renderers clamp the volume ray against an opaque-depth texture.**

vtk.js does it inside the library:
`@kitware/vtk.js/Rendering/OpenGL/VolumeMapper.js:113` substitutes
`//VTK::ZBuffer::Impl` with a `zBufferTexture` read and
`dists.y = min(zdepth, dists.y);`. Page 14 writes the identical clamp by hand
with an offscreen target and a reconstructed view distance. Neutralising that
one vtk.js line drives its occlusion ratio to 1.00, symmetric with deleting
page 14's `tFar = min(tFar, opaqueViewZ / rayViewZ)`.

So the burden difference is **vendored versus hand-written** — a
maintenance-burden fact, not an architectural one. **Do not write that vtk.js
needs no depth prepass.** Both pages run one.

### The TypeScript line counts include comments, and that is a third of them

Measured by the script: **570 of page 13's 1,659 non-blank lines (34%)** and
**860 of page 14's 2,447 (35%)** are comments, by a deliberately crude and
stated rule — a line whose trimmed form begins with `//`, `/*`, `*` or `*/`.

Both pages are commented at nearly the same rate, so the comparison between them
survives; but neither figure is a count of *code*, and a reader sizing the
maintenance burden from the raw line count would be over-reading it by about a
third on both sides.

### Data copies into renderer format

Counted by inspection, listed so the count can be disagreed with rather than
taken:

- vtk.js, 3: `triangleCells()` restates each mesh's index buffer as VTK's
  `[3, a, b, c]` cell array (`pages/13-vtkjs-scientific/main.ts:155`), applied to
  terrain and buildings; `polylineCells()` does the same for the streamlines
  (`:183`). The grids themselves are wrapped by `vtkDataArray` without copying.
- Three.js, 2: the streamline `LineSegments` index array
  (`pages/14-threejs-scientific/main.ts:439`), and a per-vertex colour attribute
  for the streamlines (`:1474`), which exists because Three.js has no scalar
  lookup table — vtk.js colours the same lines through a transfer function with
  no per-vertex copy. Positions, indices and grid data are handed to
  `BufferAttribute` / `Data3DTexture` by reference.

Both pages additionally build one `Float32Array` per slice-plane rebuild and
decode the heat grid from its fetched bytes; those are equal on both and are not
counted as a difference.

### API stability

Both counts are quoted from the pages' own runtime probes
(`window.__bench.probe.apis`), not from a reading of the import lines, so the
table and the running page cannot disagree.

vtk.js: **13** entry points, all public `@kitware/vtk.js/<Module>` paths, plus
two rendering-profile side-effect imports. Nothing private, nothing
experimental.

Three.js: **21** entries — 19 classes from the versioned package plus **two
`three/addons/*` modules** (`controls/OrbitControls.js`,
`shaders/VolumeShader.js`). Three's addons are not covered by the same stability
guarantee as the core package.

`VolumeShader` was absent from that probe until this measurement read it back
and found the list disagreed with the page's own imports: the page imports
`VolumeRenderShader1` and reads its `vertexShader`/`fragmentShader` in
`glslOverlap()`, so it is an entry point the page uses by any reading, and a
burden list that omitted it was the measurement flattering the page. It has been
added. Page 13 needed no counterpart change — `VTK_APIS` was already exact, and
vtk.js has no addon tier here.

Beyond imports, page 14 depends on two things that are internal rather than
public API:

1. `#include <packing>`, which resolves against Three.js's internal
   `ShaderChunk` library at compile time.
2. `WebGLRenderer`'s multisample-resolve behaviour — that
   `updateMultisampleRenderTarget` blits depth into the single-sample
   framebuffer whose depth attachment is the `DepthTexture`, and that
   `resolveDepthBuffer` defaults true. This is relied on, and it was established
   by **measurement, not documentation**. Believing the opposite once cost this
   spike a spurious 12% frame-time difference that was the page's own doing.

---

## Correctness: what the 23 assertions are, and what they are not

The cross-renderer suite (`tests/scientific.spec.ts`) contains **130
assertions**. They are not equal in weight, and the correctness row above cites
only the **23 that are genuinely cross-renderer**:

| Class | Count | May it be quoted as "the renderers agree"? |
|---|---|---|
| Genuinely cross-renderer | **23** | **Yes** |
| `src/lib` invariants | 9 | **No** — both pages call the same shared function, so these compare `src/lib` with itself and cannot fail unless `src/lib` is edited |
| Single-page checks | 72 | No — each holds on one page independently |
| Page-drift guards | 26 | No — these compare the two *pages*' controls and readouts, not the two renderers |

The two loads the correctness claim actually rests on:

- **Picking** — a 20-ray sweep at fixed fractions of the pinned surface under
  `orbit-v1`'s own pose, `vtkCellPicker` over the polydata's cell data against
  `Raycaster.faceIndex` over the shipped `cellObjectIndex`. Two independent
  intersection implementations, one index space. **This is the camera evidence.**
- **GPU-sampled values** — 18 probes (3 world points x 3 data cases x 2 colour
  windows), each renderer's own shader read out of its own texture upload and
  written into its own drawing buffer, compared against CPU truth. Worst channel
  delta of 1/255 on both. **This is the numerical evidence.**

**The invariants block and the camera block must not be quoted as "the renderers
agree".** The camera numbers in particular are not comparable in absolute scale
between the pages: vtk.js's `getProjectionMatrix` returns an unnormalised matrix
(396.5 / 1031.6 where Three.js returns 1.43 / 3.73 for the same 30-degree
vertical field of view). Only their ratio — the aspect ratio — is comparable,
and that is what the suite compares.

**The occlusion pins are a regression gate, not a physical law.** The detection
threshold is 4–5 m of depth error, measured on two engines.
`OCCLUSION_CROSS_PAGE = 1.20` has the narrowest window of the three and will
flake first on other hardware.

---

## Browser coverage

The cross-renderer suite runs on **chromium and firefox**; all 54 tests pass.
Every timing number in this document is **chromium only** — a frame time
measured on two different browsers' software rasterizers is two measurements,
not one.

**WebKit is untested, and the reason is recorded rather than the gap being
quietly narrowed:** WebGL2 3D textures under WebKit's software rasterizer are
the most likely thing to fail for reasons that have nothing to do with either
renderer, and this spike decides vtk.js versus Three.js, not browser support.
Any conclusion drawn from this document is qualified to chromium and firefox,
not to "browsers".

---

## What is unavailable, and why

Marked as unavailable rather than omitted, and never as zero.

| Measurement | Status | Why |
|---|---|---|
| Frame time on GPU hardware | **not measured** | every number here is ANGLE/SwiftShader. Nothing in this spike measured a real GPU, so nothing here predicts one. |
| WebKit, any measurement | **not measured** | out of scope, see above |
| `performance.memory` on firefox | **null, not 0** | firefox does not expose it. Recorded only where present; never a reason to fail a browser. The chromium values are quantised by the browser and are a coarse comparison, not a precise one. |
| vtk.js GPU float readback (`gpuSampleFloat`) | **null on page 13** | vtk.js 36.12.1 uploads its volume texture inside `vtkOpenGLVolumeMapper` and exposes no supported way to read a sampled float back. The comparable evidence on both pages is the rendered pixel. |
| Three.js library-owned world→value sample (`librarySample`) | **null on page 14** | `vtkImageData.getScalarValueFromWorld` is a second, library-owned implementation; Three.js ships nothing of the kind, which is why page 14's axis-order evidence is a GPU round trip instead. |
| Renderbuffer counts in `ScientificProbe.resources` | **published beside it** | the shared contract declares five keys and does not include renderbuffers. Both pages publish all four GL object types under `window.__bench.probe.glObjects`; widening the shared type is logged as outstanding work. |

---

## Task 9 reads this table

Task 9 applies the decision rule. Everything it needs is above; nothing needs
re-measuring. If a number here is wrong, the way to show it is another
measurement, not another reading.
