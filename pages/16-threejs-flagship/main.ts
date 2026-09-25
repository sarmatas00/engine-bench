/**
 * Page 16 -- Three.js on the geometry axis.
 *
 * Draws flagship's 10,356 building parts (1.16M vertices, 694k triangles)
 * under orbit-flagship-v1. The pair with page 15 answers the same question the
 * spike asked -- vtk.js against Three.js -- on a city model 48x the buildings
 * of the shipped tile.
 *
 * This page has NO volume rendering and no field. Its frame times are NOT
 * comparable to page 14's: different scene, different camera radius, different
 * city. The only comparison it supports is against page 15.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mountChrome} from '@lib/chrome';
import {
  ORBIT_FLAGSHIP_V1, createGpuTimer, flagshipPose, instrumentGlObjects,
  FLAGSHIP_FOV_DEG, createFpsMeter, describeGpu, loadFlagshipGeometry, makeFrameSync,
  objectForTriangle, percentile, pickTargetTriangle,
  triangleCentroid,
  type FlagshipBundle, type GeometryProbe,
} from '@lib/flagship-geometry';
import {attachContextLoss, createBenchmarkDriver, type CameraPose} from '@lib/scientific-probes';

/**
 * Colour management OFF, module scope, before any Color is constructed.
 *
 * With it on, Three.js applies an sRGB conversion on output that vtk.js does
 * not, and the two pages stop being comparable by eye: the dark background and
 * the building grey both come out washed, which reads as "a grey filter on top"
 * -- which is exactly how the team described it. Page 14 carries the same pair
 * of settings for the same reason.
 */
THREE.ColorManagement.enabled = false;

const SURFACE = {width: 1280, height: 720} as const;

/** Replaced by main() once the scene is up. */
let benchmarkHandler: () => Promise<void> =
  async () => { ui.setReadout('benchmark', 'still loading, try again in a moment'); };

const ui = mountChrome({
  num: '16',
  title: 'Three.js flagship geometry',
  expect: 'the Delft flagship district, ~10k buildings, orbiting once. No volume, no field — this is the geometry axis.',
  claim: 'a semantically rich city model is the case the shipped tile never tested',
  decision: 'whether either renderer struggles with a 10,356-part city — the axis flagship genuinely extends.',
  // The handler is filled in once the page has loaded; until then the button
  // reports that rather than silently doing nothing.
  controls: [{kind: 'button', id: 'run-benchmark', label: 'Run benchmark (210 frames)',
              onClick: () => { void benchmarkHandler(); }}],
  findings: [
    'flagship carries no usable volume grid: the 256 MiB native format cannot hold a 2 km city and a '
    + 'high-resolution VolumeGrid at once. The largest that fits is 100x100x28, which has FEWER z layers '
    + 'than the 32 the spike already measured, so nothing here may be quoted as a volume result.',
    'orbit-flagship-v1 derives its radius and target from dataset.json rather than reusing orbit-v1’s '
    + 'literals (radius 500, target z 40). Those were tuned to a 250 m tile; on a ~1000 m extent they '
    + 'would put the camera inside the city and still return 180 plausible frame times.',
    '68 source surfaces were skipped at extraction — every one has fewer than 3 distinct vertices, '
    + 'zero area, and no triangle to draw. Verified individually, not assumed.',
  ],
});

async function main(): Promise<void> {
  let bundle: FlagshipBundle;
  try {
    bundle = await loadFlagshipGeometry();
  } catch (err) {
    ui.fail(`flagship geometry failed to load: ${(err as Error).message}`);
    return;
  }
  const {mesh, json, dataset, orbit} = bundle;

  // The context is created here, not by WebGLRenderer, for two reasons page 14
  // already had to learn: the counters can be installed before Three.js
  // allocates its first object, and the attributes are the ones vtk.js's own
  // get3DContext asks for (RenderWindow.js:178-182) rather than Three.js's.
  //
  // `antialias` is LEFT UNSET, so this page gets the browser default of true,
  // exactly as vtk.js does. MEASURED before this was fixed: page 15 reported
  // SAMPLES 4 and page 16 SAMPLES 0, so vtk.js was resolving 4x MSAA at every
  // one-pixel readback and Three.js was resolving nothing. That is not a
  // renderer comparison, and it is what the first published frame times
  // measured.
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  ui.canvasHost.prepend(canvas);
  const rawGl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: false, depth: true, alpha: true, powerPreference: 'high-performance',
  }) as WebGL2RenderingContext | null;
  if (!rawGl) { ui.fail('no WebGL2 context'); return; }
  const gl: WebGL2RenderingContext = rawGl;
  const counts = instrumentGlObjects(gl);

  const renderer = new THREE.WebGLRenderer({canvas, context: gl});
  // The other half of the pair: linear out, so what the shader writes is what
  // reaches the drawing buffer, as it does on page 15.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  // The same linear triple page 15 hands vtk.js as its background.
  renderer.setClearColor(new THREE.Color().setRGB(0.067, 0.086, 0.11), 1);
  const gpuTimer = createGpuTimer(gl);
  const frameSync = makeFrameSync(gl);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

  const scene = new THREE.Scene();
  // setRGB, not a hex literal: page 15 gives vtk.js the linear triple
  // (0.72, 0.77, 0.81), and a hex would be read as sRGB and land somewhere else.
  const material = new THREE.MeshLambertMaterial();
  material.color.setRGB(0.72, 0.77, 0.81);
  scene.add(new THREE.Mesh(geometry, material));


  // 30, not Three.js's default 50 and not an arbitrary 45: it must equal page 15's.
  const camera = new THREE.PerspectiveCamera(
    FLAGSHIP_FOV_DEG, SURFACE.width / SURFACE.height, 1, orbit.radius * 6);
  camera.up.set(0, 0, 1);                          // the artifacts are z-up
  // A HEADLIGHT, because that is what page 15 gets.
  //
  // vtk.js's Renderer auto-creates one light when a page adds none:
  // setLightTypeToHeadLight(), intensity 1, directional, sitting at the camera
  // (Renderer.js createLight). An ambient term plus a fixed directional light
  // -- what this page had -- lights the city from somewhere else entirely and
  // makes the two pages look like different scenes rather than two renderers
  // drawing one.
  // Intensity is NOT vtk.js's 1. Three.js changed its light scaling in r155, so
  // the same number is a much darker scene here -- measured: at intensity 1 the
  // city was nearly black under linear output. Page 14 lands on 1.6/2.2 for the
  // same reason. These are calibrated against page 15 by eye, and that is what
  // they are: a brightness match, not a claim of identical light models.
  const headlight = new THREE.DirectionalLight(0xffffff, 3.0);
  headlight.position.set(0, 0, 0);
  headlight.target.position.set(0, 0, -1);
  camera.add(headlight);
  camera.add(headlight.target);
  scene.add(camera);   // the light rides the camera, so it stays a headlight
  // vtk.js's default actor property carries an ambient term of its own; without
  // a little here the faces pointing away from the camera go pure black.
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  // Orbit with the mouse, the same addon page 14 uses. Damping off: a damped
  // camera keeps moving after the pointer stops, which would let a drag still
  // be settling when a benchmark run starts.
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  let listeners = 0;

  /** Draw the current camera. Used by the controls on every change, and by
   *  renderFrame once it has placed the camera. */
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
    if (value !== null) ui.setReadout('fps while interacting', value.toFixed(0));
  }
  const renderScene = () => {
    renderer.render(scene, camera);
    frameSync();
    fps.tick();
    const value = fps.fps();
    if (value !== null) ui.setReadout('fps', value.toFixed(0));
  };

  controls.addEventListener('change', renderScene);
  listeners += 1;

  /**
   * Size the drawing buffer to what is actually on screen, at device pixels.
   *
   * Before this the buffer was pinned to 1280x720 for the page's whole life and
   * the browser stretched it across ~1913 CSS pixels, which is exactly the blur
   * the team saw. The measurement still runs at 1280x720 -- runBenchmark pins
   * it -- but nobody has to look at a stretched image to get that.
   */
  function applySurface(cssWidth: number, cssHeight: number, dpr: number): void {
    camera.aspect = cssWidth / cssHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssWidth, cssHeight, false);
    renderScene();
  }

  const resizeObserver = new ResizeObserver(() => {
    const rect = ui.canvasHost.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      applySurface(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)),
                   window.devicePixelRatio || 1);
      publish();
    }
  });
  resizeObserver.observe(ui.canvasHost);
  let observers = 1;

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]}) => {
    // `eye` is handed over by flagshipPose on purpose; recomputing the trig
    // here is how a page gets the handedness wrong and the renderer gets blamed.
    const eye = pose.eye!;
    camera.position.set(eye[0], eye[1], eye[2]);
    controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    renderScene();
  };

  const probe: GeometryProbe = {
    renderer: 'threejs',
    status: 'ready',
    canvasCount: ui.canvasHost.querySelectorAll('canvas').length,
    axis: 'geometry',
    // Read off the LOADED mesh, never copied from dataset.json, so a manifest
    // that disagreed with its own bytes is visible rather than quoted.
    counts: {
      buildingParts: dataset.counts.buildingParts,
      vertices: mesh.positions.length / 3,
      triangles: mesh.indices.length / 3,
      objectTable: json.objectTable.length,
    },
    camera: orbit,
    lens: {fovDeg: camera.fov, aspect: camera.aspect,
           surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]},
    volumeField: null,
    resources: {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners, observers,
    },
    interactive: true,
    measurementValid: true,
  };

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

  // The shared wiring owns the ORDER (prevent default, stop measuring, mark
  // the probe lost, dispose, then show the failure) -- this page supplies only
  // the renderer-specific parts.
  attachContextLoss(renderer.domElement, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources: () => { resizeObserver.disconnect(); controls.dispose(); material.dispose(); geometry.dispose(); renderer.dispose(); },
    onLost: () => {
      publish();
      ui.fail('WebGL context lost. Frame times from this run are not a measurement.');
    },
  });

  function publish(): void {
    // Read live, never captured at construction: the surface changes with the
    // element and is pinned during a run, so a snapshot taken once would report
    // the 300x150 default canvas for the page's whole life.
    probe.lens = {fovDeg: camera.fov, aspect: camera.aspect,
                  surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]};
    probe.resources = {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners, observers,
    };
    ui.setProbe('flagship', probe);
  }

  // One deterministic pick, so triangle -> building attribution is exercised on
  // every load rather than only under the measurement script.
  //
  // NOT a centre-of-screen cast. orbit-flagship-v1's target sits at
  // localZMax/2 = 53.8 m, which is half the TALLEST building, so the centre ray
  // passes ~40 m above ordinary Delft rooftops and reaches ground level only
  // ~93 m past the target -- it misses the city entirely and would have made
  // "no selectedObject" look like a picking failure. Instead: project a chosen
  // building's own centroid to screen and cast there.
  //
  // `expected` and `picked` are both recorded, and they may legitimately differ
  // when something nearer occludes the target. Reporting the pair is the check;
  // asserting equality would be wrong, and asserting nothing would be useless.
  const raycaster = new THREE.Raycaster();
  renderFrame(flagshipPose(0, orbit));
  const expectedTriangle = pickTargetTriangle(bundle);
  const centroid = triangleCentroid(bundle, expectedTriangle);
  const projected = new THREE.Vector3(centroid[0], centroid[1], centroid[2]).project(camera);
  raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), camera);
  const hit = raycaster.intersectObject(scene.children[0]!, false)[0];
  if (hit && typeof hit.faceIndex === 'number') {
    probe.selectedObject = objectForTriangle(bundle, hit.faceIndex);
    probe.pickCheck = {
      expected: objectForTriangle(bundle, expectedTriangle),
      picked: probe.selectedObject,
      sameObject: probe.selectedObject.objectIndex === objectForTriangle(bundle, expectedTriangle).objectIndex,
      note: 'a different object is a legitimate occlusion result, not a failure',
    };
    ui.setReadout('picked part', probe.selectedObject.dtccId);
    ui.setReadout('pick matches target', String(probe.pickCheck.sameObject));
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
      // A drag mid-run would move the camera the driver is placing, so the
      // frame times would describe a scene nobody chose. Off for the duration,
      // then back to the start pose so the page is usable again.
      controls.enabled = false;
      // The frame times of record are at 1280x720 device pixels. The observer
      // is stood down so it cannot resize the surface mid-measurement.
      const rect = ui.canvasHost.getBoundingClientRect();
      const restore = {w: Math.max(1, Math.floor(rect.width)), h: Math.max(1, Math.floor(rect.height)),
                       dpr: window.devicePixelRatio || 1};
      resizeObserver.unobserve(ui.canvasHost);
      applySurface(SURFACE.width, SURFACE.height, 1);
      try {
        const result = await driver.runBenchmark();
        probe.benchmark = result;
        probe.measurementValid = result.cpuFrameTimesMs.length === ORBIT_FLAGSHIP_V1.forcedFrames;
        publish();
        return result;
      } finally {
        applySurface(restore.w, restore.h, restore.dpr);
        resizeObserver.observe(ui.canvasHost);
        controls.enabled = true;
        renderFrame(flagshipPose(0, orbit));
      }
  }

  (window as unknown as {__bench: {runBenchmark: () => Promise<unknown>}}).__bench.runBenchmark =
    runBenchmark;

  publish();
  ui.ready();
}

void main();
