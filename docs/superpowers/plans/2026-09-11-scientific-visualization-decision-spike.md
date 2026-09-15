# Scientific Visualization Decision Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build two single-canvas city-plus-scientific-visualization paths using identical DTCC artifacts, measure them, and return evidence to the DTCC team before choosing a full prototype architecture.

**Architecture:** DTCC Core generates canonical smoke, slice, streamline, and provenance data over the existing Gothenburg bounds. A shared browser loader validates neutral arrays and metadata, then independent vtk.js and Three.js pages render the same artifacts in one scene each. Automated probes compare IDs, values, alignment, depth, interaction, browser behavior, performance, and custom-code burden.

**Tech Stack:** Python 3.11, dtcc-core 4c8d621 (runtime 5ca2ca4, post-#85; was 5cf56fa), dtcc-sim e24a1f2, NumPy, Bun, TypeScript 5.9.2, Vite 8.2.2, Three.js 0.185.1, vtk.js 36.12.1, Playwright 1.63.0.

**Spec:** docs/superpowers/specs/2026-09-11-scientific-visualization-decision-spike-design.md

**Companion plans:** docs/superpowers/plans/2026-09-11-vtk-wasm-feasibility-probe.md and docs/superpowers/plans/2026-09-11-dtcc-3d-assignment-teaching.md

## Global Constraints

- Use real Gothenburg terrain and buildings plus clearly labelled synthetic DTCC smoke data.
- Retain the existing real urban-heat field as a second provenance check.
- Both paths use identical artifacts, cameras, viewport sizes, controls, and probe positions.
- Three.js and vtk.js each own exactly one canvas; no overlay or borrowed renderer.
- MapLibre and production dtcc-twin integration are out of scope.
- Preserve EPSG:3006, one local origin, units, association, revisions, and DTCC object IDs.
- Grid-node probes are bit-identical; interpolated tolerance is 1e-5 * max(field_span, 1).
- Fixed alignment probes differ by no more than 5 cm after rebasing.
- Target at least 30 FPS; sustained performance below 20 FPS fails the interactive-MVP gate.
- VTK.wasm is governed by its companion plan and stays outside the main dependency graph.
- Do not request more data from Anders until measurements identify a precise missing case.
- No full prototype begins before measurements and DTCC feedback are reviewed.
- Revised 2026-09-14 after dtcc-core#85 closed: regenerate on published develop, Core 4c8d621 natively (editable checkout) and dtcc-sim e24a1f2 in the container, which pins Core runtime 5ca2ca4. 5ca2ca4..4c8d621 is docs-only, so both sides run identical Core code. Do not float to later develop commits without a recorded diff.
- Take field association (vertex, cell, ...) from Core's Field.association; never assert it in the manifest independently.
- FieldSlice and StreamlineCollection are explicitly unsupported by Core native exchange (docs/design/model-inventory.md). The local manifest must carry their full context (slice axis/position, seeds, integration parameters, time, domain, metadata), not only arrays.

---

## File Structure

### Create

- scripts/scientific/generate.py: serialize DTCC smoke products and manifest.
- scripts/scientific/tests/test_generate.py: artifact and provenance tests.
- scripts/scientific/validate.ts: frontend-only integrity check for committed artifacts.
- scripts/scientific/validate.test.ts: corrupt and valid artifact fixtures.
- src/lib/scientific-data.ts: neutral types, loading, hashing, decoding, and coordinate validation.
- src/lib/scientific-probes.ts: sampling, identity readout, alignment probes, probe types, and frame timing.
- tests/unit/scientific-data.test.ts: artifact-boundary tests.
- tests/unit/scientific-probes.test.ts: numeric, identity, alignment, and timing tests.
- pages/13-vtkjs-scientific/index.html and main.ts: vtk.js path.
- pages/14-threejs-scientific/index.html and main.ts: Three.js path.
- tests/scientific.spec.ts: cross-renderer correctness and interaction tests.
- scripts/measure-scientific.mjs: repeatable performance measurements.
- docs/scientific-visualization-measurements.md: evidence and recommendation.

### Modify

- scripts/real/benchio.py: one generic aligned-array packer plus the mesh-pair compatibility wrapper.
- scripts/real/stage1_build.py: preserve source building index and Building.id.
- scripts/real/tests/test_benchio.py and test_mesh_split.py: identity tests.
- src/lib/chrome.ts and tests/unit/chrome.test.ts: shared buttons and readouts.
- pages/00-index/main.ts: add the paired evidence pages.
- tests/smoke.spec.ts and playwright.config.ts: legacy dataset-matrix pages, combined scientific pages, and browser matrices.
- package.json, README.md, and NOTES.md: commands and verified evidence.

### Generated and committed

- public/data/real/buildings.mesh.json and buildings.mesh.bin.
- public/data/scientific/scientific-manifest.json.
- public/data/scientific/scientific.bin.

---

### Task 1: Preserve DTCC building identity in the city mesh

**Files:**
- Modify: scripts/real/benchio.py:56-103
- Modify: scripts/real/stage1_build.py:134-217,270-286
- Modify: scripts/real/tests/test_benchio.py
- Modify: scripts/real/tests/test_mesh_split.py
- Regenerate: public/data/real/buildings.mesh.json and buildings.mesh.bin

**Interfaces:**
- Consumes: surface face markers where marker >= 0 means city.buildings[marker].
- Produces: cell_object_index: Uint32Array and objects: Array<{sourceIndex:number,dtccId:string}>, plus an observed two-load stability verdict.

- [ ] **Step 0: Upgrade to post-#85 Core and Sim**

Before any code change, snapshot the committed pre-upgrade metrics (bounds, mesh counts, relief, field ranges, stage2.roundtrip) from public/data/real/dataset.json. In ../dtcc-core, confirm only untracked files are present, then `git checkout 4c8d621` and reinstall the editable package into engine-bench/.venv (scikit-build-core rebuilds the C++ extension). In ../dtcc-sim, check out e24a1f2 and rebuild with `DOCKER_PLATFORM=linux/amd64 docker compose build dtcc-sim`. Verify benchio.distribution_revision reports 4c8d621 natively and 5ca2ca4 in the container. Stage 2 still round-trips through heat.xdmf, which Core retains; legacy .pb is gone and must not be reintroduced.

- [ ] **Step 1: Write the failing per-cell round-trip test**

~~~python
def test_mesh_pair_round_trips_cell_arrays(tmp_path):
    meta = benchio.write_mesh_pair(
        tmp_path, "mesh",
        positions=np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=float),
        normals=np.array([[0, 0, 1]] * 3, dtype=float),
        indices=np.array([[0, 1, 2]], dtype=np.uint32),
        cell_extra={"cell_object_index": (np.array([7]), "u32", 1)},
        metadata={"objects": [{"sourceIndex": 7, "dtccId": "building-7"}]},
    )
    loaded = benchio.read_mesh_pair(tmp_path, "mesh")
    assert loaded["cell_object_index"].tolist() == [7]
    assert meta["objects"] == [{"sourceIndex": 7, "dtccId": "building-7"}]
~~~

Add a mesh-split test with two markers and assert the selected values retain triangle order. Add stable and unstable two-load identity fixtures: stable IDs produce stable_observed_two_loads; changed UUIDs produce unstable_observed and retain both mapping hashes.

- [ ] **Step 2: Run the focused tests**

Run: .venv/bin/python -m pytest scripts/real/tests/test_benchio.py scripts/real/tests/test_mesh_split.py -q

Expected: FAIL because cell_extra, metadata, and preserved face values do not exist.

- [ ] **Step 3: Extract one generic packer, then extend the artifact writer**

Extract this low-level interface from the existing mesh writer:

~~~python
def pack_array_bundle(arrays: list[tuple[str, np.ndarray, str, int]]) -> tuple[bytes, list[dict]]:
    """Return a four-byte-aligned blob and its typed array specifications."""
~~~

Keep type conversion, four-byte padding, offset calculation, duplicate-name rejection, and supported-type validation in that function. Add direct tests for empty input, mixed f32/u32/u8 arrays, duplicate names, and padding. Keep this mesh wrapper signature:

~~~python
def write_mesh_pair(
    out_dir, name: str, *, positions, normals, indices,
    extra=None, cell_extra=None, metadata=None,
) -> dict:
~~~

Validate vertex extras against len(positions) and cell extras against the triangle count. Delegate every byte-layout decision to pack_array_bundle. Reject metadata keys bin, vertexCount, indexCount, byteLength, and arrays.

- [ ] **Step 4: Preserve canonical source identity**

Have submesh optionally accept face values and return selected values without reordering. Write buildings with:

~~~python
objects = [{"sourceIndex": i, "dtccId": str(b.id)} for i, b in enumerate(city.buildings)]
benchio.write_mesh_pair(
    out_dir, "buildings",
    positions=buildings["positions"], normals=buildings["normals"],
    indices=buildings["indices"],
    cell_extra={"cell_object_index": (buildings["face_values"], "u32", 1)},
    metadata={"objects": objects},
)
~~~

Do not add IDs to terrain or the flattened limitation-demo mesh. Load the source city twice with the same bounds before regeneration and compare sourceIndex-to-dtccId mappings. Write identityStability, both observed mapping hashes, and the audit timestamp into buildings.mesh.json. Never rename sourceIndex to an ID.

- [ ] **Step 5: Test and regenerate**

~~~bash
.venv/bin/python -m pytest scripts/real/tests -q
.venv/bin/python scripts/real/stage1_build.py
scripts/real/stage2_sim.sh
.venv/bin/python scripts/real/sample_field.py
bun run generate:real
~~~

Expected: one source index per building triangle, one non-empty unique DTCC ID per referenced index within each load, and an explicit stable_observed_two_loads or unstable_observed verdict. When unstable, renderer picking continues with sourceIndex for parity while both pages report canonical traceability as failed. Stage 2 and sampling are required because stage1_build.py resets the stage-2 marker; do not leave committed heat artifacts paired with a manifest that says no heat field exists.

- [ ] **Step 6: Check drift**

Compare bounds, mesh counts, relief, field ranges, and the stage-2 round-trip record with the Step 0 snapshot. Generation timestamps and Core/Sim revisions change by design. Record any Core-upgrade drift in NOTES.md with both revisions, because the posted dtcc-twin#1 and dtcc-core#85 comments quote pre-upgrade numbers. ID drift must match unstable_observed and remain visible; unexplained scientific or geometry changes stop the task.

- [ ] **Step 7: Commit**

~~~bash
git add scripts/real/benchio.py scripts/real/stage1_build.py scripts/real/tests/test_benchio.py scripts/real/tests/test_mesh_split.py public/data/real/buildings.mesh.json public/data/real/buildings.mesh.bin
git commit -m "feat: preserve DTCC building identity in mesh artifacts"
~~~

### Task 2: Generate the shared scientific artifact bundle

**Files:**
- Create: scripts/scientific/generate.py
- Create: scripts/scientific/tests/test_generate.py
- Create: scripts/scientific/validate.ts
- Create: scripts/scientific/validate.test.ts
- Create: public/data/scientific/scientific-manifest.json
- Create: public/data/scientific/scientific.bin
- Modify: package.json

**Interfaces:**
- Consumes: dtcc_core.datasets.smoke, real dataset manifest, city meshes, and heat grid.
- Produces: schema version 1 manifest and one aligned binary with grid, slice, and streamline arrays.

- [ ] **Step 1: Write failing contract tests**

~~~python
def test_manifest_contract(generated):
    manifest, blob = generated
    assert manifest["schemaVersion"] == 1
    assert manifest["coordinateFrame"]["crs"] == "EPSG:3006"
    assert manifest["cases"]["smoke"]["dataCategory"] == "synthetic"
    assert manifest["cases"]["heat"]["dataCategory"] == "simulation"
    assert manifest["fields"]["speed"]["unit"] == "m/s"
    assert manifest["fields"]["pressure"]["unit"] == "Pa"
    assert manifest["fields"]["temperature"]["unit"] == "degC"
    assert manifest["binary"]["byteLength"] == len(blob)
    assert hashlib.sha256(blob).hexdigest() == manifest["binary"]["sha256"]
    assert {item["path"] for item in manifest["dependencies"]} == {
        "../real/dataset.json",
        "../real/ground.mesh.json", "../real/ground.mesh.bin",
        "../real/buildings.mesh.json", "../real/buildings.mesh.bin",
        "../real/field.json", "../real/field.grid.json", "../real/field.grid.f32",
    }
    assert all(item["byteLength"] > 0 and len(item["sha256"]) == 64
               for item in manifest["dependencies"])
~~~

Also assert four-byte alignment, in-range offsets, finite values, resolution cubed grid values, resolution squared slice samples, monotonic streamline offsets, and local positions inside the city frame.

- [ ] **Step 2: Run and confirm failure**

Run: .venv/bin/python -m pytest scripts/scientific/tests/test_generate.py -q

Expected: FAIL because the generator and fixture do not exist.

- [ ] **Step 3: Generate deterministic DTCC products**

~~~python
COMMON = {
    "bounds": [xmin, ymin, xmax, ymax], "zmin": z0, "zmax": z0 + 80.0,
    "resolution": 32, "crs": "EPSG:3006", "time": 0.0, "period": 8.0,
}
field = datasets.smoke(**COMMON, product="field")
slice_ = datasets.smoke(**COMMON, product="slice", slice_axis="z", slice_position=0.5)
lines = datasets.smoke(
    **COMMON, product="streamlines", slice_axis="z", slice_position=0.5,
    streamline_count=24, streamline_steps=160, streamline_step_size=0.05,
)
~~~

Read velocity, speed, and pressure from the DTCC objects, including each Field's unit and association (Core 4c8d621 sets association="vertex"; fail generation if it is empty). Record the slice and streamline context Core exposes (axis, position, seeds, count, steps, step size, time, period, domain, metadata) in the manifest beside their arrays. Rebase by [origin_x, origin_y, z0]. Import pack_array_bundle from scripts/real/benchio.py and use it for type, component, offset, length, and alignment metadata. The scientific manifest owns domain meaning; benchio owns only byte layout. Hash the final binary.

Do not assume VolumeMesh vertex order is grid order. Sort samples by z, then y, then x so x is fastest; assert every expected lattice coordinate occurs exactly once before writing the regular grid.

- [ ] **Step 4: Record real provenance**

Resolve dtcc-core through distribution direct_url.json or editable checkout HEAD. Reference the existing city and heat files rather than copying them. Add a dependency record with path, byteLength, and SHA-256 for dataset.json, both terrain mesh files, both building mesh files, field.json, field.grid.json, and field.grid.f32. Do not accept UI HTML from data.

- [ ] **Step 5: Add repeatable scripts**

~~~json
"generate:scientific": ".venv/bin/python scripts/scientific/generate.py",
"validate:scientific": "bun scripts/scientific/validate.ts",
"test:scientific:python": ".venv/bin/python -m pytest scripts/scientific/tests -q"
~~~

Keep generation explicit. Do not call generate:scientific from build or build:pages. Add validate:scientific before vite build so a browser-only clone verifies the committed manifest schema version, scientific binary, and every dependency byte length and SHA-256 without importing Python or dtcc-core. build:pages already delegates to build and must not validate twice.

- [ ] **Step 6: Prove determinism and test**

Run generation twice, record both manifest and binary SHA-256 values each time, and require exact matches. Run bun run test:scientific:python, bun test scripts/scientific/validate.test.ts, and bun run validate:scientific. The validator test includes a valid fixture plus wrong schema, wrong length, missing binary, and wrong hash cases.

- [ ] **Step 7: Commit**

~~~bash
git add scripts/scientific public/data/scientific package.json
git commit -m "feat: generate shared DTCC scientific artifacts"
~~~

### Task 3: Load and validate artifacts in the browser

**Files:**
- Create: src/lib/scientific-data.ts
- Create: tests/unit/scientific-data.test.ts

**Interfaces:**
- Produces: loadScientificBundle, decodeScientificBundle, and loadMeshPair.

- [ ] **Step 1: Write failing loader tests**

Cover schema version, main and dependency hash/length mismatch, array overlap/range/alignment, non-finite values, components, streamline offsets, missing sourceIndex/dtccId values, both identity-stability verdicts, 5 cm coordinate-frame alignment, and fetch errors.

~~~typescript
test('decodes building identity without collapsing its two meanings', () => {
  const fixture = scientificFixture();
  const bundle = decodeScientificBundle(fixture.manifest, fixture.blob);
  expect(bundle.city.objects.get(7)).toEqual({sourceIndex: 7, dtccId: 'building-7'});
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: bun test tests/unit/scientific-data.test.ts

Expected: module-not-found failure.

- [ ] **Step 3: Define renderer-free types**

~~~typescript
export type ScientificGrid = {
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  speed: Float32Array;
  velocity: Float32Array;
  pressure: Float32Array;
};

export type ScientificBundle = {
  manifest: ScientificManifest;
  city: {
    terrain: MeshPair;
    buildings: MeshPair;
    objects: Map<number, {sourceIndex: number; dtccId: string}>;
    identityStability: 'stable_observed_two_loads' | 'unstable_observed';
  };
  smoke: {grid: ScientificGrid; slice: SliceData; streamlines: StreamlineData};
  heat: {grid: ScientificGridRef};
};
~~~

Do not import renderer libraries.

- [ ] **Step 4: Implement strict loading**

Validate metadata before typed-array views. Fetch every declared dependency via assetUrl; errors include URL and HTTP status. Verify the scientific binary and every dependency through crypto.subtle.digest before constructing renderer objects.

- [ ] **Step 5: Complete identity and coordinate decoding**

Build the sourceIndex-to-object map and validate every cell_object_index against it. Missing entries throw and never fabricate IDs. Validate the shared origin and artifact bounds against the 5 cm contract before returning ScientificBundle.

- [ ] **Step 6: Verify and commit**

~~~bash
bun test tests/unit/scientific-data.test.ts
bunx tsc --noEmit
git add src/lib/scientific-data.ts tests/unit/scientific-data.test.ts
git commit -m "feat: validate and load scientific artifacts"
~~~

### Task 4: Add shared controls and measurement probes

**Files:**
- Modify: src/lib/chrome.ts
- Modify: tests/unit/chrome.test.ts
- Create: src/lib/scientific-probes.ts
- Create: tests/unit/scientific-probes.test.ts

**Interfaces:**
- Produces: button controls, safe readouts, ScientificProbe, and a deterministic BenchmarkDriver.

- [ ] **Step 1: Write failing UI tests**

Test one callback per button click, textContent-only readouts, grid indexing, trilinear boundary clamping, identity lookup under both stability verdicts, alignment probes, deterministic camera interpolation, forced-frame sampling, disjoint GPU sample rejection, resource snapshots, and context loss. Define:

~~~typescript
export type ScientificProbe = {
  renderer: 'vtkjs' | 'threejs';
  status: 'ready' | 'context-lost' | 'failed';
  canvasCount: number;
  field: true;
  provenance: {smoke: 'synthetic'; heat: 'simulation'};
  selectedObject?: {sourceIndex: number; dtccId: string; traceability: 'stable' | 'run-local'};
  selectedValue?: {field: string; value: number; unit: string; world: [number, number, number]};
  benchmark?: {
    cpuFrameTimesMs: number[];
    gpuFrameTimesMs: number[] | null;
    cameraPath: 'orbit-v1';
    forcedFrames: 180;
  };
  resources: {
    buffers: number;
    textures: number;
    renderTargets: number;
    listeners: number;
    observers: number;
  };
  measurementValid: boolean;
};
~~~

- [ ] **Step 2: Run and confirm failure**

Run: bun test tests/unit/chrome.test.ts tests/unit/scientific-probes.test.ts

- [ ] **Step 3: Implement the smallest UI extension**

Add a button Control variant and return setReadout(label, value) from mountChrome. Keep camera, picking, transfer functions, and GPU code in page modules.

Implement probeGridNode, sampleGridTrilinear, objectRefForCell, and alignmentDistance in scientific-probes.ts. Index x-fastest grids as x + nx * (y + ny * z). Always return sourceIndex and dtccId separately; map unstable_observed to run-local traceability and a visible warning.

Add attachContextLoss(canvas, handlers). It prevents the default event, stops BenchmarkDriver, sets status to context-lost and measurementValid to false, invokes renderer-specific disposal, shows a visible failure, and exposes a reload button. It does not reconstruct GPU state.

- [ ] **Step 4: Implement an identical forced-render benchmark**

Define camera path orbit-v1 as 30 warmup frames followed by 180 measured frames around fixed target/radius/elevation values. Each page exposes window.__bench.runBenchmark(), applies the same interpolated camera pose, forces one completed render, and records CPU wall time. When EXT_disjoint_timer_query_webgl2 is available, record GPU duration separately and reject disjoint samples; otherwise publish gpuFrameTimesMs as null. Idle requestAnimationFrame callbacks never count as rendered frames.

- [ ] **Step 5: Verify and commit**

~~~bash
bun test tests/unit/chrome.test.ts tests/unit/scientific-probes.test.ts
bunx tsc --noEmit
git add src/lib/chrome.ts src/lib/scientific-probes.ts tests/unit/chrome.test.ts tests/unit/scientific-probes.test.ts
git commit -m "feat: add shared scientific controls and probes"
~~~

### Task 5: Build the vtk.js reference page

**Files:**
- Create: pages/13-vtkjs-scientific/index.html
- Create: pages/13-vtkjs-scientific/main.ts
- Modify: tests/smoke.spec.ts

**Interfaces:**
- Consumes: ScientificBundle from scientific-data.ts and controls/probes from scientific-probes.ts.
- Produces: /13-vtkjs-scientific/ and a vtkjs ScientificProbe.

- [ ] **Step 1: Add a combined-page mode and register a failing smoke test**

Extend PageSpec with mode?: 'matrix' | 'combined', defaulting to matrix. Keep the current synthetic/real loop for matrix entries and run combined entries once without a dataset query. Add this page with mode combined; do not add it to FIELD_PAGES. Assert renderer vtkjs, one canvas, both provenance categories, non-empty selectedObject.sourceIndex/dtccId values with the expected traceability label, and an m/s selected value.

- [ ] **Step 2: Confirm missing-page failure**

Run: bun run build && bunx playwright test tests/smoke.spec.ts --grep "13-vtkjs-scientific"

- [ ] **Step 3: Build one vtk.js scene**

Use one vtkFullScreenRenderWindow. Convert terrain/buildings to vtkPolyData with cell_object_index. Convert smoke to vtkImageData:

~~~typescript
image.setDimensions(grid.dims);
image.setOrigin(grid.origin);
image.setSpacing(grid.spacing);
image.getPointData().setScalars(vtkDataArray.newInstance({
  name: 'speed', values: grid.speed, numberOfComponents: 1
}));
image.getPointData().setVectors(vtkDataArray.newInstance({
  name: 'velocity', values: grid.velocity, numberOfComponents: 3
}));
~~~

Use vtkImageMapper/vtkImageSlice for the z slice, vtkVolumeMapper for volume, and polyline actors for Core-precomputed streamlines.

- [ ] **Step 4: Add interaction and readback**

Use vtk cell picking and resolve cells through cell_object_index. Sample fields through the shared trilinear function. Add slice, color range, opacity, streamlines, camera reset, and data-case controls. Resize the render window and camera through one ResizeObserver tied to canvasHost; dispose the observer with the renderer.

- [ ] **Step 5: Expose probes and visible errors**

Record one fixed pick, node/interpolated probes, alignment landmarks, APIs, frame samples, status, measurementValid, and canvas count. Route startup failures through reportFailure. Attach context-loss handling to the drawing canvas and dispose vtk render-window/session resources on loss.

- [ ] **Step 6: Verify and commit**

~~~bash
bun test tests/unit
bun run build
bunx playwright test tests/smoke.spec.ts --grep "13-vtkjs-scientific"
portless engine-bench-vtk bun run dev --host 0.0.0.0
git add pages/13-vtkjs-scientific tests/smoke.spec.ts
git commit -m "feat: add vtk.js scientific reference scene"
~~~

### Task 6: Build the Three.js comparison page

**Files:**
- Create: pages/14-threejs-scientific/index.html
- Create: pages/14-threejs-scientific/main.ts
- Modify: tests/smoke.spec.ts

**Interfaces:**
- Consumes: ScientificBundle from scientific-data.ts; slice, color-range, opacity, streamline, camera-reset, and data-case controls from scientific-probes.ts; the fixed camera and numeric/alignment probe coordinates declared by the approved spec.
- Produces: /14-threejs-scientific/ and a threejs ScientificProbe.

- [ ] **Step 1: Register failing parity checks**

Add 14-threejs-scientific to PAGES with mode combined and no FIELD_PAGES membership. Assert renderer threejs, canvasCount 1, provenance {smoke: synthetic, heat: simulation}, a selected object containing separate sourceIndex and dtccId fields with the expected traceability label, and a selected speed value whose unit is m/s.

- [ ] **Step 2: Confirm missing-page failure**

Run: bun run build && bunx playwright test tests/smoke.spec.ts --grep "14-threejs-scientific"

- [ ] **Step 3: Build one Three.js scene**

Use one WebGLRenderer, PerspectiveCamera, and OrbitControls. Convert neutral city arrays to BufferGeometry and retain the triangle-to-building lookup. Use Data3DTexture. The installed public addon three/addons/shaders/VolumeShader.js is a measured starting point, but it only supplies maximum-intensity and isosurface modes; it does not satisfy transparent front-to-back compositing. Write the smallest correct front-to-back compositor and count every retained or changed GLSL line against Three.js.

Render terrain and buildings into an opaque depth texture before the volume pass. Reconstruct the opaque world/view distance in the volume shader and stop ray accumulation at that distance. Keep both passes inside the same WebGLRenderer and canvas. Use one ResizeObserver to update renderer size, camera aspect/projection, device-pixel ratio, and depth-target dimensions from the same CSS size; dispose the observer and target with the renderer.

Render the slice as a DataTexture plane and Core-precomputed streamlines as lines/tubes. Do not integrate streamlines in-browser.

- [ ] **Step 4: Add equivalent interaction**

Use Raycaster.faceIndex for canonical building selection. Sample values through the same neutral function. Mirror every vtk.js control and readout.

- [ ] **Step 5: Expose equivalent probes**

Use identical probe positions, camera, warmup/sample windows, provenance, alignment landmarks, status, and measurementValid. Attach context-loss handling and dispose geometries, materials, textures, depth target, controls, and renderer resources on loss.

- [ ] **Step 6: Verify and commit**

~~~bash
bun test tests/unit
bun run build
bunx playwright test tests/smoke.spec.ts --grep "14-threejs-scientific"
portless engine-bench-three bun run dev --host 0.0.0.0
git add pages/14-threejs-scientific tests/smoke.spec.ts
git commit -m "feat: add Three.js scientific comparison scene"
~~~

### Task 7: Prove cross-renderer correctness and parity

**Files:**
- Create: tests/scientific.spec.ts
- Modify: both scientific page main.ts files
- Modify if needed: playwright.config.ts

**Interfaces:**
- Consumes: both ScientificProbe objects and stable data-testid controls.
- Produces: one E2E suite comparing paths directly.

- [ ] **Step 1: Write cross-renderer tests first**

~~~typescript
expect(vtk.fixedGridNode.bits).toBe(three.fixedGridNode.bits);
expect(Math.abs(vtk.interpolated.value - three.interpolated.value))
  .toBeLessThanOrEqual(1e-5 * Math.max(vtk.fieldSpan, 1));
expect(vtk.selectedObject).toEqual(three.selectedObject);
expect(distance(vtk.alignment.world, three.alignment.world)).toBeLessThanOrEqual(0.05);
expect(vtk.canvasCount).toBe(1);
expect(three.canvasCount).toBe(1);
~~~

Also test all controls, provenance labels, corrupt/missing data errors, real heat, and a fixed ray where the volume lies partly behind a building. That ray must accumulate only samples in front of the opaque depth. Force WebGL loss through WEBGL_lose_context in Chromium, with a synthetic webglcontextlost event fallback for browsers without the extension; both pages must show reload, set status context-lost, stop sampling, and set measurementValid false. Run the flow at DPR 1 and DPR 2, resize from 1280x800 to 1600x900 after ready, and assert drawing-buffer dimensions, camera projection, depth-target dimensions, IDs, and numeric probes remain correct.

Run 100 deterministic cycles of slice position, color range, volume opacity, streamline visibility, data-case switching, and alternating viewport sizes. Compare renderer-owned resource counters before and after the first warm cycle; cycles 2-100 must not increase buffers, textures, render targets, listeners, or observers. Record Chromium heap data when available, but never fail another browser for exposing no heap API.

- [ ] **Step 2: Run Chromium and observe failures**

Run: bunx playwright test tests/scientific.spec.ts

- [ ] **Step 3: Make only parity/correctness fixes**

Normalize cameras, controls, fixed probes, errors, and probe output. Do not tune visual quality or performance here.

- [ ] **Step 4: Add occlusion evidence**

Capture fixed outside and behind-building views. Keep screenshots in ignored screens/. Assert the Three.js depth-prepass texture is active and compare the known behind-building pixel/probe with vtk.js; do not rely on screenshots alone or commit regenerated images.

- [ ] **Step 5: Run browser matrix**

Add chromium, firefox, and webkit projects when absent. Run the scientific suite in all three at DPR 1, then run its resize/DPR case at DPR 2. Run the full smoke suite once. Tablet, mobile, and touch layouts remain outside scope.

- [ ] **Step 6: Run complete regression**

~~~bash
bun run test:scientific:python
bun run test
~~~

Unsupported browser capabilities must show a visible error and a qualified result.

- [ ] **Step 7: Commit**

~~~bash
git add tests/scientific.spec.ts pages/13-vtkjs-scientific/main.ts pages/14-threejs-scientific/main.ts playwright.config.ts
git commit -m "test: compare scientific renderers end to end"
~~~

### Task 8: Measure performance and maintenance burden

**Files:**
- Create: scripts/measure-scientific.mjs
- Modify: tests/unit/scientific-probes.test.ts
- Modify: package.json
- Create: docs/scientific-visualization-measurements.md

**Interfaces:**
- Consumes: built pages and BenchmarkDriver CPU/GPU samples.
- Produces: machine-readable JSON plus the measurement table.

- [ ] **Step 1: Write aggregation tests**

Feed known CPU and GPU times and assert warmup exclusion, disjoint rejection, p50, p95, minimum FPS, null GPU fallback, and classifications below 20, 20-30, and at least 30 FPS.

- [ ] **Step 2: Confirm missing-export failure**

Run: bun test tests/unit/scientific-probes.test.ts

- [ ] **Step 3: Implement repeatable measurement**

Run three cold 1280x800, DPR 1 browser contexts per page. After ready, invoke runBenchmark() and record its 180 forced-render CPU samples plus GPU samples when available. Also record navigation-to-ready, resource transfer sizes, dist bundle sizes, 100-cycle resource stability, and performance.memory only when supported. Unsupported GPU/memory data is null. Reject the run when status is not ready, measurementValid is false, fewer than 180 CPU samples exist, any GPU sample is disjoint, or resource counters grow after the warm cycle. Keep DPR 2 and resize checks in the correctness suite so timings remain comparable.

Add: "measure:scientific": "bun run build:pages && node scripts/measure-scientific.mjs".

- [ ] **Step 4: Count burden from the diff**

Per path count non-blank unique TypeScript, custom GLSL, data copies, adapters, public addons, experimental APIs, and private APIs. Exclude shared loader, controls, tests, and generated data.

- [ ] **Step 5: Populate evidence without choosing early**

Record correctness, browsers, load p50, CPU frame p50/p95, GPU frame p50/p95 when available, minimum sustained FPS, transfer/bundle size, code burden, copies, and API stability. Mark unavailable measurements.

- [ ] **Step 6: Commit**

~~~bash
git add scripts/measure-scientific.mjs tests/unit/scientific-probes.test.ts package.json docs/scientific-visualization-measurements.md
git commit -m "perf: measure scientific renderer tradeoffs"
~~~

### Task 9: Publish evidence and prepare replies

**Files:**
- Modify: pages/00-index/main.ts, README.md, NOTES.md, and measurement report.
- Modify outside repo: /Users/sarmatas/Projects/dtcc/messages/slack-anders-scientific-visualization-reply.md
- Create outside repo: /Users/sarmatas/Projects/dtcc/messages/reply-dtcc-twin-1-scientific-spike.md

**Interfaces:**
- Consumes: verified main-path measurements and the documented VTK.wasm companion outcome.
- Produces: hosted evidence and two unposted reply drafts.

- [ ] **Step 1: Add the index section**

Say both pages use real city geometry plus synthetic smoke and neither is a product architecture.

- [ ] **Step 2: Apply the decision rule**

Reject correctness failures, then sustained FPS below 20, then compare maintenance burden and presentation. Permit neither.

- [ ] **Step 3: Run final verification once**

~~~bash
bun run test:scientific:python
bun run test
bun run measure:scientific
bun run build:pages
~~~

Verify both pages under /engine-bench/. Deploy only after the sarmatas gh profile resolves to sarmatas00 without printing credentials.

- [ ] **Step 4: Verify live with ego-browser**

Exercise every control, inspect console/network failures, capture evidence, and compare live probes with local results.

- [ ] **Step 5: Draft, do not post, team replies**

The GitHub draft carries live links, shared inputs, correctness, performance, burden, VTK.wasm, conclusion, and explicit team questions. Any data request specifies fields, units, CRS, bounds, resolution, and use. Update the Slack draft with the concise result.

- [ ] **Step 6: Present drafts for user approval**

Do not post during implementation. After explicit approval, verify sarmatas/sarmatas00 immediately before posting and verify the rendered comment.

- [ ] **Step 7: Commit repository evidence**

~~~bash
git add pages/00-index/main.ts README.md NOTES.md docs/scientific-visualization-measurements.md
git commit -m "docs: publish scientific renderer evidence"
~~~

---

## Dependency and Execution Order

| Task | Depends on | Reason |
|---|---|---|
| 1 | Approved spec | Picking needs canonical identity |
| 2 | 1 | Manifest references the city identity contract |
| 3 | 2 | Decoder needs final manifest layout |
| 4 | 3 | Probe types use decoded data |
| 5 | 1-4 | vtk.js needs identity, data, controls |
| 6 | 1-4 | Three.js needs the same contract |
| 7 | 5-6 | Comparison requires both pages |
| 8 | 7 | Measure only after correctness |
| 9 | 7-8 plus VTK.wasm companion outcome | Report verified results only |

Tasks 5 and 6 can run in parallel worktrees after Task 4. The VTK.wasm companion can run after Task 3 while Tasks 5-8 proceed. All other core tasks are sequential because they define or consume the same contracts. Revised 2026-09-15: the teaching companion is prepared up front and studied asynchronously alongside Tasks 1-9; lesson 12 is revised after Task 9 produces final evidence and reply drafts.

## Full Verification

~~~bash
.venv/bin/python -m pytest scripts/real/tests scripts/scientific/tests -q
bun test tests/unit
bunx tsc --noEmit
bun run build
bunx playwright test tests/smoke.spec.ts tests/scientific.spec.ts
bun run measure:scientific
bun run build:pages
~~~

Use portless for manual development:

~~~bash
portless engine-bench-scientific bun run dev --host 0.0.0.0
~~~

## What Already Exists

- scripts/real/benchio.py already implements aligned typed-array packing; Task 1 deepens and reuses it instead of creating a second packer.
- stage1_build.py already retains surface-mesh markers long enough to map faces back to city.buildings.
- DTCC Core already provides VolumeMesh, FieldSlice, StreamlineCollection, units, explicit field association, CRS metadata, and deterministic smoke generation. After #85, VolumeMesh round-trips natively as `.dtcc` (float64 typed arrays); FieldSlice and StreamlineCollection are Python objects only and fail native serialization by design.
- page 11 already proves vtk.js regular-grid volume and isosurface rendering.
- Three.js already provides Data3DTexture and a public volume-shader addon, while the review confirmed transparent depth-aware compositing still requires custom work.
- chrome.ts already provides safe page framing and controls; the plan adds only the missing button/readout lifecycle.
- smoke.spec.ts already health-checks all Vite entries, console errors, WebGL2, and screenshots.
- GitHub Pages subpath support, committed real data, and the public hosted bench already work.

## Test Coverage Diagram

~~~text
ARTIFACT GENERATION                                  BROWSER / USER FLOW
[PLAN] generic aligned packer                       [PLAN] combined page health mode
  |-- valid mixed arrays                              |-- vtk.js page loads once
  |-- padding and offsets                             |-- Three.js page loads once
  |-- invalid dtype / duplicate name                  '-- legacy pages keep 2-case matrix
  '-- per-cell count mismatch
                                                   [PLAN] trusted load boundary
[PLAN] building identity                              |-- all dependency hashes
  |-- stable across two loads                         |-- corrupt/missing data -> visible error
  |-- unstable -> run-local warning                   |-- 5 cm coordinate gate
  '-- marker -> sourceIndex -> dtccId                  '-- no fabricated identity

[PLAN] smoke / heat artifacts                       [PLAN] renderer parity [E2E]
  |-- deterministic complete lattice                  |-- one canvas each
  |-- units / fields / provenance                     |-- same IDs and scalar values
  |-- x-fastest ordering                              |-- controls and data cases
  '-- complete dependency hash table                  |-- slice / lines / volume
                                                      |-- opaque depth / occlusion
                                                      |-- context loss -> invalid run
                                                      |-- resize + DPR 1/2
                                                      '-- 100-cycle resource stability

                                                   [PLAN] performance
                                                     |-- fixed orbit, forced renders
                                                     |-- CPU and optional GPU time
                                                     |-- disjoint samples rejected
                                                     '-- only correctness-valid runs reported
~~~

Coverage before implementation: 0 planned paths implemented. Plan coverage: every diagram branch has an explicit unit, Python, E2E, or measurement assertion. Test-plan artifact: /Users/sarmatas/.gstack/projects/engine-bench/sarmatas-main-eng-review-test-plan-20260912-125915.md.

## Failure Modes

| Failure | Test | Handling | User-visible result |
|---|---|---|---|
| DTCC IDs change between loads | Two-load Python audit | Retain sourceIndex and mark traceability failed | Run-local warning |
| Mixed regenerated artifacts | Hash/length fixtures and build validator | Abort before Vite build or renderer construction | Exact dependency error |
| Incomplete smoke lattice | Python generator invariant | Abort generation | Exact missing/duplicate coordinate |
| Renderer loses field meaning | Cross-renderer value/unit assertions | Fail correctness gate | Failed-path report |
| Building/field misalignment | Fixed landmarks within 5 cm | Fail correctness gate | Alignment failure |
| Three.js volume bleeds through buildings | Known ray and depth-prepass probe | Fail correctness gate | Occlusion failure |
| WebGL context loss | Forced extension/event test | Stop benchmark, dispose, offer reload | Visible context-lost panel |
| Resize or Retina mismatch | DPR 1/2 resize E2E | Resize all coupled resources together | Test failure before evidence |
| Repeated controls leak resources | 100-cycle counters | Reject measurement | Resource-growth failure |
| Unsupported browser feature | Three-browser matrix | Qualified result, no approximation | Visible unsupported state |
| Performance run is idle or disjoint | Forced render and GPU-query checks | Reject sample/run | Measurement omitted with reason |

Critical silent gaps after review: 0.

## NOT in Scope

- Production dtcc-twin integration; the spike returns evidence only.
- MapLibre integration; it remains a possible discovery and region-selection surface.
- A new canonical DTCC exchange contract; the manifest is local evidence infrastructure. Core now owns that contract (`DTCC.ModelFile` v6, LinkML 0.9.0); browser decoding of `.dtcc` is Core's unpublished follow-up F3, not this spike.
- Real-time simulation execution or a physically validated Gothenburg wind model.
- Mobile/touch UX and multi-tile scalability.
- Automatic WebGL context restoration.
- Selecting or building the full prototype before DTCC feedback.
- VTK.wasm implementation details and teaching artifacts, which live in companion plans.

## TODOS.md Updates

No TODOS.md exists. All approved deferred work is captured in the two companion plans, so no additional TODO entry is proposed.

## Worktree Parallelization Strategy

| Step | Modules touched | Depends on |
|---|---|---|
| Artifact foundation | scripts/real, scripts/scientific, public/data | - |
| Shared browser boundary | src/lib, tests/unit | Artifact foundation |
| vtk.js path | pages/13-vtkjs-scientific, tests | Shared boundary |
| Three.js path | pages/14-threejs-scientific, tests | Shared boundary |
| Parity and performance | tests, scripts, docs | Both renderer paths |
| Evidence and replies | pages/00-index, docs, root messages | Measurements + VTK.wasm companion |

Lane A: artifact foundation -> shared browser boundary.
Lane B: vtk.js path after Lane A.
Lane C: Three.js path after Lane A, parallel with Lane B.
Lane D: parity after B+C, then main-path measurement in parallel with the VTK.wasm companion.
Final: merge evidence, prepare replies, then revise teaching lesson 12 with measured numbers.

Conflict flag: Lanes B and C both edit tests/smoke.spec.ts. Add both combined page registrations in Task 4 before branching, or coordinate that single shared-file edit explicitly.

## Implementation Tasks

- [ ] T1 (P1, human: ~2h / Codex: ~20m) - Plans - Keep core, VTK.wasm, and teaching completion states separate.
- [ ] T2 (P1, human: ~1h / Codex: ~15m) - Build - Make scientific regeneration explicit and validate committed artifacts during normal builds.
- [ ] T3 (P1, human: ~2h / Codex: ~20m) - Identity - Audit DTCC IDs across two loads and preserve sourceIndex separately.
- [ ] T4 (P1, human: ~2h / Codex: ~20m) - Provenance - Hash every referenced city and heat dependency.
- [ ] T5 (P1, human: ~2-4d / Codex: ~2-4h) - Three.js - Terminate volume rays at opaque city depth.
- [ ] T6 (P2, human: ~1h / Codex: ~15m) - Shared code - Split artifact loading from probes and measurement.
- [ ] T7 (P2, human: ~2h / Codex: ~20m) - Serialization - Reuse one generic aligned-array packer.
- [ ] T8 (P1, human: ~2h / Codex: ~20m) - Tests - Add combined-page mode to the smoke matrix.
- [ ] T9 (P1, human: ~0.5d / Codex: ~30m) - Runtime - Handle WebGL context loss visibly and invalidate measurements.
- [ ] T10 (P1, human: ~1d / Codex: ~1h) - Rendering - Verify desktop resize and DPR 1/2.
- [ ] T11 (P1, human: ~1-2d / Codex: ~1-2h) - Performance - Force identical camera/render work and verify 100-cycle resource stability.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | /plan-ceo-review | Scope and strategy | 0 | - | Not run |
| Codex Review | /codex review | Independent second opinion | 0 | - | Not run |
| Eng Review | /plan-eng-review | Architecture and tests | 1 | CLEAR | 11 issues resolved, 0 critical gaps |
| Design Review | /plan-design-review | UI and UX gaps | 0 | - | Not run |
| DX Review | /plan-devex-review | Developer experience gaps | 0 | - | Not run |

**VERDICT:** ENG CLEARED for implementation planning; external posts remain approval-gated.

NO UNRESOLVED DECISIONS
