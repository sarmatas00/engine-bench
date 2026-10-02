/**
 * Page 19 -- vtk.js on the animation axis. The pair with page 20.
 *
 * Page 17's city and volume settings, with Anders's time-dependent pressure
 * field in place of the static speed volume, swapped while drawing in one of
 * three modes (flagship-fields.ts, SwapMode). No arrows or streamlines: they
 * would be traced from one instant of a field that moves.
 *
 * vtk.js's two ways to change a volume, used as the library intends:
 *  - stream: one vtkImageData whose scalars get the next frame's array, with
 *    the volume property's updatedExtents set to the whole grid, so the mapper
 *    overwrites its texture in place (texSubImage3D) instead of building a new
 *    one. Without the extents it allocates a new texture on every swap.
 *  - preloaded: one vtkVolume per frame, all in the renderer, one visible.
 *    Switching ONE mapper's input would not do: vtk.js frees a texture the
 *    moment its last user lets go, so it would upload every frame again.
 *
 * The only comparison supported is against page 20, mode for mode.
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
import vtkVolumeProperty from '@kitware/vtk.js/Rendering/Core/VolumeProperty';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';

import {mountChrome} from '@lib/chrome';
import {colormap} from '@lib/colormap';
import {
  FLAGSHIP_FOV_DEG, ORBIT_FLAGSHIP_V1, createFpsMeter, createGpuTimer, describeGpu, flagshipPose,
  instrumentGlObjects, makeFrameSync, percentile, loadFlagshipGeometry, type FlagshipBundle,
} from '@lib/flagship-geometry';
import {DEFAULT_OPACITY, VOLUME_MAX_SAMPLES, VOLUME_STEP_M, opacityNodes} from '@lib/flagship-volume';
import {
  PLAYBACK_FPS, SWAP_MODES, benchmarkFrame, seriesFromQuery, countVolumeUploads, loadFieldSeries,
  type AnimationProbe, type FieldSeries, type SwapMode,
} from '@lib/flagship-fields';
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
let modeHandler: (mode: string) => void = () => {};
/** Replaced by main() once the scene is up. */
let playHandler: (playing: boolean) => void = () => {};
/** Replaced by main() once the scene is up. */
let benchmarkHandler: () => Promise<void> =
  async () => { ui.setReadout('benchmark', 'still loading, try again in a moment'); };

const ui = mountChrome({
  num: '19',
  title: 'VTK.js flagship animation',
  expect: 'the Delft district inside a synthetic pressure field that changes over time, playing in a loop.',
  claim: 'a Twin will play simulations back, so the volume has to change while it is drawn',
  decision: 'whether either renderer\'s frame rate holds while the volume is replaced every frame, '
    + 'streamed into one texture or preloaded as one texture per frame.',
  controls: [
    {kind: 'select', id: 'mode', label: 'Swap', options: SWAP_MODES, value: 'stream', onChange: v => modeHandler(v)},
    {kind: 'toggle', id: 'play', label: 'Play', value: true, onChange: v => playHandler(v)},
    {kind: 'button', id: 'run-benchmark', label: 'Run benchmark (210 frames)',
     onClick: () => { void benchmarkHandler(); }},
  ],
  findings: [
    'The field is SYNTHETIC and ignores the buildings: Anders\'s generator says "not a fluid simulation". '
    + 'It is a time series of realistic shape, here to measure playback, not to show a flow.',
    'Bigger series for the size test (?fields=large, ?fields=xl) are generated locally and not published; '
    + 'see NOTES.md for their results.',
    'The benchmark advances one data frame per drawn frame, whatever the mode, which is harder than real '
    + 'playback. Static draws frame 0 throughout and is the baseline for the other two.',
    'Stream overwrites one texture in place: vtk.js does that only when the volume property is given '
    + 'updatedExtents. The probe counts the GL calls, so a mode that quietly reallocates shows up.',
    'Preloaded keeps one vtkVolume per frame, one visible. Swapping a single mapper\'s input is not '
    + 'preloading in vtk.js: it frees the old texture as soon as nothing uses it.',
    'Opacity per sample is matched to page 20 as on pages 17/18 (unit distance = step).',
  ],
});
// First readout row, so every pasted summary names the renderer that produced it.
ui.setReadout('renderer', 'vtk.js');

async function main(): Promise<void> {
  let bundle: FlagshipBundle;
  let series: FieldSeries;
  const seriesName = seriesFromQuery(location.search);
  try {
    [bundle, series] = await Promise.all([loadFlagshipGeometry(), loadFieldSeries(seriesName)]);
  } catch (err) {
    ui.fail(`flagship data failed to load: ${(err as Error).message}`);
    return;
  }
  const {mesh, dataset, orbit} = bundle;
  const {meta, frames} = series;
  const [nx, ny, nz] = meta.dims;

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
  if (!gl) { ui.fail('no WebGL2 context'); return; }
  const counts = instrumentGlObjects(gl);
  const uploads = countVolumeUploads(gl);
  const gpuTimer = createGpuTimer(gl);
  const frameSync = makeFrameSync(gl);
  const fps = createFpsMeter();
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

  // --- shared transfer functions -------------------------------------------
  const [lo, hi] = meta.range;
  const ctf = vtkColorTransferFunction.newInstance();
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const v = lo + f * (hi - lo);
    const [r, g, b] = colormap(v, lo, hi);
    ctf.addRGBPoint(v, r / 255, g / 255, b / 255);
  }
  const ofun = vtkPiecewiseFunction.newInstance();
  for (const [v, a] of opacityNodes(lo, hi, DEFAULT_OPACITY)) ofun.addPoint(v, a);
  const makeProperty = () => {
    const property = vtkVolumeProperty.newInstance();
    property.setRGBTransferFunction(0, ctf);
    property.setScalarOpacity(0, ofun);
    // Page 17's reasoning: unit distance = step makes vtk.js's opacity
    // correction the identity, as page 20's shader applies a per sample.
    property.setScalarOpacityUnitDistance(0, VOLUME_STEP_M);
    return property;
  };
  const makeVolume = (values: Float32Array, property: ReturnType<typeof makeProperty>) => {
    const image = vtkImageData.newInstance();
    image.setDimensions(meta.dims);
    image.setOrigin(meta.origin);
    image.setSpacing(meta.spacing);
    image.getPointData().setScalars(vtkDataArray.newInstance({
      name: meta.field, values, numberOfComponents: 1,
    }));
    const volumeMapper = vtkVolumeMapper.newInstance();
    volumeMapper.setInputData(image);
    volumeMapper.setSampleDistance(VOLUME_STEP_M);
    volumeMapper.setMaximumSamplesPerRay(VOLUME_MAX_SAMPLES);
    const volume = vtkVolume.newInstance();
    volume.setMapper(volumeMapper);
    volume.setProperty(property);
    renderer.addVolume(volume);
    return {image, volumeMapper, volume};
  };

  // --- stream (and static): one volume, overwritten in place ----------------
  // Its own property, because updatedExtents lives on the property and the
  // preloaded volumes must never pick them up.
  const streamProperty = makeProperty();
  const stream = makeVolume(frames[0], streamProperty);
  const streamScalars = stream.image.getPointData().getScalars();
  const WHOLE: [number, number, number, number, number, number] = [0, nx - 1, 0, ny - 1, 0, nz - 1];

  // --- preloaded: built on first use, then kept --------------------------------
  let preloaded: ReturnType<typeof makeVolume>[] | null = null;
  function buildPreloaded(): void {
    if (preloaded) return;
    const property = makeProperty();
    preloaded = frames.map(f => makeVolume(f, property));
    stream.volume.setVisibility(false);
    // Draw each once alone, so every texture is on the GPU before playing.
    for (const p of preloaded) p.volume.setVisibility(false);
    for (const p of preloaded) { p.volume.setVisibility(true); renderWindow.render(); p.volume.setVisibility(false); }
  }

  let mode: SwapMode = 'stream';
  // Frame 0 is already in the stream texture once the first render has run.
  // updatedExtents must not be set before that: vtk.js 36.12.1 then looks up a
  // texture that does not exist yet and throws.
  let shown = 0;
  function showFrame(k: number): void {
    if (mode === 'preloaded') {
      stream.volume.setVisibility(false);
      preloaded!.forEach((p, i) => p.volume.setVisibility(i === k));
    } else {
      preloaded?.forEach(p => p.volume.setVisibility(false));
      stream.volume.setVisibility(true);
      // Stream swaps on every call, even to the frame it holds, so a benchmark
      // frame is always one upload. Static uploads only to get back to frame 0.
      if (mode === 'stream' || shown !== k) {
        streamScalars.setData(frames[k], 1);
        streamProperty.setUpdatedExtents([WHOLE]);
      }
    }
    shown = k;
  }

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]; drawIndex?: number}) => {
    if (pose.drawIndex !== undefined) showFrame(benchmarkFrame(pose.drawIndex, frames.length, mode));
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

  const volumeTextures = () => (preloaded ? 1 + preloaded.length : 1);
  const probe: AnimationProbe = {
    renderer: 'vtkjs',
    status: 'ready',
    canvasCount: ui.canvasHost.querySelectorAll('canvas').length,
    axis: 'animation',
    counts: {
      buildingParts: dataset.counts.buildingParts,
      vertices: mesh.positions.length / 3,
      triangles: mesh.indices.length / 3,
      objectTable: bundle.json.objectTable.length,
    },
    camera: orbit,
    interactive: true,
    lens: {fovDeg: renderer.getActiveCamera().getViewAngle(),
           aspect: gl.drawingBufferWidth / gl.drawingBufferHeight,
           surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]},
    volumeField: {
      field: meta.field, dims: meta.dims, nodes: frames[0].length, range: meta.range,
      stepMetres: stream.volumeMapper.getSampleDistance(), maxSamples: stream.volumeMapper.getMaximumSamplesPerRay(),
      opacityScale: DEFAULT_OPACITY,
      opacityCorrection: `1-(1-a)^(${stream.volumeMapper.getSampleDistance()}/${streamProperty.getScalarOpacityUnitDistance(0)})`,
    },
    animation: {
      series: seriesName, mode, frames: frames.length, bytesPerFrame: frames[0].byteLength,
      volumeTextures: volumeTextures(), uploads: {...uploads},
    },
    resources: {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers: 0,
    },
    measurementValid: true,
  };

  function publish(): void {
    probe.animation = {...probe.animation, mode, volumeTextures: volumeTextures(), uploads: {...uploads}};
    probe.lens = {fovDeg: renderer.getActiveCamera().getViewAngle(),
                  aspect: gl!.drawingBufferWidth / gl!.drawingBufferHeight,
                  surface: [gl!.drawingBufferWidth, gl!.drawingBufferHeight]};
    probe.resources = {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers,
    };
    ui.setProbe('flagshipAnimation', probe);
  }

  const driver = createBenchmarkDriver({
    renderFrame,
    gpuTimer: gpuTimer ?? undefined,
    path: {
      cameraPath: ORBIT_FLAGSHIP_V1.cameraPath,
      warmupFrames: ORBIT_FLAGSHIP_V1.warmupFrames,
      forcedFrames: ORBIT_FLAGSHIP_V1.forcedFrames,
      pose: i => ({...flagshipPose(i, orbit), drawIndex: i}),
    },
  });

  // --- live playback ---------------------------------------------------------
  let playing = true;
  let playFrame = 0;
  const timer = window.setInterval(() => {
    if (!playing || benchmarking || mode === 'static') return;
    playFrame = (playFrame + 1) % frames.length;
    showFrame(playFrame);
    renderWindow.render();
    tickFps();
    ui.setReadout('frame', `${playFrame + 1}/${frames.length}, t=${meta.frames[playFrame].timeSeconds.toFixed(1)} s`);
  }, 1000 / PLAYBACK_FPS);

  attachContextLoss(canvas, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources: () => {
      window.clearInterval(timer);
      resizeObserver.disconnect();
      mapper.delete(); actor.delete(); polyData.delete();
      for (const v of [stream, ...(preloaded ?? [])]) { v.volumeMapper.delete(); v.volume.delete(); v.image.delete(); }
    },
    onLost: () => {
      publish();
      ui.fail('WebGL context lost. Frame times from this run are not a measurement.');
    },
  });

  renderFrame(flagshipPose(0, orbit));

  async function runAndReport(): Promise<void> {
    ui.setReadout('benchmark', `running 210 frames at 1280x720, ${mode}...`);
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
      const b = probe.animation.benchmarkUploads!;
      ui.setReadout('uploads/frame', `${(b.calls / b.drawnFrames).toFixed(2)} (${(b.bytes / b.drawnFrames / 1e6).toFixed(2)} MB), `
        + `${b.allocations} allocations`);
      ui.setReadout('benchmark', `done, ${mode}, ${cpu.length} measured frames`);
    } catch (err) {
      ui.setReadout('benchmark', `failed: ${(err as Error).message}`);
    }
  }

  async function runBenchmark() {
    // Not interactor.disable(): page 15 measured that it stops rendering too.
    const interactor = renderWindow.getInteractor();
    const style = interactor?.getInteractorStyle();
    interactor?.setInteractorStyle(null);
    const restore = apiRenderWindow.getSize() as [number, number];
    resizeObserver.unobserve(ui.canvasHost);
    // Set and cleared HERE, not in runAndReport: __bench.runBenchmark is
    // called directly too, and a flag left set would freeze playback.
    benchmarking = true;
    fps.reset();
    applySurface(SURFACE[0], SURFACE[1]);
    const before = {...uploads};
    try {
      const result = await driver.runBenchmark();
      probe.benchmark = result;
      probe.animation.benchmarkUploads = {
        calls: uploads.calls - before.calls, bytes: uploads.bytes - before.bytes,
        allocations: uploads.allocations - before.allocations,
        drawnFrames: ORBIT_FLAGSHIP_V1.warmupFrames + result.cpuFrameTimesMs.length, mode,
      };
      probe.measurementValid = result.cpuFrameTimesMs.length === ORBIT_FLAGSHIP_V1.forcedFrames;
      publish();
      return result;
    } finally {
      applySurface(restore[0], restore[1]);
      resizeObserver.observe(ui.canvasHost);
      if (style) interactor?.setInteractorStyle(style);
      renderFrame(flagshipPose(0, orbit));
      benchmarking = false;
      fps.reset();
    }
  }

  benchmarkHandler = runAndReport;
  modeHandler = (value: string) => {
    mode = value as SwapMode;
    if (mode === 'preloaded') buildPreloaded();
    showFrame(mode === 'static' ? 0 : playFrame);
    renderWindow.render();
    ui.setReadout('mode', mode);
    publish();
  };
  playHandler = (value: boolean) => { playing = value; };

  (window as unknown as {__bench: Record<string, unknown>}).__bench.runBenchmark = runBenchmark;
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setMode = (m: SwapMode) => modeHandler(m);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setPlaying = (p: boolean) => playHandler(p);

  ui.setReadout('volume', `${meta.field}, ${meta.dims.join(' x ')} nodes (${(frames[0].length / 1e6).toFixed(2)}M), `
    + `${frames.length} frames${seriesName === 'shipped' ? '' : `, ?fields=${seriesName}`}`);
  ui.setReadout('mode', mode);
  ui.setReadout('GPU', describeGpu(gl));
  ui.setReadout('triangles', probe.counts.triangles);
  ui.setReadout('camera radius m', Math.round(orbit.radius));
  publish();
  ui.ready();
}

void main();
