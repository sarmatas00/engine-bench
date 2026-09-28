/**
 * Page 18 -- Three.js on the volume axis. The pair with page 17.
 *
 * Page 16's city (same mesh, camera path, lights and colours) with flagship's
 * 250x250x139 speed field ray-marched through it. Three.js ships no volume
 * renderer, so the compositor below is code we would own: the same two-pass
 * design page 14 settled on (opaque pass into a multisampled target with a
 * depth texture, then a front-to-back march that stops at the buildings).
 *
 * The only comparison supported is against page 17.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mountChrome} from '@lib/chrome';
import {COLORMAP_GLSL} from '@lib/colormap';
import {
  ORBIT_FLAGSHIP_V1, FLAGSHIP_FOV_DEG, createFpsMeter, createGpuTimer, describeGpu, flagshipPose,
  instrumentGlObjects, loadFlagshipGeometry, makeFrameSync, percentile, type FlagshipBundle,
} from '@lib/flagship-geometry';
import {
  DEFAULT_OPACITY, VOLUME_MAX_SAMPLES, VOLUME_STEP_M, loadFlagshipVolume, opacityNodes, volumeBox,
  type FlagshipVolume, type VolumeProbe,
} from '@lib/flagship-volume';
import {attachContextLoss, createBenchmarkDriver, type CameraPose} from '@lib/scientific-probes';

// Page 16's colour pair, same reason: no sRGB conversion vtk.js does not make.
THREE.ColorManagement.enabled = false;

const SURFACE = {width: 1280, height: 720} as const;

/**
 * Page 14's compositor, with two changes: the step cap is VOLUME_MAX_SAMPLES
 * (this box's diagonal is ~2.8 km, page 14's 512 would truncate grazing rays),
 * and the opacity curve comes in as uniforms built from opacityNodes(), the
 * same nodes page 17 hands vtkPiecewiseFunction.
 */
const VOLUME_VERTEX_GLSL = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const VOLUME_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
precision highp sampler3D;
#include <packing>
uniform highp sampler3D uData;
uniform vec3 uOrigin;
uniform vec3 uSpacing;
uniform vec3 uSize;
uniform vec2 uClim;
uniform vec3 uAlphaNodes;
uniform float uStep;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform sampler2D uOpaqueDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
varying vec3 vWorld;
${COLORMAP_GLSL}
float benchSampleVolume(vec3 world) {
  vec3 index = (world - uOrigin) / uSpacing;
  return texture(uData, (index + 0.5) / uSize).r;
}
float benchVolumeAlpha(float f) {
  return f < 0.5 ? mix(uAlphaNodes.x, uAlphaNodes.y, f / 0.5)
                 : mix(uAlphaNodes.y, uAlphaNodes.z, (f - 0.5) / 0.5);
}
void main() {
  vec3 rayOrigin = cameraPosition;
  vec3 rayDir = normalize(vWorld - rayOrigin);
  vec3 ta = (uBoxMin - rayOrigin) / rayDir;
  vec3 tb = (uBoxMax - rayOrigin) / rayDir;
  vec3 tsmall = min(ta, tb);
  vec3 tbig = max(ta, tb);
  float tNear = max(max(max(tsmall.x, tsmall.y), tsmall.z), 0.0);
  float tFar = min(min(tbig.x, tbig.y), tbig.z);
  if (tFar <= tNear) discard;
  float opaqueDepth = texture(uOpaqueDepth, gl_FragCoord.xy / uResolution).x;
  float opaqueViewZ = perspectiveDepthToViewZ(opaqueDepth, uNear, uFar);
  float rayViewZ = (viewMatrix * vec4(rayDir, 0.0)).z;
  if (rayViewZ < 0.0) tFar = min(tFar, opaqueViewZ / rayViewZ);
  if (tFar <= tNear) discard;
  vec4 acc = vec4(0.0);
  float t = tNear + 0.5 * uStep;
  for (int i = 0; i < ${VOLUME_MAX_SAMPLES}; i++) {
    if (t >= tFar || acc.a >= 0.99) break;
    float value = benchSampleVolume(rayOrigin + rayDir * t);
    float f = clamp((value - uClim.x) / (uClim.y - uClim.x), 0.0, 1.0);
    float a = benchVolumeAlpha(f);
    acc.rgb += (1.0 - acc.a) * a * benchColormap(f);
    acc.a += (1.0 - acc.a) * a;
    t += uStep;
  }
  if (acc.a < 0.004) discard;
  gl_FragColor = acc;
}`;

const BLIT_VERTEX_GLSL = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BLIT_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`;

/** Replaced by main() once the scene is up. */
let benchmarkHandler: () => Promise<void> =
  async () => { ui.setReadout('benchmark', 'still loading, try again in a moment'); };

const ui = mountChrome({
  num: '18',
  title: 'Three.js flagship volume',
  expect: 'the Delft district with a synthetic wind-speed field as a translucent volume around the buildings, orbiting once.',
  claim: 'vtk.js should do best on volume data, the case the geometry axis could not test',
  decision: 'whether either renderer struggles with an 8.7-million-cell volume drawn together with a 10,356-part city.',
  controls: [{kind: 'button', id: 'run-benchmark', label: 'Run benchmark (210 frames)',
              onClick: () => { void benchmarkHandler(); }}],
  findings: [
    'The field is SYNTHETIC: real Delft buildings, analytic wind. Its own source says "Not a fluid solver". '
    + 'It is here as a realistically sized volume, not as a flow result.',
    'The ray marcher is page 14\'s, which is code we would own: Three.js has no volume renderer. It stops at '
    + 'the buildings by reading their depth from an offscreen pass rasterized at the canvas\'s own sample count.',
    `The step cap is ${VOLUME_MAX_SAMPLES}, not page 14's 512: this box's diagonal is ~2.8 km, so a grazing ray `
    + `needs ~1,417 steps of ${VOLUME_STEP_M} m. Page 17 is given the same cap.`,
    'The redraws/sec readout is NOT comparable with page 17: vtk.js redraws more often while dragging and at '
    + 'reduced quality. Use the Run benchmark button to compare the two pages.',
  ],
});
// First readout row, so every pasted summary names the renderer that produced it.
ui.setReadout('renderer', 'Three.js');

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

  // Created here rather than by WebGLRenderer, page 16's reasoning: counters go
  // in before Three.js allocates anything, and `antialias` is left unset so this
  // canvas multisamples exactly as vtk.js's does.
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
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const background = new THREE.Color().setRGB(0.067, 0.086, 0.11);
  renderer.setClearColor(background, 1);
  const gpuTimer = createGpuTimer(gl);
  const frameSync = makeFrameSync(gl);
  // R32F linear filtering has its own extension; vtk.js filters linearly too,
  // so a nearest fallback would be a different image. Recorded, not assumed.
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
  // The canvas's OWN sample count, read off the default framebuffer: page 14's
  // first version rasterized its city at one sample against vtk.js's four and
  // published the difference as "Three.js is 12% faster".
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const canvasSamples = gl.getParameter(gl.SAMPLES) as number;
  const opaqueTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture, depthBuffer: true, stencilBuffer: false, samples: canvasSamples,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });

  // --- the volume -----------------------------------------------------------
  const [nx, ny, nz] = meta.dims;
  const texture = new THREE.Data3DTexture(volumeData.data, nx, ny, nz);
  texture.format = THREE.RedFormat;
  texture.type = THREE.FloatType;
  texture.minFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
  texture.magFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 4;
  texture.needsUpdate = true;

  const box = volumeBox(meta);
  const [lo, hi] = meta.range;
  // Normalised to the colour range, so the shader's f in 0..1 lands on the same
  // nodes page 17's piecewise function holds in field units.
  const nodes = opacityNodes(0, 1, DEFAULT_OPACITY).map(([, a]) => a);
  const uResolution = {value: new THREE.Vector2(1, 1)};
  const volumeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uData: {value: texture},
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
    // Premultiplied accumulation, so ONE / ONE_MINUS_SRC_ALPHA (page 14).
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
  const renderScene = () => {
    renderer.setRenderTarget(opaqueTarget);
    renderer.clear();
    renderer.render(opaque, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(blitScene, blitCamera);
    renderer.render(volumeScene, camera);
    frameSync();
    tickFps();
  };

  controls.addEventListener('change', renderScene);
  listeners += 1;

  function applySurface(cssWidth: number, cssHeight: number, dpr: number): void {
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssWidth, cssHeight, false);
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));
    opaqueTarget.setSize(bufferWidth, bufferHeight);
    uResolution.value.set(bufferWidth, bufferHeight);
    camera.aspect = bufferWidth / bufferHeight;
    camera.updateProjectionMatrix();
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
  const observers = 1;

  const renderFrame = (pose: CameraPose & {eye?: [number, number, number]}) => {
    const eye = pose.eye!;
    camera.position.set(eye[0], eye[1], eye[2]);
    controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    renderScene();
  };

  const probe: VolumeProbe = {
    renderer: 'threejs',
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
    lens: {fovDeg: camera.fov, aspect: camera.aspect, surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]},
    volumeField: {
      field: meta.field, dims: meta.dims, cells: volumeData.data.length, range: meta.range,
      stepMetres: VOLUME_STEP_M, maxSamples: VOLUME_MAX_SAMPLES, opacityScale: DEFAULT_OPACITY,
      opacityCorrection: 'none: a per sample',
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
      pose: i => flagshipPose(i, orbit),
    },
  });

  attachContextLoss(renderer.domElement, {
    probe,
    stopBenchmark: () => driver.stop(),
    disposeGpuResources: () => {
      resizeObserver.disconnect(); controls.dispose();
      material.dispose(); geometry.dispose();
      volumeMaterial.dispose(); boxGeometry.dispose(); texture.dispose();
      blitMaterial.dispose(); blitGeometry.dispose(); opaqueTarget.dispose();
      renderer.dispose();
    },
    onLost: () => {
      publish();
      ui.fail('WebGL context lost. Frame times from this run are not a measurement.');
    },
  });

  function publish(): void {
    probe.lens = {fovDeg: camera.fov, aspect: camera.aspect,
                  surface: [gl.drawingBufferWidth, gl.drawingBufferHeight]};
    probe.resources = {
      buffers: counts.buffers, textures: counts.textures,
      renderTargets: counts.renderTargets, listeners, observers,
    };
    ui.setProbe('flagshipVolume', probe);
  }

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

  ui.setReadout('volume', `${meta.field}, ${meta.dims.join(' x ')} (${(volumeData.data.length / 1e6).toFixed(1)}M cells)`);
  ui.setReadout('GPU', describeGpu(gl));
  ui.setReadout('triangles', probe.counts.triangles);
  ui.setReadout('camera radius m', Math.round(orbit.radius));
  if (!floatLinear) ui.setReadout('volume filter', 'NEAREST (no OES_texture_float_linear): not comparable');

  async function runBenchmark() {
    controls.enabled = false;
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
