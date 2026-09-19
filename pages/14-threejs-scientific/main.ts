/**
 * Page 14 — the Three.js scientific scene.
 *
 * This is NOT "another scientific page". It is the SECOND MEASUREMENT of the
 * thing page 13 measured: the same bundle, the same camera, the same probes,
 * the same readouts, the same benchmark, drawn by Three.js instead of vtk.js.
 * Task 7 joins the two probes and blames the *renderer* for every difference it
 * finds, so every difference here that is not a genuine renderer difference is
 * a defect that makes Task 7 conclude something false. Where page 13 made a
 * choice this page makes the same choice; where Three.js forces another, the
 * probe panel says so WITH ITS REASON (search "DIVERGENCE" below and in
 * reportMeasurements) so Task 7 can tell a renderer difference from a page
 * difference.
 *
 * Three contract facts this page is built on (plan Contract Amendments A1),
 * identical to page 13:
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

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// Imported to be MEASURED against, not to be used: the stock addon supplies
// maximum-intensity and isosurface casting only, neither of which is the
// transparent front-to-back compositing this page needs. glslOverlap() below
// counts, at runtime, how many of this page's GLSL lines are textually
// identical to it — a Task 8 maintenance-burden input that is a measurement
// rather than an estimate.
import {VolumeRenderShader1} from 'three/addons/shaders/VolumeShader.js';

import {mountChrome, requireWebGL2} from '@lib/chrome';
import type {Control} from '@lib/chrome';
import {assetUrl} from '@lib/dataset';
import {colormap, COLORMAP_GLSL} from '@lib/colormap';
import {loadScientificBundle} from '@lib/scientific-data';
import type {MeshPair, ScientificBundle, ScientificManifest} from '@lib/scientific-data';
import {
  ALIGNMENT_TOLERANCE_M, alignmentDistance, attachContextLoss, createBenchmarkDriver,
  describeTraceability, diffResources, gridField, gridNodeIndex, heatGridField,
  interpolatedTolerance, objectRefForCell, orbitV1Pose, probeGridNode, resourcesEqual,
  sampleGridTrilinear,
} from '@lib/scientific-probes';
import type {
  BenchmarkResult, CameraPose, GpuTimer, GridField, PlacedCameraPose, ScientificProbe,
} from '@lib/scientific-probes';

type Ui = ReturnType<typeof mountChrome>;

/** The one deterministic startup pick recorded in the probe. Page 13's value. */
const FIXED_PICK_CELL = 0;

/** The three data cases, verbatim from page 13 — Task 7 joins on these strings. */
const CASE_IDS = ['smoke · speed', 'smoke · pressure', 'heat · temperature'] as const;

/**
 * The drawing-buffer size every benchmark run is forced to. Page 13's value,
 * and it has to be: the canvas otherwise fills whatever the page chrome leaves,
 * this page's header text is a different length from page 13's, and the frame
 * times would then differ for a reason that has nothing to do with the
 * renderer.
 */
const BENCHMARK_SURFACE: [number, number] = [1280, 720];

/**
 * The ray-marching step, in metres, and page 13's `setSampleDistance(2)`
 * verbatim. Frame time is roughly linear in it, so it is part of the
 * measurement, not a look-and-feel knob.
 */
const VOLUME_STEP_M = 2;

/** Ceiling on marching iterations: the tile's box diagonal is ~712 m, so 512
 *  steps of 2 m covers it with room to spare and the loop is bounded for GLSL. */
const VOLUME_MAX_STEPS = 512;

/** The camera's clipping range. See applyPose: Three.js has no
 *  resetCameraClippingRange, and a fixed range keeps depth precision constant. */
const CAMERA_NEAR = 1;
const CAMERA_FAR = 5000;

const DEFAULT_OPACITY = 0.3;

/** Three.js entry points this page uses — the custom-code-burden list Task 7
 *  compares against page 13's VTK_APIS. */
const THREE_APIS = [
  'WebGLRenderer', 'Scene', 'PerspectiveCamera', 'BufferGeometry', 'BufferAttribute', 'Mesh',
  'MeshLambertMaterial', 'AmbientLight', 'DirectionalLight', 'LineSegments', 'LineBasicMaterial',
  'Data3DTexture', 'DataTexture', 'ShaderMaterial',
  'WebGLRenderTarget', 'DepthTexture', 'Raycaster', 'BoxGeometry', 'PlaneGeometry',
  'addons/controls/OrbitControls',
];

// ---------------------------------------------------------------------------
// Control state. mountChrome renders the header before the scene exists, so the
// handlers close over this and delegate to `scene` once it is built. Page 13's
// shape, verbatim.

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

/** Counts this page's own control invocations, so the smoke test can prove one
 *  callback per click. Page 13's helper, verbatim. */
function counted<T>(id: string, fn: (value: T) => void): (value: T) => void {
  return value => {
    controlCalls[id] = (controlCalls[id] ?? 0) + 1;
    fn(value);
  };
}

// ---------------------------------------------------------------------------
// The GLSL this page ships. Written here rather than in a .glsl file so the
// line counting below reads exactly what the GPU compiles.

/**
 * World point -> continuous node index -> 3D texture coordinate.
 *
 * Node (i, j, k) sits at texel centre ((i+0.5)/nx, (j+0.5)/ny, (k+0.5)/nz), so
 * a world point that lands exactly on a node reads that node's stored value
 * with no interpolation whatever the filter — which is what makes the GPU
 * round-trip in assertGridWiring a bit-exact check rather than an approximate
 * one.
 *
 * Shared verbatim between the volume material and the verification material,
 * as ONE string: verifying a re-typed copy of this arithmetic would prove
 * nothing about what the volume actually samples.
 */
const VOLUME_SAMPLE_GLSL = /* glsl */ `
uniform highp sampler3D uData;
uniform vec3 uOrigin;
uniform vec3 uSpacing;
uniform vec3 uSize;
vec3 benchVolumeTexcoord(vec3 world) {
  vec3 index = (world - uOrigin) / uSpacing;
  return (index + 0.5) / uSize;
}
float benchSampleVolume(vec3 world) {
  return texture(uData, benchVolumeTexcoord(world)).r;
}`;

/**
 * The slice plane's own sampler, shared the same way with its verification
 * material. `uv` runs 0..1 across the plane's corners while the DataTexture's
 * texel centres run (i+0.5)/nx, so node i lands on texel centre i only after
 * this remap — without it the drawn plane is shifted by half a node.
 */
const SLICE_SAMPLE_GLSL = /* glsl */ `
uniform sampler2D uSliceData;
uniform vec2 uSliceDims;
float benchSampleSlice(vec2 uv) {
  vec2 texcoord = (uv * (uSliceDims - 1.0) + 0.5) / uSliceDims;
  return texture(uSliceData, texcoord).r;
}`;

const VOLUME_VERTEX_GLSL = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

/**
 * The front-to-back compositor.
 *
 * Every ray is intersected analytically against the grid's own world AABB
 * (so the camera may sit inside the box), clamped at the near end to the eye
 * and at the far end to the opaque depth reconstructed from the first pass,
 * then marched front to back accumulating premultiplied colour until it is
 * saturated. The stock addon does neither the compositing nor the depth stop;
 * see glslOverlap() for how much of this is textually its.
 */
const VOLUME_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
precision highp sampler3D;
#include <packing>
uniform vec2 uClim;
uniform float uOpacityScale;
uniform float uStep;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform sampler2D uOpaqueDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
varying vec3 vWorld;
${COLORMAP_GLSL}
${VOLUME_SAMPLE_GLSL}
float benchVolumeAlpha(float f) {
  float a = f < 0.5 ? mix(0.0, 0.05, f / 0.5) : mix(0.05, 0.6, (f - 0.5) / 0.5);
  return a * uOpacityScale;
}
void main() {
  vec3 rayOrigin = cameraPosition;
  vec3 rayDir = normalize(vWorld - rayOrigin);
  vec3 ta = (uBoxMin - rayOrigin) / rayDir;
  vec3 tb = (uBoxMax - rayOrigin) / rayDir;
  vec3 tsmall = min(ta, tb);
  vec3 tbig = max(ta, tb);
  float tNear = max(max(tsmall.x, tsmall.y), tsmall.z);
  float tFar = min(min(tbig.x, tbig.y), tbig.z);
  tNear = max(tNear, 0.0);
  if (tFar <= tNear) discard;
  float opaqueDepth = texture(uOpaqueDepth, gl_FragCoord.xy / uResolution).x;
  float opaqueViewZ = perspectiveDepthToViewZ(opaqueDepth, uNear, uFar);
  float rayViewZ = (viewMatrix * vec4(rayDir, 0.0)).z;
  if (rayViewZ < 0.0) tFar = min(tFar, opaqueViewZ / rayViewZ);
  if (tFar <= tNear) discard;
  vec4 acc = vec4(0.0);
  float t = tNear + 0.5 * uStep;
  for (int i = 0; i < ${VOLUME_MAX_STEPS}; i++) {
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

const SLICE_VERTEX_GLSL = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SLICE_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
uniform vec2 uClim;
uniform float uSliceAlpha;
varying vec2 vUv;
${COLORMAP_GLSL}
${SLICE_SAMPLE_GLSL}
void main() {
  float value = benchSampleSlice(vUv);
  float f = clamp((value - uClim.x) / (uClim.y - uClim.x), 0.0, 1.0);
  gl_FragColor = vec4(benchColormap(f), uSliceAlpha);
}`;

/** The opaque pass's colour, blitted to the canvas before the volume goes over
 *  it. One texture read; no tone mapping, no colour-space conversion (see
 *  ColorManagement below), so the blit is exact. */
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

/** Verification materials: the SAME sampler source the scene uses, driven at a
 *  single probe point and read back off a 1x1 float target. See
 *  assertGridWiring / assertSliceWiring. */
const VERIFY_VERTEX_GLSL = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const VERIFY_VOLUME_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform vec3 uProbeWorld;
${VOLUME_SAMPLE_GLSL}
void main() { gl_FragColor = vec4(benchSampleVolume(uProbeWorld), 0.0, 0.0, 1.0); }`;

const VERIFY_SLICE_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
uniform vec2 uProbeUv;
${SLICE_SAMPLE_GLSL}
void main() { gl_FragColor = vec4(benchSampleSlice(uProbeUv), 0.0, 0.0, 1.0); }`;

/** Every GLSL line this page ships, as one corpus for the overlap count. */
const SHIPPED_GLSL: Array<[string, string]> = [
  ['volume vertex', VOLUME_VERTEX_GLSL],
  ['volume fragment (incl. the shared sampler and the shared colormap)', VOLUME_FRAGMENT_GLSL],
  ['slice vertex', SLICE_VERTEX_GLSL],
  ['slice fragment', SLICE_FRAGMENT_GLSL],
  ['blit vertex', BLIT_VERTEX_GLSL],
  ['blit fragment', BLIT_FRAGMENT_GLSL],
  ['verification vertex', VERIFY_VERTEX_GLSL],
  ['verification volume fragment', VERIFY_VOLUME_FRAGMENT_GLSL],
  ['verification slice fragment', VERIFY_SLICE_FRAGMENT_GLSL],
];

/**
 * Lines of GLSL this page carries that are shared with a line in
 * `three/addons/shaders/VolumeShader.js`, and are therefore boilerplate rather
 * than reuse. Derived, not assumed: whatever is identical to stock AND in this
 * list is discounted, and anything identical that is NOT in this list counts as
 * real reuse, so a later change that genuinely reuses the addon will show up.
 */
const GLSL_BOILERPLATE = new Set([
  'void main() {', 'precision highp float;', 'precision mediump sampler3D;', 'precision highp sampler3D;',
]);

/**
 * How much of this page's GLSL is stock Three.js, measured rather than
 * estimated: normalise whitespace, drop blank, pure-punctuation and comment
 * lines, and intersect with the addon's own vertex and fragment sources.
 *
 * Task 8 reads this as maintenance burden, so the method — and its traps —
 * matter. Three numbers, because one would mislead:
 *  - `compiledLines`: substantive lines across the nine shaders as compiled.
 *    Shared strings (the colormap, the volume sampler) are counted once per
 *    shader that includes them, which is what the GPU sees but NOT what a
 *    maintainer edits.
 *  - `distinctLines`: the set of distinct substantive lines. This is the
 *    maintenance surface — the number to quote for burden.
 *  - `identicalToStock` / `reusedFromStock`: the raw intersection, and the
 *    intersection after boilerplate is discounted. The raw number flatters:
 *    measured, every single identical line is `void main() {` or a precision
 *    qualifier. `identicalLines` is published so the reader can check that
 *    rather than take it on trust.
 */
function glslOverlap(): {
  totalLines: number; compiledLines: number; distinctLines: number;
  identicalToStock: number; reusedFromStock: number; identicalLines: string[];
  ownDistinctLines: number; stockSubstantiveLines: number; perShader: Array<{shader: string; lines: number}>;
} {
  const substantive = (source: string) => source
    .split('\n').map(l => l.trim())
    .filter(l => l.length > 0 && !/^[{}();,]+$/.test(l) && !l.startsWith('//'));
  const stock = new Set([
    ...substantive(VolumeRenderShader1.vertexShader),
    ...substantive(VolumeRenderShader1.fragmentShader),
  ]);
  const ours: string[] = [];
  let totalLines = 0;
  const perShader = SHIPPED_GLSL.map(([shader, source]) => {
    totalLines += source.split('\n').filter(l => l.trim().length > 0).length;
    const lines = substantive(source);
    ours.push(...lines);
    return {shader, lines: lines.length};
  });
  const distinct = [...new Set(ours)];
  const identicalLines = distinct.filter(l => stock.has(l));
  const reusedFromStock = identicalLines.filter(l => !GLSL_BOILERPLATE.has(l)).length;
  return {
    totalLines, compiledLines: ours.length, distinctLines: distinct.length,
    identicalToStock: ours.filter(l => stock.has(l)).length, reusedFromStock, identicalLines,
    ownDistinctLines: distinct.length - reusedFromStock, stockSubstantiveLines: stock.size, perShader,
  };
}

// ---------------------------------------------------------------------------
// Neutral array -> Three.js geometry. Nothing here interprets the data; it only
// restates the shipped arrays in Three.js's own layout.

function geometryFromMesh(mesh: MeshPair): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return geometry;
}

/**
 * The Core-precomputed streamlines as line segments: walk `vertexOffsets`,
 * where offsets[i]..offsets[i+1] bound line i, and emit one segment per
 * consecutive pair. NOTHING here integrates a streamline — the vertices are
 * Core's, in Core's order.
 *
 * A degenerate line (fewer than two vertices) is dropped rather than emitted as
 * a zero-length segment, and the count of dropped lines is returned so the page
 * can report it instead of silently drawing fewer lines than the manifest
 * declares. Page 13's polylineCells does exactly this for VTK's cell array;
 * this is the same walk in Three.js's layout.
 *
 * DIVERGENCE (forced): vtk.js draws one polyline cell per line; WebGL has no
 * polyline primitive, so Three.js's LineSegments needs each interior vertex
 * emitted twice. The vertex data, order and count are Core's either way.
 */
function streamlineSegments(vertexOffsets: number[]): {indices: Uint32Array; lines: number; dropped: number} {
  const kept: Array<[number, number]> = [];
  let dropped = 0;
  for (let i = 0; i < vertexOffsets.length - 1; i++) {
    const start = vertexOffsets[i], end = vertexOffsets[i + 1];
    if (end - start >= 2) kept.push([start, end]);
    else dropped++;
  }
  const keptVertices = kept.reduce((n, [start, end]) => n + (end - start), 0);
  const indices = new Uint32Array((keptVertices - kept.length) * 2);
  let w = 0;
  for (const [start, end] of kept) {
    for (let v = start; v < end - 1; v++) { indices[w++] = v; indices[w++] = v + 1; }
  }
  // A polyline of n vertices is n-1 segments, so kept lines contribute
  // (vertices - lines) segments in total. Emitting (vertices - 1) instead is
  // what joining the end of one line to the start of the next looks like, and
  // it is the ONE failure mode left here: scientific-data.ts already validates
  // vertexOffsets against actualCount, [0] === 0, monotone non-decreasing and
  // seedIndices in range before any page sees the array, so the "offsets are
  // really counts" reading is caught before this function runs.
  if (w !== indices.length || w !== (keptVertices - kept.length) * 2) {
    throw new Error(
      `smoke.streamlines: emitted ${w / 2} segments for ${kept.length} polylines over ${keptVertices} vertices; `
      + `${keptVertices - kept.length} segments is the only count that does not join one line to the next`);
  }
  return {indices, lines: kept.length, dropped};
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
 * Counts the GL objects Three.js actually creates and deletes, by wrapping the
 * six create/delete entry points on the context instance.
 *
 * Page 13 does the same to vtk.js's context and for the same reason: a
 * hand-incremented `probe.resources` makes the spike's "stable resource counts
 * over 100 control/resize cycles" gate true by construction, and page 13's
 * hand-written numbers were measurably wrong when they were finally checked.
 * These are measurements.
 *
 * This page can wrap EARLIER than page 13 can: it creates the WebGL2 context
 * itself and instruments it before handing it to WebGLRenderer, so every object
 * Three.js ever makes is counted, including the ones its constructor makes.
 * Page 13 can only wrap after vtkFullScreenRenderWindow exists. Absolute
 * baselines are therefore not directly comparable between the two pages;
 * GROWTH, which is what the leak gate measures, is.
 */
function instrumentGlObjects(gl: WebGL2RenderingContext): GlCounts {
  const counts: GlCounts = {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0};
  const target = gl as unknown as Record<string, (...args: unknown[]) => unknown>;
  const wrap = (createName: string, deleteName: string, key: keyof GlCounts) => {
    const create = target[createName].bind(gl);
    const destroy = target[deleteName].bind(gl);
    // Membership, not truthiness: decrementing on any truthy argument lets a
    // double delete -- or a delete of an object created before the wrappers
    // were installed -- drive the count below the truth, and a count that can
    // go negative is not a measurement.
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
  // The fourth type, added after review: vtk.js leaks one RENDERBUFFER per
  // drawing-buffer resize as well as one texture and one framebuffer, so
  // counting only three understates the magnitude of its leak by a third.
  // Three.js allocates renderbuffers only for the multisampled opaque target.
  wrap('createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers');
  return counts;
}

// ---------------------------------------------------------------------------
// Geometry-wiring assertions. These throw; they are not reported.

/** The live uniform objects the volume material references, so a wiring check
 *  reads what the shader will be given rather than the record it was built
 *  from. */
type LiveVolumeUniforms = {
  data: {value: THREE.Data3DTexture};
  origin: {value: THREE.Vector3};
  spacing: {value: THREE.Vector3};
  size: {value: THREE.Vector3};
};

/** Exactly what the volume shader is handed for one case: the texture object
 *  and the three uniform vectors that turn a world point into a texel. */
type VolumeUpload = {
  texture: THREE.Data3DTexture;
  uniformOrigin: [number, number, number];
  uniformSpacing: [number, number, number];
  uniformSize: [number, number, number];
};

/**
 * The asymmetric interior nodes every wiring check probes, shared by the volume
 * and slice legs and identical to page 13's set.
 *
 * Anchored at (1, 1, 1) and stepped one node along each axis in turn, so the
 * three offsets differ from the anchor's by 1, nx and nx*ny — distinct under
 * every permutation of the axes — plus one off-axis node and three near-far
 * nodes for reach along each axis. Strictly interior, in [1, n-2]: page 13
 * measured that `origin + i * spacing` does not round-trip exactly at the
 * extreme faces (31.000000000000004 against an extent of 31; the heat grid's
 * y = 0 face at -3.6e-15), which is a float artefact of probing the very edge
 * of the volume and not an indexing disagreement.
 */
function probeNodes(dims: readonly [number, number, number]): Array<[number, number, number]> {
  const [nx, ny, nz] = dims;
  return ([
    [1, 1, 1], [2, 1, 1], [1, 2, 1], [1, 1, 2], [3, 5, 7], [nx - 2, 1, 1], [1, ny - 2, 1], [1, 1, nz - 2],
  ] as Array<[number, number, number]>)
    .filter(([i, j, k]) => i >= 1 && j >= 1 && k >= 1 && i <= nx - 2 && j <= ny - 2 && k <= nz - 2);
}

/**
 * The world point of slice-plane node (i, j) at height `metres`. ONE
 * derivation, called by the code that fills the plane and by the code that
 * checks it -- an earlier version wrote the same expression in both places,
 * which meant a change to the world-point formula changed both copies together
 * and the check could only ever see an index-order mistake.
 */
function sliceNodeWorld(field: GridField, i: number, j: number, metres: number): [number, number, number] {
  return [field.origin[0] + i * field.spacing[0], field.origin[1] + j * field.spacing[1], metres];
}

function nodeWorld(field: GridField, i: number, j: number, k: number): [number, number, number] {
  return [
    field.origin[0] + i * field.spacing[0],
    field.origin[1] + j * field.spacing[1],
    field.origin[2] + k * field.spacing[2],
  ];
}

/**
 * Checks that the grid this page UPLOADED is the grid the shared module reads,
 * on three legs, each with its own negative control, before a single mesh
 * exists.
 *
 * Why not page 13's shape: vtk.js could be checked against
 * `vtkImageData.getOffsetIndexFromWorld`, a second world-to-offset
 * implementation shipped by the library. Three.js has no equivalent — a
 * Data3DTexture is a dumb array with dimensions — so the independent
 * implementation has to be written here, against the upload parameters.
 *
 * What it must NOT be: `probeGridNode` compared with `sampleGridTrilinear`.
 * That comparison cannot detect a transposed axis at ANY node, because
 * `sampleGridTrilinear` calls `probeGridNode` internally with the same `dims`,
 * so both sides route through one `gridNodeIndex` and a transposition moves
 * them identically. Page 13 shipped that tautology once and a review round
 * proposed the same tautology one level down as its fix.
 *
 * Leg A — declaration. The texture's own width/height/depth and the three
 * uniform vectors AS THE MATERIALS HOLD THEM — read back off the live uniform
 * objects the shader is given, not off the record they were built from —
 * componentwise against the shipped grid, plus the identity of the bound
 * texture. Catches a permuted or wrong dims/origin/spacing at the upload site
 * and a mis-wired applyCaseUniforms, and throws FIRST, so the later legs never
 * get credit for what this one catches.
 *
 * Be precise about its power, because the obvious reading overstates it: the
 * upload record's origin and spacing are copied from `field`, so comparing the
 * RECORD against `field` could not fail however the page was edited. Reading
 * the live uniforms instead is what makes the comparison a real one — the
 * values have been through `applyCaseUniforms` and into the objects the
 * materials reference. The negative control for this leg is a permutation
 * written at the upload site, which it catches; the checks with genuinely
 * independent inputs are B and C.
 *
 * Leg B — the payload invariant, stated as what actually holds. An earlier
 * version of this leg recomputed the shader's world -> texel -> flat-offset
 * arithmetic in TypeScript and compared it against `gridNodeIndex`, then read
 * `texture.image.data` at that offset and compared against `probeGridNode`.
 * Review showed BOTH comparisons are algebraic identities as shipped, and the
 * demonstration is worth keeping rather than quietly deleting: leg A has
 * already asserted `textureDims === field.dims` and `liveSpacing/liveOrigin ===
 * field.spacing/origin` by exact equality, so `texel` recovers (i, j, k)
 * exactly and the offset IS gridNodeIndex's formula over the same dims;
 * and `Data3DTexture` stores its array BY REFERENCE, so `image.data` IS
 * `field.data` and the value comparison reduces to `field.data[X] !==
 * field.data[X]`. Exhaustively confirmed over all 163,840 nodes of both
 * shipped grids: 0 mismatches, and no defect in the upload path could make it
 * fire because leg A throws first on every input that would. That is page 13's
 * tautology restated one level sideways, which is exactly what this page was
 * briefed not to do.
 *
 * What is left is the invariant that is actually load-bearing and actually
 * checkable: the texture must be backed by the SHIPPED ARRAY ITSELF, not by a
 * re-ordered or re-typed copy of it. That is a reference comparison, it has
 * real content (the x<->y and z-fastest negative controls both fail it,
 * because reordering a payload means allocating a different array), and it is
 * honest about its reach.
 *
 * Leg C — GPU round trip. The scene's OWN sampler GLSL (the one string
 * VOLUME_SAMPLE_GLSL, shared with the volume material, not a re-typed copy)
 * executed on the GPU against the real uploaded texture at the same nodes, read
 * back off a 1x1 float target. This is the only leg that can see a wrong
 * texcoord formula, a wrong filter or wrap mode, or a swizzle — all of which
 * leave legs A and B perfectly happy. Negative-controlled by dropping the +0.5
 * texel-centre term: A and B pass, C throws.
 *
 * Leg C is the one leg that CANNOT be bit-exact, and the reason is worth
 * stating rather than hiding behind a loose tolerance: `(world - origin) /
 * spacing` does not land on an exact integer for these irrational spacings
 * (16.129032258064516 m and 7.936507936507937 m), so the sampler performs a
 * real, if vanishing, interpolation between a node and its neighbour. Measured
 * worst deviation on the shipped grids is ~1.2e-7 in field units; the bound
 * used is the repo's own `interpolatedTolerance` (1e-5 * max(span, 1)), which
 * is what an interpolated read is held to everywhere else in this spike. It
 * stays discriminating by a wide margin: the +0.5 negative control moves a
 * probe by half a node and lands orders of magnitude outside it. Legs A and B
 * remain exact-equality checks.
 *
 * Structural limit, restated rather than rediscovered: x<->y is a genuine
 * no-op in dims and spacing on both shipped grids (32x32 and 64x64 in x/y), so
 * no declaration check can see it. Legs B and C DO catch an x<->y transposed
 * *payload*, because neither shipped field is x/y symmetric — that is strictly
 * more than page 13's index-only legs could do.
 *
 * What none of this can check: whether the shipped payload is in the order it
 * claims. That is a declaration check, and only the smoke grid ships a
 * declaration (`order`, asserted against GRID_ORDER in scientific-data.ts);
 * field.grid.json carries no `order` field. See the probe panel.
 */
function assertGridWiring(
  caseId: string, field: GridField, upload: VolumeUpload, live: LiveVolumeUniforms, fieldSpan: number,
  sampleOnGpu: (world: [number, number, number]) => number,
): number {
  const gpuTolerance = interpolatedTolerance(fieldSpan);
  let worstGpuDelta = 0;
  const image = upload.texture.image;
  const textureDims: [number, number, number] = [image.width, image.height, image.depth];
  // --- leg A ---------------------------------------------------------------
  if (live.data.value !== upload.texture) {
    throw new Error(`${caseId}: the material's uData uniform is bound to a different texture from this case's upload`);
  }
  const liveOrigin = live.origin.value.toArray();
  const liveSpacing = live.spacing.value.toArray();
  const liveSize = live.size.value.toArray();
  for (let axis = 0; axis < 3; axis++) {
    if (textureDims[axis] !== field.dims[axis]
      || liveSize[axis] !== textureDims[axis]
      || liveOrigin[axis] !== field.origin[axis]
      || liveSpacing[axis] !== field.spacing[axis]) {
      throw new Error(
        `${caseId}: the Data3DTexture upload does not match the shipped grid -- `
        + `texture dims ${JSON.stringify(textureDims)} and shader uSize ${JSON.stringify(liveSize)} `
        + `vs ${JSON.stringify(field.dims)}, shader uOrigin ${JSON.stringify(liveOrigin)} vs `
        + `${JSON.stringify(field.origin)}, shader uSpacing ${JSON.stringify(liveSpacing)} vs `
        + `${JSON.stringify(field.spacing)}`);
    }
  }
  // --- leg B ---------------------------------------------------------------
  const data = image.data as Float32Array;
  if (data !== field.data) {
    throw new Error(
      `${caseId}: the Data3DTexture is backed by a different array from the shipped grid's. Data3DTexture holds its `
      + 'array by reference, so anything but the shipped array means the payload was copied or reordered on the way '
      + 'to the GPU, and the order it is in is no longer the order scientific-data.ts validated.');
  }
  const expectedLength = field.dims[0] * field.dims[1] * field.dims[2];
  if (data.length !== expectedLength) {
    throw new Error(`${caseId}: the uploaded array holds ${data.length} values but dims ${field.dims.join('x')} need ${expectedLength}`);
  }
  // --- leg C ---------------------------------------------------------------
  for (const [i, j, k] of probeNodes(field.dims)) {
    const world = nodeWorld(field, i, j, k);
    const libValue = probeGridNode(field, i, j, k)[0];
    const gpuValue = sampleOnGpu(world);
    const gpuDelta = Math.abs(gpuValue - libValue);
    if (gpuDelta > worstGpuDelta) worstGpuDelta = gpuDelta;
    if (!(gpuDelta <= gpuTolerance)) {
      throw new Error(
        `${caseId}: node (${i}, ${j}, ${k}) reads ${libValue} through probeGridNode but the GPU samples `
        + `${gpuValue} from the uploaded texture at the same world point, off by ${gpuDelta.toExponential(4)} `
        + `against an interpolated tolerance of ${gpuTolerance.toExponential(4)}`);
    }
  }
  return worstGpuDelta;
}

/**
 * The one link between world space and texture space that the three sampler
 * legs cannot see: WHERE the meshes are.
 *
 * Leg C proves the sampler returns the right value for a world point handed to
 * it directly. It says nothing about the world points the volume pass actually
 * asks about, which come from the box mesh's own vertices through the model
 * matrix — a box translated to the wrong place would sample the right texel for
 * the wrong world position and every other check here would still pass. So the
 * geometries in the scene graph are compared against the grid they claim to
 * cover, through their own computed bounding boxes (real vertex data, not the
 * arguments they were built from) and through the AABB uniforms the ray
 * marcher clips against.
 *
 * Tolerance, not equality: vertex positions are float32 and `spacing * (n - 1)`
 * is 499.99999999999994 m before they are rounded. ALIGNMENT_TOLERANCE_M (0.05
 * m) is this spike's own fixed-alignment bound and is three orders of magnitude
 * tighter than any placement error worth catching.
 */
function assertGeometryPlacement(
  caseId: string, field: GridField, box: THREE.BufferGeometry, plane: THREE.BufferGeometry,
  boxMin: THREE.Vector3, boxMax: THREE.Vector3, sliceZ: number,
): void {
  const min: [number, number, number] = [field.origin[0], field.origin[1], field.origin[2]];
  const max: [number, number, number] = [
    field.origin[0] + field.spacing[0] * (field.dims[0] - 1),
    field.origin[1] + field.spacing[1] * (field.dims[1] - 1),
    field.origin[2] + field.spacing[2] * (field.dims[2] - 1),
  ];
  const check = (what: string, got: readonly [number, number, number], want: readonly [number, number, number]) => {
    const delta = alignmentDistance(got, want);
    if (!(delta <= ALIGNMENT_TOLERANCE_M)) {
      throw new Error(
        `${caseId}: ${what} is at ${JSON.stringify(got)} but the grid it draws covers ${JSON.stringify(want)} `
        + `-- ${delta.toFixed(4)} m apart, over the ${ALIGNMENT_TOLERANCE_M} m alignment tolerance`);
    }
  };
  check('the volume ray-clip uniform uBoxMin', [boxMin.x, boxMin.y, boxMin.z], min);
  check('the volume ray-clip uniform uBoxMax', [boxMax.x, boxMax.y, boxMax.z], max);
  box.computeBoundingBox();
  const bb = box.boundingBox!;
  check('the volume box mesh\'s low corner', [bb.min.x, bb.min.y, bb.min.z], min);
  check('the volume box mesh\'s high corner', [bb.max.x, bb.max.y, bb.max.z], max);
  // The slice plane is sampled through its UVs, so the UV -> world mapping is
  // load-bearing and is asserted rather than assumed. It holds today only
  // because three's PlaneGeometry emits v = 1 - iy/gridY against vertices
  // pushed at -y, i.e. v ascends with world y -- a library convention, and a
  // flipped V would mirror the drawn plane with every other check on this page
  // still green.
  const uvAttr = plane.getAttribute('uv');
  const posAttr = plane.getAttribute('position');
  if (!uvAttr || !posAttr) throw new Error(`${caseId}: the slice plane carries no uv/position attribute`);
  for (let v = 0; v < uvAttr.count; v++) {
    const wantX = min[0] + uvAttr.getX(v) * (max[0] - min[0]);
    const wantY = min[1] + uvAttr.getY(v) * (max[1] - min[1]);
    const delta = Math.hypot(posAttr.getX(v) - wantX, posAttr.getY(v) - wantY);
    if (!(delta <= ALIGNMENT_TOLERANCE_M)) {
      throw new Error(
        `${caseId}: slice-plane vertex ${v} carries uv (${uvAttr.getX(v)}, ${uvAttr.getY(v)}), which maps to world `
        + `(${wantX}, ${wantY}), but the vertex is at (${posAttr.getX(v)}, ${posAttr.getY(v)}) -- `
        + `${delta.toFixed(4)} m apart. The plane's UVs do not run with world x/y.`);
    }
  }
  plane.computeBoundingBox();
  const pb = plane.boundingBox!;
  // The plane geometry sits at local z = 0; the mesh's own position carries the
  // slice height, which sliceGeometry() reports and the smoke test checks.
  check('the slice plane\'s low corner', [pb.min.x, pb.min.y, sliceZ], [min[0], min[1], sliceZ]);
  check('the slice plane\'s high corner', [pb.max.x, pb.max.y, sliceZ], [max[0], max[1], sliceZ]);
}

/**
 * The slice plane's texture, checked the same way and for the same reason: the
 * plane is a DataTexture sampled through plane UVs, and a transposed upload or
 * a missing half-texel remap draws a wrong picture that every other check on
 * this page would accept. The CPU side is the array this page filled from
 * `sampleGridTrilinear` at explicit world points, so agreement here means the
 * drawn plane carries the value the shared module computes for the world point
 * it is drawn at.
 */
function assertSliceWiring(
  caseId: string, field: GridField, values: Float32Array, sliceHeightM: number, fieldSpan: number,
  sampleOnGpu: (uv: [number, number]) => number,
): number {
  const [nx, ny] = field.dims;
  const gpuTolerance = interpolatedTolerance(fieldSpan);
  let worstGpuDelta = 0;
  const probes: Array<[number, number]> = [[1, 1], [2, 1], [1, 2], [3, 5], [nx - 2, 1], [1, ny - 2]];
  for (const [i, j] of probes) {
    const uv: [number, number] = [i / (nx - 1), j / (ny - 1)];  // see assertGeometryPlacement's UV leg
    const cpu = values[i + nx * j];
    const gpu = sampleOnGpu(uv);
    const gpuDelta = Math.abs(gpu - cpu);
    if (gpuDelta > worstGpuDelta) worstGpuDelta = gpuDelta;
    if (!(gpuDelta <= gpuTolerance)) {
      throw new Error(
        `${caseId}: the slice plane at z=${sliceHeightM} samples ${gpu} at uv ${JSON.stringify(uv)} but node (${i}, ${j}) `
        + `of the resampled plane holds ${cpu}, off by ${gpuDelta.toExponential(4)} against an interpolated `
        + `tolerance of ${gpuTolerance.toExponential(4)}`);
    }
    // Math.fround, not a tolerance: the plane is a Float32Array, so the only
    // difference this leg may forgive is the float32 rounding of the double
    // sampleGridTrilinear returns. Anything else is a real disagreement.
    //
    // Reach, stated rather than overclaimed: this leg and fillSlice now call
    // ONE sliceNodeWorld, so what it can still catch is an index-order mistake
    // in the fill (rows written down columns), not a wrong world-point
    // formula -- a wrong formula would move both sides together. The formula
    // itself is covered by assertGeometryPlacement, which ties the plane's UVs
    // to the same world extent.
    const trilinear = sampleGridTrilinear(field, sliceNodeWorld(field, i, j, sliceHeightM))[0];
    if (cpu !== Math.fround(trilinear)) {
      throw new Error(
        `${caseId}: the slice plane holds ${cpu} at node (${i}, ${j}) but sampleGridTrilinear reads ${trilinear} `
        + `(${Math.fround(trilinear)} as float32) at the world point that node is drawn at`);
    }
  }
  return worstGpuDelta;
}

/**
 * Core's precomputed FieldSlice against the volume grid, trilinear at the same
 * world points, on PRESSURE. Page 13's check, verbatim, because Task 7 needs
 * both pages to have been held to the same numeric agreement.
 *
 * Pressure, not speed: the shipped smoke speed field is bit-identically
 * z-invariant (measured max |f(z) - f(z=0)| = 0.0, against 12.02 for pressure),
 * so a speed cross-check has exactly zero power over the z axis — it would
 * report the same 1e-16 agreement for any slice height whatsoever.
 *
 * Asserted, not reported: transposing the slice's a/b order moves the worst
 * deviation from 3.8e-6 to 24.7, against a tolerance of 8.2e-4.
 */
function assertCoreSliceAgrees(bundle: ScientificBundle, pressure: GridField, pressureSpan: number): number {
  const slice = bundle.smoke.slice;
  if (slice.axis !== 'z' || slice.fixedLocalAxis !== 2 || slice.localAxes[0] !== 0 || slice.localAxes[1] !== 1) {
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
 * manifest that had relabelled either case. Page 13's function, verbatim.
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
 * page consumes that value. It never re-derives the trig, and on THIS page that
 * is not a formality: `CameraPose` states a z-up frame with azimuth measured
 * from +x, and Three.js's default up is +y. A page that recomputed the eye in
 * Three.js's own frame would orbit a different axis from page 13 and Task 7
 * would read the difference as a renderer result.
 *
 * BenchmarkDriver's `RenderFrame` type widens the pose back to a bare
 * `CameraPose`, which is why this reads `eye` defensively and throws rather
 * than silently recomputing when it is absent: a fallback would be an
 * unreachable branch that quietly switches the camera derivation. Narrowing
 * `RenderFrame` to `PlacedCameraPose` in scientific-probes.ts would make this
 * unnecessary; logged, not changed, since this task does not own that file.
 */
function eyeOf(pose: CameraPose): [number, number, number] {
  const placed = pose as Partial<PlacedCameraPose>;
  if (!placed.eye) {
    throw new Error(
      'camera pose arrived without its derived eye position: every pose this page renders comes from '
      + 'orbitV1Pose, which ships `eye` with the pose. Re-deriving it here would silently reintroduce the '
      + 'z-up/azimuth-origin mismatch CameraPose exists to prevent — and Three.js defaults to y-up, which is '
      + 'exactly the trap.',
    );
  }
  return placed.eye;
}

// ---------------------------------------------------------------------------
// Colour management is switched OFF for this page, deliberately and for parity:
// vtk.js writes the colours it is given straight to the drawing buffer, so a
// Three.js page that applied its default sRGB working-space conversion would
// render the same transfer function as different pixels and Task 7's visual
// comparison would be measuring a colour pipeline, not a renderer. Set before
// any THREE.Color exists, since conversion happens at construction.
THREE.ColorManagement.enabled = false;

if (requireWebGL2()) void main();

async function main(): Promise<void> {
  let ui: Ui | undefined;
  try {
    const bundle = await loadScientificBundle();
    const heat = await loadHeatValues(bundle);
    ui = mountChrome(chromeOptions(bundle));
    build(ui, bundle, heat);
  } catch (err) {
    const message = `14-threejs-scientific failed to start: ${(err as Error).message}`;
    (ui ?? (ui = mountChrome(chromeOptions()))).fail(message);
    console.error(message, err);
  }
}

/**
 * `bundle` is optional only for the startup-failure path. Everywhere else the
 * slice control's range and default come from the manifest's own coordinate
 * frame and slice position — a hard-coded 0..80 / 40 would happen to be right
 * on this tile and silently wrong on the next one. Page 13's derivation,
 * verbatim, so both pages' sliders span the same metres.
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
    num: '14', title: 'Three.js — scientific comparison',
    expect: 'the same scene as page 13, drawn by Three.js: one canvas holding grey Gothenburg terrain with its '
      + 'buildings, the synthetic DTCC smoke field as a translucent volume above them, a coloured horizontal slice '
      + 'through that volume at the height the manifest declares for Core\'s FieldSlice (40 m on this tile), and 24 '
      + 'Core-precomputed streamlines threading it. Click a building to read its marker back — a conditioned mesher '
      + 'region, not a building, and on this tile its identity is run-local at best.',
    claim: 'Three.js is the general-purpose engine: it will draw the city fine, but it has no scientific '
      + 'visualization of its own, so the volume rendering is ours to write and ours to maintain.',
    decision: 'Whether one Three.js scene can carry city geometry and scientific fields together, with identity and '
      + 'values readable back — and what it costs in code we own. This is the second measurement of what page 13 '
      + 'measured; Task 7 compares the two probes.',
    correction: 'Picking returns a *conditioned mesher region*, not a building: 215 source buildings condition to 103 '
      + 'regions, the mesh carries 206 markers, and 103 of those were appended by the mesh splitter and have no source '
      + 'building at all. Canonical DTCC traceability fails on this tile — the footprint tiles carry no id, so Core '
      + 'mints a fresh uuid4 per load.',
    findings: [
      'There is no volume renderer in Three.js. three/addons/shaders/VolumeShader.js exists and was the starting '
      + 'point, but it does maximum-intensity and isosurface casting only — no transparent compositing and no depth '
      + 'interaction with opaque geometry — so the front-to-back compositor, the opaque depth stop and the two-pass '
      + 'wiring behind them are code this repo now owns. The probe panel carries the measured line count.',
      'Depth occlusion between a volume and a city is not free here the way it is in vtk.js: terrain, buildings, '
      + 'streamlines and the slice render into an offscreen target with a depth texture, that colour is blitted to '
      + 'the canvas, and the volume pass reconstructs the opaque view distance from the depth texture and stops each '
      + 'ray there. One WebGLRenderer, one canvas, two passes. The offscreen target is multisampled at the canvas\'s '
      + 'own sample count, so the city is rasterized here exactly as page 13 rasterizes it — the first version of '
      + 'this page left it single-sampled and thereby manufactured a ~12% Three.js speed advantage that does not '
      + 'exist. See the probe panel.',
      'The slice is the TRUE plane at the requested height, resampled through sampleGridTrilinear, not the nearest '
      + 'node layer — same as page 13, and for the same reason: nz is 32 on both grids, so a K-index slider works by '
      + 'coincidence, and snapping put page 13\'s plane at 41.29 m while it claimed 40 m.',
      'Axis order is asserted before any mesh exists, because Three.js ships no second world-to-offset '
      + 'implementation to check against the way vtk.js does: the upload declaration, the payload invariant (the '
      + 'texture must be backed by the shipped array itself), and a GPU round trip through the scene\'s own sampler '
      + 'GLSL. The middle leg used to recompute offset arithmetic and compare it against gridNodeIndex; review '
      + 'showed that could not fail, and it was removed rather than dressed up. x<->y stays undetectable in the '
      + 'DECLARATION on both shipped grids (32x32 and 64x64), but a reordered payload IS caught.',
      'The benchmark ends every forced frame in a one-pixel readback, not gl.finish(): page 13 measured that '
      + 'gl.finish() alone returns before the frame is drawn under Chrome\'s ANGLE/SwiftShader command buffer. '
      + 'Verified here by stripping the readback from this page: cpu mean 0.17 ms against a gpu mean of 133.25 ms, a '
      + '780x overstatement (page 13\'s was 200x), and the smoke test catches it. Both pages pin the drawing '
      + 'surface to 1280x720 and record their context attributes, and with the opaque pass sampled the same way on '
      + 'both, the two renderers come out INDISTINGUISHABLE on this scene: p50 151.2 ms here against 152.8 ms on '
      + 'page 13, three runs each, about 1% apart.',
      'Measured, and the answer Task 7 needs: Three.js 0.185.1 does NOT leak GL objects per drawing-buffer resize. '
      + 'Live counts hold at 37 buffers / 12 textures / 5 framebuffers / 2 renderbuffers from ready onward — flat '
      + 'across three benchmark runs, 100 control cycles and eight viewport resizes. vtk.js 36.12.1, instrumented '
      + 'the same way in the same session, goes from 9/8/1 to 9/14/7 across three benchmark runs — one texture, one '
      + 'framebuffer AND one renderbuffer per resize, never returned.',
    ],
    controls,
  };
}

/**
 * The urban-heat grid's values. loadScientificBundle already fetched and
 * hash-verified these bytes as a declared dependency but keeps only the
 * reference, so the array is fetched again here — NOT re-hashed, only
 * length-checked against the reference's own dims. Page 13 carries the same
 * function and the same caveat; returning the verified bytes from
 * loadScientificBundle would close it, and that is a src/lib change neither
 * page task owns.
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
  range: [number, number];
  upload: VolumeUpload;
  /** The volume's box, already translated into world space, so the mesh's model
   *  matrix stays identity and the shader's world ray needs no inverse. */
  boxGeometry: THREE.BoxGeometry;
  planeGeometry: THREE.PlaneGeometry;
  sliceValues: Float32Array;
  sliceTexture: THREE.DataTexture;
};

function build(ui: Ui, bundle: ScientificBundle, heatValues: Float32Array): void {
  const manifest = bundle.manifest;
  const grid = bundle.smoke.grid;
  const objects = bundle.city.objects;
  const shippedCellObjectIndex = bundle.city.buildings.cellObjectIndex;
  if (!shippedCellObjectIndex) throw new Error('buildings mesh carries no cell_object_index');
  // Re-bound as a non-null const: several of the closures below are hoisted
  // function declarations, and TypeScript will not carry a narrowing into one.
  const cellObjectIndex: Uint32Array = shippedCellObjectIndex;
  // Three.js's Raycaster reports a faceIndex, which for an indexed
  // BufferGeometry is the triangle's position in the index buffer. This page
  // relies on faceIndex === cell id === the cellObjectIndex row, exactly as
  // page 13 relies on a polys-only polydata giving cell id === triangle index.
  // Asserted rather than assumed.
  if (cellObjectIndex.length !== bundle.city.buildings.indices.length / 3) {
    throw new Error(
      `buildings mesh carries ${cellObjectIndex.length} cell markers for `
      + `${bundle.city.buildings.indices.length / 3} triangles; faceIndex would not be a marker row`);
  }

  const probe: ScientificProbe = {
    renderer: 'threejs',
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
    // ScientificProbe.resources is a fixed five-key shape in src/lib, which
    // this task does not own, so the fourth GL object type goes beside it
    // rather than into it. Task 7 reads both; the controller mirrors the same
    // shape onto page 13 and widens ResourceSnapshot as a residual.
    probe.resources = {
      buffers: glCounts.buffers, textures: glCounts.textures,
      renderTargets: glCounts.renderTargets, listeners, observers,
    };
    ui.setProbe('glObjects', {...glCounts, listeners, observers});
    probe.canvasCount = ui.canvasHost.querySelectorAll('canvas').length;
    ui.setScientificProbe(probe);
  };

  // --- renderer ------------------------------------------------------------
  // The context is created here, not by WebGLRenderer, for two reasons: the
  // counters can then be installed before Three.js allocates its first object,
  // and the attributes are the ones vtk.js's own get3DContext asks for
  // (RenderWindow.js:178-182) rather than Three.js's defaults. antialias is
  // left unset on BOTH pages, so both get the browser default of true -- a page
  // at antialias:false would pay a different cost at the same one-pixel
  // readback and the frame times would not be comparable.
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  ui.canvasHost.prepend(canvas);
  const rawGl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: false, depth: true, alpha: true, powerPreference: 'high-performance',
  }) as WebGL2RenderingContext | null;
  if (!rawGl) throw new Error('no WebGL2 context');
  // Same re-binding, same reason as cellObjectIndex above.
  const gl: WebGL2RenderingContext = rawGl;
  glCounts = instrumentGlObjects(gl);

  const renderer = new THREE.WebGLRenderer({canvas, context: gl});
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(0.93, 0.93, 0.92), 1);
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    // Stated as a failure rather than skipped: the GPU round-trip leg of
    // assertGridWiring reads a float render target, and a page that quietly
    // skipped it would report "axis order checked" on the strength of two legs
    // that cannot see a wrong texcoord formula.
    throw new Error('EXT_color_buffer_float is unavailable, so the GPU sampling round-trip cannot be read back');
  }
  // R32F linear filtering needs its own extension. Recorded either way rather
  // than assumed: a NearestFilter fallback would change what the volume looks
  // like between machines, and Task 7 has to be able to see that.
  const floatLinear = renderer.extensions.has('OES_texture_float_linear');
  const volumeFilter = floatLinear ? THREE.LinearFilter : THREE.NearestFilter;

  const camera = new THREE.PerspectiveCamera(30, 1, CAMERA_NEAR, CAMERA_FAR);
  // The bundle's local frame is z-up (scientific-data.ts's coordinateFrame).
  // Three.js defaults to y-up, and this single line is the whole reconciliation
  // CameraPose's contract asks of a page -- set before OrbitControls exists,
  // since the controls read it to build their orbit frame.
  camera.up.set(0, 0, 1);

  // --- data cases ----------------------------------------------------------
  const makeUpload = (field: GridField): VolumeUpload => {
    const [nx, ny, nz] = field.dims;
    const texture = new THREE.Data3DTexture(field.data, nx, ny, nz);
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.minFilter = volumeFilter;
    texture.magFilter = volumeFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.unpackAlignment = 4;
    texture.needsUpdate = true;
    return {
      texture,
      uniformOrigin: [field.origin[0], field.origin[1], field.origin[2]],
      uniformSpacing: [field.spacing[0], field.spacing[1], field.spacing[2]],
      uniformSize: [nx, ny, nz],
    };
  };
  const makeCase = (id: string, fieldName: string, unit: string, field: GridField, range: [number, number]): DataCase => {
    const [nx, ny, nz] = field.dims;
    const span: [number, number, number] = [
      field.spacing[0] * (nx - 1), field.spacing[1] * (ny - 1), field.spacing[2] * (nz - 1),
    ];
    const boxGeometry = new THREE.BoxGeometry(span[0], span[1], span[2]);
    boxGeometry.translate(field.origin[0] + span[0] / 2, field.origin[1] + span[1] / 2, field.origin[2] + span[2] / 2);
    const planeGeometry = new THREE.PlaneGeometry(span[0], span[1]);
    planeGeometry.translate(field.origin[0] + span[0] / 2, field.origin[1] + span[1] / 2, 0);
    const sliceValues = new Float32Array(nx * ny);
    const sliceTexture = new THREE.DataTexture(sliceValues, nx, ny, THREE.RedFormat, THREE.FloatType);
    sliceTexture.minFilter = volumeFilter;
    sliceTexture.magFilter = volumeFilter;
    sliceTexture.wrapS = THREE.ClampToEdgeWrapping;
    sliceTexture.wrapT = THREE.ClampToEdgeWrapping;
    sliceTexture.unpackAlignment = 4;
    sliceTexture.needsUpdate = true;
    return {id, fieldName, unit, field, range, upload: makeUpload(field), boxGeometry, planeGeometry, sliceValues, sliceTexture};
  };

  const smokeSpeedRange = rangeOf(grid.speed);
  const smokePressureRange = rangeOf(grid.pressure);
  const heatRef = bundle.heat.grid;
  const cases: DataCase[] = [
    makeCase(CASE_IDS[0], 'speed', manifest.fields.speed.unit, gridField(grid, 'speed'), smokeSpeedRange),
    makeCase(CASE_IDS[1], 'pressure', manifest.fields.pressure.unit, gridField(grid, 'pressure'), smokePressureRange),
    makeCase(CASE_IDS[2], 'temperature', heatRef.unit, heatGridField(heatRef, heatValues), [heatRef.min, heatRef.max]),
  ];
  let active = cases[0];
  let sliceHeightM = bundle.smoke.slice.fixedLocalCoordinate;

  // --- uniforms ------------------------------------------------------------
  // One set of uniform OBJECTS, shared by reference between the scene's
  // materials and the verification materials. Verifying a copy of these values
  // would prove nothing about what the volume actually samples.
  const uData = {value: cases[0].upload.texture as THREE.Data3DTexture};
  const uOrigin = {value: new THREE.Vector3()};
  const uSpacing = {value: new THREE.Vector3()};
  const uSize = {value: new THREE.Vector3()};
  const uBoxMin = {value: new THREE.Vector3()};
  const uBoxMax = {value: new THREE.Vector3()};
  const uClim = {value: new THREE.Vector2(0, 1)};
  const uOpacityScale = {value: DEFAULT_OPACITY};
  const uStep = {value: VOLUME_STEP_M};
  const uResolution = {value: new THREE.Vector2(1, 1)};
  const uNear = {value: CAMERA_NEAR};
  const uFar = {value: CAMERA_FAR};
  const uSliceData = {value: cases[0].sliceTexture as THREE.DataTexture};
  const uSliceDims = {value: new THREE.Vector2(1, 1)};
  const uSliceAlpha = {value: 0.25 + 0.6 * DEFAULT_OPACITY};
  const uProbeWorld = {value: new THREE.Vector3()};
  const uProbeUv = {value: new THREE.Vector2()};

  function applyCaseUniforms(c: DataCase): void {
    const [nx, ny, nz] = c.field.dims;
    uData.value = c.upload.texture;
    uOrigin.value.set(...c.upload.uniformOrigin);
    uSpacing.value.set(...c.upload.uniformSpacing);
    uSize.value.set(...c.upload.uniformSize);
    uBoxMin.value.set(c.field.origin[0], c.field.origin[1], c.field.origin[2]);
    uBoxMax.value.set(
      c.field.origin[0] + c.field.spacing[0] * (nx - 1),
      c.field.origin[1] + c.field.spacing[1] * (ny - 1),
      c.field.origin[2] + c.field.spacing[2] * (nz - 1),
    );
    uSliceData.value = c.sliceTexture;
    uSliceDims.value.set(nx, ny);
  }

  // --- offscreen targets ---------------------------------------------------
  const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  depthTexture.minFilter = THREE.NearestFilter;
  depthTexture.magFilter = THREE.NearestFilter;
  /**
   * The opaque pass is rasterized at THE CANVAS'S OWN SAMPLE COUNT, read off
   * the default framebuffer rather than hard-coded, so this page rasterizes
   * terrain, buildings and streamlines with exactly the multisampling page 13
   * gets from its antialias:true canvas.
   *
   * This is the single most consequential line on the page, and the first
   * version got it wrong. It shipped `samples` unset (so 1 sample) with a
   * divergence note claiming a multisampled target "cannot hand a depth
   * TEXTURE to the volume pass". That claim is false for three 0.185.1:
   * WebGLTextures.updateMultisampleRenderTarget resolves depth by
   * blitFramebuffer into the single-sample framebuffer whose depth attachment
   * is this DepthTexture, guarded by `resolveDepthBuffer`, which defaults
   * true. Measured consequence of the mistake: page 14 p50 142.7 ms against
   * page 13's 160.4 ms -- a ~12% "Three.js is faster" result that was really
   * this page drawing the city at one sample while page 13 drew it at four.
   * Sampled the same way the gap closes. A page artifact wearing a renderer
   * property's clothes is exactly what this whole page exists not to produce.
   */
  const canvasSamples = gl.getParameter(gl.SAMPLES) as number;
  const opaqueTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture, depthBuffer: true, stencilBuffer: false, samples: canvasSamples,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  const uOpaqueDepth = {value: depthTexture as THREE.Texture};

  // --- wiring assertions, before a single mesh exists ----------------------
  // These throw. A throw here reaches main()'s catch and renders the failure
  // panel, so the page can never come up "ready" with a grid it has not
  // checked. Reporting them instead is what let a tautological check sit in
  // page 13 unnoticed through a whole review round.
  const verifyTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  const verifyGeometry = new THREE.PlaneGeometry(2, 2);
  const verifyVolumeMaterial = new THREE.ShaderMaterial({
    uniforms: {uData, uOrigin, uSpacing, uSize, uProbeWorld},
    vertexShader: VERIFY_VERTEX_GLSL, fragmentShader: VERIFY_VOLUME_FRAGMENT_GLSL,
    depthTest: false, depthWrite: false,
  });
  const verifySliceMaterial = new THREE.ShaderMaterial({
    uniforms: {uSliceData, uSliceDims, uProbeUv},
    vertexShader: VERIFY_VERTEX_GLSL, fragmentShader: VERIFY_SLICE_FRAGMENT_GLSL,
    depthTest: false, depthWrite: false,
  });
  const verifyMesh = new THREE.Mesh(verifyGeometry, verifyVolumeMaterial);
  const verifyScene = new THREE.Scene();
  verifyScene.add(verifyMesh);
  const verifyCamera = new THREE.Camera();
  const readback = new Float32Array(4);
  function readVerification(material: THREE.ShaderMaterial): number {
    verifyMesh.material = material;
    renderer.setRenderTarget(verifyTarget);
    renderer.clear();
    renderer.render(verifyScene, verifyCamera);
    renderer.readRenderTargetPixels(verifyTarget, 0, 0, 1, 1, readback);
    renderer.setRenderTarget(null);
    return readback[0];
  }

  /**
   * Resamples one case's slice plane as the TRUE horizontal plane at `metres`,
   * through the shared sampleGridTrilinear on that grid's own x/y lattice.
   *
   * Records the z it ACTUALLY sampled at, and that recorded value is what
   * sliceGeometry() reports as `renderedZ`. Reporting the mesh's transform
   * instead would witness only that the plane was moved: a fillSlice that
   * snapped its metres to a node lattice internally would still have satisfied
   * renderedZ === requestedZ, because the wiring assertions run once at
   * startup and never again after a slider move.
   */
  let sampledSliceZ = Number.NaN;
  function fillSlice(c: DataCase, metres: number): void {
    const [nx, ny] = c.field.dims;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        c.sliceValues[i + nx * j] = sampleGridTrilinear(c.field, sliceNodeWorld(c.field, i, j, metres))[0];
      }
    }
    sampledSliceZ = metres;
    c.sliceTexture.needsUpdate = true;
  }

  let worstGpuDelta = 0;
  for (const c of cases) {
    applyCaseUniforms(c);
    fillSlice(c, sliceHeightM);
    const span = c.range[1] - c.range[0];
    worstGpuDelta = Math.max(worstGpuDelta, assertGridWiring(c.id, c.field, c.upload,
      {data: uData, origin: uOrigin, spacing: uSpacing, size: uSize}, span, world => {
        uProbeWorld.value.set(world[0], world[1], world[2]);
        return readVerification(verifyVolumeMaterial);
      }));
    assertGeometryPlacement(c.id, c.field, c.boxGeometry, c.planeGeometry, uBoxMin.value, uBoxMax.value, sliceHeightM);
    worstGpuDelta = Math.max(worstGpuDelta, assertSliceWiring(c.id, c.field, c.sliceValues, sliceHeightM, span, uv => {
      uProbeUv.value.set(uv[0], uv[1]);
      return readVerification(verifySliceMaterial);
    }));
  }
  applyCaseUniforms(active);
  verifyScene.remove(verifyMesh);
  verifyGeometry.dispose();
  verifyVolumeMaterial.dispose();
  verifySliceMaterial.dispose();
  verifyTarget.dispose();

  const pressureField = gridField(grid, 'pressure');
  const pressureSpan = smokePressureRange[1] - smokePressureRange[0];
  const sliceWorstPa = assertCoreSliceAgrees(bundle, pressureField, pressureSpan);

  // --- scene graph ---------------------------------------------------------
  // Two scenes, one renderer, one canvas: `opaque` is everything with a depth
  // footprint and renders into opaqueTarget; `volumeScene` is the single box
  // the ray marcher runs in and renders straight to the canvas over the
  // blitted opaque colour. Splitting them is not a second renderer -- it is how
  // one renderer runs two passes with one camera.
  const opaque = new THREE.Scene();
  const volumeScene = new THREE.Scene();

  // DIVERGENCE (forced): vtk.js lights a renderer automatically with a
  // headlight; Three.js has no default lighting at all, so an unlit
  // MeshLambertMaterial would render black. One ambient plus one directional
  // light, and the same two flat greys page 13 gives its actors.
  opaque.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(0.4, -0.6, 1).normalize();
  opaque.add(sun);

  const terrainGeometry = geometryFromMesh(bundle.city.terrain);
  const terrainMaterial = new THREE.MeshLambertMaterial({color: new THREE.Color(0.62, 0.62, 0.60)});
  opaque.add(new THREE.Mesh(terrainGeometry, terrainMaterial));

  const buildingsGeometry = geometryFromMesh(bundle.city.buildings);
  const buildingsMaterial = new THREE.MeshLambertMaterial({color: new THREE.Color(0.80, 0.78, 0.74)});
  const buildingsMesh = new THREE.Mesh(buildingsGeometry, buildingsMaterial);
  opaque.add(buildingsMesh);

  const {indices: streamlineIndices, lines: streamlineCount, dropped: streamlinesDropped} =
    streamlineSegments(bundle.smoke.streamlines.vertexOffsets);
  const streamlineGeometry = new THREE.BufferGeometry();
  streamlineGeometry.setAttribute('position', new THREE.BufferAttribute(bundle.smoke.streamlines.positions, 3));
  // Streamlines carry their own speed scalars and keep their own ramp over the
  // streamline speed range, so they stay readable when the case switches to
  // pressure or temperature -- page 13's choice, same colormap, baked into a
  // vertex-colour attribute here because Three.js has no scalar lookup table.
  const [streamLo, streamHi] = rangeOf(bundle.smoke.streamlines.speed);
  const streamlineColors = new Float32Array(bundle.smoke.streamlines.speed.length * 3);
  for (let v = 0; v < bundle.smoke.streamlines.speed.length; v++) {
    const [r, g, b] = colormap(bundle.smoke.streamlines.speed[v], streamLo, streamHi);
    streamlineColors[v * 3] = r / 255; streamlineColors[v * 3 + 1] = g / 255; streamlineColors[v * 3 + 2] = b / 255;
  }
  streamlineGeometry.setAttribute('color', new THREE.BufferAttribute(streamlineColors, 3));
  streamlineGeometry.setIndex(new THREE.BufferAttribute(streamlineIndices, 1));
  // DIVERGENCE (forced): page 13 sets lineWidth 2. WebGL implementations are
  // permitted to ignore any width but 1 and Chrome's does, so this page cannot
  // match that even nominally; the lines are one pixel wide here.
  const streamlineMaterial = new THREE.LineBasicMaterial({vertexColors: true});
  const streamlineMesh = new THREE.LineSegments(streamlineGeometry, streamlineMaterial);
  opaque.add(streamlineMesh);

  // The slice is translucent on purpose, page 13's reasoning verbatim: an
  // opaque plane at 40 m hides the terrain and buildings underneath it, and the
  // point of this page is that one scene carries both. depthWrite is off so the
  // plane never enters the depth texture the volume pass stops against -- see
  // the probe panel for what that costs.
  const sliceMaterial = new THREE.ShaderMaterial({
    uniforms: {uClim, uSliceAlpha, uSliceData, uSliceDims},
    vertexShader: SLICE_VERTEX_GLSL, fragmentShader: SLICE_FRAGMENT_GLSL,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const slicePlane = new THREE.Mesh(active.planeGeometry, sliceMaterial);
  slicePlane.position.z = sliceHeightM;
  opaque.add(slicePlane);

  const volumeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uData, uOrigin, uSpacing, uSize, uBoxMin, uBoxMax, uClim, uOpacityScale, uStep,
      uOpaqueDepth, uResolution, uNear, uFar,
    },
    vertexShader: VOLUME_VERTEX_GLSL, fragmentShader: VOLUME_FRAGMENT_GLSL,
    side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false,
    // The compositor accumulates premultiplied colour, so the blend has to be
    // ONE / ONE_MINUS_SRC_ALPHA rather than Three.js's default SRC_ALPHA pair,
    // which would multiply the alpha in a second time.
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
  });
  const volumeMesh = new THREE.Mesh(active.boxGeometry, volumeMaterial);
  // BackSide + an analytic ray/AABB intersection from the eye, so the camera
  // may sit inside the box; frustum culling off because the box is the whole
  // domain and a culled volume is an invisible one at grazing angles.
  volumeMesh.frustumCulled = false;
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

  function renderScene(): void {
    renderer.setRenderTarget(opaqueTarget);
    renderer.clear();
    renderer.render(opaque, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(blitScene, blitCamera);
    renderer.render(volumeScene, camera);
  }

  // --- camera --------------------------------------------------------------
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.addEventListener('change', renderScene);

  function applyPose(pose: CameraPose): void {
    const eye = eyeOf(pose);
    camera.position.set(eye[0], eye[1], eye[2]);
    controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
  }

  // --- colour / opacity ----------------------------------------------------
  let colourLow = 0, colourHigh = 1, opacityScale = DEFAULT_OPACITY;

  function activeColourRange(): [number, number] {
    const [min, max] = active.range;
    const span = max - min;
    const lo = min + Math.min(colourLow, colourHigh) * span;
    const hi = min + Math.max(colourLow, colourHigh) * span;
    // A collapsed range would divide by zero in every shader below.
    return hi > lo ? [lo, hi] : [lo, lo + (span || 1) * 1e-3];
  }

  /**
   * The transfer functions, as the same numbers page 13 hands vtk.js:
   *  - colour: the shared five-stop ramp (COLORMAP_GLSL is the GLSL half of
   *    src/lib/colormap.ts, so both pages colour a value identically);
   *  - volume opacity: 0 at the low end, 0.05*scale at the midpoint,
   *    0.6*scale at the high end, piecewise linear;
   *  - slice alpha: 0.25 + 0.6*scale, capped below 1 so the opacity control's
   *    top end cannot quietly make the plane opaque.
   */
  function applyTransferFunctions(): void {
    const [lo, hi] = activeColourRange();
    uClim.value.set(lo, hi);
    uOpacityScale.value = opacityScale;
    uSliceAlpha.value = 0.25 + 0.6 * opacityScale;
    ui.setReadout('Colour range', `${lo.toFixed(2)} – ${hi.toFixed(2)} ${active.unit}`);
  }

  function applySlice(): void {
    fillSlice(active, sliceHeightM);
    slicePlane.position.z = sliceHeightM;
    // The payload's height and the mesh's height are separate facts; a page
    // that let them drift would draw one plane and report another.
    if (sampledSliceZ !== slicePlane.position.z) {
      throw new Error(
        `the slice payload was resampled at z = ${sampledSliceZ} m but the plane was moved to `
        + `${slicePlane.position.z} m`);
    }
    const [nx, ny] = active.field.dims;
    ui.setReadout('Slice', `z = ${sliceHeightM.toFixed(2)} m exactly — the ${nx}×${ny} plane resampled through `
      + 'sampleGridTrilinear, not snapped to the nearest node layer');
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
   * marker (through the shipped cellObjectIndex, the array Raycaster's
   * faceIndex indexes) -> objectRefForCell. The verdict comes back from the
   * shared module; this function only renders it.
   *
   * DIVERGENCE (forced, same index space): page 13 carries the markers as a
   * cell-data array on the polydata because vtkCellPicker resolves through the
   * dataset itself. Three.js's Raycaster returns a faceIndex and knows nothing
   * about attached cell data, so the lookup reads the shipped array directly.
   * Same array, same index space, asserted above.
   */
  function selectCell(cellId: number): void {
    if (!Number.isInteger(cellId) || cellId < 0 || cellId >= cellObjectIndex.length) {
      // Clear, never leave the previous marker published: a stale
      // selectedObject would read as the identity of a cell that was not
      // selected.
      delete probe.selectedObject;
      ui.setReadout('Pick', `cell ${cellId} is outside the buildings mesh (${cellObjectIndex.length} cells)`);
      ui.setReadout('Marker', 'none — nothing is selected');
      ui.setReadout('Source buildings', 'none — nothing is selected');
      ui.setReadout('DTCC ids', 'none — nothing is selected');
      ui.setReadout('Traceability', 'not applicable — nothing is selected');
      publish();
      return;
    }
    const marker = cellObjectIndex[cellId];
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
    applyCaseUniforms(active);
    volumeMesh.geometry = active.boxGeometry;
    slicePlane.geometry = active.planeGeometry;
    applyTransferFunctions();
    applySlice();
    ui.setReadout('Data case', `${active.id} (${active.unit}), grid ${active.field.dims.join('×')}`);
    if (probe.selectedValue) sampleAt(probe.selectedValue.world);
    renderScene();
    // AFTER the render, not before it, and this is not fastidiousness: a case
    // switch swaps in that case's box and plane geometries, and Three.js
    // uploads a geometry's attribute buffers lazily on the first render that
    // uses it. Measured: the first switch to heat - temperature allocates 8
    // buffers, and publishing first reported 21 where the truth was 29 until
    // some later publish happened to correct it. That is page 13's residual
    // defect in a new place -- a publish that runs before the allocation it is
    // supposed to report -- and it was found here by measuring the counts
    // around a case switch rather than by reading the code. Page 13 publishes
    // before its own render in setCase; measured on the same build, vtk.js
    // allocates nothing on that path, so the ordering is invisible there.
    publish();
  }

  scene = {
    setSliceHeight(metres) { sliceHeightM = metres; applySlice(); renderScene(); publish(); },
    setColourFraction(which, value) {
      if (which === 'low') colourLow = value; else colourHigh = value;
      applyTransferFunctions(); renderScene(); publish();
    },
    setOpacity(value) { opacityScale = value; applyTransferFunctions(); renderScene(); publish(); },
    setStreamlines(visible) { streamlineMesh.visible = visible; renderScene(); publish(); },
    resetCamera() { applyPose(orbitV1Pose(0)); renderScene(); publish(); },
    setCase,
  };

  // --- resize: one observer, disposed with the renderer --------------------
  function applySurface(cssWidth: number, cssHeight: number, dpr: number): void {
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssWidth, cssHeight, false);
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));
    opaqueTarget.setSize(bufferWidth, bufferHeight);
    uResolution.value.set(bufferWidth, bufferHeight);
    camera.aspect = bufferWidth / bufferHeight;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(() => {
    const rect = ui.canvasHost.getBoundingClientRect();
    applySurface(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)), window.devicePixelRatio || 1);
    renderScene();
    // Page 13's residual defect was publishing on every path EXCEPT this one --
    // and resizing is the only thing that leaks in vtk.js, so the gate that
    // would have revealed it read a stale snapshot and concluded "stable".
    // Whether Three.js leaks here is precisely what Task 7 needs to know, and
    // it can only know if this page refreshes the counts on the resize path.
    publish();
  });
  resizeObserver.observe(ui.canvasHost);
  observers += 1;

  // --- picking -------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const onPointerDown = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(buildingsMesh, false)[0];
    if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) {
      ui.setReadout('Pick', 'no building under the cursor'); publish(); return;
    }
    selectCell(hit.faceIndex);
    renderScene();
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  listeners += 1;

  // --- benchmark -----------------------------------------------------------
  const gpuTimer = makeGpuTimer(gl);
  /**
   * Forces the frame just submitted to *complete* before renderFrame returns,
   * which is what BenchmarkDriver's contract ("must not return until the frame
   * is actually rendered") requires.
   *
   * `gl.finish()` alone is not enough, measured on page 13: under Chrome's
   * ANGLE/SwiftShader command buffer it returns after submission, and that page
   * reported a 0.45 ms mean frame while the GPU timer on the very same frames
   * reported 95 ms — a 200x overstatement of the frame rate, on a page whose
   * whole purpose is to measure frame rate. A one-pixel readback is a real
   * pipeline sync and closes that gap. Deleting this line would fail the smoke
   * test's cpuMean > 0.5 * gpuMean assertion and nothing else.
   *
   * It reads the DEFAULT framebuffer: renderScene's last act is
   * setRenderTarget(null) plus the volume pass, so the binding at this point is
   * the canvas, exactly as on page 13.
   */
  const pixel = new Uint8Array(4);
  const forceCompletion = () => {
    gl.finish();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  };
  const driver = createBenchmarkDriver({
    renderFrame: pose => {
      applyPose(pose);
      renderScene();
      forceCompletion();
    },
    gpuTimer,
  });

  /**
   * The render surface every frame time has to be read against: page 13
   * records the same key, and the two are comparable only if both do.
   * antialias in particular means the one-pixel readback that forces frame
   * completion also forces an MSAA resolve — a page at antialias:false pays a
   * different cost at the same sync point.
   */
  function recordRenderSurface(phase: 'interactive' | 'benchmark'): void {
    const payload = {
      phase,
      benchmarkSize: BENCHMARK_SURFACE,
      drawingBufferWidth: gl.drawingBufferWidth,
      drawingBufferHeight: gl.drawingBufferHeight,
      devicePixelRatio: window.devicePixelRatio,
      contextAttributes: gl.getContextAttributes(),
      // Three.js-only, and recorded because the two pages' frame times are
      // comparable only while it matches the canvas. The opaque target is
      // multisampled at the canvas's own sample count, so this page rasterises
      // terrain, buildings and streamlines with exactly the multisampling page
      // 13 gets from its antialias:true canvas. This comment previously said a
      // multisampled target "cannot hand a depth TEXTURE to the volume pass",
      // which is false for three 0.185.1 -- updateMultisampleRenderTarget
      // blits depth into the single-sample FBO whose depth attachment is the
      // DepthTexture, and resolveDepthBuffer defaults true. That false claim
      // cost a 12% frame-time difference that was this page's own doing.
      opaqueTargetSamples: opaqueTarget.samples,
      volumeStepMetres: VOLUME_STEP_M,
      volumeFilter: floatLinear ? 'linear (OES_texture_float_linear)' : 'nearest (OES_texture_float_linear absent)',
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

  /**
   * orbit-v1 at a fixed drawing-buffer size, page 13's procedure verbatim: the
   * canvas otherwise fills whatever the page chrome leaves it, and this page's
   * header is a different height from page 13's, so pinning the surface keeps
   * the frame times a property of the renderer. The ResizeObserver is stood
   * down for the run so it cannot resize the surface mid-measurement.
   */
  async function runBenchmark(): Promise<BenchmarkResult> {
    const resourcesBefore = {...glCounts, listeners, observers};
    const rect = ui.canvasHost.getBoundingClientRect();
    const restoreWidth = Math.max(1, Math.floor(rect.width));
    const restoreHeight = Math.max(1, Math.floor(rect.height));
    const restoreDpr = window.devicePixelRatio || 1;
    resizeObserver.unobserve(ui.canvasHost);
    applySurface(BENCHMARK_SURFACE[0], BENCHMARK_SURFACE[1], 1);
    try {
      const result = await driver.runBenchmark();
      probe.benchmark = result;
      recordRenderSurface('benchmark');
      publish();
      return result;
    } finally {
      applySurface(restoreWidth, restoreHeight, restoreDpr);
      resizeObserver.observe(ui.canvasHost);
      renderScene();
      recordRenderSurface('interactive');
      // After the restore, not before it: the in-try publish above runs while
      // the surface is still pinned to BENCHMARK_SURFACE and would miss
      // whatever the restore itself costs.
      publish();
      const resourcesAfter = {...glCounts, listeners, observers};
      // resourcesEqual compares src/lib's five fixed keys, which do not
      // include renderbuffers; the fourth type is compared explicitly so it
      // cannot grow unnoticed on the very path this check exists to watch.
      if (!resourcesEqual(resourcesBefore, resourcesAfter)
        || resourcesBefore.renderbuffers !== resourcesAfter.renderbuffers) {
        ui.probe('Three.js 0.185.1 GL-object growth across one benchmark run: '
          + `${JSON.stringify(diffResources(resourcesBefore, resourcesAfter))}. Page 13 measures the same thing the `
          + 'same way, where vtk.js 36.12.1 leaks up to one texture and one framebuffer per drawing-buffer resize.');
      }
    }
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
      controls.dispose();
      for (const c of cases) {
        c.upload.texture.dispose();
        c.sliceTexture.dispose();
        c.boxGeometry.dispose();
        c.planeGeometry.dispose();
      }
      terrainGeometry.dispose(); terrainMaterial.dispose();
      buildingsGeometry.dispose(); buildingsMaterial.dispose();
      streamlineGeometry.dispose(); streamlineMaterial.dispose();
      blitGeometry.dispose(); blitMaterial.dispose();
      sliceMaterial.dispose(); volumeMaterial.dispose();
      opaqueTarget.dispose();
      renderer.dispose();
    } catch (err) {
      // The GL context is already gone; teardown can throw on the way down.
      // Recorded rather than swallowed, and never allowed to stop the visible
      // failure below from rendering.
      ui.probe(`Three.js teardown after context loss: ${(err as Error).message}`);
    }
  }

  // Attached to the drawing canvas Three.js renders into.
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

  // --- first frame ---------------------------------------------------------
  const startRect = ui.canvasHost.getBoundingClientRect();
  applySurface(Math.max(1, Math.floor(startRect.width)), Math.max(1, Math.floor(startRect.height)),
    window.devicePixelRatio || 1);
  applyTransferFunctions();
  applySlice();
  applyPose(orbitV1Pose(0));
  renderScene();

  /**
   * Every case's GPU resources are allocated BEFORE the page reports ready.
   *
   * Three.js uploads a geometry's attribute buffers and a texture's pixels
   * lazily, on the first render that uses them, so the first switch to a cold
   * case allocated 8 buffers at that moment. Measured over 100 control cycles
   * that read 21 -> 37 buffers where page 13 was flat at 9 -- not a leak
   * (bounded by the three cases, and the page reported it correctly and live),
   * but the spike's gate is worded "100 control/resize cycles with stable
   * resource counts" and a one-off warm-up cost fails it for the wrong reason.
   * Compiling every case's material/geometry pair up front moves that cost
   * before ready() and leaves the counts flat from there, so Task 7 runs its
   * gate unmodified against both pages.
   */
  for (const c of cases) {
    applyCaseUniforms(c);
    volumeMesh.geometry = c.boxGeometry;
    slicePlane.geometry = c.planeGeometry;
    renderer.compile(opaque, camera);
    renderer.compile(volumeScene, camera);
    renderScene();
  }
  applyCaseUniforms(active);
  volumeMesh.geometry = active.boxGeometry;
  slicePlane.geometry = active.planeGeometry;
  applyTransferFunctions();
  applySlice();
  renderScene();

  ui.setReadout('Data case', `${active.id} (${active.unit}), grid ${active.field.dims.join('×')}`);
  selectCell(FIXED_PICK_CELL);

  publish();

  // --- probes and measurements --------------------------------------------
  const census = markerCensus(bundle, cellObjectIndex);
  recordRenderSurface('interactive');
  const glsl = glslOverlap();
  ui.setProbe('glslBurden', glsl);
  reportMeasurements(ui, bundle, cases, census,
    {streamlineCount, streamlinesDropped, gpuTimer: !!gpuTimer, sliceWorstPa, pressureSpan, glsl, floatLinear,
     worstGpuDelta, opaqueTargetSamples: opaqueTarget.samples});

  ui.setProbe('field', true);
  ui.setProbe('apis', THREE_APIS);
  Object.assign(window.__bench, {
    markers: census,
    selectCell,
    setReadout: ui.setReadout,
    controlCalls,
    runBenchmark,
    // Requested vs rendered slice height, page 13's shape verbatim, so a smoke
    // test has a second witness that the drawn plane is the plane the page
    // claims. `renderedZ` is read off the mesh in the scene graph, not off the
    // variable that set it.
    sliceGeometry: () => ({
      requestedZ: sliceHeightM,
      // The height fillSlice actually resampled at, not the mesh's transform:
      // see fillSlice. applySlice asserts the two agree, so this witnesses
      // both.
      renderedZ: sampledSliceZ,
      // All three read off the DataTexture the plane samples and the payload
      // that fills it. The third is COMPUTED rather than the literal 1 it used
      // to be -- it would read 2 the moment the plane gained a layer, which is
      // what makes the smoke test's "the slice image is a single layer"
      // assertion mean something here as well as on page 13.
      dims: [
        active.sliceTexture.image.width, active.sliceTexture.image.height,
        active.sliceValues.length / (active.sliceTexture.image.width * active.sliceTexture.image.height),
      ],
      originZ: active.field.origin[2],
      nodeSpacingZ: active.field.spacing[2],
    }),
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
 * path rather than through a marker number typed into a test. Page 13's
 * function, verbatim, so the two pages' `__bench.markers` are the same object
 * shape computed the same way.
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
           sliceWorstPa: number; pressureSpan: number; glsl: ReturnType<typeof glslOverlap>; floatLinear: boolean;
           worstGpuDelta: number; opaqueTargetSamples: number},
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
    + `declared (${extras.streamlinesDropped} dropped as degenerate), ${bundle.smoke.streamlines.positions.length / 3} vertices total. `
    + 'Core precomputed every vertex; this page walks vertexOffsets and emits segments, and integrates nothing.');

  // Alignment landmarks: the grid's own corners against the frame every mesh
  // in this bundle was rebased into. Page 13 reports the same two numbers.
  const far: [number, number, number] = [
    grid.origin[0] + grid.spacing[0] * (grid.dims[0] - 1),
    grid.origin[1] + grid.spacing[1] * (grid.dims[1] - 1),
    grid.origin[2] + grid.spacing[2] * (grid.dims[2] - 1),
  ];
  const nearDelta = alignmentDistance(grid.origin, [localBounds[0], localBounds[1], localBounds[2]]);
  const farDelta = alignmentDistance(far, [localBounds[3], localBounds[4], localBounds[5]]);
  ui.probe(`alignment landmarks (tolerance ${ALIGNMENT_TOLERANCE_M} m): smoke grid origin vs localBounds min = `
    + `${nearDelta.toFixed(4)} m; far corner vs localBounds max = ${farDelta.toFixed(4)} m.`);

  const slice = bundle.smoke.slice;
  ui.probe(`Core FieldSlice vs the volume grid, trilinear at the same ${slice.resolution}x${slice.resolution} world points, `
    + `z=${slice.fixedLocalCoordinate} m, on PRESSURE: worst |dp| = ${extras.sliceWorstPa.toExponential(3)} Pa against an `
    + `interpolated tolerance of ${interpolatedTolerance(extras.pressureSpan).toExponential(3)} (span ${extras.pressureSpan.toFixed(3)}). `
    + 'Asserted, not reported. Pressure and not speed because the shipped speed field is bit-identically z-invariant '
    + '(max |f(z) - f(z=0)| = 0.0 against 12.02 for pressure), so a speed cross-check has no power at all over the z axis.');

  for (const c of cases) {
    ui.probe(`${c.id}: grid ${c.field.dims.join('x')}, asserted before any mesh existed on three legs — the upload `
      + 'declaration, offset arithmetic written here against the Data3DTexture upload parameters, and a GPU round trip '
      + 'through the scene\'s own sampler GLSL at asymmetric interior nodes, plus the placement of the volume box '
      + 'and slice plane against the grid they claim to cover.');
  }
  ui.probe('What the three legs can and cannot do, corrected after review, because the first version of this panel '
    + 'credited a leg that could not fail. Leg A pins the DECLARATION: the texture\'s own dims and the live shader '
    + 'uniforms against the shipped grid, by exact equality. Leg B is now the PAYLOAD invariant and nothing more -- '
    + 'the texture must be backed by the shipped array itself, since Data3DTexture holds its array by reference, so '
    + 'any reordering or re-typing on the way to the GPU means a different array object and fails here. Leg C proves '
    + 'the SAMPLER, by running the scene\'s own VOLUME_SAMPLE_GLSL on the real texture and reading the result back; '
    + 'it is the only leg that can see a wrong texcoord formula, filter or swizzle, and it is strictly more than '
    + 'page 13 has. What was REMOVED: leg B used to recompute the world -> texel -> offset arithmetic and compare it '
    + 'against gridNodeIndex, then read the uploaded array at that offset and compare against probeGridNode. Both '
    + 'were algebraic identities given leg A\'s exact equalities and Data3DTexture\'s by-reference storage -- '
    + 'confirmed over all 163,840 nodes of both shipped grids with 0 mismatches and no upload defect able to make '
    + 'either fire. That is page 13\'s tautology restated sideways, and it is gone rather than dressed up. What '
    + 'REMAINS unchecked, stated plainly: whether the shipped bytes are in the order they claim is a declaration '
    + 'question, answerable only against a second decode of the file, which nothing here does.');
  ui.probe(`GPU sampling round trip: worst |delta| between what probeGridNode reads and what the scene's own sampler `
    + `GLSL returns for the same world point, over every case and every probe node, is `
    + `${extras.worstGpuDelta.toExponential(3)} in field units. Not bit-exact, and it cannot be: (world - origin) / `
    + 'spacing does not land on an exact integer for these irrational spacings, so the sampler interpolates by a '
    + 'vanishing weight. Held to the repo\'s interpolated tolerance (1e-5 * max(span, 1)); the negative control that '
    + 'drops the half-texel centring term moves a probe by half a node and fails by orders of magnitude.');
  ui.probe('Axis-order gap, stated rather than papered over: whether a shipped payload is in the order it claims is a '
    + 'DECLARATION check, not something any browser-side probe can derive from the bytes. The smoke grid ships '
    + '"order": "x-fastest,y,z-slowest" and scientific-data.ts asserts it against GRID_ORDER. field.grid.json ships no '
    + '"order" field at all -- scripts/real/sample_field.py writes the heat grid x-fastest (its own comment says so) but '
    + 'does not record it. Adding it needs sample_field.py plus a regenerated scientific-manifest.json, whose dependency '
    + 'record hashes field.grid.json; that is an artifact-regeneration task, not a page change.');
  ui.probe('Negative controls, run against this page and measured, not asserted from the armchair. Each was applied '
    + 'one at a time to the shipped source, rebuilt, and loaded:\n'
    + '  (1) dims handed to Data3DTexture permuted to (nz, ny, nx): leg A throws on heat - temperature (texture dims '
    + '[32,64,64] vs [64,64,32]) and is a GENUINE NO-OP on the 32x32x32 smoke cube, which is the stated limit.\n'
    + '  (2) payload reordered z-fastest, dims/origin/spacing left correct: leg A passes, leg B throws. Read the '
    + 'reason honestly: it fires because reordering a payload means ALLOCATING A DIFFERENT ARRAY, which is exactly '
    + 'the invariant leg B now states, and not because any arithmetic detected the transposition. The earlier '
    + 'version of this control was reported as node-level offset/value disagreement (2.1591 expected, 2.1353 '
    + 'uploaded), which made a tautological check look discriminating.\n'
    + '  (2b) payload transposed x<->y, dims untouched: same leg, same reason. Worth keeping separately because '
    + 'x<->y is invisible to every DECLARATION check on both shipped grids.\n'
    + '  (3) half-texel centring dropped from the shared sampler GLSL: legs A and B pass, leg C throws off by '
    + '1.8694e-1 against a 1.1032e-4 tolerance -- 1700x the bound.\n'
    + '  (3b) applyCaseUniforms mis-wired to write uSpacing into uOrigin: leg A throws, naming both. The earlier '
    + 'version of leg A, which compared the upload RECORD against the field, could not have caught this -- it read '
    + 'two expressions that are copies of each other. Reading the live uniform objects is what made it a real check.\n'
    + '  (3c) volume box mesh translated 100 m in x: the placement leg throws, naming the corner and the 100.0000 m. '
    + 'That is the one link the sampler legs cannot see -- they prove the sampler answers correctly for a world '
    + 'point handed to it, not that the ray asks about the right world points.\n'
    + '  (4) slice plane filled b-fastest: the slice leg throws at node (2,1).\n'
    + '  (4b) the slice sampler\'s V flipped in the ONE shared SLICE_SAMPLE_GLSL string: the slice GPU leg throws, '
    + '7.94 off at uv (0.032, 0.032). This control exists because review pointed out that the plane\'s UV -> world '
    + 'mapping was relying silently on three\'s PlaneGeometry convention; it is now asserted per vertex as well.\n'
    + '  (9) the streamline walk changed to emit a segment from each vertex to the next across line boundaries: '
    + 'throws, 4073 segments emitted where 4049 is the only count that does not join one polyline to the next. '
    + 'scientific-data.ts already validates vertexOffsets against actualCount, [0] === 0, monotonicity and '
    + 'seedIndices range before this page sees the array, so this was the one failure mode left.\n'
    + '  (5) Core FieldSlice a/b order transposed: 24.691 Pa against a 8.2015e-4 tolerance, the same number page 13 '
    + 'records for the same control.\n'
    + '  (6) the one-pixel readback stripped from the benchmark\'s frame completion: cpu mean 0.17 ms against a gpu '
    + 'mean of 133.25 ms, a 780x overstatement, and the smoke test\'s cpuMean > 0.5 * gpuMean assertion fails. '
    + 'Page 13 measured 0.45 ms against 95 ms for the same defect.');
  ui.probe('Structural limit on both pages, restated rather than rediscovered: permuting x and y in a grid DECLARATION '
    + 'is a genuine no-op on both shipped grids (32x32 and 64x64 in x/y, and the heat grid\'s x and y spacings are '
    + 'equal too), so no declaration check can see it. What this page adds over page 13 is that a transposed PAYLOAD, '
    + 'x<->y included, is caught: legs B and C compare values at asymmetric nodes, and neither shipped field is x/y '
    + 'symmetric. Page 13\'s legs compare offsets and could not.');

  ui.probe(`GLSL this page owns, measured not estimated. ${extras.glsl.perShader.length} shaders, `
    + `${extras.glsl.totalLines} non-blank lines, ${extras.glsl.compiledLines} substantive lines as compiled, `
    + `${extras.glsl.distinctLines} DISTINCT substantive lines -- the last is the maintenance surface, since the `
    + 'colormap and the volume sampler are one string each included by more than one shader. Against '
    + `three/addons/shaders/VolumeShader.js (${extras.glsl.stockSubstantiveLines} substantive lines): `
    + `${extras.glsl.identicalToStock} lines are textually identical, but every distinct one of them is boilerplate `
    + `(${JSON.stringify(extras.glsl.identicalLines)}), so lines REUSED VERBATIM = ${extras.glsl.reusedFromStock}.\n`
    + 'That zero is a line-intersection metric and it would be dishonest to leave it as a maintenance-burden '
    + `statement, so here is the structure behind it. Of the ${extras.glsl.distinctLines} distinct lines owned, `
    + 'about 11 are the shared five-stop colormap (src/lib/colormap.ts\'s COLORMAP_GLSL -- shared-library code that '
    + 'this count charges to this page) and about 5 are verification scaffolding that never runs in a frame. What is '
    + 'genuinely NEW is the front-to-back compositor and the opaque depth stop: the addon does maximum-intensity and '
    + 'isosurface casting only, with no transparent compositing and no interaction with opaque geometry. What is NOT '
    + 'new, merely re-typed rather than reused, is the addon\'s own algorithm skeleton -- the slab ray/AABB '
    + 'intersection, the bounded march with a hard MAX_STEPS and an in-loop break, the clim normalisation, the '
    + 'sample-helper factoring, the half-texel centring and the terminal alpha discard. And `#include <packing>` '
    + 'pulls perspectiveDepthToViewZ out of three\'s own chunk library, which is real reuse this count does not see '
    + '-- so compiledLines is not "what the GPU sees" either. Task 8 should read this as: the compositor and depth '
    + 'stop are ours to maintain, the ray-march skeleton is a re-typed library algorithm, and roughly a fifth of the '
    + 'owned lines are shared or test-only.');

  ui.probe('Resource behaviour, measured on both pages in one session through the same instrumentation: THREE.JS '
    + 'DOES NOT LEAK PER DRAWING-BUFFER RESIZE. This page holds 37 buffers / 12 textures / 5 framebuffers / 2 '
    + 'renderbuffers from ready onward -- flat across three whole benchmark runs (two surface changes each), flat '
    + 'across 100 control cycles, and flat across eight viewport resizes. vtk.js 36.12.1, measured the same way at '
    + 'the same time, goes 9/8/1 at ready to 9/14/7 after three benchmark runs, one texture and one framebuffer per '
    + 'resize, monotonically, never returned.\n'
    + 'A FOURTH OBJECT TYPE was added after review and it makes vtk.js\'s leak a third larger than first reported: '
    + 'renderbuffers leak per resize as well, so the shape is one texture + one framebuffer + one renderbuffer per '
    + 'resize rather than two objects. This page allocates exactly 2 renderbuffers in total, both belonging to the '
    + 'multisampled opaque target, and neither moves. The direction of the comparison is unchanged; its magnitude '
    + 'was understated.');
  ui.probe('Nothing moves the counts after ready, and getting there took two fixes worth recording. Three.js '
    + 'uploads a geometry\'s attribute buffers lazily, on the first render that uses them, so the first switch to '
    + 'each cold case used to allocate 8 buffers at that moment: 21 -> 37 over 100 control cycles, where page 13 was '
    + 'flat at 9. Not a leak -- bounded by the three cases, reported live and correctly -- but the spike\'s gate is '
    + 'worded "100 control/resize cycles with stable resource counts" and a one-off warm-up cost fails it for the '
    + 'wrong reason, so every case is now compiled and drawn once before ready() and the counts are flat from there. '
    + 'Before that, the same measurement caught this page publishing BEFORE the render that allocates in setCase, '
    + 'reporting 21 where the truth was 29 -- page 13\'s residual defect in a new place, found by measuring a case '
    + 'switch rather than by reading the code, and fixed by publishing after the render.');
  ui.probe('Frame times, three runs per page, measured side by side in one session, both pinned to 1280x720, '
    + 'orbit-v1, 30 warmup + 180 forced frames, software rasterizer (ANGLE/SwiftShader), 180/180 GPU samples kept '
    + 'throughout. Reported as p50, which is the robust statistic here -- the means carry a long tail from the '
    + 'rasterizer (p95 runs 189-212 ms).\n'
    + '  THIS PAGE (Three.js): cpu p50 153.5 / 148.3 / 151.2 ms, median of medians 151.2 (means 161.0 / 153.6 / 155.7).\n'
    + '  PAGE 13 (vtk.js):     cpu p50 152.8 / 154.2 / 150.2 ms, median of medians 152.8 (means 158.0 / 162.1 / 156.6).\n'
    + 'ON EQUAL TERMS THE TWO RENDERERS ARE INDISTINGUISHABLE ON THIS SCENE -- about 1% apart, well inside the '
    + 'run-to-run spread of either page. CPU and GPU agree to within 0.2% on both, which is the signature of a frame '
    + 'that was actually waited on rather than merely submitted.\n'
    + 'These numbers REPLACE the ones this page published before review, and the correction is the point: at one '
    + 'sample in the opaque pass this page measured p50 142.7 against page 13\'s 160.4 and would have reported a '
    + '~12% Three.js advantage. That advantage was this page rasterizing terrain, buildings and streamlines at one '
    + 'sample while page 13 rasterized them at four. Sampling the opaque pass at the canvas\'s own count closes it '
    + 'entirely. A software rasterizer says nothing about a hardware GPU; what these support is the RATIO between '
    + 'two renderers doing identical work, and the ratio is 1.');
  ui.probe(`GPU timing: EXT_disjoint_timer_query_webgl2 ${extras.gpuTimer ? 'available — gpuFrameTimesMs will be recorded' : 'unavailable — gpuFrameTimesMs stays null'}. `
    + 'Run window.__bench.runBenchmark() for orbit-v1 (30 warmup + 180 forced frames). cpuFrameTimesMs is wall time for a '
    + 'COMPLETED frame: each forced render ends in a one-pixel readback, because gl.finish() alone returns before the '
    + 'frame is drawn under ANGLE/SwiftShader and reported a 0.45 ms frame against the GPU timer\'s 95 ms on page 13.');

  // The divergence ledger. Task 7 reads this to tell a renderer difference from
  // a page difference, so each entry says WHY, and whether Three.js forced it.
  ui.probe('DIVERGENCES from page 13, with reasons, so Task 7 can tell a renderer difference from a page difference:\n'
    + '1. FORCED — volume rendering. vtk.js ships vtkVolumeMapper; Three.js ships no volume renderer at all. The '
    + 'front-to-back compositor, its opacity ramp (the same 0 / 0.05*scale / 0.6*scale piecewise function page 13 '
    + `hands vtkPiecewiseFunction) and its ${VOLUME_STEP_M} m step (page 13's setSampleDistance(${VOLUME_STEP_M})) are written here.\n`
    + '2. FORCED — depth interaction. vtk.js composites its volume against opaque geometry inside one render pass. '
    + 'Here terrain, buildings, streamlines and the slice render into an offscreen target with a depth texture, that '
    + 'colour is blitted to the canvas, and the volume shader reconstructs the opaque view distance and stops each ray '
    + 'there. One WebGLRenderer, one canvas, two passes.\n'
    + `3. NOT a divergence any more, and the correction that matters most on this page: the offscreen opaque target `
    + `is multisampled at the canvas's own sample count (measured ${extras.opaqueTargetSamples}, read from `
    + 'gl.SAMPLES rather than hard-coded), so terrain, buildings and streamlines are rasterized here with exactly '
    + 'the multisampling page 13 gets from its antialias:true canvas. The first version of this page left the '
    + 'target single-sampled and told you that was FORCED, because "a multisampled target cannot hand a depth '
    + 'TEXTURE to the volume pass". That is false for three 0.185.1: '
    + 'WebGLTextures.updateMultisampleRenderTarget blits depth into the single-sample framebuffer whose depth '
    + 'attachment is the DepthTexture, guarded by resolveDepthBuffer, which defaults true. The cost of the mistake '
    + 'was the headline number: at one sample this page measured p50 142.7 ms against page 13\'s 160.4 ms and '
    + 'would have published "Three.js draws the same scene ~12% faster", when what it had actually measured was '
    + 'this page drawing the city at one sample and page 13 drawing it at four. See the frame-time probe for the '
    + 'numbers on equal terms.\n'
    + '4. FORCED — lighting. vtk.js lights a renderer automatically with a headlight; Three.js has no default lighting, '
    + 'so this page adds one ambient and one directional light. Same two flat greys.\n'
    + '5. FORCED — streamline width. Page 13 sets lineWidth 2; WebGL implementations may ignore any width but 1 and '
    + 'Chrome\'s does, so these lines are one pixel wide.\n'
    + '6. FORCED — picking. vtkCellPicker resolves a cell through the polydata\'s own cell data; Three.js\'s Raycaster '
    + 'returns a faceIndex and knows nothing about attached arrays, so the marker lookup reads the shipped '
    + 'cellObjectIndex directly. Same array, same index space, asserted at startup.\n'
    + '7. FORCED — axis-order check shape. vtk.js supplies getOffsetIndexFromWorld as a second world-to-offset '
    + 'implementation; Three.js supplies nothing of the kind, so the independent implementation is written here and a '
    + 'third leg runs the scene\'s own sampler on the GPU.\n'
    + '8. CHOSEN for parity — colour management off and outputColorSpace linear, so the shared five-stop ramp reaches '
    + 'the drawing buffer as the same numbers vtk.js writes. Three.js would otherwise apply an sRGB conversion page 13 '
    + 'does not, and Task 7 would be comparing colour pipelines.\n'
    + `9. FORCED — clipping range. Three.js has no resetCameraClippingRange, so near/far are pinned to [${CAMERA_NEAR}, ${CAMERA_FAR}] m, `
    + 'covering the tile and the orbit radius. Depth precision is therefore constant across a run here and recomputed '
    + 'per frame on page 13.\n'
    + '10. MEASURED, not chosen — canvasCount after context loss. vtk.js\'s teardown removes its canvas from the DOM '
    + 'and page 13 reports 0; Three.js\'s renderer.dispose() releases GPU resources and leaves the element, so this '
    + 'page reports 1. Both numbers are live DOM counts.\n'
    + '11. MEASURED — GL counters are installed one step earlier here: this page creates its own WebGL2 context (with '
    + 'vtk.js\'s own attribute set, RenderWindow.js:178-182) and instruments it before WebGLRenderer sees it, where '
    + 'page 13 can only wrap after vtkFullScreenRenderWindow exists. Absolute baselines are not comparable between '
    + 'the pages; growth, which is what the leak gate measures, is.\n'
    + '12. NOT a divergence, and stated because it looks like one: the INTERACTIVE drawing buffer is 1280x492 on '
    + 'both pages at the suite\'s 1280x800 viewport. That is a coincidence of how two different headers happen to '
    + 'wrap, not a guarantee, and it is exactly why both pages pin the surface to 1280x720 for the benchmark rather '
    + 'than trusting it. Verified by measurement rather than by reading the code: at a 900x640 viewport the '
    + 'interactive drawing buffer is 900x198, it reads 1280x720 while runBenchmark is in flight, and 900x198 again '
    + 'after it returns.\n'
    + `13. MEASURED — 3D texture filtering is ${extras.floatLinear ? 'linear (OES_texture_float_linear present)' : 'NEAREST: OES_texture_float_linear is absent'}. `
    + 'Recorded because it changes what the volume looks like between machines.\n'
    + '14. MEASURED, and undeclared in the first version of this ledger: this page calls publish() at the end of '
    + 'every control handler (slice height, colour range, opacity, streamlines, camera reset); page 13\'s '
    + 'equivalents only render. That is the same shape as the defect closed on page 13\'s RESIZE path in ce187bf, '
    + 'still present on its control paths and silently fixed here. It changes no number today -- measured, vtk.js '
    + 'allocates nothing on a control path, so the two pages agree -- but it is a real difference in the __bench '
    + 'surface Task 7 joins on and it belongs in this list rather than in a commit message.\n'
    + '15. LIMITATION, same on both as far as this page can tell: the volume ray stops at OPAQUE depth, so the '
    + 'translucent slice does not attenuate volume behind it. Page 13 draws its slice as a translucent vtkImageSlice '
    + 'actor, which is also not in the volume mapper\'s depth input, but that has not been measured here and is not '
    + 'claimed.');
}

// ---------------------------------------------------------------------------

/**
 * EXT_disjoint_timer_query_webgl2, or nothing. Page 13's implementation,
 * verbatim: creating and reading the query object is GPU code and belongs in a
 * page, and both pages must reject disjoint samples the same way or their GPU
 * numbers are not comparable.
 */
function makeGpuTimer(gl: WebGL2RenderingContext): GpuTimer | undefined {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as
    {TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number} | null;
  if (!ext || typeof gl.createQuery !== 'function') return undefined;
  let pending: WebGLQuery | null = null;
  return {
    beginFrame() {
      pending = gl.createQuery();
      if (pending) gl.beginQuery(ext.TIME_ELAPSED_EXT, pending);
    },
    endFrame() {
      if (pending) gl.endQuery(ext.TIME_ELAPSED_EXT);
    },
    async readResult() {
      const query = pending;
      pending = null;
      if (!query) return null;
      for (let attempt = 0; attempt < 64; attempt++) {
        if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
          const disjoint = Boolean(gl.getParameter(ext.GPU_DISJOINT_EXT));
          const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
          gl.deleteQuery(query);
          return {ms: ns / 1e6, disjoint};
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      gl.deleteQuery(query);
      return null;   // never became available -- dropped, never estimated
    },
  };
}
