# engine-bench

Screen-shareable evidence for the 2026-09-03 DTCC briefing "Two Threads, One Blocker":
the MapLibre + deck.gl recommendation, its two limitations, the priced fixes, and the
rejected engines — each as a page you can look at.

**Live: <https://sarmatas00.github.io/engine-bench/00-index/>** — no install, both datasets.
Add `?dataset=real` to any page for the Gothenburg tile.

Two datasets, one switch. `?dataset=synthetic` (the default) draws the controlled scene from
`src/lib/scene.ts`: a hill, six blocks, a formula temperature field, all offline. `?dataset=real`
draws a 500 m Gothenburg tile built by `dtcc_core` with a steady-state urban-heat field solved by
`dtcc-sim` in Docker. Every page works on both; the smoke test runs both and skips the real half,
with a printed reason, when the real dataset has not been generated.

## Run

    bun install                 # also copies Cesium's assets to public/cesium
    bunx playwright install chromium   # once, before the first test run
    bun run generate            # "the pipeline": writes public/data/synthetic/*
    portless engine-bench bun run dev
    bun run test                # unit tests, then builds, opens every page headless, screenshots to screens/
    uv venv --python 3.11 .venv                                  # real-data pipeline, once
    uv pip install --python .venv/bin/python -e ../dtcc-core pytest
    .venv/bin/pytest scripts/real/tests                          # Python unit tests
    bunx tsc --noEmit -p tsconfig.json   # typecheck

    # real dataset (needs Docker for the field)
    .venv/bin/python scripts/real/stage1_build.py   # tile: terrain, meshes, footprints
    scripts/real/stage2_sim.sh                      # urban-heat solve in dtcc-sim:local
    .venv/bin/python scripts/real/sample_field.py   # round trip + sample onto the ground mesh
    bun run generate:real                           # glTF assembly
    # then open any page with ?dataset=real

## Deploy

    bun run build:pages    # same build, with PAGES_BASE=/engine-bench/

Every absolute path goes through `assetUrl` (`src/lib/dataset.ts`), which prefixes
`import.meta.env.BASE_URL`. That is `/` for `dev`, `preview` and the test suite, and
`/engine-bench/` only under `build:pages`, so hosting cannot drift the local numbers.
Publish the resulting `dist/` to the `gh-pages` branch.

`dtcc-sim`'s own `Dockerfile` (`~/Projects/dtcc/dtcc-sim`) does not build as shipped on an Apple
Silicon machine under `--platform linux/amd64` — see `NOTES.md` under `## Findings` for the full
diagnosis. Until DTCC fixes it upstream, build with two one-line patches: add `binutils` to the
`mamba install` line (conda-forge's `compilers` metapackage has no plain `ar` on `PATH`, so CMake's
archive step execs the literal string `CMAKE_AR-NOTFOUND`), and cap build parallelism before
`pip install -e ".[service]"` (`ENV CMAKE_BUILD_PARALLEL_LEVEL=2` / `ENV MAKEFLAGS=-j2` — an
unbounded emulated C++ build otherwise fans out to more concurrent compiles than this Mac's Docker
VM can hold in memory). Patch without modifying the `dtcc-sim` clone, e.g. via `docker build -f -`
on a patched copy of the Dockerfile piped to stdin, then tag it `dtcc-sim:local` so
`scripts/real/stage2_sim.sh` picks it up.

## Datasets

`public/data/` is generated, never committed. `?dataset=` picks which half a page reads.

**Synthetic** — one command, no network, no Docker:

| command | writes |
| --- | --- |
| `bun run generate` | `public/data/synthetic/`: `blocks.glb`, `blocks-draped.glb`, `field.glb`, `field-baked.glb`, `field.grid.f32`, `field.grid.json` |

**Real** — the Gothenburg tile `gothenburg-skansen-kronan`, 500 m box in EPSG:3006, run in this order:

| command | writes |
| --- | --- |
| `.venv/bin/python scripts/real/stage1_build.py` | `public/data/real/`: `dataset.json` (tile bounds, origin, anchor, relief), `terrain.tif`, `terrain.json`, `terrain-rgb.png`, `basemap.png`, `footprints.geojson`, and the `ground` / `buildings` / `buildings-flat` mesh pairs (`*.mesh.json` + `*.mesh.bin`) |
| `scripts/real/stage2_sim.sh` | `public/data/real/`: `heat.xdmf` + `heat.h5` (the `dtcc-sim` urban-heat volume solve), `heat.pre.f64` (the field as the container held it, before saving), `heat.meta.json` (solver args and the `dtcc-core` revision that produced them). Needs Docker and the `dtcc-sim:local` image |
| `.venv/bin/python scripts/real/sample_field.py` | measures the dtcc-core#85 volume-mesh round trip into `dataset.json` (`stage2.roundtrip`) and `NOTES.md`, then samples the field onto the ground mesh: `field.mesh.*`, `field-baked.mesh.*`, `field.grid.f32`, `field.grid.json`, `field.json` (the 2nd/98th-percentile colour range). Re-runnable: it replaces its `NOTES.md` bullet in place rather than appending a second one |
| `bun run generate:real` | glTF assembly from the mesh pairs: `public/data/real/blocks.glb`, `blocks-draped.glb`, `field.glb`, `field-baked.glb` |

Stage 2 is optional. Without it `dataset.json` has no `stages.stage2`, the six field pages
(04, 07, 08, 10, 11, 12) say so on screen instead of drawing another dataset's numbers, and
`bun run test` skips them on `?dataset=real` with that reason printed.

## Scientific visualization: vtk.js against Three.js

Pages **13** (vtk.js 36.12.1) and **14** (Three.js 0.185.1) draw the same scene — the real
Gothenburg terrain and buildings, a **synthetic** smoke field as a volume, a slice plane and
dtcc-core's streamlines, with the volume occluded by the city. Same artifacts, same bundle,
same shared probe and benchmark code, drawing surface pinned to 1280x720 for every timed frame.
**Neither page is a product architecture.** They are measurement rigs built to be compared with
each other, and they carry verification scaffolding no shipping page would.

- **The evidence:** `docs/scientific-visualization-measurements.md`. It chooses nothing; it
  records what was measured, on what surface, with what spread, and what could not be measured.
  `bun run measure:scientific` regenerates the **software-rasterizer** sections. It does not
  regenerate the GPU-hardware pass (driven live through a browser; its raw samples were not
  kept) or the VTK.wasm probe, and the document says so in both places.
- **The decision:** `NOTES.md`, "The decision rule, applied". Correctness rejects neither path
  (23 genuinely cross-renderer assertions agree — not the 127 the suite contains). Sustained FPS
  rejects neither (126.6 - 163.9 FPS on ANGLE Metal / Apple M4; the 3.2 - 5.9 figures elsewhere
  in the evidence document are software rasterization and say nothing about either library).
  The choice is decided on maintenance burden.
- **There is no frame-time winner**, on either surface, and the sign of the gap is not stable.
  Anything that reads a speed ranking out of these pages is reading noise.

`spikes/vtk-wasm/` is a separate time-boxed companion probe — **FEASIBLE FOR FURTHER
EVALUATION** — whose verdict is an input to that decision and whose numbers are not: it ran on
different hardware from the comparison, and nothing ranked it against the two measured paths.

## Pinned versions

maplibre-gl 5.24.0 (not 6.x — see NOTES.md), deck.gl/luma.gl 9.4.0, three 0.185.1,
cesium 1.145.0, @kitware/vtk.js 36.12.1, playcanvas 2.22.0.

## Pages

See `/00-index/` in the running app; the same table is in
`../docs/superpowers/specs/2026-09-08-engine-bench-design.md` §8 in the workspace.

## Findings that differ from the briefing

See `NOTES.md`. Anything there is a correction owed to the briefing.
