# Scientific Visualization Decision Spike

Date: 2026-09-11
Status: Approved
Repository: `engine-bench`
Related issue: <https://github.com/dtcc-platform/dtcc-twin/issues/1>

## Purpose

Determine whether the DTCC Twin should use Three.js or a VTK-based browser
renderer as the owner of its main 3D scene. The decision must be based on a
combined city-and-simulation workflow, not isolated renderer features.

This is a decision spike. It produces evidence and a recommendation. It does
not select or begin a production Twin architecture by itself.

## Context

The current bench recommended MapLibre plus deck.gl because it was the
lowest-risk way to keep the existing map while adding 3D. It also proved two
limits of that arrangement:

1. MapLibre does not drape custom 3D layers over terrain.
2. Simulation values need renderer-specific shader or preprocessing work.

The ELEMENTS investigation showed a different arrangement: Three.js owns the
scene and the map is an optional texture inside it. Anders Logg then proposed
testing that arrangement against a VTK-based browser path, with DTCC Core and
Sim responsible for scientific processing.

The existing Three.js experiment ran inside MapLibre. It therefore does not
answer whether Three.js should own the complete scene.

## Approved Decisions

- Run a decision spike before considering a full prototype.
- Use real Gothenburg terrain and buildings.
- Use `dtcc_core.datasets.smoke` for the synthetic vector field, slice and
  streamlines.
- Retain the existing real urban-heat field as a second provenance check.
- Compare one Three.js-owned canvas with one vtk.js-owned canvas.
- Give VTK.wasm a separate four-hour feasibility probe. Do not make it a
  dependency of either main path.
- Publish measurements for Anders and the DTCC developers before proposing a
  full prototype.
- Request additional data from Anders only when the first measurements identify
  a precise missing case.

## Architecture

```text
dtcc-core / dtcc-sim
  |  canonical coordinates, units, fields and provenance
  v
browser artifact generation
  |-- scientific-manifest.json
  |-- regular-grid scalar and vector data
  |-- slice geometry and values
  |-- streamline geometry and per-vertex values
  |-- existing Gothenburg terrain and buildings
  v
shared TypeScript loader and validation
  |                         |
  v                         v
Three.js-owned scene        vtk.js-owned scene
one canvas                  one canvas
  |                         |
  +------------+------------+
               v
same probes, screenshots and performance measurements
               |
               v
evidence report -> DTCC feedback -> possible full prototype
```

### Component boundaries

DTCC Core owns scientific meaning. It produces the smoke field,
`FieldSlice`, `StreamlineCollection`, field names, components and units.

The artifact generator performs serialization and coordinate rebasing only. It
must not recompute or reinterpret the physical model.

The shared browser loader validates the artifact contract and exposes neutral
arrays and metadata. It must not contain Three.js or vtk.js objects.

Each renderer owns its scene, camera, picking and GPU resources. Neither path
may borrow the other renderer or use a second canvas to fake shared depth.

MapLibre is outside the rendering comparison. A future Twin may use it as a
separate geographic discovery and region-selection surface.

## Artifact Contract

The versioned manifest records:

- schema version;
- source repository revisions;
- EPSG:3006 and the shared local origin;
- real or synthetic data category;
- field names, components, associations, units and ranges;
- grid dimensions, spacing and axis ordering;
- stable building and scientific-object identifiers;
- artifact byte lengths and hashes;
- derivation links from browser artifacts to source DTCC objects.

The initial evidence set contains:

1. Existing Gothenburg terrain and building geometry.
2. A synthetic smoke field evaluated over the same physical bounds, carrying
   velocity, speed and pressure.
3. A DTCC Core `FieldSlice` and `StreamlineCollection` derived from that field.
4. The existing real urban-heat scalar and regular-grid artifacts.

Every UI surface must identify synthetic smoke as synthetic. It must not imply
that the field is a physically simulated Gothenburg wind result.

## Interaction Contract

Both paths implement the same user-visible workflow:

| Capability | Required behavior |
|---|---|
| City scene | Terrain and buildings aligned in one scene |
| Navigation | Orbit, pan, zoom and camera reset |
| Selection | Select a building and report its stable object ID |
| Scalar field | Values, units, legend and live color-range controls |
| Field probing | Click the field and report its value and world coordinates |
| Slice | Move a slice through the volume with one slider |
| Streamlines | Display and color DTCC Core's precomputed streamlines |
| Volume | Render a transparent volume with the city geometry |
| Occlusion | Buildings and scientific results share one depth model |
| Provenance | Clearly distinguish real heat from synthetic smoke |

## Correctness Gates

A path fails the spike if:

- it requires a second overlaid canvas;
- selection cannot return the corresponding DTCC object identifier;
- grid-node scalar probes are not bit-identical to the source float32 value, or
  interpolated probes differ by more than `1e-5 * max(field_span, 1)`;
- geometry and scientific results do not share a coordinate frame;
- fixed alignment probes differ by more than 5 cm after local-origin rebasing;
- depth or transparency places hidden results in front of occluding geometry;
- values, units or provenance are silently discarded;
- a required capability depends on a private renderer API.

An explicit, documented experimental API may be measured as a qualified result,
but cannot be presented as production-safe.

## Measurements

Run each path with identical artifacts, cameras, viewport sizes and hardware.
Record:

- cold load and time to first usable frame;
- steady and worst-case frame rate;
- browser memory where the platform exposes it;
- built JavaScript size and transferred artifact bytes;
- custom TypeScript and shader code added;
- number of renderer-specific adapters and data copies;
- public, experimental and private APIs used;
- Chrome, Safari and Firefox results;
- fixed numeric probe results;
- fixed-camera alignment, transparency and occlusion screenshots.

Record unsupported measurements as unavailable. Do not replace missing browser
instrumentation with estimates.

The target is at least 30 FPS on the current 500 m scene. Sustained performance
below 20 FPS fails the interactive-MVP requirement. Results between those values
remain comparative evidence.

Correctness is mandatory. After correctness, prefer the path with the smaller
long-term custom scientific-rendering burden, provided it reaches acceptable
interaction performance.

Three.js is not preferred merely for city-scene presentation. It must support
the scientific workflow without becoming a new general scientific rendering
library.

vtk.js is not preferred merely for built-in scientific features. It must support
the navigation, selection and presentation quality expected from the Twin's main
experience.

## Failure Handling

- Artifact generation fails if DTCC Core is unavailable or returns an
  unexpected model contract.
- Generation validates dimensions, bounds, finite values, units and field
  ranges before writing artifacts.
- The browser loader validates manifest version, byte lengths, hashes, array
  dimensions and coordinate metadata.
- A failed asset or unsupported GPU capability produces a visible error panel.
- No renderer may silently substitute a different dataset or approximate a
  missing required capability.
- Partial support is recorded as a failed or qualified measurement.

## Verification Strategy

- Python tests verify generated counts, bounds, units, provenance and field
  ranges.
- TypeScript tests verify the manifest, binary lengths, coordinate conversion
  and numeric probing.
- Playwright tests exercise navigation, selection, color controls, slice
  movement and provenance labels.
- Cross-renderer probes assert the same IDs, coordinates and values.
- Fixed-camera screenshots check alignment, transparency and occlusion.
- Chrome, Safari and Firefox are reported separately.
- Performance measurement begins only after correctness passes.

## Execution Sequence

1. Lock the current commit, tests, cameras and baseline measurements.
2. Generate and validate the shared scientific artifact set.
3. Implement vtk.js first as the scientific reference path.
4. Implement the Three.js path against the same interaction contract.
5. Run correctness, browser and performance comparisons.
6. Run the isolated VTK.wasm feasibility probe for at most four focused hours.
7. Publish hosted pages, measurements and a recommendation for review.
8. Collect Anders and developer feedback.
9. Propose a full prototype only if the evidence and team feedback support it.

## Stop Conditions

Stop a renderer path and report it when:

- it needs multiple canvases for the required depth relationship;
- it cannot return canonical identifiers and numeric field values;
- alignment or provenance cannot be demonstrated;
- Three.js work expands into a general scientific visualization framework;
- vtk.js cannot provide acceptable city-scene interaction or presentation;
- a required path depends on private APIs;
- VTK.wasm exceeds its four-hour time box.

The report may conclude that neither path is ready.

## Deliverables

- Two hosted, comparable scientific-view pages in `engine-bench`.
- Committed, reproducible scientific artifacts and generation instructions.
- Automated correctness and interaction tests.
- A measurements report with screenshots and code-burden accounting.
- A GitHub response to `dtcc-twin#1` for user review before posting.
- A concise Slack update to Anders for user review before posting.
- A precise additional-data request only if the measurements justify one.
- A separate full-prototype proposal only after DTCC feedback.

## Not in Scope

- Production `dtcc-twin` integration.
- MapLibre integration.
- A new canonical DTCC exchange contract.
- Real-time simulation execution.
- A physically validated Gothenburg wind model.
- Mobile interaction design.
- Multi-tile scalability.
- Replacing Core processing with browser algorithms.
- Selecting the final architecture without team review.

## Teaching Follow-up

After the measurements and external replies are ready, create a teaching
workspace that covers the assignment history, repository map, renderer
fundamentals, measured limitations, issue discussions, proposed architecture,
decision evidence and a meeting-ready talk track with retrieval exercises.
