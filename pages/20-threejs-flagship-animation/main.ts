/**
 * Page 20 -- Three.js on the animation axis. The pair with page 19.
 *
 * Page 18's city and ray marcher (shared through threejs-volume.ts), with
 * Anders's time-dependent pressure field in place of the static speed volume,
 * swapped while drawing in one of three modes (flagship-fields.ts, SwapMode).
 *
 *  - stream: one Data3DTexture whose image.data is pointed at the next frame,
 *    then needsUpdate. Three.js allocates the texture once (texStorage3D) and
 *    after that only calls texSubImage3D, the same GL work as page 19.
 *  - preloaded: one Data3DTexture per frame, all initialised up front, and the
 *    shader's uData uniform pointed at one per draw.
 *
 * The only comparison supported is against page 19, mode for mode.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mountChrome} from '@lib/chrome';
import {
  ORBIT_FLAGSHIP_V1, FLAGSHIP_FOV_DEG, createFpsMeter, createGpuTimer, describeGpu, flagshipPose,
  instrumentGlObjects, loadFlagshipGeometry, makeFrameSync, percentile, type FlagshipBundle,
} from '@lib/flagship-geometry';
import {DEFAULT_OPACITY, VOLUME_MAX_SAMPLES, VOLUME_STEP_M, opacityNodes} from '@lib/flagship-volume';
import {
  DEFAULT_VOLUME_SCALE_CHOICE, PLAYBACK_FPS, SWAP_MODES, VOLUME_SCALE_CHOICES, VOLUME_SCALE_LABELS, benchmarkFrame, resolveVolumeScale, measureRefreshMs, runPlayback, seriesFromQuery, summarisePlayback, countVolumeUploads, loadFieldSeries, seriesBox,
  type AnimationProbe, type FieldSeries, type SwapMode, type VolumeScale,
} from '@lib/flagship-fields';
import {BLIT_FRAGMENT_GLSL, BLIT_VERTEX_GLSL, VOLUME_FRAGMENT_GLSL, VOLUME_VERTEX_GLSL} from '@lib/threejs-volume';
import {attachContextLoss, createBenchmarkDriver, type CameraPose} from '@lib/scientific-probes';

// Page 16's colour pair, same reason: no sRGB conversion vtk.js does not make.
THREE.ColorManagement.enabled = false;

const SURFACE = {width: 1280, height: 720} as const;

/** Replaced by main() once the scene is up. */
let modeHandler: (mode: string) => void = () => {};
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
  num: '20',
  title: 'Three.js flagship animation',
  expect: 'the Delft district inside a synthetic pressure field that changes over time, playing in a loop.',
  claim: 'a Twin will play simulations back, so the volume has to change while it is drawn',
  decision: 'whether either renderer\'s frame rate holds while the volume is replaced every frame, '
    + 'streamed into one texture or preloaded as one texture per frame.',
  controls: [
    {kind: 'select', id: 'mode', label: 'Swap', options: SWAP_MODES, value: 'stream', onChange: v => modeHandler(v)},
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
    'Volume resolution (default auto: half the window\'s CSS resolution, so 1/4 of the canvas on Retina) ray-marches the volume on a smaller target and scales it up over the '
    + 'full-resolution city: our own code here, vtk.js\'s imageSampleDistance on page 19. The benchmark always '
    + 'draws at full resolution, so its numbers compare with pages 17/18; the playback test uses the setting.',
    'Playback test: 10 s of real playback (data at 10 frames/s, the display at its own refresh, the camera '
    + 'orbiting as if dragged), recording the gap between displayed frames. It measures stutter, which the '
    + 'benchmark cannot: the benchmark times draws one after another, not what a viewer sees.',
    'The field is SYNTHETIC and ignores the buildings: Anders\'s generator says "not a fluid simulation". '
    + 'It is a time series of realistic shape, here to measure playback, not to show a flow.',
    'Bigger series for the size test (?fields=large, ?fields=xl) are generated locally and not published; '
    + 'see NOTES.md for their results.',
    'The benchmark advances one data frame per drawn frame, whatever the mode, which is harder than real '
    + 'playback. Static draws frame 0 throughout and is the baseline for the other two.',
    'Stream points one texture at the next frame\'s array and flags it for upload; Three.js then sends it '
    + 'with texSubImage3D into the texture it already has. The probe counts the GL calls to prove it.',
    'Preloaded is one texture per frame and a uniform switch. The ray marcher is page 18\'s, shared code.',
    'The redraws/sec readout is NOT comparable with page 19. Use Run benchmark to compare the two pages.',
  ],
});
// First readout row, so every pasted summary names the renderer that produced it.
ui.setReadout('renderer', 'Three.js');

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

  // Created here rather than by WebGLRenderer, page 16's reasoning.
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  ui.canvasHost.prepend(canvas);
  const rawGl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: false, depth: true, alpha: true, powerPreference: 'high-performance',
  }) as WebGL2RenderingContext | null;
  if (!rawGl) { ui.fail('no WebGL2 context'); return; }
  const gl: WebGL2RenderingContext = rawGl;
  const counts = instrumentGlObjects(gl);
  const uploads = countVolumeUploads(gl);

  const renderer = new THREE.WebGLRenderer({canvas, context: gl});
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const background = new THREE.Color().setRGB(0.067, 0.086, 0.11);
  renderer.setClearColor(background, 1);
  const gpuTimer = createGpuTimer(gl);
  const frameSync = makeFrameSync(gl);
  const floatLinear = renderer.extensions.has('OES_texture_float_linear');

  // --- the city: page 16's mesh and lights ---------------------------------
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  const material = new THREE.MeshLambertMaterial();
  material.color.setRGB(0.72, 0.77, 0.81);

  const cameraNear = 1;
  const cameraFar = orbit.radius * 6;
  const camera = new THREE.PerspectiveCamera(FLAGSHIP_FOV_DEG, SURFACE.width / SURFACE.height, cameraNear, cameraFar);
  camera.up.set(0, 0, 1);
  const headlight = new THREE.DirectionalLight(0xffffff, 3.0);
  headlight.position.set(0, 0, 0);
  headlight.target.position.set(0, 0, -1);
  camera.add(headlight);
  camera.add(headlight.target);

  const opaque = new THREE.Scene();
  opaque.add(new THREE.Mesh(geometry, material));
  opaque.add(camera);
  opaque.add(new THREE.AmbientLight(0xffffff, 0.9));

  // --- offscreen opaque pass (page 14's design) ----------------------------
  const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  depthTexture.minFilter = THREE.NearestFilter;
  depthTexture.magFilter = THREE.NearestFilter;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const canvasSamples = gl.getParameter(gl.SAMPLES) as number;
  const opaqueTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture, depthBuffer: true, stencilBuffer: false, samples: canvasSamples,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });

  // --- reduced-resolution volume pass ------------------------------------------
  // The march runs into this target, 1/scale of the canvas per axis, cleared to
  // transparent; a full-screen quad then lays it over the city with the same
  // premultiplied blend the volume pass uses. Linear filtering does the upscale.
  // At scale 1 none of this runs: the volume draws straight to the canvas, the
  // path pages 18 and 20 always had.
  const volumeTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
  const compositeMaterial = new THREE.ShaderMaterial({
    uniforms: {uColor: {value: volumeTarget.texture}},
    vertexShader: BLIT_VERTEX_GLSL, fragmentShader: BLIT_FRAGMENT_GLSL,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
  });
  const compositeGeometry = new THREE.PlaneGeometry(2, 2);
  const compositeScene = new THREE.Scene();
  compositeScene.add(new THREE.Mesh(compositeGeometry, compositeMaterial));
  let volumeChoice: string = DEFAULT_VOLUME_SCALE_CHOICE;
  let volumeScale: VolumeScale = resolveVolumeScale(volumeChoice, window.devicePixelRatio || 1);
  const bufferSize = new THREE.Vector2(1, 1);

  // --- the volume textures ----------------------------------------------------
  const [nx, ny, nz] = meta.dims;
  const makeTexture = (data: Float32Array) => {
    const texture = new THREE.Data3DTexture(data, nx, ny, nz);
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
    texture.magFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
    texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.unpackAlignment = 4;
    texture.needsUpdate = true;
    return texture;
  };
  const streamTexture = makeTexture(frames[0]);
  let preloaded: THREE.Data3DTexture[] | null = null;
  function buildPreloaded(): void {
    if (preloaded) return;
    preloaded = frames.map(makeTexture);
    for (const t of preloaded) renderer.initTexture(t);
  }

  const box = seriesBox(meta);
  const [lo, hi] = meta.range;
  const nodes = opacityNodes(0, 1, DEFAULT_OPACITY).map(([, a]) => a);
  const uResolution = {value: new THREE.Vector2(1, 1)};
  const uData = {value: streamTexture as THREE.Data3DTexture};
  const volumeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uData,
      // Values on the vertices: node 0 IS the origin, so the shader's
      // (index + 0.5) / size lands on texel centres exactly as on page 18.
      uOrigin: {value: new THREE.Vector3(...meta.origin)},
      uSpacing: {value: new THREE.Vector3(...meta.spacing)},
      uSize: {value: new THREE.Vector3(nx, ny, nz)},
      uClim: {value: new THREE.Vector2(lo, hi)},
      uAlphaNodes: {value: new THREE.Vector3(nodes[0], nodes[1], nodes[2])},
      uStep: {value: VOLUME_STEP_M},
      uBoxMin: {value: new THREE.Vector3(...box.min)},
      uBoxMax: {value: new THREE.Vector3(...box.max)},
      uOpaqueDepth: {value: depthTexture as THREE.Texture},
      uResolution,
      uNear: {value: cameraNear},
      uFar: {value: cameraFar},
    },
    vertexShader: VOLUME_VERTEX_GLSL, fragmentShader: VOLUME_FRAGMENT_GLSL,
    side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
  });
  const span = box.max.map((m, a) => m - box.min[a]) as [number, number, number];
  const boxGeometry = new THREE.BoxGeometry(span[0], span[1], span[2]);
  boxGeometry.translate(box.min[0] + span[0] / 2, box.min[1] + span[1] / 2, box.min[2] + span[2] / 2);
  const volumeMesh = new THREE.Mesh(boxGeometry, volumeMaterial);
  volumeMesh.frustumCulled = false;
  const volumeScene = new THREE.Scene();
  volumeScene.add(volumeMesh);

  const blitGeometry = new THREE.PlaneGeometry(2, 2);
  const blitMaterial = new THREE.ShaderMaterial({
    uniforms: {uColor: {value: opaqueTarget.texture}},
    vertexShader: BLIT_VERTEX_GLSL, fragmentShader: BLIT_FRAGMENT_GLSL,
    depthTest: false, depthWrite: false,
  });
  const blitScene = new THREE.Scene();
  blitScene.add(new THREE.Mesh(blitGeometry, blitMaterial));
  const blitCamera = new THREE.Camera();

  let mode: SwapMode = 'stream';
  let shown = 0;
  function showFrame(k: number): void {
    if (mode === 'preloaded') {
      uData.value = preloaded![k];
    } else {
      uData.value = streamTexture;
      // Same rule as page 19: stream uploads on every call, static only to
      // get back to frame 0.
      if (mode === 'stream' || shown !== k) {
        streamTexture.image.data = frames[k];
        streamTexture.needsUpdate = true;
      }
    }
    shown = k;
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  let listeners = 0;

  const fps = createFpsMeter();
  let benchmarking = false;
  function tickFps(): void {
    if (benchmarking) return;
    fps.tick();
    const value = fps.fps();
    if (value !== null) ui.setReadout('redraws/sec', value.toFixed(0));
  }
  const transparent = new THREE.Color(0, 0, 0);
  /** One frame, no GPU sync: the city at full resolution, the volume at `scale`. */
  const drawScene = (scale: VolumeScale) => {
    renderer.setRenderTarget(opaqueTarget);
    renderer.clear();
    renderer.render(opaque, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(blitScene, blitCamera);
    if (scale === 1) {
      uResolution.value.copy(bufferSize);
      renderer.render(volumeScene, camera);
      return;
    }
    const w = Math.ceil(bufferSize.x / scale), h = Math.ceil(bufferSize.y / scale);
    if (volumeTarget.width !== w || volumeTarget.height !== h) volumeTarget.setSize(w, h);
    // The shader turns gl_FragCoord into a depth-texture coordinate with this.
    uResolution.value.set(w, h);
    renderer.setRenderTarget(volumeTarget);
    renderer.setClearColor(transparent, 0);
    renderer.clear();
    renderer.render(volumeScene, camera);
    renderer.setClearColor(background, 1);
    renderer.setRenderTarget(null);
    renderer.render(compositeScene, blitCamera);
  };
  // vtk.js's rule, so the two pages behave alike: reduced resolution while the
  // picture is moving (playing, or the user dragging), full resolution once it
  // comes to rest. The benchmark always draws full.
  let interacting = false;
  const moving = () => interacting || (playing && mode !== 'static');
  const renderScene = () => {
    drawScene(benchmarking || !moving() ? 1 : volumeScale);
    frameSync();
    tickFps();
  };

  controls.addEventListener('change', renderScene);
  controls.addEventListener('start', () => { interacting = true; });
  controls.addEventListener('end', () => { interacting = false; renderScene(); });
  listeners += 3;

  function applySurface(cssWidth: number, cssHeight: number, dpr: number): void {
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssWidth, cssHeight, false);
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));
    opaqueTarget.setSize(bufferWidth, bufferHeight);
    bufferSize.set(bufferWidth, bufferHeight);
    camera.aspect = bufferWidth / bufferHeight;
    camera.updateProjectionMatrix();
    renderScene();
  }

  const resizeObserver = new ResizeObserver(() => {
    // 'auto' depends on the pixel ratio, which changes when the window moves screens.
    scaleHandler(volumeChoice);
    const rect = ui.canvasHost.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      applySurface(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)),
                   window.devicePixelRatio || 1);
      publish();
    }
  });
  resizeObserver.observe(ui.canvasHost);
  const observers = 1;

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]; drawIndex?: number}) => {
    if (pose.drawIndex !== undefined) showFrame(benchmarkFrame(pose.drawIndex, frames.length, mode));
    const eye = pose.eye!;
    camera.position.set(eye[0], eye[1], eye[2]);
    controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    renderScene();
  };

  const volumeTextures = () => (preloaded ? 1 + preloaded.length : 1);
  const probe: AnimationProbe = {
    renderer: 'threejs',
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
    lens: {fovDeg: camera.fov, aspect: camera.aspect, surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]},
    volumeField: {
      field: meta.field, dims: meta.dims, nodes: frames[0].length, range: meta.range,
      stepMetres: VOLUME_STEP_M, maxSamples: VOLUME_MAX_SAMPLES, opacityScale: DEFAULT_OPACITY,
      opacityCorrection: 'none: a per sample',
    },
    animation: {
      series: seriesName, mode, frames: frames.length, bytesPerFrame: frames[0].byteLength,
      volumeTextures: volumeTextures(), uploads: {...uploads},
    },
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
    renderScene();
    ui.setReadout('frame', `${playFrame + 1}/${frames.length}, t=${meta.frames[playFrame].timeSeconds.toFixed(1)} s`);
  }, 1000 / PLAYBACK_FPS);

  attachContextLoss(renderer.domElement, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources: () => {
      window.clearInterval(timer);
      resizeObserver.disconnect(); controls.dispose();
      material.dispose(); geometry.dispose();
      volumeMaterial.dispose(); boxGeometry.dispose(); streamTexture.dispose();
      preloaded?.forEach(t => t.dispose());
      blitMaterial.dispose(); blitGeometry.dispose(); opaqueTarget.dispose();
      compositeMaterial.dispose(); compositeGeometry.dispose(); volumeTarget.dispose();
      renderer.dispose();
    },
    onLost: () => {
      publish();
      ui.fail('WebGL context lost. Frame times from this run are not a measurement.');
    },
  });

  function publish(): void {
    probe.animation = {...probe.animation, mode, volumeTextures: volumeTextures(), uploads: {...uploads}};
    probe.lens = {fovDeg: camera.fov, aspect: camera.aspect,
                  surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]};
    probe.resources = {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners, observers,
    };
    ui.setProbe('flagshipAnimation', probe);
  }

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
    controls.enabled = false;
    const rect = ui.canvasHost.getBoundingClientRect();
    const restore = {w: Math.max(1, Math.floor(rect.width)), h: Math.max(1, Math.floor(rect.height)),
                     dpr: window.devicePixelRatio || 1};
    resizeObserver.unobserve(ui.canvasHost);
    // Set and cleared HERE, not in runAndReport: __bench.runBenchmark is
    // called directly too, and a flag left set would freeze playback.
    benchmarking = true;
    fps.reset();
    applySurface(SURFACE.width, SURFACE.height, 1);
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
      applySurface(restore.w, restore.h, restore.dpr);
      resizeObserver.observe(ui.canvasHost);
      controls.enabled = true;
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
    controls.enabled = false;
    const rect = ui.canvasHost.getBoundingClientRect();
    const restore = {w: Math.max(1, Math.floor(rect.width)), h: Math.max(1, Math.floor(rect.height)),
                     dpr: window.devicePixelRatio || 1};
    resizeObserver.unobserve(ui.canvasHost);
    benchmarking = true;
    if (pinned) applySurface(SURFACE.width, SURFACE.height, 1);
    const before = {...uploads};
    try {
      const refreshMs = await measureRefreshMs();
      const result = await runPlayback({
        seconds: opts.seconds ?? 10, orbit: opts.orbit ?? true, frameCount: frames.length,
        showFrame: (k) => { if (mode !== 'static') showFrame(k); },
      draw: (turn) => {
        if (turn !== null) {
          const pose = flagshipPose(turn * (ORBIT_FLAGSHIP_V1.warmupFrames + ORBIT_FLAGSHIP_V1.forcedFrames), orbit);
          camera.position.set(pose.eye[0], pose.eye[1], pose.eye[2]);
          controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
          camera.lookAt(controls.target);
          camera.updateMatrixWorld();
        }
        // No frameSync: a viewer's frames are pipelined, so this must be too.
        drawScene(volumeScale);
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
      if (pinned) applySurface(restore.w, restore.h, restore.dpr);
      resizeObserver.observe(ui.canvasHost);
      controls.enabled = true;
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
    renderScene();
    ui.setReadout('mode', mode);
    publish();
  };
  // Pausing redraws at rest, so a still picture is full resolution.
  playHandler = (value: boolean) => { playing = value; renderScene(); };
  scaleHandler = (label: string) => {
    volumeChoice = label;
    volumeScale = resolveVolumeScale(label, window.devicePixelRatio || 1);
    renderScene();
    ui.setReadout('volume resolution', `${volumeChoice} (${VOLUME_SCALE_LABELS[volumeScale]} of the canvas)`);
    publish();
  };

  (window as unknown as {__bench: Record<string, unknown>}).__bench.runBenchmark = runBenchmark;
  (window as unknown as {__bench: Record<string, unknown>}).__bench.runPlayback = runPlaybackTest;
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setMode = (m: SwapMode) => modeHandler(m);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setPlaying = (p: boolean) => playHandler(p);
  (window as unknown as {__bench: Record<string, unknown>}).__bench.setVolumeScale =
    (v: VolumeScale) => scaleHandler(VOLUME_SCALE_LABELS[v]);

  ui.setReadout('volume', `${meta.field}, ${meta.dims.join(' x ')} nodes (${(frames[0].length / 1e6).toFixed(2)}M), `
    + `${frames.length} frames${seriesName === 'shipped' ? '' : `, ?fields=${seriesName}`}`);
  ui.setReadout('mode', mode);
  ui.setReadout('volume resolution', `${volumeChoice} (${VOLUME_SCALE_LABELS[volumeScale]} of the canvas)`);
  ui.setReadout('GPU', describeGpu(gl));
  ui.setReadout('triangles', probe.counts.triangles);
  ui.setReadout('camera radius m', Math.round(orbit.radius));
  if (!floatLinear) ui.setReadout('volume filter', 'NEAREST (no OES_texture_float_linear): not comparable');
  publish();
  ui.ready();
}

void main();
