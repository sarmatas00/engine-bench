/**
 * The animation axis on flagship: the Delft city plus a pressure field that
 * changes every frame.
 *
 * WHAT THIS AXIS IS. Pages 17/18 upload one volume and draw it 210 times. A
 * Twin playing back a simulation does something else: it replaces the volume
 * while it draws. Pages 19/20 measure that, on 25 frames of the time series
 * Anders generated for it (dtcc-core scripts/generate_fields.py), in three
 * modes that are the three ways an app could do it (SwapMode below).
 *
 * THE FIELD IS SYNTHETIC AND IGNORES THE CITY. Its own manifest: "Analytic
 * visualization fixtures; not a fluid simulation". The pressure fills the whole
 * box, buildings included. It is a time series of realistic size, nothing more.
 *
 * NOT COMPARABLE TO PAGES 13-18. Different volume (129x129x37 nodes, 0.6M
 * against page 17's 8.7M), no arrows or streamlines. The only comparison
 * supported is page 19 against page 20, mode for mode.
 */

import {assetUrl} from './dataset';
import type {VerifiedFile} from './scientific-data';
import type {GeometryProbe} from './flagship-geometry';

export type FieldSeriesJson = {
  field: string;
  unit: string;
  /** Vertex counts per axis: values sit on the grid's nodes. */
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  order: 'x-fastest';
  association: 'vertex';
  /** Over every shipped frame, so a colour means one pressure all loop long. */
  range: [number, number];
  periodSeconds: number;
  frameStride: number;
  frames: {file: string; snapshot: number; timeSeconds: number}[];
  seamCheck: {snapshot: number; maxDifferenceOfPeakFromSnapshot0: number};
  orderCheck: {maxErrorOfPeak: number; maxErrorOfPeakIfXYSwapped: number | null; atSeconds: number};
  synthetic: boolean;
  source: {file: string; sha256: string; generator: string; generatorCommit: string};
};

export type VelocitySeriesJson = {
  /** Every strideVertices-th vertex of the pressure grid, per axis. */
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  order: 'x-fastest';
  components: 3;
  strideVertices: number;
  frames: {file: string; snapshot: number; timeSeconds: number}[];
  /** Streamline seeds in the local frame, the same for every frame. */
  seeds: [number, number, number][];
  maxSpeed: number;
  orderCheck: {maxErrorOfPeak: number; maxErrorOfPeakIfXYSwapped: number; atSeconds: number};
};

export type FieldSeries = {
  meta: FieldSeriesJson;
  /** One x-fastest float32 volume per shipped frame, in meta.frames order. */
  frames: Float32Array[];
  /**
   * Velocity for streamlines, one grid per pressure frame, three components
   * per node. Only the shipped series has it; the local size-test series do not.
   */
  velocity: {meta: VelocitySeriesJson; frames: Float32Array[]} | null;
};

/**
 * Streamlines on the animated field.
 *  - off: none drawn.
 *  - precomputed: every frame traced once at load, the lines swapped with the
 *    volume. What shipping results to a Twin would look like.
 *  - live: traced again every time the data frame changes, inside the drawn
 *    frame. The stress test Anders asked for: the tracer's speed shows up as
 *    frame time.
 */
export type StreamlineMode = 'off' | 'precomputed' | 'live';
export const STREAMLINE_MODES: StreamlineMode[] = ['off', 'precomputed', 'live'];

/**
 * Isosurface of pressure, same three modes as streamlines: off, every frame
 * extracted once at load (precomputed), or extracted again on every data change
 * (live). vtk.js's vtkImageMarchingCubes on page 19, its port (marching-cubes.ts)
 * on page 20, normals from the field's gradient, points not merged (vtk.js's
 * default). The level cuts the low-pressure vortex cores.
 */
export type IsoMode = StreamlineMode;
export const ISO_MODES: IsoMode[] = ['off', 'precomputed', 'live'];
export const ISO_LEVEL_PA = -100;
/** Linear RGB, the same on both pages. */
export const ISO_COLOUR: [number, number, number] = [0.95, 0.62, 0.25];

/**
 * A vertical slice through the pressure field, across x (west to east), coloured
 * with the volume's colour map at full opacity. 'fixed' sits at the box centre;
 * 'sweep' crosses the whole box once per benchmark run, one position per drawn
 * frame, and during playback once every SLICE_SWEEP_SECONDS. It always shows the
 * current data frame.
 */
export type SliceMode = 'off' | 'fixed' | 'sweep';
export const SLICE_MODES: SliceMode[] = ['off', 'fixed', 'sweep'];
export const SLICE_SWEEP_SECONDS = 8;

/** Slice x for a sweep fraction t in [0, 1): ping-pong across the node box. */
export function sliceX(box: {min: readonly number[]; max: readonly number[]}, mode: SliceMode, t: number): number {
  const mid = (box.min[0] + box.max[0]) / 2;
  if (mode !== 'sweep') return mid;
  const u = 1 - Math.abs(2 * (t - Math.floor(t)) - 1);   // 0 -> 1 -> 0
  // Inset half a percent so the plane is never exactly on the box face.
  const lo = box.min[0] + 0.005 * (box.max[0] - box.min[0]);
  const hi = box.max[0] - 0.005 * (box.max[0] - box.min[0]);
  return lo + u * (hi - lo);
}

export type ExtractStats = {mode: StreamlineMode; runs: number; msP50: number | null; msMax: number | null};

/**
 * How the volume changes between drawn frames.
 *
 *  - static: no change, frame 0 drawn every time. The baseline, the same work
 *    as pages 17/18 on this smaller volume.
 *  - stream: ONE volume texture, overwritten in place before every drawn frame
 *    (texSubImage3D on both: vtk.js through setUpdatedExtents, Three.js
 *    through needsUpdate on an allocated Data3DTexture). What playback costs
 *    when the frames do not all fit on the GPU.
 *  - preloaded: one texture per frame, all uploaded at the switch, and a draw
 *    picks one. Nothing crosses to the GPU while playing; GPU memory grows with
 *    the frame count instead.
 */
export type SwapMode = 'static' | 'stream' | 'preloaded';
export const SWAP_MODES: SwapMode[] = ['static', 'stream', 'preloaded'];

/**
 * Live playback rate, in data frames per second. The series spans one 10 s
 * period in 25 frames, so true time would be 2.5 frames a second, too slow to
 * read as motion. The benchmark ignores this and advances one data frame per
 * drawn frame, the worst case for a swap.
 */
export const PLAYBACK_FPS = 10;

/**
 * Volume resolution: the ray march runs on a target this many times smaller
 * PER AXIS than the canvas, then is scaled up over the full-resolution city.
 * Ray-march cost is per pixel, so 1/2 is a quarter of the work.
 *
 * MEASURED (M4, 3024x1559 Retina window, orbiting): full 19-24 FPS on both
 * renderers, 1/2 44-51 FPS, 1/4 59-60 FPS. So the default is 'auto': half the
 * window's CSS resolution, which is 1/2 of the canvas at pixel ratio 1 and 1/4
 * on a Retina screen. The benchmark always draws at full, so its numbers stay
 * comparable with pages 17/18.
 */
export const VOLUME_SCALES = [1, 2, 4] as const;
export type VolumeScale = (typeof VOLUME_SCALES)[number];
export type VolumeScaleChoice = 'auto' | 'full' | '1/2' | '1/4';
export const VOLUME_SCALE_CHOICES: VolumeScaleChoice[] = ['auto', 'full', '1/2', '1/4'];
export const DEFAULT_VOLUME_SCALE_CHOICE: VolumeScaleChoice = 'auto';
export const VOLUME_SCALE_LABELS: Record<VolumeScale, string> = {1: 'full', 2: '1/2', 4: '1/4'};

/** The scale a choice means on a screen with this pixel ratio. */
export function resolveVolumeScale(choice: string, pixelRatio: number): VolumeScale {
  if (choice === 'full') return 1;
  if (choice === '1/2') return 2;
  if (choice === '1/4') return 4;
  // auto: half the CSS resolution, i.e. 2 x pixel ratio, snapped to a scale we offer.
  return pixelRatio >= 1.5 ? 4 : 2;
}

/** The data frame a benchmark draw shows: one step per drawn frame, looping. */
export function benchmarkFrame(drawIndex: number, frameCount: number, mode: SwapMode): number {
  return mode === 'static' ? 0 : drawIndex % frameCount;
}

export type AnimationProbe = Omit<GeometryProbe, 'axis' | 'volumeField' | 'selectedObject' | 'pickCheck'> & {
  axis: 'animation';
  volumeField: {
    field: string; dims: [number, number, number]; nodes: number; range: [number, number];
    stepMetres: number; maxSamples: number; opacityScale: number; opacityCorrection: string;
  };
  animation: {
    series: SeriesName;
    mode: SwapMode;
    frames: number;
    bytesPerFrame: number;
    /** Volume textures the page holds on the GPU right now (1, or 1 + frames once preloaded). */
    volumeTextures: number;
    /** Counted at the GL call, not inferred from the mode: see countVolumeUploads. */
    uploads: VolumeUploadCounts;
    /** The last benchmark run's share of `uploads`, warm-up frames included. */
    benchmarkUploads?: VolumeUploadCounts & {drawnFrames: number; mode: SwapMode};
    /** Isosurface as drawn now; runs/ms cover extractions since the last benchmark started. */
    iso: ExtractStats & {level: number; triangles: number};
    slice: {mode: SliceMode; x: number};
    volumeVisible: boolean;
    /** Streamlines as drawn now; traceMs are the last run's per-trace times. */
    streamlines: {mode: StreamlineMode; seeds: number; lines: number; points: number;
                  traces: number; traceMsP50: number | null; traceMsMax: number | null};
    /** The last playback test (runPlayback), without its raw gaps. */
    playback?: ReturnType<typeof summarisePlayback> & {
      refreshMs: number; mode: SwapMode; displayedFrames: number; dataSwaps: number; orbit: boolean;
      volumeScale: VolumeScale;
      /** Drawing-buffer size the test ran at, so a result is never read without it. */
      surface: [number, number];
      uploads: VolumeUploadCounts;
    };
  };
};

/**
 * Which series to load. The shipped one is the default; 'large' and 'xl' are
 * the size test's local-only series (scripts/fields/generate_large.py), picked
 * with ?fields=large|xl. A fixed list, so the query never becomes a path.
 */
export const SERIES = {shipped: 'data/fields', large: 'data/fields-large', xl: 'data/fields-xl'} as const;
export type SeriesName = keyof typeof SERIES;

export function seriesFromQuery(search: string): SeriesName {
  const name = new URLSearchParams(search).get('fields');
  return name === 'large' || name === 'xl' ? name : 'shipped';
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verified(bytes: Uint8Array, expected: VerifiedFile | undefined, what: string): Promise<void> {
  if (!expected) throw new Error(`fields manifest: no record for ${what}`);
  if (bytes.byteLength !== expected.byteLength) {
    throw new Error(`${what}: manifest says ${expected.byteLength} bytes, got ${bytes.byteLength}`);
  }
  const got = await sha256Hex(bytes);
  if (got !== expected.sha256) throw new Error(`${what}: sha256 ${got} != ${expected.sha256}`);
}

/** Checks a series description before any typed-array view exists over its frames. */
export function checkSeriesJson(meta: FieldSeriesJson, frameByteLengths: number[]): void {
  if (meta.order !== 'x-fastest') throw new Error(`fields order ${meta.order}, expected x-fastest`);
  if (meta.association !== 'vertex') throw new Error(`fields association ${meta.association}, expected vertex`);
  if (!(meta.range[1] > meta.range[0])) throw new Error(`fields range ${meta.range} is empty`);
  if (!meta.frames.length) throw new Error('fields: no frames');
  const bytes = meta.dims[0] * meta.dims[1] * meta.dims[2] * 4;
  frameByteLengths.forEach((n, i) => {
    if (n !== bytes) throw new Error(`fields frame ${i}: ${meta.dims.join('x')} float32 needs ${bytes} bytes, file has ${n}`);
  });
}

/** Fetch and verify every frame. Same rule as loadFlagshipVolume: no byte is read unchecked. */
export async function loadFieldSeries(name: SeriesName = 'shipped'): Promise<FieldSeries> {
  const DATA = SERIES[name];
  const manifest = JSON.parse(new TextDecoder().decode(await fetchBytes(assetUrl(`${DATA}/manifest.json`)))) as {
    axis: string; grid: string; files: Record<string, VerifiedFile>;
  };
  if (manifest.axis !== 'animation') throw new Error(`fields manifest: axis ${manifest.axis}`);
  const jsonBytes = await fetchBytes(assetUrl(`${DATA}/${manifest.grid}`));
  await verified(jsonBytes, manifest.files[manifest.grid], `fields ${manifest.grid}`);
  const meta = JSON.parse(new TextDecoder().decode(jsonBytes)) as FieldSeriesJson;
  const bins = await Promise.all(meta.frames.map(async ({file}) => {
    const bytes = await fetchBytes(assetUrl(`${DATA}/${file}`));
    await verified(bytes, manifest.files[file], `fields ${file}`);
    return bytes;
  }));
  checkSeriesJson(meta, bins.map(b => b.byteLength));
  const asFloats = (b: Uint8Array) => new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  let velocity: FieldSeries['velocity'] = null;
  const velName = (manifest as {velocity?: string}).velocity;
  if (velName) {
    const velBytes = await fetchBytes(assetUrl(`${DATA}/${velName}`));
    await verified(velBytes, manifest.files[velName], `fields ${velName}`);
    const velMeta = JSON.parse(new TextDecoder().decode(velBytes)) as VelocitySeriesJson;
    const need = velMeta.dims[0] * velMeta.dims[1] * velMeta.dims[2] * 3 * 4;
    if (velMeta.order !== 'x-fastest' || velMeta.frames.length !== meta.frames.length) {
      throw new Error(`velocity: order ${velMeta.order}, ${velMeta.frames.length} frames for ${meta.frames.length} pressure frames`);
    }
    const velBins = await Promise.all(velMeta.frames.map(async ({file}) => {
      const bytes = await fetchBytes(assetUrl(`${DATA}/${file}`));
      await verified(bytes, manifest.files[file], `fields ${file}`);
      if (bytes.byteLength !== need) throw new Error(`velocity ${file}: needs ${need} bytes, has ${bytes.byteLength}`);
      return bytes;
    }));
    velocity = {meta: velMeta, frames: velBins.map(asFloats)};
  }
  return {meta, frames: bins.map(asFloats), velocity};
}

/** The volume's node box in the local frame: first to last vertex. */
export function seriesBox(meta: Pick<FieldSeriesJson, 'dims' | 'origin' | 'spacing'>): {
  min: [number, number, number]; max: [number, number, number];
} {
  const max = meta.origin.map((o, a) => o + meta.spacing[a] * (meta.dims[a] - 1)) as [number, number, number];
  return {min: [...meta.origin] as [number, number, number], max};
}

export type VolumeUploadCounts = {
  /** texImage3D / texSubImage3D calls, i.e. volume data sent to the GPU. */
  calls: number;
  bytes: number;
  /** texStorage3D / texImage3D calls: a 3D texture (re)allocated. */
  allocations: number;
};

/**
 * Counts 3D texture traffic at the GL call. A swap mode is only what it claims
 * if the counts say so: stream must send exactly one frame per drawn frame and
 * allocate nothing; preloaded must send nothing at all while playing.
 */
export function countVolumeUploads(gl: WebGL2RenderingContext): VolumeUploadCounts {
  const counts: VolumeUploadCounts = {calls: 0, bytes: 0, allocations: 0};
  const target = gl as unknown as Record<string, (...args: unknown[]) => unknown>;
  const bytesOf = (data: unknown) => (ArrayBuffer.isView(data) ? data.byteLength : 0);
  const storage = target.texStorage3D.bind(gl);
  target.texStorage3D = (...args) => { counts.allocations++; return storage(...args); };
  const image = target.texImage3D.bind(gl);
  // texImage3D(target, level, internalformat, w, h, d, border, format, type, pixels)
  target.texImage3D = (...args) => {
    counts.allocations++;
    if (args[9]) { counts.calls++; counts.bytes += bytesOf(args[9]); }
    return image(...args);
  };
  const sub = target.texSubImage3D.bind(gl);
  // texSubImage3D(target, level, x, y, z, w, h, d, format, type, pixels)
  target.texSubImage3D = (...args) => { counts.calls++; counts.bytes += bytesOf(args[10]); return sub(...args); };
  return counts;
}

/**
 * Playback smoothness, which the benchmark cannot see.
 *
 * The benchmark draws on demand, one frame after another, and reports how long
 * each draw took. A user watching playback sees something else: the display
 * refreshing on requestAnimationFrame, the data frame changing on its own clock
 * (PLAYBACK_FPS), and every draw in between that is NOT a swap. A renderer can
 * have a good p95 draw time and still stutter if those in-between draws are
 * sometimes expensive. This drives exactly that loop and records the gap
 * between consecutive displayed frames.
 */
export type PlaybackOptions = {
  seconds: number;
  /** Move the camera every displayed frame, as a user dragging would. */
  orbit: boolean;
  frameCount: number;
  /** Swap to data frame k (the page's own showFrame). */
  showFrame: (k: number) => void;
  /** Draw one displayed frame; `turn` is 0..1 around the orbit when orbiting. */
  draw: (turn: number | null) => void;
  /** Injected for tests; requestAnimationFrame and performance.now otherwise. */
  raf?: (cb: (t: number) => void) => void;
};

export type PlaybackResult = {
  seconds: number; orbit: boolean;
  displayedFrames: number; dataSwaps: number;
  /** Gap between consecutive rAF callbacks that drew, ms. */
  gapsMs: number[];
};

export function runPlayback(opts: PlaybackOptions): Promise<PlaybackResult> {
  const raf = opts.raf ?? (cb => requestAnimationFrame(cb));
  return new Promise(resolve => {
    const gapsMs: number[] = [];
    let start = -1, last = -1, shownData = -1, swaps = 0, displayed = 0;
    const tick = (now: number) => {
      if (start < 0) { start = now; last = now; }
      const elapsed = (now - start) / 1000;
      if (elapsed >= opts.seconds) {
        resolve({seconds: opts.seconds, orbit: opts.orbit, displayedFrames: displayed, dataSwaps: swaps, gapsMs});
        return;
      }
      const k = Math.floor(elapsed * PLAYBACK_FPS) % opts.frameCount;
      if (k !== shownData) { opts.showFrame(k); shownData = k; swaps++; }
      opts.draw(opts.orbit ? (elapsed / opts.seconds) % 1 : null);
      if (displayed > 0) gapsMs.push(now - last);
      last = now;
      displayed++;
      raf(tick);
    };
    raf(tick);
  });
}

/** What a viewer feels: how often a frame was late, and how late the worst was. */
export function summarisePlayback(gapsMs: number[], refreshMs: number): {
  p50: number; p95: number; p99: number; worst: number;
  /** Gaps longer than 1.5 refresh intervals: at least one refresh was missed. */
  missed: number; missedPct: number;
} {
  const s = [...gapsMs].sort((a, b) => a - b);
  const at = (p: number) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0);
  const missed = gapsMs.filter(g => g > 1.5 * refreshMs).length;
  return {p50: at(0.5), p95: at(0.95), p99: at(0.99), worst: s.at(-1) ?? 0,
          missed, missedPct: gapsMs.length ? (100 * missed) / gapsMs.length : 0};
}

/** The display's refresh interval, from idle rAF callbacks: median of `samples` gaps. */
export function measureRefreshMs(samples = 30): Promise<number> {
  return new Promise(resolve => {
    const t: number[] = [];
    const tick = (now: number) => {
      t.push(now);
      if (t.length <= samples) { requestAnimationFrame(tick); return; }
      const gaps = t.slice(1).map((v, i) => v - t[i]).sort((a, b) => a - b);
      resolve(gaps[Math.floor(gaps.length / 2)]);
    };
    requestAnimationFrame(tick);
  });
}
