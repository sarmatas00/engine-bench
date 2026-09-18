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
  describeTraceability, gridField, heatGridField, interpolatedTolerance, objectRefForCell,
  orbitV1Pose, poseToEye, probeGridNode, sampleGridTrilinear,
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
 * falls back to the shared `poseToEye` (never to hand-rolled trig) for a pose
 * that genuinely lacks it. Narrowing `RenderFrame` to `PlacedCameraPose` in
 * scientific-probes.ts would remove the need for this — reported, not changed,
 * since this task does not own that file.
 */
function eyeOf(pose: CameraPose): [number, number, number] {
  const placed = pose as Partial<PlacedCameraPose>;
  return placed.eye ?? poseToEye(pose);
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
      'The slice is the volume grid\'s own z slice. Core\'s FieldSlice artifact is carried in full (axis, position, '
      + 'localAxes, domain) and is cross-checked against the volume grid at the same world points — see the probe panel.',
      'Both grids are sampled through the shared sampleGridTrilinear. The heat grid is 64x64x32, not a cube, so it is '
      + 'the one shipped fixture that can catch a transposed axis; the volume grid at 32x32x32 cannot.',
      'Defect we found and fixed here: gl.finish() alone does not force a completed frame under Chrome\'s '
      + 'ANGLE/SwiftShader command buffer. The benchmark first reported a 0.45 ms mean CPU frame while the GPU timer '
      + 'reported 95 ms on the same frames — a 200x overstated frame rate. Each forced render now ends in a one-pixel '
      + 'readback, and CPU and GPU agree at about 98 ms (roughly 10 FPS, software rasterizer).',
    ],
    controls,
  };
}

/** The urban-heat grid's values. loadScientificBundle already hash-verified
 *  these bytes as a declared dependency but keeps only the reference, so the
 *  array itself is fetched here (from cache) and re-checked against the
 *  reference's own dims before use. */
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
    // Counted by this page, at each creation site below. `renderTargets` stays
    // 0 on purpose: vtk.js owns every framebuffer it renders through, and this
    // page creates none of its own. Task 7 compares these before/after control
    // and resize cycles, so what matters is that each number is attributable.
    resources: {buffers: 0, textures: 0, renderTargets: 0, listeners: 0, observers: 0},
    measurementValid: true,
  };
  const publish = () => ui.setScientificProbe(probe);

  // --- geometry ------------------------------------------------------------
  const terrainPd = polyDataFromMesh(bundle.city.terrain);
  probe.resources.buffers += 3;                       // points, polys, normals
  const buildingsPd = polyDataFromMesh(bundle.city.buildings);
  probe.resources.buffers += 3;
  // Carried as cell data so picking resolves a picked cell to its marker
  // through the dataset itself rather than through a side table.
  buildingsPd.getCellData().addArray(vtkDataArray.newInstance({
    name: CELL_OBJECT_INDEX, values: cellObjectIndex, numberOfComponents: 1,
  }));
  probe.resources.buffers += 1;
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
  probe.resources.buffers += 3;

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
  probe.resources.textures += cases.length;           // one vtkImageData per case
  let active = cases[0];

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
  const ofun = vtkPiecewiseFunction.newInstance();
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

  const imageMapper = vtkImageMapper.newInstance();
  imageMapper.setInputData(active.image);
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
    ofun.addPoint(hi, 0.6 * opacityScale);
    // The slice is translucent on purpose: an opaque plane at 40 m hides the
    // terrain and buildings underneath it, and the point of this page is that
    // one scene carries both. The same opacity control drives it and the
    // volume, so there is one knob, not two.
    const sliceAlpha = Math.min(1, 0.25 + opacityScale);
    sliceOpacity.removeAllPoints();
    sliceOpacity.addPoint(lo, sliceAlpha);
    sliceOpacity.addPoint(hi, sliceAlpha);
    ui.setReadout('Colour range', `${lo.toFixed(2)} – ${hi.toFixed(2)} ${active.unit}`);
  }

  function applySlice(): void {
    const [, , originZ] = active.field.origin;
    const spacingZ = active.field.spacing[2];
    const maxK = active.field.dims[2] - 1;
    const k = Math.min(maxK, Math.max(0, Math.round((sliceHeightM - originZ) / spacingZ)));
    imageMapper.setKSlice(k);
    ui.setReadout('Slice', `k=${k} of ${maxK}, z=${(originZ + k * spacingZ).toFixed(2)} m (requested ${sliceHeightM.toFixed(2)} m)`);
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
      ui.setReadout('Pick', `cell ${cellId} is outside the buildings mesh (${markers.length} cells)`);
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
    imageMapper.setInputData(active.image);
    applyTransferFunctions();
    applySlice();
    ui.setReadout('Data case', `${active.id} (${active.unit}), grid ${active.field.dims.join('×')}`);
    if (probe.selectedValue) sampleAt(probe.selectedValue.world);
    publish();
    renderWindow.render();
  }

  scene = {
    setSliceHeight(metres) { sliceHeightM = metres; applySlice(); renderWindow.render(); },
    setColourFraction(which, value) {
      if (which === 'low') colourLow = value; else colourHigh = value;
      applyTransferFunctions(); renderWindow.render();
    },
    setOpacity(value) { opacityScale = value; applyTransferFunctions(); renderWindow.render(); },
    setStreamlines(visible) { streamlineActor.setVisibility(visible); renderWindow.render(); },
    resetCamera() { applyPose(orbitV1Pose(0)); renderWindow.render(); },
    setCase,
  };

  // --- resize: one observer, disposed with the renderer --------------------
  const resizeObserver = new ResizeObserver(() => {
    const rect = ui.canvasHost.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    apiRenderWindow.setSize(Math.max(1, Math.floor(rect.width * dpr)), Math.max(1, Math.floor(rect.height * dpr)));
    renderer.resetCameraClippingRange();
    renderWindow.render();
  });
  resizeObserver.observe(ui.canvasHost);
  probe.resources.observers += 1;

  // --- picking -------------------------------------------------------------
  const picker = vtkCellPicker.newInstance();
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
  probe.resources.listeners += 1;

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
  const driver = createBenchmarkDriver({
    renderFrame: pose => {
      applyPose(pose);
      renderWindow.render();
      forceCompletion();
    },
    gpuTimer,
  });

  async function runBenchmark(): Promise<BenchmarkResult> {
    const result = await driver.runBenchmark();
    probe.benchmark = result;
    publish();
    return result;
  }

  // --- context loss --------------------------------------------------------
  let disposed = false;
  function disposeGpuResources(): void {
    if (disposed) return;
    disposed = true;
    resizeObserver.disconnect();
    probe.resources.observers -= 1;
    canvas.removeEventListener('pointerdown', onPointerDown);
    probe.resources.listeners -= 1;
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
  probe.resources.listeners += 1;

  // --- first frame ---------------------------------------------------------
  applyTransferFunctions();
  applySlice();
  applyPose(orbitV1Pose(0));
  renderWindow.render();

  ui.setReadout('Data case', `${active.id} (${active.unit}), grid ${active.field.dims.join('×')}`);
  selectCell(FIXED_PICK_CELL);

  probe.canvasCount = ui.canvasHost.querySelectorAll('canvas').length;
  publish();

  // --- probes and measurements --------------------------------------------
  const census = markerCensus(bundle, cellObjectIndex);
  reportMeasurements(ui, bundle, cases, census, {streamlineCount, streamlinesDropped, gpuTimer: !!gpuTimer});

  ui.setProbe('field', true);
  ui.setProbe('apis', VTK_APIS);
  Object.assign(window.__bench, {
    markers: census,
    selectCell,
    setReadout: ui.setReadout,
    controlCalls,
    runBenchmark,
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
  extras: {streamlineCount: number; streamlinesDropped: number; gpuTimer: boolean},
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

  // Core's FieldSlice vs the volume grid at the same world points. Reported,
  // not asserted: the two are separate Core products and this spike exists to
  // measure how far apart they are.
  const slice = bundle.smoke.slice;
  if (slice.axis === 'z' && slice.fixedLocalAxis === 2 && slice.localAxes[0] === 0 && slice.localAxes[1] === 1) {
    const speed = gridField(grid, 'speed');
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
        const delta = Math.abs(slice.speed[a + res * b] - sampleGridTrilinear(speed, world)[0]);
        if (delta > worst) worst = delta;
      }
    }
    const span = rangeOf(grid.speed)[1] - rangeOf(grid.speed)[0];
    ui.probe(`Core FieldSlice vs the volume grid, trilinear at the same ${res}×${res} world points, z=${slice.fixedLocalCoordinate} m: `
      + `worst |Δspeed| = ${worst.toExponential(3)} m/s (the interpolated tolerance for a span of ${span.toFixed(3)} is `
      + `${interpolatedTolerance(span).toExponential(3)}). Two independent Core products, reported not asserted.`);
  } else {
    ui.probe(`Core FieldSlice not cross-checked: localAxes=${JSON.stringify(slice.localAxes)}, axis=${JSON.stringify(slice.axis)}, `
      + 'fixedLocalAxis=' + slice.fixedLocalAxis + ' — the on-disk "a-fastest" order is only known to be world-ascending for z/[0,1].');

  }

  // Grid-node vs trilinear at a node: a bit-identical read and an interpolated
  // one must agree exactly *at* a node. Run on every case, because the shipped
  // volume grid is a 32³ cube — a transposed axis is invisible on it — while
  // the heat grid is 64×64×32 and is not.
  for (const c of cases) reportCornerProbe(ui, `${c.id} grid`, c.field);

  ui.probe(`GPU timing: EXT_disjoint_timer_query_webgl2 ${extras.gpuTimer ? 'available — gpuFrameTimesMs will be recorded' : 'unavailable — gpuFrameTimesMs stays null'}. `
    + 'Run window.__bench.runBenchmark() for orbit-v1 (30 warmup + 180 forced frames). cpuFrameTimesMs is wall time for a '
    + 'COMPLETED frame: each forced render ends in a one-pixel readback, because gl.finish() alone returns before the '
    + 'frame is drawn under ANGLE/SwiftShader and reported a 0.45 ms frame against the GPU timer\'s 95 ms.');
}

/**
 * Trilinear sampling at the grid's own far corner must return exactly the
 * stored node value. On a non-cubic grid (the 64×64×32 heat field) this is the
 * one check that fails loudly if any axis has been transposed on the way in.
 */
function reportCornerProbe(ui: Ui, label: string, field: GridField): void {
  const [nx, ny, nz] = field.dims;
  const corner: [number, number, number] = [
    field.origin[0] + field.spacing[0] * (nx - 1),
    field.origin[1] + field.spacing[1] * (ny - 1),
    field.origin[2] + field.spacing[2] * (nz - 1),
  ];
  const node = probeGridNode(field, nx - 1, ny - 1, nz - 1)[0];
  const interpolated = sampleGridTrilinear(field, corner)[0];
  ui.probe(`${label} ${nx}×${ny}×${nz}: far-corner node ${node} vs trilinear ${interpolated} — `
    + `${node === interpolated ? 'identical' : `DIFFER by ${Math.abs(node - interpolated)}`}.`);
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
