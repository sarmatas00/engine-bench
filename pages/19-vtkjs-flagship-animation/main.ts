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
import vtkImageStreamline from '@kitware/vtk.js/Filters/General/ImageStreamline';
import vtkImageMarchingCubes from '@kitware/vtk.js/Filters/General/ImageMarchingCubes';
import vtkImageResliceMapper from '@kitware/vtk.js/Rendering/Core/ImageResliceMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';

import {mountChrome} from '@lib/chrome';
import {colormap} from '@lib/colormap';
import {
  FLAGSHIP_FOV_DEG, ORBIT_FLAGSHIP_V1, createFpsMeter, createGpuTimer, describeGpu, flagshipPose,
  instrumentGlObjects, makeFrameSync, percentile, loadFlagshipGeometry, type FlagshipBundle,
} from '@lib/flagship-geometry';
import {
  DEFAULT_OPACITY, STREAMLINE_COLOUR, STREAMLINE_MAX_STEPS, STREAMLINE_STEP_S, VOLUME_MAX_SAMPLES, VOLUME_STEP_M,
  opacityNodes,
} from '@lib/flagship-volume';
import {
  DEFAULT_VOLUME_SCALE_CHOICE, PLAYBACK_FPS, SWAP_MODES, VOLUME_SCALE_CHOICES, VOLUME_SCALE_LABELS, benchmarkFrame, resolveVolumeScale, measureRefreshMs, runPlayback, seriesFromQuery, summarisePlayback, countVolumeUploads, loadFieldSeries,
  ISO_COLOUR, ISO_LEVEL_PA, ISO_MODES, SLICE_MODES, SLICE_SWEEP_SECONDS, STREAMLINE_MODES, seriesBox, sliceX,
  type AnimationProbe, type FieldSeries, type IsoMode, type SliceMode, type StreamlineMode, type SwapMode, type VolumeScale,
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
let streamlineHandler: (mode: string) => void = () => {};
/** Replaced by main() once the scene is up. */
let isoHandler: (mode: string) => void = () => {};
/** Replaced by main() once the scene is up. */
let sliceHandler: (mode: string) => void = () => {};
/** Replaced by main() once the scene is up. */
let volumeHandler: (on: boolean) => void = () => {};
/** Replaced by main() once the scene is up. */
let scaleHandler: (label: string) => void = () => {};
/** Replaced by main() once the scene is up. */
let playHandler: (playing: boolean) => void = () => {};
/** Replaced by main() once the scene is up. */
let playbackHandler: () => Promise<void> = async () => {};
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
    {kind: 'select', id: 'streamlines', label: 'Streamlines', options: STREAMLINE_MODES, value: 'precomputed',
     onChange: v => streamlineHandler(v)},
    {kind: 'select', id: 'iso', label: 'Isosurface', options: ISO_MODES, value: 'off', onChange: v => isoHandler(v)},
    {kind: 'select', id: 'slice', label: 'Slice', options: SLICE_MODES, value: 'off', onChange: v => sliceHandler(v)},
    {kind: 'toggle', id: 'volume', label: 'Volume', value: true, onChange: v => volumeHandler(v)},
    {kind: 'select', id: 'volume-scale', label: 'Volume resolution',
     options: VOLUME_SCALE_CHOICES, value: DEFAULT_VOLUME_SCALE_CHOICE,
     onChange: v => scaleHandler(v)},
    {kind: 'toggle', id: 'play', label: 'Play', value: true, onChange: v => playHandler(v)},
    {kind: 'button', id: 'run-benchmark', label: 'Run benchmark (210 frames)',
     onClick: () => { void benchmarkHandler(); }},
    {kind: 'button', id: 'run-playback', label: 'Playback test (10 s, orbiting, this window)',
     onClick: () => { void playbackHandler(); }},
  ],
  findings: [
    `Isosurface: pressure = ${ISO_LEVEL_PA} Pa, the low-pressure vortex cores, by vtk.js's own `
    + 'vtkImageMarchingCubes with normals. Page 20 runs a port held to the same output point for point.',
    'Slice: vtk.js\'s vtkImageResliceMapper on the same image data the volume draws, so it shows the current frame.',
    'Streamlines come from the field\'s velocity (every 2nd vertex, 65x65x19), 100 seeds at a quarter of the box '
    + 'height, traced by vtk.js\'s own vtkImageStreamline. Precomputed traces all 25 frames at load (one filter per '
    + 'frame: vtk.js reuses a filter\'s output object) and swaps the lines; live traces again on every data change.',
    'Volume resolution (default auto: half the window\'s CSS resolution, so 1/4 of the canvas on Retina) uses vtk.js\'s imageSampleDistance, which vtk.js (36 and 37) applies ONLY while its '
    + 'interactor is animating. So while playing, the page keeps vtk.js\'s own animation loop running and lets it '
    + 'draw every frame; paused and still, vtk.js draws full resolution. Auto-adjust is off: by default vtk.js '
    + 'changes the volume resolution about once a second while you drag, then snaps back, the "jumps".',
    'Playback test: 10 s of real playback (data at 10 frames/s, the display at its own refresh, the camera '
    + 'orbiting as if dragged), recording the gap between displayed frames. It measures stutter, which the '
    + 'benchmark cannot: the benchmark times draws one after another, not what a viewer sees.',
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
    // 'auto' depends on the pixel ratio, which changes when the window moves screens.
    scaleHandler(volumeChoice);
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

  // --- streamlines: vtk.js's own tracer, page 17's drawing ---------------------
  const velocity = series.velocity;
  let streamMode: StreamlineMode = velocity ? 'precomputed' : 'off';
  const makeTracer = (k: number) => {
    const image = vtkImageData.newInstance();
    image.setDimensions(velocity!.meta.dims);
    image.setOrigin(velocity!.meta.origin);
    image.setSpacing(velocity!.meta.spacing);
    image.getPointData().setVectors(vtkDataArray.newInstance({
      name: 'velocity', values: velocity!.frames[k], numberOfComponents: 3,
    }));
    const seeds = vtkPolyData.newInstance();
    seeds.getPoints().setData(Float32Array.from(velocity!.meta.seeds.flat()), 3);
    const tracer = vtkImageStreamline.newInstance();
    tracer.setIntegrationStep(STREAMLINE_STEP_S);
    tracer.setMaximumNumberOfSteps(STREAMLINE_MAX_STEPS);
    tracer.setInputData(image, 0);
    tracer.setInputData(seeds, 1);
    return {image, seeds, tracer};
  };
  const lineMapper = vtkMapper.newInstance();
  lineMapper.setScalarVisibility(false);
  const lineActor = vtkActor.newInstance();
  lineActor.setMapper(lineMapper);
  lineActor.getProperty().setColor(...STREAMLINE_COLOUR);
  lineActor.getProperty().setLighting(false);
  lineActor.setVisibility(false);
  renderer.addActor(lineActor);
  const traceMs: number[] = [];
  const timedTrace = (t: ReturnType<typeof makeTracer>) => {
    const t0 = performance.now();
    const out = t.tracer.getOutputData();
    traceMs.push(performance.now() - t0);
    return out;
  };
  // Live: one filter, its vectors pointed at the next frame and marked modified,
  // so the next getOutputData() traces again.
  const live = velocity ? makeTracer(0) : null;
  let precomputed: {tracers: ReturnType<typeof makeTracer>[]; lines: ReturnType<typeof timedTrace>[]} | null = null;
  let precomputeMs = 0;
  let lineStats = {lines: 0, points: 0};
  function showLines(k: number): void {
    lineActor.setVisibility(streamMode !== 'off');
    if (streamMode === 'off') return;
    let lines;
    if (streamMode === 'precomputed') {
      if (!precomputed) {
        const t0 = performance.now();
        const tracers = velocity!.frames.map((_, i) => makeTracer(i));
        precomputed = {tracers, lines: tracers.map(timedTrace)};
        precomputeMs = performance.now() - t0;
      }
      lines = precomputed.lines[k];
    } else {
      live!.image.getPointData().getVectors().setData(velocity!.frames[k], 3);
      live!.image.modified();
      lines = timedTrace(live!);
    }
    lineMapper.setInputData(lines);
    lineStats = {lines: lines.getNumberOfLines(), points: lines.getNumberOfPoints()};
  }

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
    applyScale(volumeMapper, volumeScale);
    const volume = vtkVolume.newInstance();
    volume.setMapper(volumeMapper);
    volume.setProperty(property);
    renderer.addVolume(volume);
    return {image, volumeMapper, volume};
  };

  // --- volume resolution ------------------------------------------------------
  // vtk.js 36 and 37 draw the volume on a smaller viewport only while the interactor
  // is animating (OpenGL VolumeMapper renderPieceStart: isAnimating() and a
  // scale over 1.5), at 1/sqrt(scale) per axis. The scale starts at
  // initialInteractionScale and, with auto-adjust off, is reset to
  // imageSampleDistance^2 on each frame-rate update (about once a second of
  // animation). Setting both keeps it fixed from the first frame. Auto-adjust
  // ON is vtk.js's default: it retunes the scale every second to hold 30 FPS,
  // which is the resolution jumping while you drag.
  let volumeChoice: string = DEFAULT_VOLUME_SCALE_CHOICE;
  let volumeScale: VolumeScale = resolveVolumeScale(volumeChoice, window.devicePixelRatio || 1);
  function applyScale(m: ReturnType<typeof vtkVolumeMapper.newInstance>, scale: VolumeScale): void {
    m.setAutoAdjustSampleDistances(false);
    m.setImageSampleDistance(scale);
    m.setInitialInteractionScale(scale * scale);
    // The ray step must not change while animating, or the comparison with page 20 breaks.
    m.setInteractionSampleDistanceFactor(1);
  }
  // While any token holds an animation request, vtk.js's loop draws every
  // display frame itself (RenderWindowInteractor.handleAnimation). Two tokens,
  // because live playback and the playback test start and stop independently:
  // with one, the live timer's sync cancelled the test's request mid-run and
  // vtk.js drew 25 times in 181 frames (measured, then fixed).
  const held = new Set<'live' | 'test'>();
  function holdAnimation(who: 'live' | 'test', on: boolean): void {
    const interactor = renderWindow.getInteractor();
    if (on && !held.has(who)) { interactor.requestAnimation(who); held.add(who); }
    if (!on && held.has(who)) { interactor.cancelAnimation(who, true); held.delete(who); }
  }

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

  // --- isosurface: vtk.js's own marching cubes ---------------------------------
  const makeIsoFilter = (k: number) => {
    const image = vtkImageData.newInstance();
    image.setDimensions(meta.dims);
    image.setOrigin(meta.origin);
    image.setSpacing(meta.spacing);
    image.getPointData().setScalars(vtkDataArray.newInstance({name: meta.field, values: frames[k], numberOfComponents: 1}));
    const filter = vtkImageMarchingCubes.newInstance({contourValue: ISO_LEVEL_PA, computeNormals: true, mergePoints: false});
    filter.setInputData(image);
    return {image, filter};
  };
  const isoMapper = vtkMapper.newInstance();
  isoMapper.setScalarVisibility(false);
  const isoActor = vtkActor.newInstance();
  isoActor.setMapper(isoMapper);
  isoActor.getProperty().setColor(...ISO_COLOUR);
  isoActor.setVisibility(false);
  renderer.addActor(isoActor);
  let isoMode: IsoMode = 'off';
  const isoMs: number[] = [];
  let isoTriangles = 0;
  const timedIso = (f: ReturnType<typeof makeIsoFilter>) => {
    const t0 = performance.now();
    const out = f.filter.getOutputData();
    isoMs.push(performance.now() - t0);
    return out;
  };
  const liveIso = makeIsoFilter(0);
  // One filter per frame when precomputed: like vtkImageStreamline, the filter
  // reuses its output object (outData[0]?.initialize()).
  let precomputedIso: {filters: ReturnType<typeof makeIsoFilter>[]; out: ReturnType<typeof timedIso>[]} | null = null;
  let isoPrecomputeMs = 0;
  function showIso(k: number): void {
    isoActor.setVisibility(isoMode !== 'off');
    if (isoMode === 'off') return;
    let out;
    if (isoMode === 'precomputed') {
      if (!precomputedIso) {
        const t0 = performance.now();
        const filters = frames.map((_, i) => makeIsoFilter(i));
        precomputedIso = {filters, out: filters.map(timedIso)};
        isoPrecomputeMs = performance.now() - t0;
      }
      out = precomputedIso.out[k];
    } else {
      liveIso.image.getPointData().getScalars().setData(frames[k], 1);
      liveIso.image.modified();
      out = timedIso(liveIso);
    }
    isoMapper.setInputData(out);
    isoTriangles = out.getNumberOfPolys();
  }

  // --- slice: vtk.js's reslice mapper on the image the volume draws --------------
  const box = seriesBox(meta);
  const slicePlane = vtkPlane.newInstance();
  slicePlane.setNormal(1, 0, 0);
  const sliceMapper = vtkImageResliceMapper.newInstance();
  sliceMapper.setSlicePlane(slicePlane);
  const sliceActor = vtkImageSlice.newInstance();
  sliceActor.setMapper(sliceMapper);
  sliceActor.getProperty().setRGBTransferFunction(0, ctf);
  // An explicit, fully opaque opacity function. NOT optional in vtk.js 36.12.1 or 37.4.0:
  // OpenGL ImageResliceMapper.buildBufferObjects caches the opacity texture
  // keyed by this function; with none set, every rebuild (every data swap or
  // image change) creates a new opacity texture, skips the cache write for lack
  // of a key, and never frees the previous one. MEASURED without it: +1 live
  // texture per swap, 8 -> 280 textures in one benchmark run on 36.12.1, and
  // +210 over a 210-frame run on 37.4.0 (with it: +0).
  const sliceOpacity = vtkPiecewiseFunction.newInstance();
  sliceOpacity.addPoint(lo, 1);
  sliceOpacity.addPoint(hi, 1);
  sliceActor.getProperty().setPiecewiseFunction(0, sliceOpacity);
  sliceActor.getProperty().setUseLookupTableScalarRange(true);
  sliceActor.getProperty().setInterpolationTypeToLinear();
  sliceActor.setVisibility(false);
  renderer.addActor(sliceActor);
  let sliceMode: SliceMode = 'off';
  const placeSlice = (t: number) => {
    slicePlane.setOrigin(sliceX(box, sliceMode, t), (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2);
  };
  placeSlice(0);
  let volumeOn = true;

  let mode: SwapMode = 'stream';
  // Frame 0 is already in the stream texture once the first render has run.
  // updatedExtents must not be set before that: vtk.js (36.12.1, 37.4.0) looks up a
  // texture that does not exist yet and throws.
  let shown = 0;
  let shownLines = -1;
  function showFrame(k: number): void {
    if (mode === 'preloaded') {
      stream.volume.setVisibility(false);
      preloaded!.forEach((p, i) => p.volume.setVisibility(volumeOn && i === k));
      // The slice reads the image this frame's volume draws, sharing its texture.
      sliceMapper.setInputData(preloaded![k].image);
    } else {
      preloaded?.forEach(p => p.volume.setVisibility(false));
      stream.volume.setVisibility(volumeOn);
      sliceMapper.setInputData(stream.image);
      // Stream swaps on every call, even to the frame it holds, so a benchmark
      // frame is always one upload. Static uploads only to get back to frame 0.
      if (mode === 'stream' || shown !== k) {
        streamScalars.setData(frames[k], 1);
        streamProperty.setUpdatedExtents([WHOLE]);
        // The slice's mapper reads updatedExtents from its own property. Set it
        // only while the slice is drawn: extents left on a hidden slice would
        // apply to whatever it draws next.
        if (sliceMode !== 'off') sliceActor.getProperty().setUpdatedExtents([WHOLE]);
      }
    }
    // Lines follow the volume's frame. Live retraces on every call that moves
    // the data (static stays on frame 0 and never retraces).
    if (mode !== 'static' || shownLines !== k) { showLines(k); showIso(k); shownLines = k; }
    shown = k;
  }

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]; drawIndex?: number}) => {
    if (pose.drawIndex !== undefined) {
      showFrame(benchmarkFrame(pose.drawIndex, frames.length, mode));
      if (sliceMode === 'sweep') placeSlice(pose.drawIndex / (ORBIT_FLAGSHIP_V1.warmupFrames + ORBIT_FLAGSHIP_V1.forcedFrames));
    }
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
  const isoStats = () => ({
    mode: isoMode, level: ISO_LEVEL_PA, triangles: isoMode === 'off' ? 0 : isoTriangles, runs: isoMs.length,
    msP50: isoMs.length ? percentile(isoMs, 0.5) : null, msMax: isoMs.length ? Math.max(...isoMs) : null,
  });
  const streamlineStats = () => ({
    mode: streamMode, seeds: velocity?.meta.seeds.length ?? 0, lines: streamMode === 'off' ? 0 : lineStats.lines,
    points: streamMode === 'off' ? 0 : lineStats.points, traces: traceMs.length,
    traceMsP50: traceMs.length ? percentile(traceMs, 0.5) : null,
    traceMsMax: traceMs.length ? Math.max(...traceMs) : null,
  });
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
      volumeTextures: volumeTextures(), uploads: {...uploads}, streamlines: streamlineStats(),
      iso: isoStats(), slice: {mode: sliceMode, x: slicePlane.getOrigin()[0]}, volumeVisible: volumeOn,
    },
    resources: {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers: 0,
    },
    measurementValid: true,
  };

  function publish(): void {
    probe.animation = {...probe.animation, mode, volumeTextures: volumeTextures(), uploads: {...uploads},
                       streamlines: streamlineStats(), iso: isoStats(),
                       slice: {mode: sliceMode, x: slicePlane.getOrigin()[0]}, volumeVisible: volumeOn};
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
  // Playing = vtk.js's animation loop running (so the volume scale applies);
  // the timer only changes the data, the loop draws it on the next frame.
  const syncAnimation = () => holdAnimation('live', playing && !benchmarking && mode !== 'static');
  const timer = window.setInterval(() => {
    syncAnimation();
    if (!playing || benchmarking || mode === 'static') return;
    playFrame = (playFrame + 1) % frames.length;
    showFrame(playFrame);
    if (sliceMode === 'sweep') placeSlice(performance.now() / 1000 / SLICE_SWEEP_SECONDS);
    tickFps();
    ui.setReadout('frame', `${playFrame + 1}/${frames.length}, t=${meta.frames[playFrame].timeSeconds.toFixed(1)} s`);
  }, 1000 / PLAYBACK_FPS);

  attachContextLoss(canvas, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources: () => {
      window.clearInterval(timer);
      holdAnimation('live', false); holdAnimation('test', false);
      resizeObserver.disconnect();
      mapper.delete(); actor.delete(); polyData.delete();
      for (const v of [stream, ...(preloaded ?? [])]) { v.volumeMapper.delete(); v.volume.delete(); v.image.delete(); }
      for (const t of [...(live ? [live] : []), ...(precomputed?.tracers ?? [])]) {
        t.tracer.delete(); t.seeds.delete(); t.image.delete();
      }
      lineMapper.delete(); lineActor.delete();
      for (const f of [liveIso, ...(precomputedIso?.filters ?? [])]) { f.filter.delete(); f.image.delete(); }
      isoMapper.delete(); isoActor.delete(); sliceMapper.delete(); sliceActor.delete();
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
      const iso = probe.animation.iso;
      if (iso.mode !== 'off') {
        ui.setReadout('iso ms', iso.msP50 === null ? 'no extractions'
          : `p50 ${iso.msP50.toFixed(1)}, max ${iso.msMax!.toFixed(1)} (${iso.runs} extractions, ${iso.mode})`);
      }
      const st = probe.animation.streamlines;
      ui.setReadout('trace ms', st.traceMsP50 === null ? 'no retraces'
        : `p50 ${st.traceMsP50.toFixed(1)}, max ${st.traceMsMax!.toFixed(1)} (${st.traces} traces, ${st.mode})`);
      ui.setReadout('benchmark', `done, ${mode}, streamlines ${streamMode}, ${cpu.length} measured frames`);
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
    // Full resolution and no second render loop: vtk.js's animation is released.
    holdAnimation('live', false);
    // Set and cleared HERE, not in runAndReport: __bench.runBenchmark is
    // called directly too, and a flag left set would freeze playback.
    benchmarking = true;
    fps.reset();
    applySurface(SURFACE[0], SURFACE[1]);
    const before = {...uploads};
    traceMs.length = 0;
    isoMs.length = 0;
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


  /**
   * The playback test, live timer paused. `surface: 'page'` (the button's
   * choice) keeps the canvas the viewer actually has, at the screen's pixel
   * ratio: that is what stutters or not. 'test' pins the benchmark's
   * 1280x720 at ratio 1, for comparing machines and renderers.
   */
  async function runPlaybackTest(opts: {seconds?: number; orbit?: boolean; surface?: 'page' | 'test'} = {}) {
    const pinned = (opts.surface ?? 'page') === 'test';
    const interactor = renderWindow.getInteractor();
    const style = interactor?.getInteractorStyle();
    interactor?.setInteractorStyle(null);
    const restore = apiRenderWindow.getSize() as [number, number];
    resizeObserver.unobserve(ui.canvasHost);
    benchmarking = true;
    holdAnimation('live', false);
    if (pinned) applySurface(SURFACE[0], SURFACE[1]);
    const before = {...uploads};
    traceMs.length = 0;
    isoMs.length = 0;
    try {
      const refreshMs = await measureRefreshMs();
      // vtk.js draws in its own animation loop, the only path where the
      // volume scale applies; draw() below only moves the camera.
      holdAnimation('test', true);
      const result = await runPlayback({
        seconds: opts.seconds ?? 10, orbit: opts.orbit ?? true, frameCount: frames.length,
        showFrame: (k) => { if (mode !== 'static') showFrame(k); },
      draw: (turn) => {
        if (sliceMode === 'sweep') placeSlice(performance.now() / 1000 / SLICE_SWEEP_SECONDS);
        if (turn !== null) {
          const pose = flagshipPose(turn * (ORBIT_FLAGSHIP_V1.warmupFrames + ORBIT_FLAGSHIP_V1.forcedFrames), orbit);
          const camera = renderer.getActiveCamera();
          camera.setPosition(pose.eye[0], pose.eye[1], pose.eye[2]);
          camera.setFocalPoint(pose.target[0], pose.target[1], pose.target[2]);
          camera.setViewUp(0, 0, 1);
          renderer.resetCameraClippingRange();
        }
        // vtk.js's animation loop renders this frame; no explicit render, or
        // every frame would be drawn twice.
      },
      });
      const summary = {
        ...summarisePlayback(result.gapsMs, refreshMs), refreshMs, mode, volumeScale,
        surface: [gl!.drawingBufferWidth, gl!.drawingBufferHeight] as [number, number],
        displayedFrames: result.displayedFrames, dataSwaps: result.dataSwaps, orbit: result.orbit,
        uploads: {calls: uploads.calls - before.calls, bytes: uploads.bytes - before.bytes,
                  allocations: uploads.allocations - before.allocations},
      };
      probe.animation.playback = summary;
      publish();
      return {...summary, gapsMs: result.gapsMs};
    } finally {
      holdAnimation('test', false);
      if (pinned) applySurface(restore[0], restore[1]);
      resizeObserver.observe(ui.canvasHost);
      if (style) interactor?.setInteractorStyle(style);
      renderFrame(flagshipPose(0, orbit));
      benchmarking = false;
    }
  }
  playbackHandler = async () => {
    ui.setReadout('playback', `running 10 s, ${mode}...`);
    const r = await runPlaybackTest();
    ui.setReadout('playback', `${mode}: ${r.missedPct.toFixed(1)}% frames late, worst ${r.worst.toFixed(0)} ms, `
      + `p99 ${r.p99.toFixed(1)} ms (refresh ${r.refreshMs.toFixed(1)} ms) at ${r.surface.join('x')}, `
      + `volume ${VOLUME_SCALE_LABELS[r.volumeScale]}`);
  };
  benchmarkHandler = runAndReport;
  modeHandler = (value: string) => {
    mode = value as SwapMode;
    if (mode === 'preloaded') buildPreloaded();
    showFrame(mode === 'static' ? 0 : playFrame);
    renderWindow.render();
    ui.setReadout('mode', mode);
    publish();
  };
  playHandler = (value: boolean) => { playing = value; syncAnimation(); };
  isoHandler = (value: string) => {
    isoMode = value as IsoMode;
    showIso(shown);
    if (isoMode === 'precomputed') ui.setReadout('iso precompute ms', Math.round(isoPrecomputeMs));
    ui.setReadout('isosurface', isoMode === 'off' ? 'off' : `${isoMode}, ${ISO_LEVEL_PA} Pa (${isoTriangles} triangles)`);
    renderWindow.render();
    publish();
  };
  sliceHandler = (value: string) => {
    sliceMode = value as SliceMode;
    sliceActor.setVisibility(sliceMode !== 'off');
    placeSlice(0);
    ui.setReadout('slice', sliceMode);
    renderWindow.render();
    publish();
  };
  volumeHandler = (on: boolean) => { volumeOn = on; showFrame(shown); renderWindow.render(); publish(); };
  streamlineHandler = (value: string) => {
    if (!velocity && value !== 'off') { ui.setReadout('streamlines', 'no velocity in this series'); return; }
    streamMode = value as StreamlineMode;
    showLines(shown);
    if (streamMode === 'precomputed') ui.setReadout('precompute ms', Math.round(precomputeMs));
    ui.setReadout('streamlines', `${streamMode}${streamMode === 'off' ? '' : ` (${lineStats.lines} lines, ${lineStats.points} points)`}`);
    renderWindow.render();
    publish();
  };
  scaleHandler = (label: string) => {
    volumeChoice = label;
    volumeScale = resolveVolumeScale(label, window.devicePixelRatio || 1);
    for (const v of [stream, ...(preloaded ?? [])]) applyScale(v.volumeMapper, volumeScale);
    renderWindow.render();
    ui.setReadout('volume resolution', `${volumeChoice} (${VOLUME_SCALE_LABELS[volumeScale]} of the canvas)`);
    publish();
  };

  (window as unknown as {__bench: Record<string, unknown>}).__bench.runBenchmark = runBenchmark;
  (window as unknown as {__bench: Record<string, unknown>}).__bench.runPlayback = runPlaybackTest;
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setMode = (m: SwapMode) => modeHandler(m);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setPlaying = (p: boolean) => playHandler(p);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setStreamlines = (m: StreamlineMode) => streamlineHandler(m);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setIso = (m: IsoMode) => isoHandler(m);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setSlice = (m: SliceMode) => sliceHandler(m);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setVolume = (on: boolean) => volumeHandler(on);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setVolumeScale =
    (v: VolumeScale) => scaleHandler(VOLUME_SCALE_LABELS[v]);

  ui.setReadout('volume', `${meta.field}, ${meta.dims.join(' x ')} nodes (${(frames[0].length / 1e6).toFixed(2)}M), `
    + `${frames.length} frames${seriesName === 'shipped' ? '' : `, ?fields=${seriesName}`}`);
  ui.setReadout('mode', mode);
  streamlineHandler(streamMode);
  ui.setReadout('volume resolution', `${volumeChoice} (${VOLUME_SCALE_LABELS[volumeScale]} of the canvas)`);
  ui.setReadout('GPU', describeGpu(gl));
  ui.setReadout('triangles', probe.counts.triangles);
  ui.setReadout('camera radius m', Math.round(orbit.radius));
  publish();
  ui.ready();
}

void main();
