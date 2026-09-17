/**
 * The shared measurement seam both renderer pages (vtk.js, Three.js) consume
 * and both are asserted against: numeric grid probing, the building-identity
 * readout, fixed-point alignment, a deterministic forced-frame benchmark, and
 * WebGL context-loss handling.
 *
 * Renderer-free by contract, same as src/lib/scientific-data.ts -- no three,
 * no vtk.js, ever. Camera, picking, transfer functions and GPU resource
 * creation stay in the page modules; this file only defines the numbers and
 * the orchestration both pages must agree on, plus the pure logic behind
 * each. A page hands this module callbacks (render one frame, dispose GPU
 * resources, read one GPU timer result) rather than this module reaching
 * into a renderer's own objects.
 */

import type {BuildingObjectEntry, ScientificGrid} from './scientific-data';

// ---------------------------------------------------------------------------
// The probe contract. Both pages assert against this shape -- getting it
// wrong costs both tasks, so it is defined once, here, verbatim against the
// plan's Contract Amendments.

export type ScientificProbe = {
  renderer: 'vtkjs' | 'threejs';
  status: 'ready' | 'context-lost' | 'failed';
  canvasCount: number;
  field: true;
  provenance: {smoke: 'synthetic'; heat: 'simulation'};
  selectedObject?: {
    marker: number; sourceIndexes: number[]; dtccIds: string[];
    traceability: 'stable' | 'run-local' | 'none';
  };
  selectedValue?: {field: string; value: number; unit: string; world: [number, number, number]};
  benchmark?: {
    cpuFrameTimesMs: number[];
    gpuFrameTimesMs: number[] | null;
    cameraPath: 'orbit-v1';
    forcedFrames: 180;
  };
  resources: {
    buffers: number;
    textures: number;
    renderTargets: number;
    listeners: number;
    observers: number;
  };
  measurementValid: boolean;
};

export type SelectedObject = NonNullable<ScientificProbe['selectedObject']>;
export type ResourceSnapshot = ScientificProbe['resources'];
export type BenchmarkResult = NonNullable<ScientificProbe['benchmark']>;

// ---------------------------------------------------------------------------
// Grid indexing and sampling.
//
// A generic {dims, origin, spacing, data, components} view rather than
// ScientificGrid itself: the same indexing and interpolation apply equally
// to a scalar (speed, pressure) or vector (velocity) field, and to fixtures
// in tests that never touch the real artifact. `gridField` below adapts a
// decoded ScientificGrid into this shape by field name.

export type GridField = {
  dims: readonly [number, number, number];
  origin: readonly [number, number, number];
  spacing: readonly [number, number, number];
  data: Float32Array;
  /** Values per node, stored contiguously per node (AoS): node n's
   *  components live at data[n*components .. n*components+components). */
  components: number;
};

/**
 * Adapts one named field of a decoded ScientificGrid (src/lib/scientific-data.ts,
 * Task 3) into the generic GridField shape -- so both pages read the same
 * dims/origin/spacing/component-count for a given field name instead of each
 * hand-rolling (and risking disagreeing on) the adapter.
 */
export function gridField(grid: ScientificGrid, field: 'speed' | 'pressure' | 'velocity'): GridField {
  return {
    dims: grid.dims, origin: grid.origin, spacing: grid.spacing,
    data: grid[field], components: field === 'velocity' ? 3 : 1,
  };
}

/**
 * Flat node index for an x-fastest grid: x + nx * (y + ny * z).
 *
 * Contract (task-4-brief.md): the shipped scientific.bin arrays are already
 * x-fastest -- Task 2 measured Core's raw VolumeMesh order as z-fastest/
 * x-slowest (the opposite) and generate.py reorders it at generation time.
 * Consume the shipped order here; do not re-derive or transpose it.
 */
export function gridNodeIndex(dims: readonly [number, number, number], i: number, j: number, k: number): number {
  const [nx, ny, nz] = dims;
  if (!Number.isInteger(i) || !Number.isInteger(j) || !Number.isInteger(k)) {
    throw new Error(`gridNodeIndex: indices must be integers, got (${i}, ${j}, ${k})`);
  }
  if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) {
    throw new Error(`gridNodeIndex: (${i}, ${j}, ${k}) out of range for dims (${nx}, ${ny}, ${nz})`);
  }
  return i + nx * (j + ny * k);
}

/**
 * The raw, stored value(s) at grid node (i, j, k) -- bit-identical to the
 * source float32 array, per the Global Constraint on grid-node probes. No
 * interpolation, no rounding: this is a direct read through gridNodeIndex.
 */
export function probeGridNode(field: GridField, i: number, j: number, k: number): number[] {
  const node = gridNodeIndex(field.dims, i, j, k);
  const start = node * field.components;
  return Array.from(field.data.subarray(start, start + field.components));
}

/**
 * Trilinear sample of `field` at a world-space point. Boundary-clamped: a
 * point outside the grid samples the nearest face rather than extrapolating
 * or throwing (task-4-brief.md: "trilinear boundary clamping"). A degenerate
 * (length-1) axis contributes no interpolation on that axis.
 */
export function sampleGridTrilinear(field: GridField, world: readonly [number, number, number]): number[] {
  const frac: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const nMinus1 = field.dims[axis] - 1;
    if (nMinus1 <= 0) { frac[axis] = 0; continue; }
    const raw = (world[axis] - field.origin[axis]) / field.spacing[axis];
    frac[axis] = Math.min(Math.max(raw, 0), nMinus1);
  }
  const base: [number, number, number] = [Math.floor(frac[0]), Math.floor(frac[1]), Math.floor(frac[2])];
  const t: [number, number, number] = [frac[0] - base[0], frac[1] - base[1], frac[2] - base[2]];
  const hi: [number, number, number] = [
    Math.min(base[0] + 1, field.dims[0] - 1),
    Math.min(base[1] + 1, field.dims[1] - 1),
    Math.min(base[2] + 1, field.dims[2] - 1),
  ];

  const out = new Array(field.components).fill(0);
  for (const [xi, wx] of [[base[0], 1 - t[0]], [hi[0], t[0]]] as const) {
    if (wx === 0) continue;
    for (const [yi, wy] of [[base[1], 1 - t[1]], [hi[1], t[1]]] as const) {
      if (wy === 0) continue;
      for (const [zi, wz] of [[base[2], 1 - t[2]], [hi[2], t[2]]] as const) {
        const w = wx * wy * wz;
        if (w === 0) continue;
        const corner = probeGridNode(field, xi, yi, zi);
        for (let c = 0; c < field.components; c++) out[c] += corner[c] * w;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Identity lookup (Contract Amendments A1; task-4-brief.md contract facts).

/**
 * Look up a picked face marker (a conditioned mesher region, never a
 * building) in the decoded objects map, and derive a traceability verdict
 * from the tile's measured two-load identity-stability result.
 *
 * - Unattributed (`sourceIndexes.length === 0`, a split-added marker with no
 *   source building -- 103 of 206 on the shipped tile): traceability
 *   'none'. Stated as an explicit verdict, not an empty array left for the
 *   caller to interpret.
 * - Attributed, `identityStability === 'unstable_observed'` (the tile's
 *   measured verdict): traceability 'run-local' -- the dtccIds are real, but
 *   the source footprint tiles carry no `id`, so Core mints a fresh uuid4
 *   per load and the id is not a stable database key.
 * - Attributed, `identityStability === 'stable_observed_two_loads'`:
 *   traceability 'stable'. Not reachable on the shipped tile; exercised only
 *   by a synthetic fixture in tests/unit/scientific-probes.test.ts, so this
 *   branch is verified rather than merely unreachable dead code.
 *
 * Returns exactly what the map holds -- sourceIndexes/dtccIds copied into
 * fresh arrays the caller cannot use to mutate the shared objects map, never
 * a fallback to a neighbouring marker, never a fabricated id. Throws if
 * `marker` has no entry at all: scientific-data.ts's validateCellObjectIndex
 * already rules that out for any marker read from a decoded ScientificBundle,
 * so reaching it here means the caller passed a marker that never came from
 * that bundle.
 */
export function objectRefForCell(
  objects: ReadonlyMap<number, BuildingObjectEntry>,
  identityStability: 'stable_observed_two_loads' | 'unstable_observed',
  marker: number,
): SelectedObject {
  const entry = objects.get(marker);
  if (!entry) throw new Error(`objectRefForCell: no entry for marker ${marker} (objects has ${objects.size} entries)`);
  const attributed = entry.sourceIndexes.length > 0;
  const traceability: SelectedObject['traceability'] = !attributed
    ? 'none'
    : identityStability === 'unstable_observed' ? 'run-local' : 'stable';
  return {marker, sourceIndexes: [...entry.sourceIndexes], dtccIds: [...entry.dtccIds], traceability};
}

/**
 * Human copy for a traceability verdict -- always non-empty, and distinct
 * per verdict, so a page's readout (via chrome.ts's setReadout) states a
 * split-added marker's "no source building" plainly instead of going blank,
 * and shows a visible warning for a run-local id instead of it looking like
 * a stable database key.
 */
export function describeTraceability(traceability: SelectedObject['traceability']): string {
  switch (traceability) {
    case 'none': return 'no source building (added by the mesh splitter; not a conditioned region)';
    case 'run-local': return 'run-local id (regenerated per session -- not stable across reloads)';
    case 'stable': return 'stable DTCC object id';
  }
}

// ---------------------------------------------------------------------------
// Fixed-point alignment (Global Constraint: "Fixed alignment probes differ
// by no more than 5 cm after rebasing").

export const ALIGNMENT_TOLERANCE_M = 0.05;

/** Euclidean distance, in metres, between two fixed world points from the
 * two renderer scenes -- compare the result against ALIGNMENT_TOLERANCE_M. */
export function alignmentDistance(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ---------------------------------------------------------------------------
// Deterministic forced-frame benchmark: camera path orbit-v1.

export type CameraPose = {
  target: readonly [number, number, number];
  radius: number;
  elevationDeg: number;
  azimuthDeg: number;
};

/**
 * orbit-v1: the one camera path both pages must use for benchmark
 * measurement (Global Constraint: identical cameras). 30 warmup frames
 * (unrecorded) followed by 180 measured frames, tracing one orbit in azimuth
 * around a fixed target/radius/elevation -- spec.md: "a fixed 30-frame
 * warmup plus 180 forced-render orbit".
 */
export const ORBIT_V1 = {
  cameraPath: 'orbit-v1' as const,
  warmupFrames: 30,
  forcedFrames: 180 as const,
  target: [0, 0, 40] as [number, number, number],
  radius: 500,
  elevationDeg: 30,
};

/**
 * Deterministic camera pose for frame `frameIndex` of an orbit-v1 run
 * (0-indexed over the full warmup+measured span, so the camera is already
 * moving into the measured arc when recording starts rather than snapping
 * into place at frame 30). Pure: the same index always yields the same
 * pose, with no dependency on wall-clock time.
 */
export function orbitV1Pose(frameIndex: number): CameraPose {
  const total = ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames;
  const azimuthDeg = (360 * frameIndex) / total;
  return {target: ORBIT_V1.target, radius: ORBIT_V1.radius, elevationDeg: ORBIT_V1.elevationDeg, azimuthDeg};
}

export type GpuSample = {ms: number; disjoint: boolean};

/**
 * Renderer-supplied WebGL disjoint timer query, one instance per driver.
 * Creating and reading the actual EXT_disjoint_timer_query_webgl2 query
 * object is GPU/page code and stays there; this module only calls these
 * three methods in the right order per frame and decides what to keep.
 */
export type GpuTimer = {
  beginFrame(): void;
  endFrame(): void;
  /** Resolves once the most recently ended frame's result is available, or
   * null if it never becomes available (still pending, lost, ...). */
  readResult(): Promise<GpuSample | null>;
};

export type RenderFrame = (pose: CameraPose) => void | Promise<void>;

export type BenchmarkDriverOptions = {
  /** Forces one completed render of `pose`. Must not return until the frame
   * is actually rendered -- this is the only place a frame is produced;
   * nothing here schedules or waits on requestAnimationFrame, so an idle
   * rAF tick can never be counted as a rendered frame. */
  renderFrame: RenderFrame;
  gpuTimer?: GpuTimer;
  /** Injectable clock, for deterministic tests. Defaults to performance.now. */
  now?: () => number;
};

export type BenchmarkDriver = {
  /** Runs orbit-v1 start to finish: 30 unrecorded warmup frames, then 180
   * measured frames, each timed on the CPU wall clock via `now`. Rejects if
   * `stop()` is called while a run is in progress. */
  runBenchmark(): Promise<BenchmarkResult>;
  /** Aborts a run in progress. Safe to call at any time, including when
   * nothing is running -- this is what attachContextLoss calls on context
   * loss. */
  stop(): void;
};

export function createBenchmarkDriver(opts: BenchmarkDriverOptions): BenchmarkDriver {
  const now = opts.now ?? (() => performance.now());
  let stopped = false;

  async function runBenchmark(): Promise<BenchmarkResult> {
    stopped = false;
    const total = ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames;

    for (let f = 0; f < ORBIT_V1.warmupFrames; f++) {
      if (stopped) throw new Error('benchmark stopped during warmup');
      await opts.renderFrame(orbitV1Pose(f));
    }

    const cpuFrameTimesMs: number[] = [];
    const gpuFrameTimesMs: number[] = [];
    const gpuAvailable = !!opts.gpuTimer;

    for (let f = ORBIT_V1.warmupFrames; f < total; f++) {
      if (stopped) throw new Error('benchmark stopped during measurement');
      const pose = orbitV1Pose(f);
      opts.gpuTimer?.beginFrame();
      const t0 = now();
      await opts.renderFrame(pose);
      const t1 = now();
      opts.gpuTimer?.endFrame();
      cpuFrameTimesMs.push(t1 - t0);
      if (opts.gpuTimer) {
        const sample = await opts.gpuTimer.readResult();
        // A disjoint or not-yet-available sample is dropped, never
        // estimated or zero-filled -- spec.md: "reject disjoint samples".
        if (sample && !sample.disjoint) gpuFrameTimesMs.push(sample.ms);
      }
    }

    return {
      cpuFrameTimesMs,
      gpuFrameTimesMs: gpuAvailable ? gpuFrameTimesMs : null,
      cameraPath: ORBIT_V1.cameraPath,
      forcedFrames: ORBIT_V1.forcedFrames,
    };
  }

  return {runBenchmark, stop: () => { stopped = true; }};
}

// ---------------------------------------------------------------------------
// Resource snapshots (spec.md: "100 deterministic control/resize cycles with
// stable renderer-owned resource counts"). Every renderer supplies its own
// counts -- GPU counts from its own bookkeeping, listeners/observers from its
// own DOM wiring; this module never counts anything itself, it only compares.

const RESOURCE_KEYS = ['buffers', 'textures', 'renderTargets', 'listeners', 'observers'] as const;

export function resourcesEqual(a: ResourceSnapshot, b: ResourceSnapshot): boolean {
  return RESOURCE_KEYS.every(k => a[k] === b[k]);
}

/** Per-key delta (after - before) for every key that changed. Empty when the
 * two snapshots are equal. */
export function diffResources(before: ResourceSnapshot, after: ResourceSnapshot): Partial<Record<keyof ResourceSnapshot, number>> {
  const diff: Partial<Record<keyof ResourceSnapshot, number>> = {};
  for (const k of RESOURCE_KEYS) if (before[k] !== after[k]) diff[k] = after[k] - before[k];
  return diff;
}

// ---------------------------------------------------------------------------
// WebGL context loss.

/** Just enough of a canvas for attachContextLoss -- any real
 * HTMLCanvasElement satisfies this structurally, with no cast needed. */
type EventListenerHost = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export type ContextLossHandlers = {
  /** Mutated in place: status -> 'context-lost', measurementValid -> false.
   * A plain object (or the page's own window.__bench.probe) rather than a
   * setter, so the caller can read the result straight off the object it
   * passed in. */
  probe: {status: ScientificProbe['status']; measurementValid: boolean};
  /** Usually BenchmarkDriver.stop. attachContextLoss never reconstructs GPU
   * state itself -- it only guarantees measurement stops. */
  stopBenchmark: () => void;
  /** Renderer-specific: dispose buffers/textures/programs. Page-owned; this
   * module never touches a GPU object directly. */
  disposeGpuResources: () => void;
  /** Called last, once state has settled: show the visible failure and its
   * reload control. DOM/presentation stays with the page (so both renderers
   * can match chrome.ts's existing look) rather than this module inventing
   * a second one. */
  onLost: () => void;
};

/**
 * Wires a canvas's `webglcontextlost` event to the ordered response the spec
 * requires: prevent the browser's default (which would otherwise let the
 * driver drop the context permanently on some platforms), stop the
 * benchmark, mark the shared probe state lost and invalid, dispose the
 * renderer's own GPU resources, then let the page show the failure and its
 * reload control.
 *
 * Does not reconstruct GPU state: `webglcontextrestored` is not handled
 * here at all, on purpose.
 */
export function attachContextLoss(canvas: EventListenerHost, handlers: ContextLossHandlers): {detach: () => void} {
  const onContextLost = (event: Event) => {
    event.preventDefault();
    handlers.stopBenchmark();
    handlers.probe.status = 'context-lost';
    handlers.probe.measurementValid = false;
    handlers.disposeGpuResources();
    handlers.onLost();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);
  return {detach: () => canvas.removeEventListener('webglcontextlost', onContextLost)};
}
