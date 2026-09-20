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
| Sessions | seven (A, B, D, E, G on this machine; C and F by an independent reviewer). **E is the record**; all seven are tabulated under "Frame time". |
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

**The gap between the two renderers changes sign between sessions.** Seven
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

---
---

# APPENDED SECTION — VTK.wasm feasibility probe (not part of Task 8)

> **Everything below this line was added by the VTK.wasm feasibility probe, a
> separate time-boxed companion to this spike. Nothing above it was edited.**
>
> **It is not a third contender and it is not an input to Task 9.** The probe
> answers one question — can current VTK.wasm load this repo's neutral artifacts
> and draw one city-plus-scientific view in one canvas — and it does not reopen
> the vtk.js versus Three.js comparison the rest of this document measures.
> Neither of those paths failed, so there is nothing here to rescue.
>
> **These numbers do not belong in any table above.** Every frame time in this
> document is ANGLE/SwiftShader software rasterization, as its own "what is
> unavailable" section states. The probe ran on ANGLE Metal on an Apple M4.
> Comparing them is a category error, not a close call.
>
> Full record, including the anti-coincidence tests and the negative control:
> `spikes/vtk-wasm/README.md`. Re-runnable source: `spikes/vtk-wasm/probe.{html,ts}`.

**Verdict: FEASIBLE FOR FURTHER EVALUATION.** Every one of the eleven success
assertions passed, twice — once in the working environment and once from a clean
install, with a bit-identical frame.

Probed on 2026-09-19 with `@kitware/vtk-wasm@3.0.4` (the plan's baseline, which
does exist on the registry; `latest` was 3.0.5) driving runtime bundle
`vtk-wasm32-emscripten.tar.gz` sha256 `79ae16e4…c031e`, self-identifying as VTK
`9.7.20260913`. Browser: ego lite 0.5.0.32 (Chromium), macOS 15.5 arm64.
Elapsed: **11 min 2 s** of a 4-hour box.

| Measurement | Value | How it was taken |
|---|---|---|
| Runtime initialization | **471.7 ms** (103.0 ms fetch over localhost + 368.7 ms gunzip/untar/compile/instantiate) | `t0` recorded *before* the first runtime byte was requested; the fetch split cross-checked against the tarball's `PerformanceResourceTiming` entry |
| Session creation | 58.4 ms | `runtime.createStandaloneSession()` |
| First rendered frame | **1686.6 ms** after `t0` | includes artifact fetch+verify (333.9 ms), scene construction, and a 650 ms first render (shader compile + volume texture upload) |
| Transferred runtime bytes | **12,734,721 B** wire, **87,326,720 B** decompressed | one request; `transferSize` / `decodedBodySize`. The `.wasm` alone is 84,487,981 B. The npm package (432 KB) contains no `.wasm`. |
| Transferred artifact bytes | 2,730,359 B across 10 requests | counted separately so the runtime figure is not inflated by the data |
| `render()` submit time | median **1.4 ms**, p95 9.9 ms (30 camera steps) | synchronous cost of `render()` returning — **not** a frame time |
| Presented frame interval | median **16.7 ms**, p95 33.4 ms (40 frames) | measured across `requestAnimationFrame`; vsync-locked at 60 Hz |
| Backend that actually ran | `vtkWebAssemblyOpenGLRenderWindow`, `getRenderingBackend()` → `OpenGL2`, live context `WebGL 2.0 (OpenGL ES 3.0 Chromium)` on `ANGLE (Apple, ANGLE Metal Renderer: Apple M4)` | read off the render window's own class and the live canvas context, not off a capability string |
| Teardown | session **released** (post-dispose calls throw `Cannot pass deleted object as a pointer of type vtkStandaloneSession*`); wasm heap **not** returned (20,185,088 B before and after); WebGL context **never** lost, even after `runtime.dispose()`; `StandaloneSession.dispose()` leaves the canvas in `specialHTMLTargets` | measured after each of `finalize()`, `session.dispose()`, `runtime.dispose()` |

Artifact verification, the same contract the rest of this document is built on:
all 10 files (`scientific-manifest.json`, `scientific.bin` and its 8 declared
dependencies) byteLength- and SHA-256-verified through this repo's own
`src/lib/scientific-data.ts` **before** the first VTK object existed
(validated at 421.2 ms, first VTK object at 964.0 ms). A negative control with
one byte of `scientific.bin` flipped was rejected —
`sha256 mismatch -- manifest says f4ab6c11… file hashes to 78989a80…` — so the
ordering assertion rests on a check that is load-bearing.

Both halves of the scene were confirmed to draw by rendering the false case and
diffing pixels, not by looking at a screenshot: an empty renderer gives 1
distinct colour and 0 non-background pixels; removing the volume changes 159,010
pixels; removing the city changes 63,796.

The probe added **no dependency to this repo**: `@kitware/vtk-wasm` lived only in
`mktemp -d` directories, and `git diff --stat` shows no change to `package.json`
or `bun.lock`.

---
---

# APPENDED SECTION — GPU-hardware pass (Task 9, Step 1a)

> **Everything below this line was added by Task 9. Nothing above it was
> edited.** The 572 lines above this marker are byte-identical to their state at
> commit `352b07e`, and the check is self-contained:
> `head -c 33923 docs/scientific-visualization-measurements.md | shasum -a 256`
> must still print
> `659ee99602b4f189cb45de8e0d8f48095429ef332c9cb4fbc6d6f19918b14d92`.
>
> **No number here is comparable with any number above.** Everything above is
> ANGLE/SwiftShader software rasterization, as this document's own surface row
> says. Everything below is ANGLE Metal on an Apple M4. Putting a 5.4 ms frame
> time beside a 158.4 ms one is the category error the VTK.wasm section names,
> which is why this pass gets its own surface row instead of a column in the
> evidence table.
>
> **Why it exists.** The decision rule Task 9 applies rejects sustained FPS
> below 20. Every FPS figure above is 3.2-5.9 and all of it is software
> rasterization, so running that gate on those figures would reject both paths
> on evidence about neither — the same category error as the 12% MSAA phantom,
> one level up. The user decided on 2026-09-20 to give the gate a real input
> rather than skip it or apply it literally. This section is that input.

## The GPU measurement surface. Quote it with every number below.

| | |
|---|---|
| Browser | **ego lite 0.5.0.32 (Chromium)**, driven through `/ego-browser`; a real window with a real GPU process, not headless |
| Rasterizer | **ANGLE Metal — hardware.** Unmasked renderer, read off the page's own live context after the run: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`, `WebGL 2.0 (OpenGL ES 3.0 Chromium)`, vendor `Google Inc. (Apple)` |
| Backend, read off what ran | the unmasked renderer string above and `EXT_disjoint_timer_query_webgl2` **present and returning samples** on all 18 runs — not a capability string, and not `gl.getSupportedExtensions()` |
| Harness viewport | 1280x800 CSS, `deviceScaleFactor` 1, pinned with `Emulation.setDeviceMetricsOverride` |
| Benchmark drawing buffer | **1280x720, asserted per run from `probe.renderSurfaceBenchmark`, not trusted.** All 18 runs recorded `phase: "benchmark"`, 1280x720 |
| Camera path | `orbit-v1` — the same 30 unrecorded warmup frames then 180 forced frames the software pass used |
| Runs | 3 cold page loads per page per session, **interleaved** vtk.js, Three.js, vtk.js, Three.js, vtk.js, Three.js. A cold *page load*, not a cold browser context — the software pass used `browser.newContext()`; this pass navigates the same tab, which destroys the GL context and the JS heap but not the browser process. Stated because it is a difference. |
| Sessions | **three: H1, H2, H3.** H3 also ran the resize sweep and the 100 control cycles, so H3 is the only session whose runs went through `judgeRun` in full |
| Machine | one Apple M4, macOS 15.5 arm64 |
| Date of record | 2026-09-20 |

**One machine, one browser engine, one day.** Nothing below supports a claim
about "GPUs", about "browsers", or about any hardware but this one.

### Which gates each run passed

H3's six runs were handed to `judgeRun` with a real `resourceGrowth` record and
**all six were accepted, none rejected.** H1's and H2's twelve runs ran the
benchmark half of the protocol only, so they passed the gates that half can
answer — `status: ready`, `measurementValid`, exactly 180 finite non-negative
CPU samples, a p50 above the clock floor, a benchmark-phase 1280x720 surface,
`gpuSampleStats` published, and a GPU rejection rate under 10% — and **did not
run the resource-growth stability gate**, because no control cycles were driven
in those sessions. Said rather than left to be assumed: 6 of the 18 runs are
fully gated, 12 are gated on everything except resource stability.

GPU sampling: 16 of the 18 runs kept 180 of 180 samples; two kept 179 of 180, a
0.56% rejection rate against the 10% ceiling.

**No raw record was kept for these 18 runs, and that is a gap.** Every
SwiftShader session above is archived as JSON under `.cache/sessions/`, so any
figure in those tables can be re-derived from its 3,240 underlying samples. The
Metal pass was driven live through a browser rather than through
`measure:scientific`, and only the per-run values transcribed into the table
below survive. Every published Metal figure recomputes from that table — the
medians, the gaps, the spreads and all 18 FPS values were re-derived from it
during review — but **the underlying samples are gone**, which means the
distinct-clock-value count in the quantisation note cannot be re-checked by
anyone. It is stated here rather than discovered later. These are the numbers
gate 2 consumes, so they deserve the same auditability as the rest of this
document and do not yet have it; wiring the hardware pass through
`measure:scientific` would close it.

## Frame time on the GPU: still no winner, and now the two clocks disagree

| Session | Page | CPU p50 median | CPU p95 median | CPU min median | CPU max, per run | GPU-timer p50 median |
|---|---|---|---|---|---|---|
| H1 | vtk.js | **5.40 ms** (6.00 / 5.40 / 5.40) | 7.10 (7.40 / 6.50 / 7.10) | 3.90 (4.40 / 3.90 / 3.90) | 9.20 / 8.20 / 21.20 | 5.58 (5.75 / 5.57 / 5.58) |
| H1 | Three.js | **5.00 ms** (5.60 / 5.00 / 5.00) | 6.80 (7.20 / 6.10 / 6.80) | 3.80 (3.90 / 3.10 / 3.80) | 13.50 / 7.10 / 12.00 | 6.31 (6.84 / 6.31 / 6.17) |
| H2 | vtk.js | **5.50 ms** (5.50 / 5.30 / 6.20) | 7.70 (7.90 / 6.40 / 7.70) | 4.20 (3.90 / 4.20 / 4.20) | 12.60 / 15.00 / 15.30 | 5.60 (5.60 / 5.56 / 5.73) |
| H2 | Three.js | **5.70 ms** (5.30 / 5.70 / 5.70) | 7.30 (7.30 / 7.20 / 7.50) | 3.90 (3.80 / 3.90 / 3.90) | 10.10 / 8.40 / 8.60 | 6.80 (6.40 / 6.81 / 6.80) |
| H3 | vtk.js | **6.00 ms** (6.00 / 5.90 / 6.10) | 7.50 (7.60 / 7.30 / 7.50) | 4.00 (4.00 / 4.00 / 4.00) | 8.90 / 14.70 / 13.40 | 5.73 (5.66 / 5.82 / 5.73) |
| H3 | Three.js | **5.40 ms** (5.60 / 5.20 / 5.40) | 7.10 (7.10 / 7.30 / 7.00) | 3.80 (3.80 / 3.70 / 4.00) | 7.90 / 27.50 / 12.40 | 6.69 (6.84 / 6.69 / 6.55) |

**The cross-renderer CPU p50 gap spans 3.6-11.1%, the within-condition spread
spans 3.4-17.0%, and the sign reverses in one session of three.** H1 and H3 put
vtk.js behind by 8.0% and 11.1%; H2 puts Three.js behind by 3.6%. Published as
ranges, per this spike's rule, because a ratio of two extremes lurches as
sessions accumulate.

That is the same shape the software pass measured (gap 2.0-7.1%, spread
0.4-9.6%, sign reversed in one session of seven), reached independently on a
different rasterizer. **The answer is the same and it is not a coincidence of
surface: there is no frame-time winner on this scene, and the sign of the gap is
not a property of either renderer.**

Two things make that conclusion stronger here than it was on SwiftShader, and
both are reasons to be *less* willing to read a direction, not more:

- **The CPU clock and the GPU timer point in opposite directions, on the same
  runs.** The CPU p50 puts vtk.js slower in two sessions of three. The GPU timer
  puts **Three.js** slower in **all three**, by 13.1%, 21.4% and 16.8%. On
  SwiftShader the two clocks agreed to within 0.3 ms because the "GPU" was the
  same CPU; on real hardware they are two measurements of different things — the
  CPU clock times the JavaScript call that submits and waits, the GPU timer times
  the command stream — and they disagree about which page is ahead. A published
  direction would have to pick one clock and suppress the other.
- **The measurement is near the clock's resolution.** `performance.now()` here
  quantises to 0.1 ms: pooling all 3,240 CPU samples, the **distinct clock values
  — that is, after rounding to the 0.1 ms grid — number about 85**, and the
  smallest non-zero step between them is exactly 0.100 ms. (Stated as a grid
  count on purpose: the raw float64 values carry sub-nanosecond jitter around
  each grid point, so a raw distinct-value count is larger and means nothing.
  An independent re-measurement of 720 fresh samples found every one within
  1.9e-7 ms of a grid point.) Against a ~5.5 ms p50 one quantum is about 1.8%,
  so the whole 3.6-11.1% gap band is **two to six clock quanta**. The software
  pass had ~150 ms frames and no such problem; this one does, and it is a
  property of measuring a fast frame, not of either page.

#### The GPU timer passes this document's own winner test. It is still not promoted.

Stated here rather than left for a reader to rediscover, because anyone who
recomputes from the table above will find it:

| clock | gap per session | within-condition spread | sign |
|---|---|---|---|
| CPU p50 | 8.0 / 3.6 / 11.1% | 3.4 - 17.0% | reverses in H2 |
| **GPU timer** | **13.1 / 21.4 / 16.8%** | **2.8 - 10.9%** | **Three.js slower in all three** |

The rule this spike works to is: do not declare a winner unless the
cross-renderer gap exceeds the within-condition spread. On the CPU clock it does
not, and no winner is declared. **On the GPU timer it does, in every session,
with a sign that never reverses.**

Three reasons it is still not promoted to a result:

1. **It measures a different quantity.** The GPU timer times the command stream;
   the CPU clock times the call that submits and waits. A page can be ahead on
   one and behind on the other without either being wrong.
2. **It is not what the decision rule consumes.** Gate 2 is minimum sustained
   FPS, defined as `1000 / p95` of wall-clock frame time. Swapping in a different
   clock to obtain a direction would be choosing the measurement by its answer.
3. **The direction it shows favours vtk.js, which this document's conclusion
   already recommends on other grounds.** That is exactly why it is written down
   instead of quietly used: a suppressed result that agrees with the
   recommendation is the one most worth exposing, and the recommendation
   deliberately does not rest on it.

### Minimum sustained FPS on the GPU — the number the decision rule consumes

Same definition as above: `1000 / p95`, the rate held for 95% of frames, at
1280x720, `orbit-v1`.

| | vtk.js 36.12.1 | Three.js 0.185.1 |
|---|---|---|
| Min sustained FPS, **range over 9 runs each** | **126.6 - 156.3** | **133.3 - 163.9** |
| Per session (3 runs each) | H1 135.1 / 153.8 / 140.8 · H2 126.6 / 156.3 / 129.9 · H3 131.6 / 137.0 / 133.3 | H1 138.9 / 163.9 / 147.1 · H2 137.0 / 138.9 / 133.3 · H3 140.8 / 137.0 / 142.9 |
| `classifyFps` verdict | **`meets-target` on all 9 runs** | **`meets-target` on all 9 runs** |

**Across all 18 runs the range is 126.6-163.9 FPS.** Published as a range rather
than a median, because a single figure here would be exactly the number that is
right only by coincidence of when it was taken.

Against the spec's bands — at least 30 FPS is the target, sustained below 20 FPS
fails the interactive-MVP requirement — **every run on both renderers is
`meets-target`, by a factor of four or more.** This says nothing about which
renderer is faster (see above); it says that on this machine, this scene at this
surface is not near the gate in either library. It is also six times above the
target, which is the margin that matters for reading it forward to weaker
hardware: a GPU four times slower than an M4 would still clear 30 FPS on this
scene.

**What this row does not establish.** It is one GPU, one browser engine, one
scene, one surface, one day. It does not predict an integrated GPU, a 4K
surface, a larger grid, a scene with more geometry, or WebKit. It replaces the
software FPS row as the *decision rule's input* and replaces nothing else in this
document.

## Two results from the software pass reproduce on hardware, and one artifact disappears

Measured in session H3, which ran the full protocol — 8 drawing-buffer resizes
then 100 control cycles with no resize, on each of six runs.

- **Resource stability holds.** Over 100 control cycles with no resize, both
  pages moved **0** on all six counters, on all six runs. Same as SwiftShader.
- **The vtk.js resize growth reproduces, on hardware, for the first time.** Over
  8 drawing-buffer resizes: vtk.js **+8 textures, +8 framebuffers, +8
  renderbuffers**, one of each per resize, identical on all three of its runs;
  Three.js **0, 0, 0**. This is now reproduced in seven sessions, six of them
  software and this one hardware. It is a library property, not a rasterizer one.
- **The tens-of-seconds first resize does not exist here.** The "harness
  property, belonging to neither renderer" section above records a first resize
  taking 49.3-61 s on both pages under SwiftShader while every later one took
  0.25 s. On Metal, across **48 resizes** (8 per run, 6 runs, both pages), every
  wait was between **0.26 s and 1.06 s** — measured with the same 250 ms polling
  the software harness uses, so the figures are poll-granular and the true waits
  are at or below them. Removing the software rasterizer removes the stall, which
  is the confirmation that section's attribution was right: it was a queue drain,
  not a renderer.

## The cross-renderer suite, re-run on ANGLE Metal

The 13-test cross-renderer suite (`tests/scientific.spec.ts`) was re-run against
the real GPU using a temporary, **gitignored** Playwright config that differs
from `playwright.config.ts`'s chromium project only in its launch flags
(`--use-gl=angle --use-angle=metal --enable-gpu --ignore-gpu-blocklist` in place
of the SwiftShader flags). **All 13 passed.** Notable, because the document above
warns that the occlusion pins are a regression gate rather than a physical law
and that `OCCLUSION_CROSS_PAGE = 1.20` "will flake first on other hardware":

- Occlusion ratios on Metal: vtk.js 1.66 / 1.31 / 1.31 / 1.55 (mean 1.46),
  Three.js 2.22 / 1.43 / 1.49 / 1.84 (mean 1.75), cross-page **1.20** against the
  1.20 pin and its ±10% window. **Identical to the SwiftShader figures at two
  decimal places.** The pin did not flake; the warning stands anyway, because one
  more GPU is not "other hardware" in general.
- GPU-sampled slice colour, 18 probes: worst channel delta **1 of 255** on both
  renderers, the same as software.
- Picking, driven live through `/ego-browser` on the same hardware rather than
  through Playwright: 20 rays under `PICK_POSE`, **17 hits and 3 misses on both
  pages**, zero disagreements on hit, cell id or marker, and a worst
  intersection-point separation of **1.2e-11 m** against the suite's 0.05 m
  bound.

**One trap worth recording, because it is this spike's defect in its purest
form.** The first attempt at this hardware suite run simply removed the
SwiftShader flags, on the assumption that a flagless chromium would use the GPU.
All 13 tests passed — and the run was still SwiftShader. It was caught by the
suite's own frame-time line reading 157.6 / 160.0 ms when the `/ego-browser` pass
on the same machine had just measured 5-6 ms, then confirmed by reading the
unmasked renderer under three flag sets: flagless headless chromium reports
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device ...))`, identical to the
explicit SwiftShader flags. **A green suite is not evidence of the surface it ran
on.** Explicit `--use-angle=metal --enable-gpu` was required, and the backend was
read off the renderer string afterwards rather than assumed from the flags.

## Live verification (Step 4), on the same hardware

Both pages, driven through `/ego-browser` at the GPU surface:

- **Every control exercised.** Each page exposes 8 interactive elements: the
  `data-case` select (3 options), the `slice-z`, `range-low`, `range-high` and
  `opacity` ranges, the `streamlines` checkbox, the `camera-reset` button and the
  index link. Every range was driven to its minimum, maximum and midpoint, the
  checkbox through all four transitions, every select option selected, and the
  button clicked — 21 recorded states per page — on top of the **600 deterministic
  control cycles per page** the H3 stability sweep drove.
- **Console and network are clean.** 0 `console.error`, 0 `console.warn`, 0
  `window.onerror`, 0 unhandled rejections, 0 non-2xx responses and 0 zero-byte
  resources, on both pages, across every run of every session — collected by a
  listener installed with `Page.addScriptToEvaluateOnNewDocument` **before** any
  page script, and reported beside a run that reached its terminal state, so "0
  errors" cannot mean "nothing ran".
- **Live probe values match the record.** Page 14's `glslBurden`, read off the
  running page on Metal, is `144` non-blank / `128` compiled / **`85` distinct** /
  `11` textually identical to the stock addon / **`0`** reused verbatim — the
  document's figures exactly. `probe.apis` reads **13** on page 13 and **21** on
  page 14, matching the table. Page 13 publishes no `glslBurden` at all, which is
  what "0 lines, 0 shaders" means in practice.
- **One false finding, rejected by measurement.** A first picking pass dispatched
  synthetic `MouseEvent`s for `pointerdown`, and both pages logged 15
  `NotFoundError: Failed to execute 'setPointerCapture'`. The count was identical
  on both pages and equal to the number of synthetic clicks, which is the
  signature of a harness artifact rather than a page defect; re-run with real CDP
  mouse input the same clicks produced **0 errors** and a correct identity
  readout on both pages. Recorded rather than published, because a console error
  found live is a finding only after it survives being attributed to the tool
  that produced it.
