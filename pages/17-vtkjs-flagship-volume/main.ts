/**
 * Page 17 -- vtk.js on the volume axis. The pair with page 18.
 *
 * Page 15's city (the same 694k-triangle mesh, same camera path, same colours)
 * with flagship's 250x250x139 speed field ray-marched through it. This is the
 * volume test the geometry axis could not run: 8.7M cells against pages 13/14's
 * 131k, and 139 vertical layers against 32.
 *
 * The only comparison supported is against page 18. See flagship-volume.ts for
 * what the field is (synthetic) and why these numbers do not compare to 13-16.
 *
 * No startup pick. Pages 15 and 16 already check triangle -> building
 * attribution on this exact mesh; a volume in front of the buildings would turn
 * the same check into a test of whether the picker ignores volumes.
 */
import '@kitware/vtk.js/Rendering/Profiles/Volume';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import '@kitware/vtk.js/Rendering/Profiles/Glyph';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkArrowSource from '@kitware/vtk.js/Filters/Sources/ArrowSource';
import vtkGlyph3DMapper from '@kitware/vtk.js/Rendering/Core/Glyph3DMapper';

import {mountChrome} from '@lib/chrome';
import {colormap} from '@lib/colormap';
import {
  FLAGSHIP_FOV_DEG, ORBIT_FLAGSHIP_V1, createFpsMeter, createGpuTimer, describeGpu, flagshipPose,
  instrumentGlObjects, makeFrameSync, percentile, loadFlagshipGeometry, type FlagshipBundle,
} from '@lib/flagship-geometry';
import {
  ARROW_COLOUR, ARROW_METRES_PER_MS, ARROW_SHAPE, DEFAULT_OPACITY, VOLUME_MAX_SAMPLES, VOLUME_STEP_M, loadFlagshipVolume, opacityNodes,
  type FlagshipVolume, type VolumeProbe,
} from '@lib/flagship-volume';
import {attachContextLoss, createBenchmarkDriver, type CameraPose} from '@lib/scientific-probes';

const SURFACE: [number, number] = [1280, 720];

/** vtk.js cell format: [count, i0, i1, i2] per triangle. */
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

/** Replaced by main() once the scene is up. */
let arrowsHandler: (visible: boolean) => void = () => {};
/** Replaced by main() once the scene is up. */
let benchmarkHandler: () => Promise<void> =
  async () => { ui.setReadout('benchmark', 'still loading, try again in a moment'); };

const ui = mountChrome({
  num: '17',
  title: 'VTK.js flagship volume',
  expect: 'the Delft district with a synthetic wind-speed field as a translucent volume around the buildings, orbiting once.',
  claim: 'vtk.js should do best on volume data, the case the geometry axis could not test',
  decision: 'whether either renderer struggles with an 8.7-million-cell volume drawn together with a 10,356-part city.',
  controls: [
    {kind: 'toggle', id: 'arrows', label: 'Wind arrows', value: true, onChange: v => arrowsHandler(v)},
    {kind: 'button', id: 'run-benchmark', label: 'Run benchmark (210 frames)',
     onClick: () => { void benchmarkHandler(); }},
  ],
  findings: [
    'The field is SYNTHETIC: real Delft buildings, analytic wind. Its own source says "Not a fluid solver". '
    + 'It is here as a realistically sized volume, not as a flow result.',
    'Opacity per sample is matched to page 18 on purpose. vtk.js corrects opacity for step length, '
    + '1-(1-a)^(step/unit distance), with a unit distance of 1 m by default; page 18 applies a per sample, as page 14 does. '
    + 'At a 2 m step that made vtk.js markedly more opaque, so its rays saturated and stopped sooner: less work, '
    + 'not a faster renderer. This page sets the unit distance to the step, and so does page 13 since 2026-09-29.',
    'While you DRAG, vtk.js draws the volume into a smaller viewport with coarser samples (its '
    + 'interaction mode). The live redraws/sec therefore measures cheaper frames than page 18 draws. '
    + 'The Run benchmark button renders at full quality on both pages and is the comparison.',
    'Solid cells (inside buildings and below ground, 13.6% of the grid) are written as the field minimum, '
    + 'which the opacity function maps to zero, so they draw as empty.',
    'Wind arrows come from vtk.js itself: vtkArrowSource for the shape and vtkGlyph3DMapper to place, turn and '
    + 'size one per point from the velocity field. Page 18 builds the same thing by hand. The benchmark measures '
    + 'whatever the toggle shows, and the readout says which.',
  ],
});
// First readout row, so every pasted summary names the renderer that produced it.
ui.setReadout('renderer', 'vtk.js');

async function main(): Promise<void> {
  let bundle: FlagshipBundle;
  let volumeData: FlagshipVolume;
  try {
    [bundle, volumeData] = await Promise.all([loadFlagshipGeometry(), loadFlagshipVolume()]);
  } catch (err) {
    ui.fail(`flagship data failed to load: ${(err as Error).message}`);
    return;
  }
  const {mesh, dataset, orbit} = bundle;
  const {meta} = volumeData;

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0';
  ui.canvasHost.prepend(container);

  const fs = vtkFullScreenRenderWindow.newInstance({
    rootContainer: container, listenWindowResize: false,
    containerStyle: {height: '100%', width: '100%', position: 'absolute'},
    background: [0.067, 0.086, 0.11],
  } as any);
  const renderer = fs.getRenderer();
  const renderWindow = fs.getRenderWindow();
  const apiRenderWindow = fs.getApiSpecificRenderWindow();
  const canvas = apiRenderWindow.getCanvas() as HTMLCanvasElement | null;
  if (!canvas) throw new Error('vtk.js produced no drawing canvas');
  const gl = apiRenderWindow.get3DContext() as WebGL2RenderingContext | null;
  const counts = gl ? instrumentGlObjects(gl) : {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0};
  const gpuTimer = gl ? createGpuTimer(gl) : null;
  const frameSync = makeFrameSync(gl);
  const fps = createFpsMeter();
  // Silent during a benchmark run, page 15's reasoning.
  let benchmarking = false;
  function tickFps(): void {
    if (benchmarking) return;
    fps.tick();
    const value = fps.fps();
    if (value !== null) ui.setReadout('redraws/sec', value.toFixed(0));
  }

  function applySurface(width: number, height: number): void {
    apiRenderWindow.setSize(Math.max(1, width), Math.max(1, height));
    renderer.resetCameraClippingRange();
    renderWindow.render();
  }

  const interactorForFps = renderWindow.getInteractor() as unknown as
    {onAnimation?: (cb: () => void) => unknown} | null;
  if (typeof interactorForFps?.onAnimation === 'function') {
    interactorForFps.onAnimation(() => { tickFps(); });
  }

  const resizeObserver = new ResizeObserver(() => {
    const rect = ui.canvasHost.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width > 0 && rect.height > 0) {
      applySurface(Math.floor(rect.width * dpr), Math.floor(rect.height * dpr));
      publish();
    }
  });
  resizeObserver.observe(ui.canvasHost);
  const observers = 1;
  renderer.getActiveCamera().setViewAngle(FLAGSHIP_FOV_DEG);

  // --- the city: page 15's actor, unchanged --------------------------------
  const polyData = vtkPolyData.newInstance();
  polyData.getPoints().setData(mesh.positions, 3);
  polyData.getPolys().setData(triangleCells(mesh.indices));
  polyData.getPointData().setNormals(vtkDataArray.newInstance({
    name: 'normals', values: mesh.normals, numberOfComponents: 3,
  }));
  const mapper = vtkMapper.newInstance();
  mapper.setInputData(polyData);
  mapper.setScalarVisibility(false);
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setColor(0.72, 0.77, 0.81);
  renderer.addActor(actor);

  // --- the volume -----------------------------------------------------------
  const image = vtkImageData.newInstance();
  image.setDimensions(meta.dims);
  image.setOrigin(meta.origin);
  image.setSpacing(meta.spacing);
  image.getPointData().setScalars(vtkDataArray.newInstance({
    name: meta.field, values: volumeData.data, numberOfComponents: 1,
  }));

  const [lo, hi] = meta.range;
  const ctf = vtkColorTransferFunction.newInstance();
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const v = lo + f * (hi - lo);
    const [r, g, b] = colormap(v, lo, hi);
    ctf.addRGBPoint(v, r / 255, g / 255, b / 255);
  }
  const ofun = vtkPiecewiseFunction.newInstance();
  for (const [v, a] of opacityNodes(lo, hi, DEFAULT_OPACITY)) ofun.addPoint(v, a);

  const volumeMapper = vtkVolumeMapper.newInstance();
  volumeMapper.setInputData(image);
  volumeMapper.setSampleDistance(VOLUME_STEP_M);
  volumeMapper.setMaximumSamplesPerRay(VOLUME_MAX_SAMPLES);
  const volume = vtkVolume.newInstance();
  volume.setMapper(volumeMapper);
  volume.getProperty().setRGBTransferFunction(0, ctf);
  volume.getProperty().setScalarOpacity(0, ofun);
  // Unit distance = step, so vtk.js's correction 1-(1-a)^(step/unit) is the
  // identity and each sample carries exactly the transfer function's opacity,
  // as page 18's shader does. Left at the default 1 m, vtk.js composites a
  // denser volume, saturates rays sooner and does less work per frame.
  volume.getProperty().setScalarOpacityUnitDistance(0, VOLUME_STEP_M);
  renderer.addVolume(volume);

  // --- wind arrows: vtk.js's own glyph path ---------------------------------
  const {arrows} = volumeData;
  const arrowPoints = vtkPolyData.newInstance();
  arrowPoints.getPoints().setData(arrows.positions, 3);
  arrowPoints.getPointData().setVectors(vtkDataArray.newInstance({
    name: 'wind', values: arrows.vectors, numberOfComponents: 3,
  }));
  const arrowSource = vtkArrowSource.newInstance({...ARROW_SHAPE});
  const glyphMapper = vtkGlyph3DMapper.newInstance();
  glyphMapper.setInputData(arrowPoints, 0);
  glyphMapper.setInputConnection(arrowSource.getOutputPort(), 1);
  glyphMapper.setOrientationArray('wind');
  glyphMapper.setOrientationModeToDirection();
  glyphMapper.setScaleArray('wind');
  glyphMapper.setScaleModeToScaleByMagnitude();
  glyphMapper.setScaleFactor(ARROW_METRES_PER_MS);
  glyphMapper.setScalarVisibility(false);
  const arrowActor = vtkActor.newInstance();
  arrowActor.setMapper(glyphMapper);
  arrowActor.getProperty().setColor(...ARROW_COLOUR);
  renderer.addActor(arrowActor);

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]}) => {
    const eye = pose.eye!;
    const camera = renderer.getActiveCamera();
    camera.setPosition(eye[0], eye[1], eye[2]);
    camera.setFocalPoint(pose.target[0], pose.target[1], pose.target[2]);
    camera.setViewUp(0, 0, 1);
    renderer.resetCameraClippingRange();
    renderWindow.render();
    frameSync();
    tickFps();
  };

  const probe: VolumeProbe = {
    renderer: 'vtkjs',
    status: 'ready',
    canvasCount: ui.canvasHost.querySelectorAll('canvas').length,
    axis: 'volume',
    counts: {
      buildingParts: dataset.counts.buildingParts,
      vertices: mesh.positions.length / 3,
      triangles: mesh.indices.length / 3,
      objectTable: bundle.json.objectTable.length,
    },
    camera: orbit,
    interactive: true,
    lens: {fovDeg: renderer.getActiveCamera().getViewAngle(),
           aspect: (gl ? gl.drawingBufferWidth / gl.drawingBufferHeight : 1),
           surface: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : [0, 0]},
    volumeField: {
      field: meta.field, dims: meta.dims, cells: volumeData.data.length, range: meta.range,
      stepMetres: volumeMapper.getSampleDistance(), maxSamples: volumeMapper.getMaximumSamplesPerRay(),
      opacityScale: DEFAULT_OPACITY,
      opacityCorrection: `1-(1-a)^(${volumeMapper.getSampleDistance()}/${volume.getProperty().getScalarOpacityUnitDistance(0)})`,
    },
    arrows: {visible: arrowActor.getVisibility(), count: arrows.meta.count},
    resources: {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers: 0,
    },
    measurementValid: true,
  };

  function publish(): void {
    probe.arrows = {visible: arrowActor.getVisibility(), count: arrows.meta.count};
    probe.lens = {fovDeg: renderer.getActiveCamera().getViewAngle(),
                  aspect: gl ? gl.drawingBufferWidth / gl.drawingBufferHeight : 1,
                  surface: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : [0, 0]};
    probe.resources = {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers,
    };
    ui.setProbe('flagshipVolume', probe);
  }

  const driver = createBenchmarkDriver({
    renderFrame,
    gpuTimer: gpuTimer ?? undefined,
    path: {
      cameraPath: ORBIT_FLAGSHIP_V1.cameraPath,
      warmupFrames: ORBIT_FLAGSHIP_V1.warmupFrames,
      forcedFrames: ORBIT_FLAGSHIP_V1.forcedFrames,
      pose: i => flagshipPose(i, orbit),
    },
  });

  attachContextLoss(canvas, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources: () => {
      resizeObserver.disconnect();
      mapper.delete(); actor.delete(); polyData.delete();
      volumeMapper.delete(); volume.delete(); image.delete();
      glyphMapper.delete(); arrowActor.delete(); arrowSource.delete(); arrowPoints.delete();
    },
    onLost: () => {
      publish();
      ui.fail('WebGL context lost. Frame times from this run are not a measurement.');
    },
  });

  renderFrame(flagshipPose(0, orbit));

  async function runAndReport(): Promise<void> {
    ui.setReadout('benchmark', 'running 210 frames at 1280x720...');
    benchmarking = true;
    fps.reset();
    try {
      const result = await runBenchmark();
      const cpu = result.cpuFrameTimesMs;
      const gpu = result.gpuFrameTimesMs ?? [];
      ui.setReadout('cpu p50 ms', percentile(cpu, 0.5).toFixed(2));
      ui.setReadout('cpu p95 ms', percentile(cpu, 0.95).toFixed(2));
      ui.setReadout('min FPS', (1000 / percentile(cpu, 0.95)).toFixed(0));
      ui.setReadout('gpu p50 ms', gpu.length
        ? `${percentile(gpu, 0.5).toFixed(2)} (${gpu.length}/${cpu.length} kept)`
        : 'no usable samples');
      ui.setReadout('benchmark', `done, ${cpu.length} measured frames`);
    } catch (err) {
      ui.setReadout('benchmark', `failed: ${(err as Error).message}`);
    } finally {
      benchmarking = false;
      fps.reset();
    }
  }

  benchmarkHandler = runAndReport;
  arrowsHandler = (visible: boolean) => {
    arrowActor.setVisibility(visible);
    ui.setReadout('arrows', visible ? `on (${arrows.meta.count})` : 'off');
    renderWindow.render();
    publish();
  };

  ui.setReadout('volume', `${meta.field}, ${meta.dims.join(' x ')} (${(volumeData.data.length / 1e6).toFixed(1)}M cells)`);
  ui.setReadout('arrows', `on (${arrows.meta.count})`);
  ui.setReadout('GPU', describeGpu(gl));
  ui.setReadout('triangles', probe.counts.triangles);
  ui.setReadout('camera radius m', Math.round(orbit.radius));

  async function runBenchmark() {
    // Not interactor.disable(): page 15 measured that it stops rendering too.
    const interactor = renderWindow.getInteractor();
    const style = interactor?.getInteractorStyle();
    interactor?.setInteractorStyle(null);
    const restore = apiRenderWindow.getSize() as [number, number];
    resizeObserver.unobserve(ui.canvasHost);
    applySurface(SURFACE[0], SURFACE[1]);
    try {
      const result = await driver.runBenchmark();
      probe.benchmark = result;
      probe.measurementValid = result.cpuFrameTimesMs.length === ORBIT_FLAGSHIP_V1.forcedFrames;
      publish();
      return result;
    } finally {
      applySurface(restore[0], restore[1]);
      resizeObserver.observe(ui.canvasHost);
      if (style) interactor?.setInteractorStyle(style);
      renderFrame(flagshipPose(0, orbit));
    }
  }

  (window as unknown as {__bench: {runBenchmark: () => Promise<unknown>}}).__bench.runBenchmark =
    runBenchmark;

  publish();
  ui.ready();
}

void main();
