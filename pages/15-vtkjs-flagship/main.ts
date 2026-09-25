/**
 * Page 15 -- vtk.js on the geometry axis. The pair with page 16.
 *
 * Draws flagship's 10,356 building parts (1.16M vertices, 694k triangles)
 * under orbit-flagship-v1. NO volume rendering and no field: flagship carries
 * no usable volume grid (see flagship-geometry.ts). Frame times here are NOT
 * comparable to page 13's -- different scene, camera radius and city. The only
 * comparison supported is against page 16.
 *
 * THE SURFACE IS PINNED ONCE AND NEVER RESIZED. Page 13 resizes to pin the
 * benchmark surface and pays two GL objects per setSize for it. This page has
 * no interactive mode to restore, so it takes the surface at construction and
 * installs no ResizeObserver -- which keeps `resources` a clean read of what
 * the scene holds rather than a mix of scene and resize cost.
 */
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker';

import {mountChrome} from '@lib/chrome';
import {
  FLAGSHIP_FOV_DEG, ORBIT_FLAGSHIP_V1, createFpsMeter, createGpuTimer, describeGpu, flagshipPose,
  instrumentGlObjects, makeFrameSync, percentile,
  loadFlagshipGeometry, objectForTriangle, pickTargetTriangle, triangleCentroid,
  type FlagshipBundle, type GeometryProbe,
} from '@lib/flagship-geometry';
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
let benchmarkHandler: () => Promise<void> =
  async () => { ui.setReadout('benchmark', 'still loading, try again in a moment'); };

const ui = mountChrome({
  num: '15',
  title: 'VTK.js flagship geometry',
  expect: 'the Delft flagship district, ~10k buildings, orbiting once. No volume, no field — this is the geometry axis.',
  claim: 'a semantically rich city model is the case the shipped tile never tested',
  decision: 'whether either renderer struggles with a 10,356-part city — the axis flagship genuinely extends.',
  // The handler is filled in once the page has loaded; until then the button
  // reports that rather than silently doing nothing.
  controls: [{kind: 'button', id: 'run-benchmark', label: 'Run benchmark (210 frames)',
              onClick: () => { void benchmarkHandler(); }}],
  findings: [
    'The redraws/sec readout is NOT comparable with the other page. MEASURED over ten identical drags: vtk.js issued 43 draw calls, Three.js issued 10. vtk.js animates continuously while its interactor is dragging; Three.js redraws once per controls event. Both are correct behaviour and the rates are not the same quantity. Use the Run benchmark button to compare the two pages \u2014 it drives both through the identical 210-frame camera path.',
    'flagship carries no usable volume grid: the 256 MiB native format cannot hold a 2 km city and a '
    + 'high-resolution VolumeGrid at once. The largest that fits is 100x100x28, FEWER z layers than the '
    + '32 the spike already measured, so nothing here may be quoted as a volume result.',
    'orbit-flagship-v1 derives radius and target from dataset.json rather than reusing orbit-v1’s '
    + 'literals, which were tuned to a 250 m tile and would put the camera inside this city.',
    'The startup pick aims at a projected building centroid, not screen centre: the camera target sits '
    + 'at half the TALLEST building (53.8 m), well above ordinary Delft rooftops, so a centre-screen ray '
    + 'misses the city and would look like broken picking.',
  ],
});
// First readout row, so every pasted summary names the renderer that produced
// it: two unlabelled pastes in one thread were indistinguishable.
ui.setReadout('renderer', 'vtk.js');

async function main(): Promise<void> {
  let bundle: FlagshipBundle;
  try {
    bundle = await loadFlagshipGeometry();
  } catch (err) {
    ui.fail(`flagship geometry failed to load: ${(err as Error).message}`);
    return;
  }
  const {mesh, json, dataset, orbit} = bundle;

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0';
  ui.canvasHost.prepend(container);

  // listenWindowResize off: this page owns no resize path at all, so
  // `resources` reads the scene rather than the scene plus resize cost.
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
  // Wrapped before the first render, so every GL object for this scene is counted.
  const counts = gl ? instrumentGlObjects(gl) : {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0};
  const gpuTimer = gl ? createGpuTimer(gl) : null;
  const frameSync = makeFrameSync(gl);
  const fps = createFpsMeter();
  /**
   * One place that ticks the meter and writes the readout.
   *
   * SILENT DURING A BENCHMARK RUN. The driver awaits a real macrotask between
   * frames, so wall-clock intervals inside a run are the driver's pacing, not
   * the cost of drawing -- measured at 76 FPS on a page whose frames take
   * 3.3 ms, which would read as the scene being four times slower than it is.
   * The run reports its own statistics; this meter is for interaction.
   */
  let benchmarking = false;
  function tickFps(): void {
    if (benchmarking) return;
    fps.tick();
    const value = fps.fps();
    if (value !== null) ui.setReadout('redraws/sec', value.toFixed(0));
  }

  /**
   * Size the drawing buffer to what is on screen, at device pixels.
   *
   * Before this the buffer was pinned to 1280x720 for the page's whole life and
   * stretched across ~1913 CSS pixels -- the blur the team saw. The measurement
   * still runs at 1280x720; runBenchmark pins it and stands the observer down.
   *
   * Each setSize costs vtk.js two GL objects it never returns (NOTES.md, the
   * resize leak). That is vtk.js's, not this page's, and `resources` reports it
   * rather than hiding it behind a surface that never changes.
   */
  function applySurface(width: number, height: number): void {
    apiRenderWindow.setSize(Math.max(1, width), Math.max(1, height));
    renderer.resetCameraClippingRange();
    renderWindow.render();
  }

  // vtk.js draws its own frames while the interactor is dragging, bypassing
  // renderFrame entirely, so without this the meter would sit silent during
  // exactly the interaction someone is trying to measure. The interactor emits
  // one Animation event per animated frame. Guarded rather than assumed: if the
  // event is not there, the meter simply stays on renderFrame's ticks.
  const interactorForFps = renderWindow.getInteractor() as unknown as
    {onAnimation?: (cb: () => void) => unknown} | null;
  if (typeof interactorForFps?.onAnimation === 'function') {
    interactorForFps.onAnimation(() => {
      tickFps();
    });
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
  // Set explicitly even though it equals vtk.js's own default, so page 16 is
  // matched against a stated value rather than against a library default.
  renderer.getActiveCamera().setViewAngle(FLAGSHIP_FOV_DEG);

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

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]}) => {
    const eye = pose.eye!;
    const camera = renderer.getActiveCamera();
    camera.setPosition(eye[0], eye[1], eye[2]);
    camera.setFocalPoint(pose.target[0], pose.target[1], pose.target[2]);
    // The artifacts are z-up; vtk.js imposes no up of its own.
    camera.setViewUp(0, 0, 1);
    renderer.resetCameraClippingRange();
    renderWindow.render();
    // Makes the wall clock measure a frame, not command submission.
    frameSync();
    tickFps();
  };

  const probe: GeometryProbe = {
    renderer: 'vtkjs',
    status: 'ready',
    canvasCount: ui.canvasHost.querySelectorAll('canvas').length,
    axis: 'geometry',
    counts: {
      buildingParts: dataset.counts.buildingParts,
      vertices: mesh.positions.length / 3,
      triangles: mesh.indices.length / 3,
      objectTable: json.objectTable.length,
    },
    camera: orbit,
    interactive: true,
    lens: {fovDeg: renderer.getActiveCamera().getViewAngle(),
           aspect: (gl ? gl.drawingBufferWidth / gl.drawingBufferHeight : 1),
           surface: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : [0, 0]},
    volumeField: null,
    resources: {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers: 0,
    },
    measurementValid: true,
  };

  function publish(): void {
    // Live, same reason as page 16.
    probe.lens = {fovDeg: renderer.getActiveCamera().getViewAngle(),
                  aspect: gl ? gl.drawingBufferWidth / gl.drawingBufferHeight : 1,
                  surface: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : [0, 0]};
    probe.resources = {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners: 0, observers,
    };
    ui.setProbe('flagship', probe);
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
    disposeGpuResources: () => { resizeObserver.disconnect(); mapper.delete(); actor.delete(); polyData.delete(); },
    onLost: () => {
      publish();
      ui.fail('WebGL context lost. Frame times from this run are not a measurement.');
    },
  });

  // Same startup pick as page 16, through vtk.js's own picker: aim at a chosen
  // building's centroid, record where we aimed and what we hit. A different
  // object is occlusion, not a failure; asserting equality would be wrong.
  renderFrame(flagshipPose(0, orbit));
  const expectedTriangle = pickTargetTriangle(bundle);
  const centroid = triangleCentroid(bundle, expectedTriangle);
  // The 4th argument is the viewport aspect (X/Y), which vtk.js requires.
  // Normalized display and vtk.js pixel display share a bottom-left origin, so
  // the y scale below needs no flip -- unlike page 13's parityPickAt, which
  // takes v from the TOP and therefore does flip.
  // The LIVE surface, not the SURFACE constant. The drawing buffer now follows
  // the element, so multiplying normalized display coordinates by 1280x720
  // aimed the picker at the wrong pixel: page 15 resolved triangle 2203 where
  // page 16 resolved 658873, the first time the two ever disagreed.
  const [pickW, pickH] = apiRenderWindow.getSize() as [number, number];
  const display = renderer.worldToNormalizedDisplay(
    centroid[0], centroid[1], centroid[2], pickW / pickH,
  ) as number[];
  const picker = vtkCellPicker.newInstance();
  picker.setPickFromList(false);
  picker.pick([display[0] * pickW, display[1] * pickH, 0], renderer);
  const cellId = picker.getCellId();
  if (cellId >= 0 && cellId < mesh.indices.length / 3) {
    probe.selectedObject = objectForTriangle(bundle, cellId);
    probe.pickCheck = {
      expected: objectForTriangle(bundle, expectedTriangle),
      picked: probe.selectedObject,
      sameObject: probe.selectedObject.objectIndex === objectForTriangle(bundle, expectedTriangle).objectIndex,
      note: 'a different object is a legitimate occlusion result, not a failure',
    };
    ui.setReadout('picked part', probe.selectedObject.dtccId);
    // A miss means a nearer building occludes the aimed-at one, not a failure.
    // Renderer parity is 'picked part' agreeing across pages 15 and 16.
    ui.setReadout('aimed-at building', probe.pickCheck.sameObject
      ? 'hit'
      : 'occluded by picked part (not a failure)');
  } else {
    ui.setReadout('picked part', 'no hit');
  }

  /**
   * Run the measurement and put the result on the page.
   *
   * Exists because "it feels slower on my machine" cannot be compared against a
   * published range. This prints the same statistics those ranges were built
   * from, beside the GPU string they were measured on, so a number from any
   * machine is attributable to the surface that produced it.
   */
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
      // Reported with its sample count, never as a bare number: disjoint GPU
      // samples are dropped here and a p50 over a handful of survivors is not
      // a p50 over a run.
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

  ui.setReadout('building parts', probe.counts.buildingParts);
  ui.setReadout('GPU', describeGpu(gl));
  ui.setReadout('triangles', probe.counts.triangles);
  ui.setReadout('camera radius m', Math.round(orbit.radius));

  async function runBenchmark() {
      // Same reason as page 16: vtk.js's own interactor would otherwise let a
      // drag move the camera the driver is placing.
      //
      // NOT interactor.disable(). MEASURED: that stops vtk.js rendering
      // altogether, and the run then completes 180 frames, reports
      // measurementValid true, and draws NOTHING -- cpu p50 falls from 5.5 ms
      // to 0.3 ms with zero GPU samples, which reads as a 15x speedup rather
      // than as a broken run. Dropping the interactor STYLE takes the camera
      // away from the mouse and leaves rendering alone.
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
