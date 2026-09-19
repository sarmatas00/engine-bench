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
| A7 | **Dispose releases the session.** | Calling `dispose()` and returning is not evidence of release. So: after dispose, a call that requires a live session must throw or report released, and the WebGL context must be reported lost/unavailable; both recorded with the actual error text. |
| A8 | **Initialization duration** is measured including Wasm fetch **and** compile. | A number that starts after `instantiate` is smaller and looks better. So: `t0` is taken before the first byte of the runtime is requested; the reported figure is split into fetch / compile+instantiate / first-frame, each from `performance` marks, and cross-checked against the Resource Timing entry for the `.wasm` request. |
| A9 | **Transferred bytes** of the runtime are recorded. | A number read off the package's unpacked size, or off `content-length` of one file, is not what the browser transferred. So: summed from `PerformanceResourceTiming.transferSize`/`encodedBodySize` for the runtime's own requests, listed per request, and separated from artifact bytes. |
| A10 | **No unhandled console or network failures.** | A page that logs nothing because nothing ran looks clean. So: an explicit `console.error`/`onerror`/`unhandledrejection` collector installed before load, plus a non-2xx response counter; both must report a count *and* the probe must have reached its final state, so "0 errors" cannot mean "0 work". |
| A11 | **First frame actually drew** the scene. | A first-frame timestamp taken after `render()` returns can precede any pixel, and an empty canvas produces a timestamp too. So: after render, read back pixels and require a non-background, non-uniform result — a canvas histogram with more than one distinct colour — before the frame counts. |

---

## Result

*(filled in below at the deadline or on completion)*
