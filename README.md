# engine-bench

Screen-shareable evidence for the 2026-09-03 DTCC briefing "Two Threads, One Blocker":
the MapLibre + deck.gl recommendation, its two limitations, the priced fixes, and the
rejected engines — each as a page you can look at.

Everything is synthetic and runs offline. One `src/lib/scene.ts` defines a hill, six
blocks and a temperature field; every page draws that same scene in its engine.

## Run

    bun install                 # also copies Cesium's assets to public/cesium
    bunx playwright install chromium   # once, before the first test run
    bun run generate            # "the pipeline": writes public/data/*
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

## Pinned versions

maplibre-gl 5.24.0 (not 6.x — see NOTES.md), deck.gl/luma.gl 9.4.0, three 0.185.1,
cesium 1.145.0, @kitware/vtk.js 36.12.1, playcanvas 2.22.0.

## Pages

See `/00-index/` in the running app; the same table is in
`../docs/superpowers/specs/2026-09-08-engine-bench-design.md` §8 in the workspace.

## Findings that differ from the briefing

See `NOTES.md`. Anything there is a correction owed to the briefing.
