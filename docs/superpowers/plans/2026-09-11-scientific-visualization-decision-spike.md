# Scientific Visualization Decision Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build two single-canvas city-plus-scientific-visualization paths using identical DTCC artifacts, measure them, and return evidence to the DTCC team before choosing a full prototype architecture.

**Architecture:** DTCC Core generates canonical smoke, slice, streamline, and provenance data over the existing Gothenburg bounds. A shared browser loader validates neutral arrays and metadata, then independent vtk.js and Three.js pages render the same artifacts in one scene each. Automated probes compare IDs, values, alignment, depth, interaction, browser behavior, performance, and custom-code burden.

**Tech Stack:** Python 3.11, dtcc-core 5cf56fa baseline, NumPy, Bun, TypeScript 5.9.2, Vite 8.2.2, Three.js 0.185.1, vtk.js 36.12.1, Playwright 1.63.0.

**Spec:** docs/superpowers/specs/2026-09-11-scientific-visualization-decision-spike-design.md

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
- VTK.wasm gets at most four focused hours and stays outside the main dependency graph.
- Do not request more data from Anders until measurements identify a precise missing case.
- No full prototype begins before measurements and DTCC feedback are reviewed.

---

## File Structure

### Create

- scripts/scientific/generate.py: serialize DTCC smoke products and manifest.
- scripts/scientific/tests/test_generate.py: artifact and provenance tests.
- src/lib/scientific.ts: neutral types, loading, validation, rebasing, and probes.
- tests/unit/scientific.test.ts: loader and numeric-probe tests.
- pages/13-vtkjs-scientific/index.html and main.ts: vtk.js path.
- pages/14-threejs-scientific/index.html and main.ts: Three.js path.
- tests/scientific.spec.ts: cross-renderer correctness and interaction tests.
- scripts/measure-scientific.mjs: repeatable performance measurements.
- docs/scientific-visualization-measurements.md: evidence and recommendation.
- spikes/vtk-wasm/README.md: bounded probe record.

### Modify

- scripts/real/benchio.py: typed per-cell mesh arrays.
- scripts/real/stage1_build.py: preserve source building index and Building.id.
- scripts/real/tests/test_benchio.py and test_mesh_split.py: identity tests.
- src/lib/chrome.ts and tests/unit/chrome.test.ts: shared buttons and readouts.
- pages/00-index/main.ts: add the paired evidence pages.
- tests/smoke.spec.ts and playwright.config.ts: page and browser matrices.
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
- Produces: cell_object_index: Uint32Array and objects: Array<{index:number,id:string}>.

- [ ] **Step 1: Write the failing per-cell round-trip test**

~~~python
def test_mesh_pair_round_trips_cell_arrays(tmp_path):
    meta = benchio.write_mesh_pair(
        tmp_path, "mesh",
        positions=np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=float),
        normals=np.array([[0, 0, 1]] * 3, dtype=float),
        indices=np.array([[0, 1, 2]], dtype=np.uint32),
        cell_extra={"cell_object_index": (np.array([7]), "u32", 1)},
        metadata={"objects": [{"index": 7, "id": "building-7"}]},
    )
    loaded = benchio.read_mesh_pair(tmp_path, "mesh")
    assert loaded["cell_object_index"].tolist() == [7]
    assert meta["objects"] == [{"index": 7, "id": "building-7"}]
~~~

Add a mesh-split test with two markers and assert the selected values retain triangle order.

- [ ] **Step 2: Run the focused tests**

Run: .venv/bin/python -m pytest scripts/real/tests/test_benchio.py scripts/real/tests/test_mesh_split.py -q

Expected: FAIL because cell_extra, metadata, and preserved face values do not exist.

- [ ] **Step 3: Extend the artifact writer**

Use this signature:

~~~python
def write_mesh_pair(
    out_dir, name: str, *, positions, normals, indices,
    extra=None, cell_extra=None, metadata=None,
) -> dict:
~~~

Validate vertex extras against len(positions) and cell extras against the triangle count. Reuse the existing aligned type writer. Reject metadata keys bin, vertexCount, indexCount, byteLength, and arrays.

- [ ] **Step 4: Preserve canonical source identity**

Have submesh optionally accept face values and return selected values without reordering. Write buildings with:

~~~python
objects = [{"index": i, "id": str(b.id)} for i, b in enumerate(city.buildings)]
benchio.write_mesh_pair(
    out_dir, "buildings",
    positions=buildings["positions"], normals=buildings["normals"],
    indices=buildings["indices"],
    cell_extra={"cell_object_index": (buildings["face_values"], "u32", 1)},
    metadata={"objects": objects},
)
~~~

Do not add IDs to terrain or the flattened limitation-demo mesh.

- [ ] **Step 5: Test and regenerate**

~~~bash
.venv/bin/python -m pytest scripts/real/tests -q
.venv/bin/python scripts/real/stage1_build.py
scripts/real/stage2_sim.sh
.venv/bin/python scripts/real/sample_field.py
bun run generate:real
~~~

Expected: one object index per building triangle and one non-empty unique DTCC ID per referenced index. Stage 2 and sampling are required because stage1_build.py resets the stage-2 marker; do not leave committed heat artifacts paired with a manifest that says no heat field exists.

- [ ] **Step 6: Check drift**

Compare bounds, mesh counts, relief, field ranges, and the stage-2 round-trip record with the prior commit. IDs and generation timestamps may change. Any unexplained scientific or geometry change stops the task.

- [ ] **Step 7: Commit**

~~~bash
git add scripts/real/benchio.py scripts/real/stage1_build.py scripts/real/tests/test_benchio.py scripts/real/tests/test_mesh_split.py public/data/real/buildings.mesh.json public/data/real/buildings.mesh.bin
git commit -m "feat: preserve DTCC building identity in mesh artifacts"
~~~

### Task 2: Generate the shared scientific artifact bundle

**Files:**
- Create: scripts/scientific/generate.py
- Create: scripts/scientific/tests/test_generate.py
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

Read velocity, speed, and pressure from the DTCC objects. Rebase by [origin_x, origin_y, z0]. Write arrays with type, components, offset, and length, then hash the final binary.

Do not assume VolumeMesh vertex order is grid order. Sort samples by z, then y, then x so x is fastest; assert every expected lattice coordinate occurs exactly once before writing the regular grid.

- [ ] **Step 4: Record real provenance**

Resolve dtcc-core through distribution direct_url.json or editable checkout HEAD. Reference ../real/field.grid.json for heat. Do not duplicate the heat binary or accept UI HTML from data.

- [ ] **Step 5: Add repeatable scripts**

~~~json
"generate:scientific": ".venv/bin/python scripts/scientific/generate.py",
"test:scientific:python": ".venv/bin/python -m pytest scripts/scientific/tests -q"
~~~

Run scientific generation after real generation in build. build:pages already delegates to build and must not invoke it a second time. Missing prerequisites produce an actionable non-zero exit and never skip.

- [ ] **Step 6: Prove determinism and test**

Run generation twice, record both manifest and binary SHA-256 values each time, and require exact matches. Then run bun run test:scientific:python.

- [ ] **Step 7: Commit**

~~~bash
git add scripts/scientific public/data/scientific package.json
git commit -m "feat: generate shared DTCC scientific artifacts"
~~~

### Task 3: Load and validate artifacts in the browser

**Files:**
- Create: src/lib/scientific.ts
- Create: tests/unit/scientific.test.ts

**Interfaces:**
- Produces: loadScientificBundle, decodeScientificBundle, probeGridNode, sampleGridTrilinear, loadMeshPair, and objectIdForCell.

- [ ] **Step 1: Write failing loader tests**

Cover schema version, hash/length mismatch, array overlap/range/alignment, non-finite values, components, streamline offsets, missing IDs, 5 cm alignment, boundary clamping, and fetch errors.

~~~typescript
test('grid-node probes preserve float32 bits', () => {
  const fixture = scientificFixture();
  const bundle = decodeScientificBundle(fixture.manifest, fixture.blob);
  expect(probeGridNode(bundle.smoke.grid, [1, 1, 1]))
    .toBe(bundle.smoke.grid.speed[13]);
});
~~~

- [ ] **Step 2: Run and confirm failure**

Run: bun test tests/unit/scientific.test.ts

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
  city: {terrain: MeshPair; buildings: MeshPair; objectIds: Map<number, string>};
  smoke: {grid: ScientificGrid; slice: SliceData; streamlines: StreamlineData};
  heat: {grid: ScientificGridRef};
};
~~~

Do not import renderer libraries.

- [ ] **Step 4: Implement strict loading**

Validate metadata before typed-array views. Fetch via assetUrl; errors include URL and HTTP status. Verify SHA-256 through crypto.subtle.digest in the browser path.

- [ ] **Step 5: Implement probes and IDs**

Index x-fastest as x + nx * (y + ny * z). Trilinear sampling clamps at boundaries. Missing cell_object_index or object-map entries throw and never fabricate IDs.

- [ ] **Step 6: Verify and commit**

~~~bash
bun test tests/unit/scientific.test.ts
bunx tsc --noEmit
git add src/lib/scientific.ts tests/unit/scientific.test.ts
git commit -m "feat: validate and load scientific artifacts"
~~~

### Task 4: Add shared controls and measurement probes

**Files:**
- Modify: src/lib/chrome.ts
- Modify: tests/unit/chrome.test.ts
- Modify: src/lib/scientific.ts
- Modify: tests/unit/scientific.test.ts

**Interfaces:**
- Produces: button controls, safe readouts, ScientificProbe, and FrameSampler.

- [ ] **Step 1: Write failing UI tests**

Test one callback per button click and textContent-only readouts. Define:

~~~typescript
export type ScientificProbe = {
  renderer: 'vtkjs' | 'threejs';
  canvasCount: number;
  field: true;
  provenance: {smoke: 'synthetic'; heat: 'simulation'};
  selectedObjectId?: string;
  selectedValue?: {field: string; value: number; unit: string; world: [number, number, number]};
  frameTimesMs: number[];
};
~~~

- [ ] **Step 2: Run and confirm failure**

Run: bun test tests/unit/chrome.test.ts tests/unit/scientific.test.ts

- [ ] **Step 3: Implement the smallest UI extension**

Add a button Control variant and return setReadout(label, value) from mountChrome. Keep camera, picking, transfer functions, and GPU code in page modules.

- [ ] **Step 4: Implement identical frame sampling**

Ignore 30 warmup frames and retain the next 180 requestAnimationFrame deltas. Publish raw deltas; aggregate later.

- [ ] **Step 5: Verify and commit**

~~~bash
bun test tests/unit/chrome.test.ts tests/unit/scientific.test.ts
bunx tsc --noEmit
git add src/lib/chrome.ts src/lib/scientific.ts tests/unit/chrome.test.ts tests/unit/scientific.test.ts
git commit -m "feat: add shared scientific controls and probes"
~~~

### Task 5: Build the vtk.js reference page

**Files:**
- Create: pages/13-vtkjs-scientific/index.html
- Create: pages/13-vtkjs-scientific/main.ts
- Modify: tests/smoke.spec.ts

**Interfaces:**
- Consumes: ScientificBundle and shared controls.
- Produces: /13-vtkjs-scientific/ and a vtkjs ScientificProbe.

- [ ] **Step 1: Register a failing smoke test**

Add the page to PAGES and FIELD_PAGES. Assert renderer vtkjs, one canvas, both provenance categories, a non-empty selected ID, and an m/s selected value.

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

Use vtk cell picking and resolve cells through cell_object_index. Sample fields through the shared trilinear function. Add slice, color range, opacity, streamlines, camera reset, and data-case controls.

- [ ] **Step 5: Expose probes and visible errors**

Record one fixed pick, node/interpolated probes, alignment landmarks, APIs, frame samples, and canvas count. Route failures through reportFailure.

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
- Consumes: the same bundle, controls, cameras, probes, and gates as Task 5.
- Produces: /14-threejs-scientific/ and a threejs ScientificProbe.

- [ ] **Step 1: Register failing parity checks**

Use the Task 5 assertions with renderer threejs and require exactly one canvas.

- [ ] **Step 2: Confirm missing-page failure**

Run: bun run build && bunx playwright test tests/smoke.spec.ts --grep "14-threejs-scientific"

- [ ] **Step 3: Build one Three.js scene**

Use one WebGLRenderer, PerspectiveCamera, and OrbitControls. Convert neutral city arrays to BufferGeometry and retain triangle-to-building lookup. Use Data3DTexture. The installed public addon three/addons/shaders/VolumeShader.js is a measured starting point, but it only supplies maximum-intensity and isosurface modes; it does not satisfy transparent front-to-back compositing. Write the smallest compositing shader needed for the gate and count every retained or changed GLSL line against Three.js.

Render the slice as a DataTexture plane and Core-precomputed streamlines as lines/tubes. Do not integrate streamlines in-browser.

- [ ] **Step 4: Add equivalent interaction**

Use Raycaster.faceIndex for canonical building selection. Sample values through the same neutral function. Mirror every vtk.js control and readout.

- [ ] **Step 5: Expose equivalent probes**

Use identical probe positions, camera, warmup/sample windows, provenance, and alignment landmarks.

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
expect(vtk.selectedObjectId).toBe(three.selectedObjectId);
expect(distance(vtk.alignment.world, three.alignment.world)).toBeLessThanOrEqual(0.05);
expect(vtk.canvasCount).toBe(1);
expect(three.canvasCount).toBe(1);
~~~

Also test all controls, provenance labels, corrupt/missing data errors, and real heat.

- [ ] **Step 2: Run Chromium and observe failures**

Run: bunx playwright test tests/scientific.spec.ts

- [ ] **Step 3: Make only parity/correctness fixes**

Normalize cameras, controls, fixed probes, errors, and probe output. Do not tune visual quality or performance here.

- [ ] **Step 4: Add occlusion evidence**

Capture fixed outside and behind-building views. Keep screenshots in ignored screens/. Assert targeted depth behavior rather than committing regenerated images.

- [ ] **Step 5: Run browser matrix**

Add chromium, firefox, and webkit projects when absent. Run the scientific suite in all three and the full smoke suite once.

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
- Modify: tests/unit/scientific.test.ts
- Modify: package.json
- Create: docs/scientific-visualization-measurements.md

**Interfaces:**
- Consumes: built pages and raw frameTimesMs.
- Produces: machine-readable JSON plus the measurement table.

- [ ] **Step 1: Write aggregation tests**

Feed known frame times and assert warmup exclusion, p50, p95, minimum FPS, and classifications below 20, 20-30, and at least 30 FPS.

- [ ] **Step 2: Confirm missing-export failure**

Run: bun test tests/unit/scientific.test.ts

- [ ] **Step 3: Implement repeatable measurement**

Run three cold 1280x800 browser contexts per page. Record navigation-to-ready, 180 frame deltas, resource transfer sizes, dist bundle sizes, and performance.memory only when supported. Unsupported memory is null.

Add: "measure:scientific": "bun run build:pages && node scripts/measure-scientific.mjs".

- [ ] **Step 4: Count burden from the diff**

Per path count non-blank unique TypeScript, custom GLSL, data copies, adapters, public addons, experimental APIs, and private APIs. Exclude shared loader, controls, tests, and generated data.

- [ ] **Step 5: Populate evidence without choosing early**

Record correctness, browsers, load p50, frame p50/p95, minimum FPS, transfer/bundle size, code burden, copies, and API stability. Mark unavailable measurements.

- [ ] **Step 6: Commit**

~~~bash
git add scripts/measure-scientific.mjs tests/unit/scientific.test.ts package.json docs/scientific-visualization-measurements.md
git commit -m "perf: measure scientific renderer tradeoffs"
~~~

### Task 9: Run the four-hour VTK.wasm probe

**Files:**
- Create: spikes/vtk-wasm/README.md
- Create on success only: spikes/vtk-wasm/probe.html and probe.ts

**Interfaces:**
- Consumes: the same manifest/binary URLs.
- Produces: reproducible yes/no evidence; no root dependency.

- [ ] **Step 1: Record start time and success gate**

The gate is: load the manifest, create one standalone session, register one canvas, show city plus one volume or slice, and report initialization time and transferred bytes.

- [ ] **Step 2: Probe in a temporary package**

Use a directory outside the repo and the current Kitware TypeScript guide. Do not add @kitware/vtk-wasm to root package.json.

- [ ] **Step 3: Stop at four focused hours**

On success, copy only minimal reproducible code. On failure, record the exact last success, error, runtime size, browser, and stop reason. Do not keep debugging.

- [ ] **Step 4: Add the separate result to the report**

VTK.wasm cannot rescue either main path or be selected during this spike.

- [ ] **Step 5: Commit**

~~~bash
git add spikes/vtk-wasm docs/scientific-visualization-measurements.md
git commit -m "docs: record VTK.wasm feasibility probe"
~~~

### Task 10: Publish evidence and prepare replies

**Files:**
- Modify: pages/00-index/main.ts, README.md, NOTES.md, and measurement report.
- Modify outside repo: /Users/sarmatas/Projects/dtcc/messages/slack-anders-scientific-visualization-reply.md
- Create outside repo: /Users/sarmatas/Projects/dtcc/messages/reply-dtcc-twin-1-scientific-spike.md

**Interfaces:**
- Consumes: verified measurements.
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

### Task 11: Build the deferred teaching workspace

**Files:** Created outside the repo through the teach skill:
- MISSION.md and RESOURCES.md
- assets/course.css
- reference/dtcc-3d-and-repository-map.html
- lessons/0001-explain-the-dtcc-3d-assignment.html
- lessons/0002-understand-the-renderer-limitations.html
- lessons/0003-explain-the-scientific-visualization-spike.html
- lessons/0004-rehearse-the-meeting-conversation.html
- learning-records/0001-assignment-baseline.md

**Interfaces:**
- Consumes: final evidence, issue comments, meeting notes, repos, and primary documentation.
- Produces: a stateful learning path for explaining the assignment in meetings.

- [ ] **Step 1: Invoke teach after reply drafts are ready**

Use the mission: explain the assignment, evidence, repo relationships, limitations, and architecture without relying on the agent during a meeting.

- [ ] **Step 2: Build four short retrieval-based lessons**

Lesson 1 teaches the assignment and Core/Sim-to-browser repository map. Lesson 2 teaches MapLibre custom-layer terrain limits, fields, shaders, picking, slices, streamlines, volume, and occlusion using the bench evidence. Lesson 3 teaches the compared architecture and how to interpret the measurements. Lesson 4 rehearses the issue history, Anders's proposal, the recommendation, and a two-minute meeting explanation. Each lesson uses equal-length-option quizzes or active recall rather than passive reading.

- [ ] **Step 3: Open the lesson and wait for practice**

Do not mark the learning record complete until the user responds to the retrieval exercise.

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
| 9 | 2-3 | Reuse artifacts, not main renderers |
| 10 | 7-9 | Report verified results only |
| 11 | 10 | Teach from final evidence |

Tasks 5 and 6 can run in parallel worktrees after Task 4. Tasks 8 and 9 can run in parallel after Task 7. All other tasks are sequential because they define or consume the same contracts.

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
