/**
 * Page 13 — the vtk.js scientific reference scene.
 *
 * One vtkFullScreenRenderWindow, one canvas, one bundle: DTCC terrain and
 * buildings, the synthetic DTCC smoke grid as a volume and a z slice, Core's
 * precomputed streamlines, and the dtcc-sim urban-heat grid as a second
 * provenance category. Task 6 mirrors this page in Three.js, so every number,
 * camera, probe and readout here comes from the shared, renderer-free modules
 * (src/lib/scientific-data.ts, src/lib/scientific-probes.ts) rather than being
 * re-derived locally — that is the only way Task 7's parity suite can blame a
 * renderer for a difference instead of blaming two divergent pages.
 *
 * Three contract facts this page is built on (plan Contract Amendments A1):
 *  1. A face marker is a *conditioned mesher region*, not a building. The
 *     objects table is keyed by marker and fans out to sourceIndexes/dtccIds.
 *     Nothing here flattens a multi-source entry or renames a sourceIndex.
 *  2. An empty {sourceIndexes: [], dtccIds: []} entry is valid data — 103 of
 *     the tile's 206 markers. The readout states the absence in words via
 *     describeTraceability; it never renders a blank row.
 *  3. Identity is unstable_observed, so canonical traceability has *failed*:
 *     objectRefForCell reports 'run-local' for an attributed marker and 'none'
 *     for a split-added one. This page does not re-derive that verdict.
 */

import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';

import {mountChrome, requireWebGL2} from '@lib/chrome';
import type {Control} from '@lib/chrome';
import {assetUrl} from '@lib/dataset';
import {colormap} from '@lib/colormap';
import {loadScientificBundle} from '@lib/scientific-data';
import type {MeshPair, ScientificBundle, ScientificManifest} from '@lib/scientific-data';
import {
  ALIGNMENT_TOLERANCE_M, alignmentDistance, attachContextLoss, createBenchmarkDriver,
  describeTraceability, diffResources, gridField, gridNodeIndex, heatGridField,
  interpolatedTolerance, objectRefForCell, orbitV1Pose, poseToEye, probeGridNode, resourcesEqual,
  sampleGridTrilinear,
} from '@lib/scientific-probes';
import type {
  BenchmarkResult, CameraPose, GpuTimer, GridField, PlacedCameraPose, ScientificProbe,
} from '@lib/scientific-probes';

type Ui = ReturnType<typeof mountChrome>;

/** The cell-data array name picking resolves through. */
const CELL_OBJECT_INDEX = 'cellObjectIndex';

/** The one deterministic startup pick recorded in the probe. */
const FIXED_PICK_CELL = 0;

/** The three data cases, named once so the select and the case table agree. */
const CASE_IDS = ['smoke · speed', 'smoke · pressure', 'heat · temperature'] as const;

/**
 * The drawing-buffer size every benchmark run is forced to, so the number is a
 * property of the renderer and not of this page's header height. The canvas
 * otherwise fills whatever space the chrome leaves (1280x492 here), and Task
 * 6's header text is a different length -- without this its frame times would
 * differ for a reason that has nothing to do with Three.js.
 */
const BENCHMARK_SURFACE: [number, number] = [1280, 720];

// ---------------------------------------------------------------------------
// The cross-renderer parity surface (Task 7). Every constant, every field and
// every function here exists on page 14 too, under the same name, in the same
// shape and the same units. A parity field that exists on one page only is
// worse than no field at all: the suite looks thorough and tests nothing.

/**
 * The drawing surface every parity measurement is pinned to, page 14's value.
 * It has to be pinned and it has to match: a parity test names a ray by a
 * FRACTION of the drawing surface, and that fraction only picks out the same
 * ray on both pages when both cameras have the same aspect ratio — which is
 * this surface's. The interactive surface is 1280x492 on both pages by a
 * header-wrapping coincidence (divergence #12), which is exactly the kind of
 * thing that must not be relied on.
 */
const PARITY_SURFACE: [number, number] = [1280, 720];

/** The fixed grid node every parity probe reports. Interior on both shipped
 *  grids (32^3 smoke, 64x64x32 heat), and asymmetric, so a transposed index
 *  would not land on itself. Page 14's value. */
const PARITY_NODE: [number, number, number] = [3, 5, 7];

/** The fixed OFF-node point, in node units, the interpolated probe reports.
 *  Deliberately half-way between nodes on every axis. Page 14's value. */
const PARITY_OFFSET: [number, number, number] = [3.5, 5.5, 7.5];

/** IEEE-754 float32 bit pattern of a value, so a grid-node readout can be
 *  compared bit-for-bit rather than approximately. Page 14's helper. */
function f32bits(value: number): number {
  const buf = new Float32Array(1);
  buf[0] = value;
  return new Uint32Array(buf.buffer)[0];
}

/** vtk.js entry points this page uses — the custom-code-burden list Task 7 compares. */
const VTK_APIS = [
  'Rendering/Misc/FullScreenRenderWindow', 'Common/DataModel/PolyData', 'Common/DataModel/ImageData',
  'Common/Core/DataArray', 'Rendering/Core/Mapper', 'Rendering/Core/Actor', 'Rendering/Core/Volume',
  'Rendering/Core/VolumeMapper', 'Rendering/Core/ImageMapper', 'Rendering/Core/ImageSlice',
  'Rendering/Core/ColorTransferFunction', 'Common/DataModel/PiecewiseFunction', 'Rendering/Core/CellPicker',
];

// ---------------------------------------------------------------------------
// Control state. mountChrome renders the header before the scene exists, so the
// handlers close over this and delegate to `scene` once it is built.

type Scene = {
  setSliceHeight(metres: number): void;
  setColourFraction(which: 'low' | 'high', value: number): void;
  setOpacity(value: number): void;
  setStreamlines(visible: boolean): void;
  resetCamera(): void;
  setCase(id: string): void;
};

let scene: Scene | null = null;
const controlCalls: Record<string, number> = {};

/**
 * Wraps a control callback so the page counts its own invocations. The smoke
 * test reads these back to prove one callback per click — chrome.ts's
 * controlHandler is unit-tested without a DOM, and this is the browser-side
 * half Task 4 could not assert.
 */
function counted<T>(id: string, fn: (value: T) => void): (value: T) => void {
  return value => {
    controlCalls[id] = (controlCalls[id] ?? 0) + 1;
    fn(value);
  };
}

const DEFAULT_OPACITY = 0.3;

// ---------------------------------------------------------------------------
// Neutral array -> vtk.js geometry. Nothing here interprets the data; it only
// restates the shipped arrays in vtk.js's own layout.

/** VTK cell array for a triangle soup: [3, a, b, c] per triangle. */
function triangleCells(indices: Uint32Array): Uint32Array {
  const triangles = indices.length / 3;
  const cells = new Uint32Array(triangles * 4);
  for (let t = 0; t < triangles; t++) {
    cells[t * 4] = 3;
    cells[t * 4 + 1] = indices[t * 3];
    cells[t * 4 + 2] = indices[t * 3 + 1];
    cells[t * 4 + 3] = indices[t * 3 + 2];
  }
  return cells;
}

/**
 * VTK cell array for the Core-precomputed streamlines: walk `vertexOffsets`,
 * where offsets[i]..offsets[i+1] bound line i. A degenerate line (fewer than
 * two vertices) is dropped rather than emitted as a zero-length cell; the
 * count of dropped lines is returned so the page can report it instead of
 * silently drawing fewer lines than the manifest declares.
 */
function polylineCells(vertexOffsets: number[]): {cells: Uint32Array; lines: number; dropped: number} {
  const kept: Array<[number, number]> = [];
  let dropped = 0;
  for (let i = 0; i < vertexOffsets.length - 1; i++) {
    const start = vertexOffsets[i], end = vertexOffsets[i + 1];
    if (end - start >= 2) kept.push([start, end]);
    else dropped++;
  }
  const size = kept.reduce((n, [s, e]) => n + (e - s) + 1, 0);
  const cells = new Uint32Array(size);
  let w = 0;
  for (const [start, end] of kept) {
    cells[w++] = end - start;
    for (let v = start; v < end; v++) cells[w++] = v;
  }
  return {cells, lines: kept.length, dropped};
}

function polyDataFromMesh(mesh: MeshPair): ReturnType<typeof vtkPolyData.newInstance> {
  const pd = vtkPolyData.newInstance();
  pd.getPoints().setData(mesh.positions, 3);
  pd.getPolys().setData(triangleCells(mesh.indices));
  pd.getPointData().setNormals(vtkDataArray.newInstance({name: 'normals', values: mesh.normals, numberOfComponents: 3}));
  return pd;
}

type ImageSpec = {
  dims: readonly [number, number, number];
  origin: readonly [number, number, number];
  spacing: readonly [number, number, number];
  scalars: {name: string; values: Float32Array};
  vectors?: {name: string; values: Float32Array};
};

function imageDataFrom(spec: ImageSpec): ReturnType<typeof vtkImageData.newInstance> {
  const image = vtkImageData.newInstance();
  image.setDimensions(spec.dims as [number, number, number]);
  image.setOrigin(spec.origin as [number, number, number]);
  image.setSpacing(spec.spacing as [number, number, number]);
  image.getPointData().setScalars(vtkDataArray.newInstance({
    name: spec.scalars.name, values: spec.scalars.values, numberOfComponents: 1,
  }));
  if (spec.vectors) {
    image.getPointData().setVectors(vtkDataArray.newInstance({
      name: spec.vectors.name, values: spec.vectors.values, numberOfComponents: 3,
    }));
  }
  return image;
}

function rangeOf(values: Float32Array): [number, number] {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  return [min, max];
}

// ---------------------------------------------------------------------------
// Live GPU-object counts.

type GlCounts = {buffers: number; textures: number; renderTargets: number; renderbuffers: number};

/**
 * Counts the GL objects vtk.js actually creates and deletes, by wrapping the
 * six create/delete entry points on the context instance before the first
 * render.
 *
 * The first version of this page hand-incremented `probe.resources` at each
 * construction site, which made every number a literal fixed at build time:
 * `resourcesEqual(before, after)` over 100 control/resize cycles was then true
 * by construction and could never have caught a leak. The declared numbers
 * were also wrong -- 10 buffers, 3 "textures" (vtkImageData objects, which are
 * CPU-side arrays) and 0 render targets, against a real 9 buffers, 18 textures
 * and 11 framebuffers. These counts are measurements.
 */
function instrumentGlObjects(gl: WebGL2RenderingContext | WebGLRenderingContext): GlCounts {
  const counts: GlCounts = {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0};
  const target = gl as unknown as Record<string, (...args: unknown[]) => unknown>;
  const wrap = (createName: string, deleteName: string, key: keyof GlCounts) => {
    const create = target[createName].bind(gl);
    const destroy = target[deleteName].bind(gl);
    // Membership, not truthiness: decrementing on any truthy argument lets a
    // double delete -- or a delete of an object created before the wrappers
    // were installed -- drive the count below the truth, and a count that can
    // go negative is not a measurement. This page needs the guard MORE than
    // page 14 does, not less: it can only wrap after vtkFullScreenRenderWindow
    // has built its context, so objects predating the wrappers genuinely exist
    // here, which is the exact case the WeakSet covers.
    const live = new WeakSet<object>();
    target[createName] = (...args: unknown[]) => {
      const object = create(...args);
      if (object) { live.add(object as object); counts[key]++; }
      return object;
    };
    target[deleteName] = (...args: unknown[]) => {
      const object = args[0];
      if (object && live.has(object as object)) { live.delete(object as object); counts[key]--; }
      return destroy(...args);
    };
  };
  wrap('createBuffer', 'deleteBuffer', 'buffers');
  wrap('createTexture', 'deleteTexture', 'textures');
  wrap('createFramebuffer', 'deleteFramebuffer', 'renderTargets');
  // The fourth type, added after Task 6's review measured vtk.js leaking one
  // renderbuffer per resize as well as one texture and one framebuffer. Without
  // it the published magnitude of the leak is understated by a third. Page 14
  // carries the same four wraps over the same WeakSet-guarded helper, so the
  // two pages count the same four types the same way.
  wrap('createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers');
  return counts;
}

// ---------------------------------------------------------------------------
// Geometry-wiring assertions. These throw; they are not reported.

/**
 * Cross-checks the shared module's grid indexing against vtk.js's own, on the
 * very image this page renders.
 *
 * This replaces a far-corner probe that compared `probeGridNode` against
 * `sampleGridTrilinear` and was a tautology: at an exact node the trilinear
 * sampler's `w === 0` skip collapses it to a single `probeGridNode` call
 * through the same `gridNodeIndex` and the same `field.dims`, so the two sides
 * are the same array element by construction, under any permutation of the
 * payload. Measured: it reported "identical" for a correct payload, a
 * z-fastest transposed payload and a reversed-garbage payload alike. Moving
 * the probe to an interior node does not help -- the collapse happens at every
 * exact node, and on this grid's irrational spacing the residual difference is
 * float noise (1e-15) that is present on the *correct* payload too.
 *
 * `vtkImageData.getOffsetIndexFromWorld` is a genuinely independent second
 * implementation: a world->index matrix plus vtk.js's own `computeOffsetIndex`,
 * sharing no code with `gridNodeIndex`.
 *
 * Be precise about which leg catches what, because the obvious reading is
 * wrong. A permuted `setDimensions`/`setOrigin`/`setSpacing` is caught by the
 * plain componentwise equality loop below, which throws first -- the vtk.js
 * legs never fire for those. What the matrix path adds is four classes that
 * loop cannot see at all: a permuted or flipped `direction` matrix, a wrong
 * `numberOfComponents`, a wrongly bound scalar array, and a shifted extent.
 * The last two are invisible to any componentwise comparison of dims, origin
 * and spacing. Verified by negative control, one permutation at a time.
 *
 * Known structural limit: x<->y via dims/spacing is a genuine no-op on both
 * shipped grids (32x32 and 64x64 in x/y), so it is undetectable here by
 * construction rather than by omission. x<->y via `direction` IS caught.
 *
 * What it still cannot check: whether the *shipped payload* is in the order it
 * claims. That is a declaration check, and only the smoke grid ships a
 * declaration (`order`, asserted against GRID_ORDER in scientific-data.ts).
 * field.grid.json carries no `order` field; see the probe panel.
 */
function assertGridWiring(caseId: string, field: GridField, image: ReturnType<typeof vtkImageData.newInstance>): void {
  const [nx, ny, nz] = field.dims;
  const dims = image.getDimensions();
  const origin = image.getOrigin();
  const spacing = image.getSpacing();
  for (let axis = 0; axis < 3; axis++) {
    if (dims[axis] !== field.dims[axis] || origin[axis] !== field.origin[axis] || spacing[axis] !== field.spacing[axis]) {
      throw new Error(
        `${caseId}: the vtkImageData geometry does not match the shipped grid -- `
        + `dims ${JSON.stringify(dims)} vs ${JSON.stringify(field.dims)}, `
        + `origin ${JSON.stringify(origin)} vs ${JSON.stringify(field.origin)}, `
        + `spacing ${JSON.stringify(spacing)} vs ${JSON.stringify(field.spacing)}`,
      );
    }
  }
  // Asymmetric nodes, anchored at (1, 1, 1) and stepped one node along each
  // axis in turn: the three offsets differ from the anchor's by 1, nx and
  // nx*ny, which stay distinct under every permutation of the axes. Plus one
  // off-axis node and three near-far nodes for reach along each axis.
  //
  // Every coordinate is strictly interior, in [1, n-2], and that is not
  // fastidiousness. `origin + i * spacing` does not round-trip exactly:
  // vtk.js's worldToIndex put the smoke grid's last x node at
  // 31.000000000000004 against an extent of 31, and the heat grid's y=0 face
  // at -3.6e-15, and getOffsetIndexFromWorld answers NaN outside the extent.
  // Both are float artefacts of probing the very edge of the volume -- and
  // this check reported both as indexing disagreements on its first two runs,
  // which is at least the right direction to fail in.
  const nodes: Array<[number, number, number]> = ([
    [1, 1, 1], [2, 1, 1], [1, 2, 1], [1, 1, 2], [3, 5, 7], [nx - 2, 1, 1], [1, ny - 2, 1], [1, 1, nz - 2],
  ] as Array<[number, number, number]>).filter(([i, j, k]) => i >= 1 && j >= 1 && k >= 1 && i <= nx - 2 && j <= ny - 2 && k <= nz - 2);
  for (const [i, j, k] of nodes) {
    const world: [number, number, number] = [
      field.origin[0] + i * field.spacing[0],
      field.origin[1] + j * field.spacing[1],
      field.origin[2] + k * field.spacing[2],
    ];
    const vtkOffset = image.getOffsetIndexFromWorld(world);
    const libOffset = gridNodeIndex(field.dims, i, j, k);
    if (vtkOffset !== libOffset) {
      throw new Error(`${caseId}: node (${i}, ${j}, ${k}) is offset ${libOffset} to gridNodeIndex but ${vtkOffset} to vtk.js`);
    }
    const vtkValue = image.getScalarValueFromWorld(world);
    const libValue = probeGridNode(field, i, j, k)[0];
    if (vtkValue !== libValue) {
      throw new Error(`${caseId}: node (${i}, ${j}, ${k}) reads ${libValue} through probeGridNode but ${vtkValue} through vtk.js`);
    }
  }
}

/**
 * Core's precomputed FieldSlice against the volume grid, trilinear at the same
 * world points, on PRESSURE.
 *
 * Pressure, not speed: the shipped smoke speed field is bit-identically
 * z-invariant (measured max |f(z) - f(z=0)| = 0.0, against 12.02 for pressure),
 * so a speed cross-check has exactly zero power over the z axis -- it would
 * report the same 1e-16 agreement for any slice height whatsoever. Pressure is
 * the only shipped slice array that varies in z.
 *
 * Asserted, not reported. It is the one check here that genuinely discriminates:
 * transposing the slice's a/b order moves the worst deviation from 3.8e-6 to
 * 24.7, against a tolerance of 8.2e-4.
 */
function assertCoreSliceAgrees(bundle: ScientificBundle, pressure: GridField, pressureSpan: number): number {
  const slice = bundle.smoke.slice;
  if (slice.axis !== 'z' || slice.fixedLocalAxis !== 2 || slice.localAxes[0] !== 0 || slice.localAxes[1] !== 1) {
    // Downgrading to a "not cross-checked" log line would leave the only
    // discriminating check in this file silently switched off.
    throw new Error(
      `smoke.slice: this page's a-fastest adapter is only known to be world-ascending for axis "z" with `
      + `localAxes [0, 1] and fixedLocalAxis 2; the manifest ships axis=${JSON.stringify(slice.axis)}, `
      + `localAxes=${JSON.stringify(slice.localAxes)}, fixedLocalAxis=${slice.fixedLocalAxis}. `
      + 'Re-measure the on-disk order before rendering it.',
    );
  }
  const res = slice.resolution;
  const [xmin, ymin, , xmax, ymax] = slice.domainLocalBounds;
  let worst = 0;
  for (let b = 0; b < res; b++) {
    for (let a = 0; a < res; a++) {
      const world: [number, number, number] = [
        xmin + (a * (xmax - xmin)) / (res - 1),
        ymin + (b * (ymax - ymin)) / (res - 1),
        slice.fixedLocalCoordinate,
      ];
      // "a-fastest, b-slower" over localAxes [0, 1] = x fastest, then y.
      const delta = Math.abs(slice.pressure[a + res * b] - sampleGridTrilinear(pressure, world)[0]);
      if (delta > worst) worst = delta;
    }
  }
  const tolerance = interpolatedTolerance(pressureSpan);
  if (!(worst <= tolerance)) {
    throw new Error(
      `smoke.slice: Core's FieldSlice pressure disagrees with the volume grid at z=${slice.fixedLocalCoordinate} m by `
      + `${worst.toExponential(4)} Pa, over the ${tolerance.toExponential(4)} interpolated tolerance for a span of ${pressureSpan}.`,
    );
  }
  return worst;
}

// ---------------------------------------------------------------------------
// Provenance and camera.

/**
 * The probe's two provenance categories, read off the manifest and *checked*
 * rather than restated from memory. Hard-coding `{smoke: 'synthetic', heat:
 * 'simulation'}` would make the smoke assertion vacuous — it would pass on a
 * manifest that had relabelled either case.
 */
function provenanceOf(manifest: ScientificManifest): ScientificProbe['provenance'] {
  const smoke = manifest.cases.smoke.dataCategory;
  const heat = manifest.cases.heat.dataCategory;
  if (smoke !== 'synthetic') throw new Error(`manifest cases.smoke.dataCategory is ${JSON.stringify(smoke)}, expected "synthetic"`);
  if (heat !== 'simulation') throw new Error(`manifest cases.heat.dataCategory is ${JSON.stringify(heat)}, expected "simulation"`);
  return {smoke: 'synthetic', heat: 'simulation'};
}

/**
 * The eye position for a pose handed to a BenchmarkDriver's renderFrame.
 *
 * orbitV1Pose returns a PlacedCameraPose that already carries `eye`, and this
 * page consumes that value — it never re-derives the trig, because CameraPose
 * states a z-up frame with azimuth measured from +x and vtk.js's default frame
 * is not that. BenchmarkDriver's `RenderFrame` callback type widens the pose
 * back to a bare `CameraPose`, which is why this reads `eye` defensively and
 * throws rather than silently recomputing when it is absent. A fallback would
 * be an unreachable branch that quietly switches the camera derivation -- the
 * exact shape of bug Task 4's residual fix existed to remove. Narrowing
 * `RenderFrame` to `PlacedCameraPose` in scientific-probes.ts would make this
 * function unnecessary; logged, not changed, since this task does not own
 * that file.
 */
function eyeOf(pose: CameraPose): [number, number, number] {
  const placed = pose as Partial<PlacedCameraPose>;
  if (!placed.eye) {
    throw new Error(
      'camera pose arrived without its derived eye position: every pose this page renders comes from '
      + 'orbitV1Pose, which ships `eye` with the pose. Re-deriving it here would silently reintroduce the '
      + 'z-up/azimuth-origin mismatch CameraPose exists to prevent.',
    );
  }
  return placed.eye;
}

// ---------------------------------------------------------------------------

if (requireWebGL2()) void main();

async function main(): Promise<void> {
  let ui: Ui | undefined;
  try {
    const bundle = await loadScientificBundle();
    const heat = await loadHeatValues(bundle);
    ui = mountChrome(chromeOptions(bundle));
    build(ui, bundle, heat);
  } catch (err) {
    const message = `13-vtkjs-scientific failed to start: ${(err as Error).message}`;
    // No bundle on this path, so the slice control falls back to the frame the
    // manifest would have supplied; the failure panel is the only thing that
    // matters here.
    (ui ?? (ui = mountChrome(chromeOptions()))).fail(message);
    console.error(message, err);
  }
}

/**
 * `bundle` is optional only for the startup-failure path, where mountChrome
 * exists purely to host `fail`. Everywhere else the slice control's range and
 * default come from the manifest's own coordinate frame and slice position --
 * a hard-coded 0..80 / 40 would happen to be right on this tile and silently
 * wrong on the next one.
 */
function chromeOptions(bundle?: ScientificBundle) {
  const localBounds = bundle?.manifest.coordinateFrame.localBounds;
  const sliceMin = localBounds ? localBounds[2] : 0;
  const sliceMax = localBounds ? localBounds[5] : 80;
  const sliceDefault = bundle ? bundle.smoke.slice.fixedLocalCoordinate : (sliceMin + sliceMax) / 2;
  const controls: Control[] = [
    {kind: 'select', id: 'data-case', label: 'Data case', options: [...CASE_IDS], value: CASE_IDS[0],
      onChange: counted('data-case', v => scene?.setCase(v))},
    {kind: 'range', id: 'slice-z', label: 'Slice height (m)',
      min: sliceMin, max: sliceMax, step: (sliceMax - sliceMin) / 80, value: sliceDefault,
      onChange: counted('slice-z', v => scene?.setSliceHeight(v))},
    {kind: 'range', id: 'range-low', label: 'Colour low (fraction of case range)', min: 0, max: 1, step: 0.01, value: 0,
      onChange: counted('range-low', v => scene?.setColourFraction('low', v))},
    {kind: 'range', id: 'range-high', label: 'Colour high (fraction of case range)', min: 0, max: 1, step: 0.01, value: 1,
      onChange: counted('range-high', v => scene?.setColourFraction('high', v))},
    {kind: 'range', id: 'opacity', label: 'Volume opacity', min: 0, max: 1, step: 0.01, value: DEFAULT_OPACITY,
      onChange: counted('opacity', v => scene?.setOpacity(v))},
    {kind: 'toggle', id: 'streamlines', label: 'Streamlines', value: true,
      onChange: counted('streamlines', v => scene?.setStreamlines(v))},
    {kind: 'button', id: 'camera-reset', label: 'Reset camera', onClick: counted<void>('camera-reset', () => scene?.resetCamera())},
  ];
  return {
    num: '13', title: 'VTK.js — scientific reference',
    expect: 'one canvas holding the whole scene: grey Gothenburg terrain with its buildings, the synthetic DTCC smoke '
      + 'field as a translucent volume above them, a coloured horizontal slice through that volume at the height the '
      + 'manifest declares for Core\'s FieldSlice (40 m on this tile), and 24 '
      + 'Core-precomputed streamlines threading it. Click a building to read its marker back — a conditioned mesher '
      + 'region, not a building, and on this tile its identity is run-local at best.',
    claim: 'Cannot display our simulation meshes at all — it has no concept of that kind of mesh. It stays useful for '
      + 'one thing: if we convert results to a regular grid first, it can draw them.',
    decision: 'Whether one vtk.js scene can carry city geometry and scientific fields together, with identity and '
      + 'values readable back. Task 6 builds the same scene in Three.js; Task 7 compares them.',
    correction: 'Picking returns a *conditioned mesher region*, not a building: 215 source buildings condition to 103 '
      + 'regions, the mesh carries 206 markers, and 103 of those were appended by the mesh splitter and have no source '
      + 'building at all. Canonical DTCC traceability fails on this tile — the footprint tiles carry no id, so Core '
      + 'mints a fresh uuid4 per load.',
    findings: [
      'Identity is unstable_observed, measured over two loads. An attributed marker reads back as run-local; a '
      + 'split-added marker reads back as having no source building, stated in words rather than as a blank row.',
      'The slice is the TRUE plane at the requested height, resampled through sampleGridTrilinear, not the nearest '
      + 'node layer. Snapping put it at 41.29 m while the page claimed 40 m: 0.15 Pa and 0.91 degC of error on the '
      + 'z-varying cases, invisible only on speed, which is z-invariant. Core\'s FieldSlice is cross-checked against '
      + 'the volume grid on pressure and the check now fails the page rather than logging a line.',
      'Measured vtk.js defect, reported not worked around: vtkOpenGLRenderWindow leaks up to one texture and one '
      + 'framebuffer per drawing-buffer resize and never deletes them. The counts climb monotonically — 8 textures / '
      + '1 framebuffer at startup, 14 / 7 after six viewport resizes, 20 / 13 after three benchmark runs — and never '
      + 'come back down. Growth tracks resizes, never frames. The probe\'s resources are live GL object counts, so '
      + 'the spec\'s "stable resource counts over 100 control/resize cycles" gate is a real measurement here, and '
      + 'this is what it finds.',
      'Axis order is asserted by running vtk.js\'s own world-to-offset implementation against the shared '
      + 'gridNodeIndex at asymmetric nodes on every grid. The check this replaced — probeGridNode against '
      + 'sampleGridTrilinear at the far corner — was a tautology: at an exact node the trilinear sampler collapses to '
      + 'a single probeGridNode call through the same index formula, and it reported "identical" for a correct '
      + 'payload, a transposed one and reversed garbage alike. The replacement was negative-controlled: permuting '
      + 'x/z in setDimensions or in setSpacing both fail the page at startup, and the slice cross-check fails at '
      + '24.69 Pa against a 8.2e-4 tolerance when its a/b order is transposed. Note that permuting x/y is a genuine '
      + 'no-op on these grids — 32x32 and 64x64 — so no check can see it. Whether a shipped payload matches its '
      + 'declared order is a declaration check; field.grid.json ships no order field. See the probe panel.',
      'DEFECT TASK 7 FOUND ON THIS PAGE, and it was on the screen the whole time: the colour-range control moved '
      + 'the volume and left the SLICE almost untouched. vtkImageProperty maps a scalar through its transfer '
      + 'function over [colorLevel - colorWindow/2, colorLevel + colorWindow/2] -- not over the transfer function\'s '
      + 'own range -- and vtk.js defaults those to 127.5/255. Measured: at a slice value of 4.51 m/s inside a '
      + '0.18..11.21 range this page drew rgb 35,109,175, the ramp sampled at 4.51/255, where the shared colormap '
      + 'says 97,200,140 -- which is exactly what page 14 drew for the same world point. Nothing on this page alone '
      + 'was wrong enough to fail a check; it took reading back the rendered pixel and comparing it with the other '
      + 'renderer. Fixed by driving colorWindow/colorLevel from the active colour range.',
      'Normalised for Task 7, and recorded because it is a real vtk.js behaviour: vtkCellPicker picks with a '
      + 'TOLERANCE by default (0.025 of the viewport diagonal in world units), and Three.js\'s Raycaster has none. '
      + 'Measured over the same 102-ray sweep under the same camera: vtk.js reported 77 hits to Three.js\'s 59, and '
      + 'where both hit they sometimes named different cells at different depths -- the tolerance lets a ray that '
      + 'misses every triangle report the nearest one anyway. With setTolerance(0) the two agree on all 59 hits, on '
      + 'the cell id, the marker and the intersection point to within a centimetre. A click still selects a building '
      + 'it lands on; what it no longer does is select one it merely lands near.',
      'Defect we found and fixed here: gl.finish() alone does not force a completed frame under Chrome\'s '
      + 'ANGLE/SwiftShader command buffer. The benchmark first reported a 0.45 ms mean CPU frame while the GPU timer '
      + 'reported 95 ms on the same frames — a 200x overstated frame rate. Each forced render now ends in a one-pixel '
      + 'readback, and CPU and GPU agree at about 98 ms (roughly 10 FPS, software rasterizer).',
    ],
    controls,
  };
}

/**
 * The urban-heat grid's values. loadScientificBundle already fetched and
 * hash-verified these bytes as a declared dependency but keeps only the
 * reference, so the array is fetched again here. Whether that second fetch is
 * served from the HTTP cache is the browser's business, not a guarantee -- and
 * either way these bytes are NOT re-hashed, only length-checked against the
 * reference's own dims. Returning the verified bytes from
 * loadScientificBundle would close that; out of scope here, since it is a
 * src/lib change.
 */
async function loadHeatValues(bundle: ScientificBundle): Promise<Float32Array> {
  const ref = bundle.heat.grid;
  const res = await fetch(assetUrl(ref.dataUrl));
  if (!res.ok) throw new Error(`heat grid ${ref.dataUrl}: ${res.status}`);
  const values = new Float32Array(await res.arrayBuffer());
  const expected = ref.dims[0] * ref.dims[1] * ref.dims[2];
  if (values.length !== expected) {
    throw new Error(`heat grid ${ref.dataUrl}: ${values.length} values but dims ${ref.dims.join('x')} need ${expected}`);
  }
  return values;
}

// ---------------------------------------------------------------------------

type DataCase = {
  id: string;
  fieldName: string;
  unit: string;
  field: GridField;
  image: ReturnType<typeof vtkImageData.newInstance>;
  range: [number, number];
};

function build(ui: Ui, bundle: ScientificBundle, heatValues: Float32Array): void {
  const manifest = bundle.manifest;
  const grid = bundle.smoke.grid;
  const objects = bundle.city.objects;
  const cellObjectIndex = bundle.city.buildings.cellObjectIndex;
  if (!cellObjectIndex) throw new Error('buildings mesh carries no cell_object_index');

  const probe: ScientificProbe = {
    renderer: 'vtkjs',
    status: 'ready',
    canvasCount: 0,
    field: true,
    provenance: provenanceOf(manifest),
    // buffers/textures/renderTargets are live GL object counts (see
    // instrumentGlObjects); listeners/observers are this page's own DOM
    // bookkeeping. Refreshed on every publish, so Task 7's before/after
    // comparison is a measurement rather than a pair of constants.
    resources: {buffers: 0, textures: 0, renderTargets: 0, listeners: 0, observers: 0},
    measurementValid: true,
  };
  let glCounts: GlCounts = {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0};
  let listeners = 0;
  let observers = 0;
  const publish = () => {
    // Five keys, because that is what ScientificProbe.resources declares and
    // src/lib is not this page's to change. The fourth GL object type
    // (renderbuffers) is published beside it under the same shape page 14
    // uses, so Task 7 can diff all four without special-casing either page.
    probe.resources = {
      buffers: glCounts.buffers, textures: glCounts.textures,
      renderTargets: glCounts.renderTargets, listeners, observers,
    };
    ui.setProbe('glObjects', {...glCounts, listeners, observers});
    // Recomputed, not snapshotted once: after context loss vtk.js's teardown
    // removes the canvas, and a stale 1 here would be the page reporting a
    // canvas that no longer exists.
    probe.canvasCount = ui.canvasHost.querySelectorAll('canvas').length;
    // The parity surface, refreshed on the same schedule as everything else
    // so Task 7 never reads a camera or a surface from before the last
    // control, resize or benchmark. Page 14 publishes it from its own
    // publish() the same way.
    ui.setProbe('parity', parityProbe());
    ui.setScientificProbe(probe);
  };

  // --- geometry ------------------------------------------------------------
  const terrainPd = polyDataFromMesh(bundle.city.terrain);
  const buildingsPd = polyDataFromMesh(bundle.city.buildings);
  // Carried as cell data so picking resolves a picked cell to its marker
  // through the dataset itself rather than through a side table.
  buildingsPd.getCellData().addArray(vtkDataArray.newInstance({
    name: CELL_OBJECT_INDEX, values: cellObjectIndex, numberOfComponents: 1,
  }));
  buildingsPd.buildCells();                           // vtkCellPicker needs random cell access
  if (buildingsPd.getNumberOfCells() !== buildingsPd.getPolys().getNumberOfCells()) {
    // vtkCellPicker's cell id counts verts, then lines, then polys. This page
    // relies on cell id == triangle index, which only holds for a polys-only
    // polydata -- assert it rather than assume it.
    throw new Error('buildings polydata carries cells other than polygons; cell ids would not equal triangle indices');
  }

  const {cells: streamlineCells, lines: streamlineCount, dropped: streamlinesDropped} = polylineCells(bundle.smoke.streamlines.vertexOffsets);
  const streamlinePd = vtkPolyData.newInstance();
  streamlinePd.getPoints().setData(bundle.smoke.streamlines.positions, 3);
  streamlinePd.getLines().setData(streamlineCells);
  streamlinePd.getPointData().setScalars(vtkDataArray.newInstance({
    name: 'speed', values: bundle.smoke.streamlines.speed, numberOfComponents: 1,
  }));

  // --- data cases ----------------------------------------------------------
  const smokeSpeedRange = rangeOf(grid.speed);
  const smokePressureRange = rangeOf(grid.pressure);
  const heatRef = bundle.heat.grid;
  const cases: DataCase[] = [
    {
      id: CASE_IDS[0], fieldName: 'speed', unit: manifest.fields.speed.unit,
      field: gridField(grid, 'speed'), range: smokeSpeedRange,
      image: imageDataFrom({dims: grid.dims, origin: grid.origin, spacing: grid.spacing,
        scalars: {name: 'speed', values: grid.speed}, vectors: {name: 'velocity', values: grid.velocity}}),
    },
    {
      id: CASE_IDS[1], fieldName: 'pressure', unit: manifest.fields.pressure.unit,
      field: gridField(grid, 'pressure'), range: smokePressureRange,
      image: imageDataFrom({dims: grid.dims, origin: grid.origin, spacing: grid.spacing,
        scalars: {name: 'pressure', values: grid.pressure}, vectors: {name: 'velocity', values: grid.velocity}}),
    },
    {
      id: CASE_IDS[2], fieldName: 'temperature', unit: heatRef.unit,
      field: heatGridField(heatRef, heatValues), range: [heatRef.min, heatRef.max],
      image: imageDataFrom({dims: heatRef.dims, origin: heatRef.origin, spacing: heatRef.spacing,
        scalars: {name: 'temperature', values: heatValues}}),
    },
  ];
  let active = cases[0];

  // --- wiring assertions, before a single actor exists ---------------------
  // These throw. A throw here reaches main()'s catch and renders the failure
  // panel, so the page can never come up "ready" with a grid it has not
  // checked. Reporting them instead is what let a tautological check sit in
  // this file unnoticed through a whole review round.
  for (const c of cases) assertGridWiring(c.id, c.field, c.image);
  const pressureField = gridField(grid, 'pressure');
  const pressureSpan = smokePressureRange[1] - smokePressureRange[0];
  const sliceWorstPa = assertCoreSliceAgrees(bundle, pressureField, pressureSpan);

  // --- render window -------------------------------------------------------
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0';
  ui.canvasHost.prepend(container);

  // rootContainer and listenWindowResize are real runtime options (see
  // FullScreenRenderWindow.js's model defaults); 36.12.1's .d.ts declares
  // neither, which is what the cast is for -- the same one page 11 carries.
  // listenWindowResize is off because this page owns exactly one
  // ResizeObserver, tied to ui.canvasHost, and a second resize path would make
  // resources.observers a lie.
  const fs = vtkFullScreenRenderWindow.newInstance({
    rootContainer: container, listenWindowResize: false,
    containerStyle: {height: '100%', width: '100%', position: 'absolute'},
    background: [0.93, 0.93, 0.92],
  } as any);
  const renderer = fs.getRenderer();
  const renderWindow = fs.getRenderWindow();
  const apiRenderWindow = fs.getApiSpecificRenderWindow();
  const drawingCanvas = apiRenderWindow.getCanvas() as HTMLCanvasElement | null;
  if (!drawingCanvas) throw new Error('vtk.js produced no drawing canvas');
  // Re-bound as a non-null const: `disposeGpuResources` below is a hoisted
  // function declaration, and TypeScript will not carry a narrowing into one.
  const canvas: HTMLCanvasElement = drawingCanvas;
  const gl = apiRenderWindow.get3DContext() as WebGL2RenderingContext | WebGLRenderingContext | null;
  // Wrapped before the first render, so every GL object vtk.js creates for this
  // scene is counted.
  if (gl) glCounts = instrumentGlObjects(gl);

  // --- actors --------------------------------------------------------------
  const terrainMapper = vtkMapper.newInstance(); terrainMapper.setInputData(terrainPd); terrainMapper.setScalarVisibility(false);
  const terrainActor = vtkActor.newInstance(); terrainActor.setMapper(terrainMapper);
  terrainActor.getProperty().setColor(0.62, 0.62, 0.60);
  renderer.addActor(terrainActor);

  const buildingsMapper = vtkMapper.newInstance(); buildingsMapper.setInputData(buildingsPd); buildingsMapper.setScalarVisibility(false);
  const buildingsActor = vtkActor.newInstance(); buildingsActor.setMapper(buildingsMapper);
  buildingsActor.getProperty().setColor(0.80, 0.78, 0.74);
  renderer.addActor(buildingsActor);

  const streamlineMapper = vtkMapper.newInstance();
  streamlineMapper.setInputData(streamlinePd);
  streamlineMapper.setScalarVisibility(true);
  const streamlineActor = vtkActor.newInstance(); streamlineActor.setMapper(streamlineMapper);
  streamlineActor.getProperty().setLineWidth(2);
  renderer.addActor(streamlineActor);

  const ctf = vtkColorTransferFunction.newInstance();
  // The opacity the top transfer-function node carries per unit of the
  // control, so the publish path below can invert it and report what the
  // SCENE holds rather than what the handler was told.
  const OPACITY_TOP_FRACTION = 0.6;
  const ofun = vtkPiecewiseFunction.newInstance();
  /** The control value recovered from the transfer function vtk.js actually
   *  holds. Returns null before the first applyTransferFunctions(). */
  const liveOpacityScale = (): number | null => {
    const size = ofun.getSize();
    if (!size) return null;
    const node: number[] = [];
    ofun.getNodeValue(size - 1, node);
    return node[1] / OPACITY_TOP_FRACTION;
  };
  const sliceOpacity = vtkPiecewiseFunction.newInstance();
  const streamlineCtf = vtkColorTransferFunction.newInstance();
  streamlineMapper.setLookupTable(streamlineCtf);
  streamlineMapper.setUseLookupTableScalarRange(true);

  const volumeMapper = vtkVolumeMapper.newInstance();
  volumeMapper.setInputData(active.image);
  volumeMapper.setSampleDistance(2);
  const volume = vtkVolume.newInstance(); volume.setMapper(volumeMapper);
  volume.getProperty().setRGBTransferFunction(0, ctf);
  volume.getProperty().setScalarOpacity(0, ofun);
  renderer.addVolume(volume);

  // The slice actor renders its own single-layer image, resampled at the exact
  // requested height (see applySlice) rather than the volume's nearest node
  // plane. Snapping to a node plane put the drawn surface 1.29 m off the 40 m
  // this page claims, which is 0.15 Pa / 0.91 degC of error on the z-varying
  // cases -- invisible only on speed, which is z-invariant.
  const sliceImage = vtkImageData.newInstance();
  const imageMapper = vtkImageMapper.newInstance();
  imageMapper.setInputData(sliceImage);
  const imageSlice = vtkImageSlice.newInstance(); imageSlice.setMapper(imageMapper);
  imageSlice.getProperty().setRGBTransferFunction(0, ctf);
  imageSlice.getProperty().setPiecewiseFunction(0, sliceOpacity);
  renderer.addActor(imageSlice);

  // --- colour / opacity ----------------------------------------------------
  let colourLow = 0, colourHigh = 1, opacityScale = DEFAULT_OPACITY;
  let sliceHeightM = bundle.smoke.slice.fixedLocalCoordinate;

  function activeColourRange(): [number, number] {
    const [min, max] = active.range;
    const span = max - min;
    const lo = min + Math.min(colourLow, colourHigh) * span;
    const hi = min + Math.max(colourLow, colourHigh) * span;
    // A collapsed range would divide by zero in every transfer function below.
    return hi > lo ? [lo, hi] : [lo, lo + (span || 1) * 1e-3];
  }

  function applyTransferFunctions(): void {
    const [lo, hi] = activeColourRange();
    ctf.removeAllPoints();
    streamlineCtf.removeAllPoints();
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const v = lo + f * (hi - lo);
      const [r, g, b] = colormap(v, lo, hi);
      ctf.addRGBPoint(v, r / 255, g / 255, b / 255);
    }
    // Streamlines carry their own speed scalars and keep their own ramp over
    // the streamline speed range, so they stay readable when the case switches
    // to pressure or temperature.
    const [slo, shi] = rangeOf(bundle.smoke.streamlines.speed);
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const v = slo + f * (shi - slo);
      const [r, g, b] = colormap(v, slo, shi);
      streamlineCtf.addRGBPoint(v, r / 255, g / 255, b / 255);
    }
    ofun.removeAllPoints();
    ofun.addPoint(lo, 0);
    ofun.addPoint(lo + 0.5 * (hi - lo), 0.05 * opacityScale);
    ofun.addPoint(hi, OPACITY_TOP_FRACTION * opacityScale);
    // The slice is translucent on purpose: an opaque plane hides the terrain
    // and buildings underneath it, and the point of this page is that one scene
    // carries both. The same opacity control drives it and the volume, so there
    // is one knob, not two -- and it is capped below 1 so the control's top end
    // cannot quietly undo that.
    const sliceAlpha = 0.25 + 0.6 * opacityScale;
    sliceOpacity.removeAllPoints();
    sliceOpacity.addPoint(lo, sliceAlpha);
    sliceOpacity.addPoint(hi, sliceAlpha);
    // DEFECT FOUND BY TASK 7, and it was visible on the screen the whole
    // time. vtkImageProperty maps a scalar through its transfer function over
    // [colorLevel - colorWindow/2, colorLevel + colorWindow/2] -- NOT over the
    // transfer function's own range -- and vtk.js defaults those to 127.5/255.
    // The volume honoured the colour-range control and the slice did not.
    // Measured: at a slice value of 4.51 m/s inside a 0.18..11.21 range the
    // drawn pixel was [35,109,175], which is the ramp sampled at 4.51/255,
    // where the shared colormap says [97,200,140] -- the colour page 14 drew
    // for the same world point through the same ramp. Task 7's GPU-pixel
    // comparison is what caught it: nothing on this page alone was wrong
    // enough to fail a check.
    imageSlice.getProperty().setColorWindow(hi - lo);
    imageSlice.getProperty().setColorLevel((hi + lo) / 2);
    ui.setReadout('Colour range', `${lo.toFixed(2)} – ${hi.toFixed(2)} ${active.unit}`);
  }

  /**
   * Rebuilds the slice image as the true horizontal plane at `sliceHeightM`,
   * resampled through the shared `sampleGridTrilinear` onto the active grid's
   * own x/y lattice. Requested height == rendered height by construction, so a
   * Three.js page sampling at the same height in Task 6 is comparing like with
   * like.
   */
  function applySlice(): void {
    const field = active.field;
    const [nx, ny] = field.dims;
    const values = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        values[i + nx * j] = sampleGridTrilinear(field, [
          field.origin[0] + i * field.spacing[0],
          field.origin[1] + j * field.spacing[1],
          sliceHeightM,
        ])[0];
      }
    }
    sliceImage.setDimensions([nx, ny, 1]);
    sliceImage.setOrigin([field.origin[0], field.origin[1], sliceHeightM]);
    // The third spacing is the single-layer thickness vtk.js needs for a
    // [nx, ny, 1] image; it never positions anything, the origin does.
    sliceImage.setSpacing([field.spacing[0], field.spacing[1], field.spacing[2]]);
    sliceImage.getPointData().setScalars(vtkDataArray.newInstance({
      name: `${active.fieldName}-slice`, values, numberOfComponents: 1,
    }));
    imageMapper.setKSlice(0);
    ui.setReadout('Slice', `z = ${sliceHeightM.toFixed(2)} m exactly — the ${nx}×${ny} plane resampled through `
      + 'sampleGridTrilinear, not snapped to the nearest node layer');
  }

  // --- camera --------------------------------------------------------------
  function applyPose(pose: CameraPose): void {
    const eye = eyeOf(pose);
    const camera = renderer.getActiveCamera();
    camera.setPosition(eye[0], eye[1], eye[2]);
    camera.setFocalPoint(pose.target[0], pose.target[1], pose.target[2]);
    // The bundle's local frame is z-up (scientific-data.ts's coordinateFrame);
    // vtk.js imposes no up of its own, so stating it here is the whole
    // reconciliation CameraPose's contract asks of a page.
    camera.setViewUp(0, 0, 1);
    renderer.resetCameraClippingRange();
  }

  // --- identity and sampling ----------------------------------------------
  const positions = bundle.city.buildings.positions;
  const indices = bundle.city.buildings.indices;

  function cellCentroid(cellId: number): [number, number, number] {
    const out: [number, number, number] = [0, 0, 0];
    for (let corner = 0; corner < 3; corner++) {
      const v = indices[cellId * 3 + corner] * 3;
      out[0] += positions[v] / 3; out[1] += positions[v + 1] / 3; out[2] += positions[v + 2] / 3;
    }
    return out;
  }

  function sampleAt(world: [number, number, number]): void {
    const value = sampleGridTrilinear(active.field, world)[0];
    probe.selectedValue = {field: active.fieldName, value, unit: active.unit, world};
    ui.setReadout('Sampled value',
      `${value.toFixed(4)} ${active.unit} (${active.fieldName}) at (${world.map(c => c.toFixed(1)).join(', ')})`);
  }

  /**
   * Resolve one picked cell all the way to its identity readout: cell ->
   * marker (through the polydata's own cell data, the same array the picker
   * indexes) -> objectRefForCell. The verdict comes back from the shared
   * module; this function only renders it.
   */
  function selectCell(cellId: number): void {
    const array = buildingsPd.getCellData().getArrayByName(CELL_OBJECT_INDEX);
    if (!array) throw new Error(`buildings polydata lost its ${CELL_OBJECT_INDEX} cell-data array`);
    const markers = array.getData();
    if (!Number.isInteger(cellId) || cellId < 0 || cellId >= markers.length) {
      // Clear, never leave the previous marker published: a stale
      // selectedObject would read as the identity of a cell that was not
      // selected.
      delete probe.selectedObject;
      ui.setReadout('Pick', `cell ${cellId} is outside the buildings mesh (${markers.length} cells)`);
      ui.setReadout('Marker', 'none — nothing is selected');
      ui.setReadout('Source buildings', 'none — nothing is selected');
      ui.setReadout('DTCC ids', 'none — nothing is selected');
      ui.setReadout('Traceability', 'not applicable — nothing is selected');
      publish();
      return;
    }
    const marker = markers[cellId];
    const ref = objectRefForCell(objects, bundle.city.identityStability, marker);
    probe.selectedObject = ref;
    ui.setReadout('Pick', `cell ${cellId}`);
    ui.setReadout('Marker', `${marker} — a conditioned mesher region, not a building`);
    ui.setReadout('Source buildings', ref.sourceIndexes.length
      ? `${ref.sourceIndexes.length}: source index ${ref.sourceIndexes.join(', ')}`
      : 'none — this region has no source building');
    ui.setReadout('DTCC ids', ref.dtccIds.length ? ref.dtccIds.join(', ') : 'none — there is no id to trace');
    ui.setReadout('Traceability', describeTraceability(ref.traceability));
    sampleAt(cellCentroid(cellId));
    publish();
  }

  // --- case switching ------------------------------------------------------
  function setCase(id: string): void {
    const next = cases.find(c => c.id === id);
    if (!next) return;
    active = next;
    volumeMapper.setInputData(active.image);
    applyTransferFunctions();
    applySlice();
    ui.setReadout('Data case', `${active.id} (${active.unit}), grid ${active.field.dims.join('×')}`);
    if (probe.selectedValue) sampleAt(probe.selectedValue.world);
    publish();
    renderWindow.render();
  }

  // Every handler ends in publish(), matching page 14. vtk.js allocates nothing
  // on these paths today (measured), so the numbers do not move -- but a probe
  // that goes stale on a path which CAN change what it reports is exactly the
  // defect closed on the resize path in ce187bf, and it was still sitting on
  // these handlers. Task 7 joins on this surface, so both pages refresh alike.
  scene = {
    setSliceHeight(metres) { sliceHeightM = metres; applySlice(); renderWindow.render(); publish(); },
    setColourFraction(which, value) {
      if (which === 'low') colourLow = value; else colourHigh = value;
      applyTransferFunctions(); renderWindow.render(); publish();
    },
    setOpacity(value) { opacityScale = value; applyTransferFunctions(); renderWindow.render(); publish(); },
    setStreamlines(visible) { streamlineActor.setVisibility(visible); renderWindow.render(); publish(); },
    resetCamera() { applyPose(orbitV1Pose(0)); renderWindow.render(); publish(); },
    setCase,
  };

  // --- resize: one observer, disposed with the renderer --------------------
  const resizeObserver = new ResizeObserver(() => {
    const rect = ui.canvasHost.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    apiRenderWindow.setSize(Math.max(1, Math.floor(rect.width * dpr)), Math.max(1, Math.floor(rect.height * dpr)));
    renderer.resetCameraClippingRange();
    renderWindow.render();
    // Resizing is the ONLY thing that leaks (vtk.js drops a texture and a
    // framebuffer per drawing-buffer resize), so it is the one path that must
    // refresh the counts that would reveal it. Without this, Task 7's "100
    // control/resize cycles with stable resource counts" gate reads the
    // pre-resize snapshot and concludes "stable" while 100 textures and 100
    // framebuffers have leaked -- the gate passing for the wrong reason, which
    // is the exact thing the live-count change was made to stop.
    publish();
  });
  resizeObserver.observe(ui.canvasHost);
  observers += 1;

  // --- picking -------------------------------------------------------------
  const picker = vtkCellPicker.newInstance();
  picker.setTolerance(0);
  picker.setPickFromList(true);
  picker.initializePickList();
  picker.addPickList(buildingsActor);
  const onPointerDown = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const [width, height] = apiRenderWindow.getSize() as [number, number];
    // vtk.js display coordinates: render-window pixels, origin bottom-left.
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = (1 - (event.clientY - rect.top) / rect.height) * height;
    picker.pick([x, y, 0], renderer);
    const cellId = picker.getCellId();
    if (cellId < 0) { ui.setReadout('Pick', 'no building under the cursor'); publish(); return; }
    selectCell(cellId);
    renderWindow.render();
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  listeners += 1;

  // --- benchmark -----------------------------------------------------------
  const gpuTimer = gl ? makeGpuTimer(gl) : undefined;
  /**
   * Forces the frame just submitted to *complete* before renderFrame returns,
   * which is what BenchmarkDriver's contract ("must not return until the frame
   * is actually rendered") requires and what makes cpuFrameTimesMs comparable
   * to a frame budget.
   *
   * `gl.finish()` alone is not enough here, measured: under Chrome's
   * ANGLE/SwiftShader command buffer it returns after submission, and the
   * benchmark then reported a 0.45 ms mean frame while the GPU timer on the
   * very same frames reported 95 ms — a 200x overstatement of the frame rate,
   * on a page whose whole purpose is to measure frame rate. A one-pixel
   * readback is a real pipeline sync and closes that gap.
   */
  const pixel = new Uint8Array(4);
  const forceCompletion = gl
    ? () => { gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); }
    : () => { /* no context, nothing to sync */ };
  /**
   * Benchmark frames rendered so far, published through the parity surface so
   * a test can force context loss WHILE A RUN IS ACTUALLY IN FLIGHT instead of
   * waiting a fixed number of seconds and hoping. Page 14 carries the same
   * counter. Added after firefox caught the wall-clock version passing for the
   * wrong reason: a whole 210-frame run finishes in about a second on a real
   * GPU, so a 2-second wait meant the "sampling stopped" assertion was made
   * against a benchmark that had already finished.
   */
  let benchmarkFrames = 0;
  const driver = createBenchmarkDriver({
    renderFrame: pose => {
      benchmarkFrames += 1;
      applyPose(pose);
      renderWindow.render();
      forceCompletion();
    },
    gpuTimer,
  });

  /**
   * orbit-v1 at a fixed drawing-buffer size. The canvas otherwise fills
   * whatever the page chrome leaves it, and this page's header is a different
   * height from Task 6's -- pinning the surface keeps the frame times a
   * property of the renderer. The ResizeObserver is stood down for the run so
   * it cannot resize the surface mid-measurement.
   *
   * The two setSize calls that pin and restore the surface cost two GL objects
   * apiece -- see the growth report below; that is vtk.js's, not this page's.
   */
  async function runBenchmark(): Promise<BenchmarkResult> {
    const resourcesBefore = {...glCounts, listeners, observers};
    const restoreSize = apiRenderWindow.getSize() as [number, number];
    resizeObserver.unobserve(ui.canvasHost);
    apiRenderWindow.setSize(BENCHMARK_SURFACE[0], BENCHMARK_SURFACE[1]);
    renderer.resetCameraClippingRange();
    try {
      const result = await driver.runBenchmark();
      probe.benchmark = result;
      recordRenderSurface('benchmark');
      publish();
      return result;
    } finally {
      apiRenderWindow.setSize(restoreSize[0], restoreSize[1]);
      resizeObserver.observe(ui.canvasHost);
      renderWindow.render();
      recordRenderSurface('interactive');
      // After the restore setSize, not before it: the in-try publish() above
      // runs while the surface is still pinned to BENCHMARK_SURFACE, so it
      // misses the restore's own resize leak and under-reports by one.
      publish();
      const resourcesAfter = {...glCounts, listeners, observers};
      if (!resourcesEqual(resourcesBefore, resourcesAfter)) {
        ui.probe(`vtk.js 36.12.1 GL-object growth across one benchmark run: `
          + `${JSON.stringify(diffResources(resourcesBefore, resourcesAfter))}. Measured, monotonic, and NOT this `
          + 'page\'s doing: every drawing-buffer resize leaks up to one texture and one framebuffer that vtk.js '
          + 'never deletes. Six viewport resizes take the counts from 8/1 to 14/7; three benchmark runs (two resizes '
          + 'each) take them to 20/13. Nothing this page allocates grows -- buffers, listeners and observers are flat.');
      }
    }
  }

  /**
   * The render surface every frame time has to be read against: Task 6 must
   * record the same key, or its numbers are not comparable. antialias:true, in
   * particular, means the one-pixel readback that forces frame completion also
   * forces an MSAA resolve — a page at antialias:false pays a different cost at
   * the same sync point.
   */
  function recordRenderSurface(phase: 'interactive' | 'benchmark'): void {
    const payload = {
      phase,
      benchmarkSize: BENCHMARK_SURFACE,
      drawingBufferWidth: gl ? gl.drawingBufferWidth : null,
      drawingBufferHeight: gl ? gl.drawingBufferHeight : null,
      devicePixelRatio: window.devicePixelRatio,
      contextAttributes: gl ? gl.getContextAttributes() : null,
    };
    // Written to a phase-specific key as well as the rolling one. The
    // benchmark record used to be overwritten moments later by the 'interactive'
    // record that runBenchmark's finally block writes on restore, so the
    // evidence that frame times were measured at the pinned surface existed
    // only transiently and neither Task 7 nor Task 8 could read it back. Both
    // pages keep both records, under the same keys.
    ui.setProbe(phase === 'benchmark' ? 'renderSurfaceBenchmark' : 'renderSurfaceInteractive', payload);
    ui.setProbe('renderSurface', payload);
  }

  // --- context loss --------------------------------------------------------
  let disposed = false;
  function disposeGpuResources(): void {
    if (disposed) return;
    disposed = true;
    resizeObserver.disconnect();
    observers -= 1;
    canvas.removeEventListener('pointerdown', onPointerDown);
    listeners -= 1;
    try {
      fs.delete();
    } catch (err) {
      // The GL context is already gone; vtk.js's own teardown can throw on the
      // way down. Recorded rather than swallowed, and never allowed to stop
      // the visible failure below from rendering.
      ui.probe(`vtk.js teardown after context loss: ${(err as Error).message}`);
    }
  }

  // Attached to the drawing canvas vtk.js renders into -- not ui.canvasHost,
  // which never has a GL context and would never see the event.
  attachContextLoss(canvas, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources,
    onLost: () => {
      publish();
      ui.fail('The WebGL context was lost. Measurements from this session are no longer valid — reload to start a new one.');
    },
  });
  listeners += 1;

  // --- cross-renderer parity surface (Task 7) ------------------------------
  // Primitives, not conclusions. The fixed rays, the fixed poses and the
  // thresholds live in tests/scientific.spec.ts, in ONE place, so the two
  // pages cannot drift apart on them the way two copies of an assertion
  // block could. What lives here is only what a page can answer about
  // itself: where its camera is, what its own picker resolves, what its own
  // shader wrote into its own drawing buffer.

  // Read once, off the DEFAULT framebuffer, exactly as page 14 reads it:
  // SAMPLES is a property of the BOUND framebuffer, and nothing this page
  // renders has bound an FBO yet at the time publish() first runs. Recorded
  // rather than re-read per publish so a later bound target cannot silently
  // change the number Task 7 compares.
  const canvasSamples = gl ? (() => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return gl.getParameter(gl.SAMPLES) as number;
  })() : null;

  let parityRestore: (() => void) | null = null;
  const parityPixelBuf = new Uint8Array(4);

  /** Pins the drawing surface and applies one fixed pose. Idempotent; the
   *  interactive surface is captured on the first call only. */
  function parityBegin(pose: {target: [number, number, number]; radius: number; elevationDeg: number; azimuthDeg: number}) {
    if (!parityRestore) {
      const restoreSize = apiRenderWindow.getSize() as [number, number];
      resizeObserver.unobserve(ui.canvasHost);
      parityRestore = () => {
        apiRenderWindow.setSize(restoreSize[0], restoreSize[1]);
        resizeObserver.observe(ui.canvasHost);
      };
    }
    apiRenderWindow.setSize(PARITY_SURFACE[0], PARITY_SURFACE[1]);
    // poseToEye, not local trig: CameraPose is z-up with azimuth from +x and
    // neither renderer's default frame is that. Both pages derive the eye
    // through the one shared function, which is the only reason a pose named
    // in the test means the same camera on both.
    const placed: PlacedCameraPose = {...pose, eye: poseToEye(pose)};
    applyPose(placed);
    renderWindow.render();
    publish();
    return {width: PARITY_SURFACE[0], height: PARITY_SURFACE[1]};
  }

  function parityEnd(): void {
    parityVolumeVisible(true);
    parityIsolateVolume(false);
    parityStreamlinesVisible(true);
    parityBuildingsVisible(true);
    paritySliceOpaque(false);
    const restore = parityRestore;
    parityRestore = null;
    restore?.();
    applyPose(orbitV1Pose(0));
    renderWindow.render();
    publish();
  }

  /**
   * A REAL ray-cast pick at (u, v) of the drawing surface, v measured from
   * the top. This is vtkCellPicker resolving a cell through the polydata's
   * own cell data — the independent path page 14 answers with
   * Raycaster.faceIndex over the shipped cellObjectIndex. selectCell(id) on
   * both pages would only compare the shared lookup; this compares the two
   * renderers' intersection machinery.
   */
  function parityPickAt(u: number, v: number) {
    const [w, h] = apiRenderWindow.getSize() as [number, number];
    // vtk.js display coordinates: render-window pixels, origin bottom-left.
    picker.pick([u * w, (1 - v) * h, 0], renderer);
    const cellId = picker.getCellId();
    if (cellId < 0) {
      return {hit: false, cellId: null, marker: null, sourceIndexes: null,
              dtccIds: null, traceability: null, world: null, distanceM: null};
    }
    const array = buildingsPd.getCellData().getArrayByName(CELL_OBJECT_INDEX);
    if (!array) throw new Error(`buildings polydata lost its ${CELL_OBJECT_INDEX} cell-data array`);
    const marker = array.getData()[cellId];
    const ref = objectRefForCell(objects, bundle.city.identityStability, marker);
    const p = picker.getPickPosition() as [number, number, number];
    const eye = renderer.getActiveCamera().getPosition() as [number, number, number];
    return {
      hit: true, cellId, marker,
      sourceIndexes: ref.sourceIndexes, dtccIds: ref.dtccIds, traceability: ref.traceability,
      world: [p[0], p[1], p[2]] as [number, number, number],
      distanceM: Math.hypot(p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]),
    };
  }

  /**
   * What THIS renderer's own shader wrote into its own drawing buffer at
   * (u, v), after a fresh render. Renders first, in the same task, because a
   * drawing buffer without preserveDrawingBuffer is only readable before the
   * browser composites it.
   */
  function parityPixelAt(u: number, v: number): [number, number, number, number] {
    if (!gl) throw new Error('no WebGL context to read pixels from');
    renderWindow.render();
    const [w, h] = apiRenderWindow.getSize() as [number, number];
    const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
    // readPixels' origin is bottom-left; v is measured from the top, as in
    // every other screen coordinate here.
    const y = Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h)));
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, parityPixelBuf);
    return [parityPixelBuf[0], parityPixelBuf[1], parityPixelBuf[2], parityPixelBuf[3]];
  }

  function parityVolumeVisible(visible: boolean): void { volume.setVisibility(visible); renderWindow.render(); }
  function parityStreamlinesVisible(visible: boolean): void { streamlineActor.setVisibility(visible); renderWindow.render(); }
  /**
   * Hides the buildings, which is how the occlusion comparison gets the SAME
   * ray with and without an opaque occluder in it. Comparing two different
   * rays instead (one that hits a building, one that misses it) sounds
   * equivalent and is not: adjacent rays land on different terrain at
   * different depths under different shading, and the pixel difference then
   * measures the background as much as the volume. Measured: two adjacent
   * rays at the same screen height, one hitting a building at 331 m and one
   * hitting no building at all, gave IDENTICAL deltas of 12.67 on this page.
   */
  function parityBuildingsVisible(visible: boolean): void { buildingsActor.setVisibility(visible); renderWindow.render(); }

  /**
   * Isolates the volume: terrain, buildings and the background all go BLACK
   * and the slice and streamlines are hidden, so the rendered pixel is the
   * volume's own premultiplied contribution and nothing else.
   *
   * This exists because every colour-difference measure of "how much volume is
   * in this pixel" is confounded by what is behind it. A composite is
   * `C_volume + (1 - alpha) * background`, so comparing a ray that ends on a
   * grey building against one that ends on a light background measures the two
   * BACKGROUNDS as much as the two volume paths. Measured, and this is why the
   * primitive exists rather than a comment about it: an occlusion check built
   * on that difference still PASSED with page 14's opaque depth stop deleted,
   * because the building is darker than the background by about as much as the
   * occlusion was worth. Against a black background the background term is
   * exactly zero and the pixel is the volume alone.
   */
  function parityIsolateVolume(on: boolean): void {
    if (on) {
      terrainActor.getProperty().setColor(0, 0, 0);
      buildingsActor.getProperty().setColor(0, 0, 0);
      renderer.setBackground(0, 0, 0);
      imageSlice.setVisibility(false);
      streamlineActor.setVisibility(false);
    } else {
      terrainActor.getProperty().setColor(0.62, 0.62, 0.60);
      buildingsActor.getProperty().setColor(0.80, 0.78, 0.74);
      renderer.setBackground(0.93, 0.93, 0.92);
      imageSlice.setVisibility(true);
      streamlineActor.setVisibility(true);
    }
    renderWindow.render();
  }

  /** Forces the slice plane fully opaque (and back). A translucent plane is
   *  blended over terrain lit by each renderer's own lighting, so only an
   *  opaque plane lets a pixel be compared against the colour the shared
   *  colormap says that value has. */
  function paritySliceOpaque(on: boolean): void {
    if (on) {
      const [lo, hi] = activeColourRange();
      sliceOpacity.removeAllPoints();
      sliceOpacity.addPoint(lo, 1);
      sliceOpacity.addPoint(hi, 1);
    } else {
      applyTransferFunctions();
    }
    renderWindow.render();
  }

  /** CPU truth for a world point: the shared sampler and the shared colormap.
   *  The SHARED half of the GPU-vs-CPU comparison, deliberately — what makes
   *  that comparison a renderer test is the GPU half. */
  function paritySampleCpu(world: [number, number, number]) {
    const value = sampleGridTrilinear(active.field, world)[0];
    const [lo, hi] = activeColourRange();
    return {value, rgb: colormap(value, lo, hi)};
  }

  let lastParity: Record<string, unknown> | null = null;

  /**
   * The static parity surface: one object, every field on both pages, same
   * shape and same units, `null` only where the other renderer genuinely has
   * no equivalent and `parityNotes` says which and why.
   */
  function parityProbe(): Record<string, unknown> {
    try {
      const field = active.field;
      const [i, j, k] = PARITY_NODE;
      const nodeWorld: [number, number, number] = [
        field.origin[0] + i * field.spacing[0],
        field.origin[1] + j * field.spacing[1],
        field.origin[2] + k * field.spacing[2],
      ];
      const offWorld: [number, number, number] = [
        field.origin[0] + PARITY_OFFSET[0] * field.spacing[0],
        field.origin[1] + PARITY_OFFSET[1] * field.spacing[1],
        field.origin[2] + PARITY_OFFSET[2] * field.spacing[2],
      ];
      const nodeValue = probeGridNode(field, i, j, k)[0];
      const cam = renderer.getActiveCamera();
      const [sw, sh] = apiRenderWindow.getSize() as [number, number];
      const aspect = sw / sh;
      const [near, far] = cam.getClippingRange() as [number, number];
      const projection = cam.getProjectionMatrix(aspect, near, far) as ArrayLike<number>;
      const rect = canvas.getBoundingClientRect();
      // NODE extent, read off vtk.js's own stored image geometry -- origin,
      // spacing and dimensions as the mapper will use them -- NOT
      // getBounds(), which pads by half a voxel at each face because vtk.js
      // reports an image's bounds as cells centred on its nodes (measured:
      // -1.29 .. 81.29 for a grid whose nodes span 0 .. 80). That padding is
      // a reporting convention, not a placement, and page 14's box mesh has
      // no equivalent of it, so comparing the two libraries' getBounds()
      // would fail by half a node spacing for a reason that says nothing
      // about either renderer.
      const nodeExtent = (im: ReturnType<typeof vtkImageData.newInstance>) => {
        const o = im.getOrigin() as number[];
        const sp = im.getSpacing() as number[];
        const d = im.getDimensions() as number[];
        return {
          min: [o[0], o[1], o[2]] as [number, number, number],
          max: [o[0] + sp[0] * (d[0] - 1), o[1] + sp[1] * (d[1] - 1), o[2] + sp[2] * (d[2] - 1)] as [number, number, number],
        };
      };
      const vb = nodeExtent(active.image);
      const sb = nodeExtent(sliceImage);
      lastParity = {
        schema: 1,
        renderer: 'vtkjs',
        caseId: active.id,
        colourRange: activeColourRange(),
        sliceRequestedZ: sliceHeightM,
        // The two control-driven scene states that nothing else publishes.
        // Without them a suite can prove a control's CALLBACK ran and not that
        // it reached the scene: 100 cycles of opacity and streamline toggling
        // would look identical whether the handlers were wired to the renderer
        // or to nothing at all. Read live off the vtk object, not off the
        // variable the handler set: publishing the bare `opacityScale` local
        // reported what the handler was TOLD, never what the scene holds.
        // Page 14 reads uOpacityScale.value, so both fields now have the same
        // shape and the same power.
        //
        // WHAT THIS CATCHES, measured, because the obvious control does not
        // work: freezing the scene write (`ofun.addPoint(hi, 0.6 * 0.5)`)
        // fails the 100-cycle assertion with "Expected 0, Received 0.5". But
        // deleting applyTransferFunctions() from setOpacity alone does NOT
        // fail it, and that is not a hole in this read -- the same cycle also
        // drives colour range and case, whose handlers call
        // applyTransferFunctions() too and pick up the current opacityScale on
        // the way past. So the assertion witnesses "the transfer function the
        // scene holds tracks the control", not "this one handler is wired".
        // Do not conclude from that control passing that the read is toothless.
        opacityScale: liveOpacityScale(),
        streamlinesVisible: !!streamlineActor.getVisibility(),

        // INVARIANTS. Both pages read the same Float32Array through the same
        // probeGridNode and interpolate through the same sampleGridTrilinear,
        // so these are bit-identical BY CONSTRUCTION. They cannot fail unless
        // src/lib is edited, they are not evidence that the two RENDERERS
        // agree about anything, and Task 8 must not quote them as such. Kept
        // because they are nearly free and a divergence would be alarming.
        invariants: {
          fixedGridNode: {index: [i, j, k], world: nodeWorld, value: nodeValue, bits: f32bits(nodeValue)},
          interpolated: {world: offWorld, value: sampleGridTrilinear(field, offWorld)[0]},
          fieldSpan: active.range[1] - active.range[0],
        },

        // MEASURED, renderer-side. Every one of these comes out of vtk.js's
        // own objects, and page 14's comes out of Three.js's.
        camera: {
          fovDeg: cam.getViewAngle(), aspect, near, far,
          // The two diagonal entries of the projection matrix, which depend
          // only on fov and aspect and are therefore comparable across the
          // two pages even though their clipping ranges differ (divergence
          // #9). Diagonal entries are also transpose-invariant, so the two
          // libraries' matrix conventions cannot make this pass or fail for
          // the wrong reason.
          projScaleX: projection[0], projScaleY: projection[5],
          eye: cam.getPosition(), target: cam.getFocalPoint(), up: cam.getViewUp(),
        },
        surface: {
          drawingBufferWidth: gl ? gl.drawingBufferWidth : null,
          drawingBufferHeight: gl ? gl.drawingBufferHeight : null,
          devicePixelRatio: window.devicePixelRatio,
          // EXACT, not rounded. Rounding hid the one case that does not
          // hold: the host is 492.67 css px tall at a 1280x800 viewport, so
          // a rounded 493 against a 492-pixel buffer made
          // `buffer === css * dpr` look false when it is the rounding that
          // is false. The two pages also floor at different points (page 13
          // floors width*dpr, page 14 floors width and then multiplies),
          // which is a page difference worth being able to see.
          cssWidth: rect.width, cssHeight: rect.height,
          samples: canvasSamples,
        },
        // Where the volume and the slice actually are in THIS renderer's
        // scene, read off the renderer's own objects rather than off the
        // numbers they were built from: vtk.js derives these bounds from the
        // image's dims/origin/spacing/direction, page 14 from the box mesh's
        // real vertex data. A page that placed its volume wrong fails here.
        volumeBounds: vb,
        sliceBounds: sb,

        depthTarget: null,
        librarySample: (() => {
          const rendererValue = active.image.getScalarValueFromWorld(nodeWorld);
          return {world: nodeWorld, lib: nodeValue, renderer: rendererValue,
                  delta: Math.abs(rendererValue - nodeValue)};
        })(),
        gpuSampleFloat: null,

        parityNotes: [
          'invariants.* compare src/lib with itself. Both pages call probeGridNode and sampleGridTrilinear on the '
          + 'same Float32Array, so they are bit-identical by construction and can only fail if src/lib changes. '
          + 'They are INVARIANTS, not evidence that the two renderers agree numerically.',
          'depthTarget is null here and non-null on page 14 because there is no PAGE-OWNED depth target on this '
          + 'page -- NOT because vtk.js does without one. vtkOpenGLVolumeMapper renders opaque geometry to a depth '
          + 'texture and clamps each ray against it (the //VTK::ZBuffer::Impl substitution, dists.y = min(zdepth, '
          + 'dists.y)), which is the same mechanism page 14 writes by hand. The difference between the two pages '
          + 'here is VENDORED versus HAND-WRITTEN, which is a maintenance-burden fact, not an architectural one. '
          + 'Assert the null as what it is: this page owns no depth target of its own.',
          'gpuSampleFloat is null here and non-null on page 14: vtk.js 36.12.1 uploads its volume texture inside '
          + 'vtkOpenGLVolumeMapper and exposes no supported way to read a sampled float back. What this page can '
          + 'answer about its own GPU path is the rendered pixel (parity.pixelAt), which is what the suite uses on '
          + 'both pages.',
          'camera.projScaleX/projScaleY are each library\'s OWN projection matrix diagonal, and their absolute '
          + 'scale is NOT comparable between the pages: measured, vtk.js\'s getProjectionMatrix returns an '
          + 'unnormalised matrix (396.5 / 1031.6 where three returns 1.43 / 3.73 for the same 30 degree vertical '
          + 'fov). Their RATIO is comparable and is the aspect ratio, which is what the suite compares.',
          'librarySample is non-null here and null on page 14: vtkImageData.getScalarValueFromWorld is a second, '
          + "library-owned world->value implementation. Three.js ships nothing of the kind, which is why page 14's "
          + 'axis-order evidence is a GPU round trip instead.',
        ],
      };
      return lastParity;
    } catch (err) {
      // After context loss vtk.js's teardown has removed the render window,
      // and every read above throws. The last good snapshot is the honest
      // answer; throwing here would stop onLost from ever rendering the
      // visible failure panel.
      return lastParity ?? {schema: 1, renderer: 'vtkjs', unavailable: (err as Error).message};
    }
  }

  // --- first frame ---------------------------------------------------------
  applyTransferFunctions();
  applySlice();
  applyPose(orbitV1Pose(0));
  renderWindow.render();

  ui.setReadout('Data case', `${active.id} (${active.unit}), grid ${active.field.dims.join('×')}`);
  selectCell(FIXED_PICK_CELL);

  publish();

  // --- probes and measurements --------------------------------------------
  const census = markerCensus(bundle, cellObjectIndex);
  recordRenderSurface('interactive');
  reportMeasurements(ui, bundle, cases, census,
    {streamlineCount, streamlinesDropped, gpuTimer: !!gpuTimer, sliceWorstPa, pressureSpan});

  ui.setProbe('field', true);
  ui.setProbe('apis', VTK_APIS);
  Object.assign(window.__bench, {
    markers: census,
    selectCell,
    setReadout: ui.setReadout,
    controlCalls,
    runBenchmark,
    // Requested vs rendered slice height, so a smoke test has a second witness
    // that the drawn plane is the plane the page claims. Snapping to the
    // nearest node layer -- what this page did before review round 1 -- would
    // make these two differ by up to half a layer.
    sliceGeometry: () => ({
      requestedZ: sliceHeightM,
      renderedZ: sliceImage.getOrigin()[2],
      dims: sliceImage.getDimensions(),
      // The active grid's node lattice in z, so a caller can tell an
      // off-lattice height (where snapping would be visible) from one that
      // happens to sit on a node (where it would not).
      originZ: active.field.origin[2],
      nodeSpacingZ: active.field.spacing[2],
    }),
    // The eleven parity primitives, identical in name and shape on page 14.
    // tests/scientific.spec.ts asserts that these key sets match, so a primitive
    // added to one page and not the other fails the suite instead of quietly
    // making one of its comparisons untestable.
    parity: {
      begin: parityBegin,
      end: parityEnd,
      pickAt: parityPickAt,
      pixelAt: parityPixelAt,
      setVolumeVisible: parityVolumeVisible,
      setStreamlinesVisible: parityStreamlinesVisible,
      setBuildingsVisible: parityBuildingsVisible,
      isolateVolume: parityIsolateVolume,
      setSliceOpaque: paritySliceOpaque,
      sampleCpu: paritySampleCpu,
      framesRendered: () => benchmarkFrames,
    },
  });
  ui.ready();
}

// ---------------------------------------------------------------------------
// Measurements the probe panel carries. Every one of these is a number this
// page measured, not a number it was told.

type MarkerCensus = {
  total: number; attributed: number; unattributed: number; multiSource: number;
  attributedCell: number; unattributedCell: number; multiSourceCell: number;
};

/**
 * The tile's marker census, plus one representative *cell* per category so
 * every identity check runs through the real cell -> marker -> objectRefForCell
 * path rather than through a marker number typed into a test.
 *
 * Note for anyone reading the counts: on this tile total=206, attributed=103
 * and unattributed=103, and regionMarkerCount and conditionedRegionCount are
 * *also* both 103. The counts therefore cannot distinguish those two fields
 * from each other; only the per-marker behaviour can.
 */
function markerCensus(bundle: ScientificBundle, cellObjectIndex: Uint32Array): MarkerCensus {
  const objects = bundle.city.objects;
  let attributed = 0, unattributed = 0, multiSource = 0;
  for (const entry of objects.values()) {
    if (entry.sourceIndexes.length === 0) unattributed++;
    else { attributed++; if (entry.sourceIndexes.length > 1) multiSource++; }
  }
  let attributedCell = -1, unattributedCell = -1, multiSourceCell = -1;
  for (let cell = 0; cell < cellObjectIndex.length; cell++) {
    const entry = objects.get(cellObjectIndex[cell]);
    if (!entry) continue;   // validateCellObjectIndex already ruled this out
    if (entry.sourceIndexes.length === 0) { if (unattributedCell < 0) unattributedCell = cell; continue; }
    if (attributedCell < 0) attributedCell = cell;
    if (entry.sourceIndexes.length > 1 && multiSourceCell < 0) multiSourceCell = cell;
  }
  return {total: objects.size, attributed, unattributed, multiSource, attributedCell, unattributedCell, multiSourceCell};
}

function reportMeasurements(
  ui: Ui, bundle: ScientificBundle, cases: DataCase[], census: MarkerCensus,
  extras: {streamlineCount: number; streamlinesDropped: number; gpuTimer: boolean;
           sliceWorstPa: number; pressureSpan: number},
): void {
  const grid = bundle.smoke.grid;
  const localBounds = bundle.manifest.coordinateFrame.localBounds;

  ui.probe(`objects: ${census.total} markers — ${census.attributed} attributed (${census.multiSource} standing for more `
    + `than one source building), ${census.unattributed} split-added with no source building at all. `
    + `identityStability=${bundle.city.identityStability}, so canonical DTCC traceability has failed on this tile.`);
  ui.probe(`associations, passed through from Core verbatim: smoke.grid=${JSON.stringify(grid.association)}, `
    + `smoke.slice=${JSON.stringify(bundle.smoke.slice.association)}, `
    + `smoke.streamlines=${JSON.stringify(bundle.smoke.streamlines.association)}, `
    + `heat=${JSON.stringify(bundle.heat.grid.association)}. A null here is Core's own answer, not a missing value.`);
  ui.probe(`streamlines: ${extras.streamlineCount} polylines drawn from ${bundle.smoke.streamlines.vertexOffsets.length - 1} `
    + `declared (${extras.streamlinesDropped} dropped as degenerate), ${bundle.smoke.streamlines.positions.length / 3} vertices total.`);

  // Alignment landmarks: the grid's own corners against the frame every mesh
  // in this bundle was rebased into.
  const far: [number, number, number] = [
    grid.origin[0] + grid.spacing[0] * (grid.dims[0] - 1),
    grid.origin[1] + grid.spacing[1] * (grid.dims[1] - 1),
    grid.origin[2] + grid.spacing[2] * (grid.dims[2] - 1),
  ];
  const nearDelta = alignmentDistance(grid.origin, [localBounds[0], localBounds[1], localBounds[2]]);
  const farDelta = alignmentDistance(far, [localBounds[3], localBounds[4], localBounds[5]]);
  ui.probe(`alignment landmarks (tolerance ${ALIGNMENT_TOLERANCE_M} m): smoke grid origin vs localBounds min = `
    + `${nearDelta.toFixed(4)} m; far corner vs localBounds max = ${farDelta.toFixed(4)} m.`);

  // Already ASSERTED in assertCoreSliceAgrees before the scene was built; the
  // number is repeated here so a reader can see the margin, not to check it.
  const slice = bundle.smoke.slice;
  ui.probe(`Core FieldSlice vs the volume grid, trilinear at the same ${slice.resolution}x${slice.resolution} world points, `
    + `z=${slice.fixedLocalCoordinate} m, on PRESSURE: worst |dp| = ${extras.sliceWorstPa.toExponential(3)} Pa against an `
    + `interpolated tolerance of ${interpolatedTolerance(extras.pressureSpan).toExponential(3)} (span ${extras.pressureSpan.toFixed(3)}). `
    + 'Asserted, not reported -- transposing the slice\'s a/b order moves this to 24.7. Pressure and not speed because the '
    + 'shipped speed field is bit-identically z-invariant (max |f(z) - f(z=0)| = 0.0 against 12.02 for pressure), so a speed '
    + 'cross-check has no power at all over the z axis.');

  // Axis order. The per-case wiring assertion (assertGridWiring) has already
  // run vtk.js's own world->offset implementation against gridNodeIndex at
  // asymmetric interior nodes on every grid; what is left is the part no
  // browser-side check can reach.
  for (const c of cases) {
    ui.probe(`${c.id}: grid ${c.field.dims.join('x')}, vtk.js and gridNodeIndex agree on offset and value at every `
      + 'asymmetric probe node (asserted before this scene was built).');
  }
  ui.probe('Axis-order gap, stated rather than papered over: whether a shipped payload is in the order it claims is a '
    + 'DECLARATION check, not something any browser-side probe can derive from the bytes. The smoke grid ships '
    + '"order": "x-fastest,y,z-slowest" and scientific-data.ts asserts it against GRID_ORDER. field.grid.json ships no '
    + '"order" field at all -- scripts/real/sample_field.py writes the heat grid x-fastest (its own comment says so) but '
    + 'does not record it. Adding it needs sample_field.py plus a regenerated scientific-manifest.json, whose dependency '
    + 'record hashes field.grid.json; that is an artifact-regeneration task, not a page change.');

  ui.probe('TASK 7 PARITY SURFACE, published as window.__bench.probe.parity with the same shape on both pages, '
    + 'plus the primitives window.__bench.parity.{begin, end, pickAt, pixelAt, setVolumeVisible, '
    + 'setStreamlinesVisible, setBuildingsVisible, isolateVolume, setSliceOpaque, sampleCpu, framesRendered}. '
    + 'READ THE SPLIT, because it is the whole point of the object: parity.invariants.* (the fixed grid node and '
    + 'its float32 bits, the interpolated value, the field span) compare src/lib WITH ITSELF -- both pages read '
    + 'the same Float32Array through the same probeGridNode and interpolate through the same sampleGridTrilinear, '
    + 'so they are bit-identical by construction, cannot fail unless src/lib changes, and are NOT evidence that '
    + 'the two renderers agree numerically. Everything else in the object is measured off this renderer\'s own '
    + 'objects: the camera and its projection, the drawing surface and its sample count, where the volume and the '
    + 'slice actually sit in this scene, and the library\'s own world->value answer. Where a field is null the '
    + 'other renderer has something this one genuinely has not, and parityNotes says which and why -- the suite '
    + 'asserts the nulls rather than skipping them.');
  ui.probe('What the parity suite (tests/scientific.spec.ts) actually compares between the two renderers, as '
    + 'opposed to what merely looks comparable: a REAL ray-cast pick at the same fraction of the same pinned '
    + '1280x720 surface under the same camera (vtkCellPicker on page 13, Raycaster.faceIndex on page 14 -- two '
    + 'independent '
    + 'intersection implementations over one index space); the PIXEL each renderer\'s own shader wrote for a '
    + 'known world point on the slice plane, against the shared colormap\'s answer; the volume accumulated along '
    + 'a ray with and without an opaque building in it, measured against a black background so the number is the '
    + 'volume\'s own contribution and not partly the background\'s; GL-object growth over 100 control cycles and '
    + 'ten resizes, bounded PER RENDERER because the two genuinely differ; and what each library tears down when '
    + 'the context is lost. selectCell(id) compared between the pages is none of these -- it is the shared lookup '
    + 'compared with itself.');
  ui.probe(`GPU timing: EXT_disjoint_timer_query_webgl2 ${extras.gpuTimer ? 'available — gpuFrameTimesMs will be recorded' : 'unavailable — gpuFrameTimesMs stays null'}. `
    + 'Run window.__bench.runBenchmark() for orbit-v1 (30 warmup + 180 forced frames). cpuFrameTimesMs is wall time for a '
    + 'COMPLETED frame: each forced render ends in a one-pixel readback, because gl.finish() alone returns before the '
    + 'frame is drawn under ANGLE/SwiftShader and reported a 0.45 ms frame against the GPU timer\'s 95 ms.');
}

// ---------------------------------------------------------------------------

/**
 * EXT_disjoint_timer_query_webgl2, or nothing. Creating and reading the query
 * object is GPU code and belongs here; BenchmarkDriver only orders the calls
 * and decides which samples to keep.
 */
function makeGpuTimer(gl: WebGL2RenderingContext | WebGLRenderingContext): GpuTimer | undefined {
  const ext = (gl as WebGL2RenderingContext).getExtension('EXT_disjoint_timer_query_webgl2') as
    {TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number} | null;
  const gl2 = gl as WebGL2RenderingContext;
  if (!ext || typeof gl2.createQuery !== 'function') return undefined;
  let pending: WebGLQuery | null = null;
  return {
    beginFrame() {
      pending = gl2.createQuery();
      if (pending) gl2.beginQuery(ext.TIME_ELAPSED_EXT, pending);
    },
    endFrame() {
      if (pending) gl2.endQuery(ext.TIME_ELAPSED_EXT);
    },
    async readResult() {
      const query = pending;
      pending = null;
      if (!query) return null;
      for (let attempt = 0; attempt < 64; attempt++) {
        if (gl2.getQueryParameter(query, gl2.QUERY_RESULT_AVAILABLE)) {
          const disjoint = Boolean(gl2.getParameter(ext.GPU_DISJOINT_EXT));
          const ns = gl2.getQueryParameter(query, gl2.QUERY_RESULT) as number;
          gl2.deleteQuery(query);
          return {ms: ns / 1e6, disjoint};
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      gl2.deleteQuery(query);
      return null;   // never became available -- dropped, never estimated
    },
  };
}
