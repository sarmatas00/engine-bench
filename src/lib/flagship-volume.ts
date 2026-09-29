/**
 * The volume axis on flagship: the Delft city plus a 250x250x139 speed field.
 *
 * WHAT THIS AXIS IS. Anders's grid-only flagship (8 x 8 x ~1 m cells over the
 * whole 2 km domain, no tetrahedra) carries the volume the geometry axis could
 * not: 8,687,500 cells and 139 vertical layers, against 64x64x32 = 131,072 on
 * pages 13 and 14. Pages 17 and 18 draw the SAME building mesh as pages 15 and
 * 16 (byte-identical, re-extracted from this file and hash-compared) with this
 * field ray-marched through it.
 *
 * THE FIELD IS SYNTHETIC. Real buildings, analytic wind: "Not a fluid solver;
 * no conservation or no-slip guarantee" (the source's own limitations list).
 * Nothing here is a flow result; it is a realistically sized volume.
 *
 * NOT COMPARABLE TO PAGES 13-16. Different volume, different scene. The only
 * comparison supported is page 17 against page 18.
 */

import {assetUrl} from './dataset';
import type {VerifiedFile} from './scientific-data';
import type {GeometryProbe} from './flagship-geometry';

export type FlagshipVolumeJson = {
  field: string;
  unit: string;
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  order: 'x-fastest';
  association: 'cell-centre';
  range: [number, number];
  maskedCells: number;
  maskedFill: number;
  orderCheck: Record<string, number>;
  synthetic: boolean;
  source: {file: string; sha256: string; object: string; dtccCore: {version: string; commit: string}};
};

export type FlagshipArrowsJson = {
  count: number;
  layout: string;
  layer: number;
  heightNapM: number;
  strideCells: number;
  spacingM: [number, number];
  skippedSolid: number;
  speedRange: [number, number];
};

export type FlagshipArrows = {
  meta: FlagshipArrowsJson;
  /** Arrow i's base is at positions[3i..3i+3], its wind vector at vectors[3i..3i+3]. */
  positions: Float32Array;
  vectors: Float32Array;
};

export type VelocityGridJson = {
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  order: 'x-fastest';
  components: 3;
  layersNapM: [number, number];
  zStrideLayers: number;
  solidCellsZeroed: number;
  seeds: [number, number, number][];
  seedSpacingM: number;
};

export type VelocityGrid = {
  meta: VelocityGridJson;
  /** Three components per node, x-fastest: node n's vector is data[3n..3n+3]. */
  data: Float32Array;
};

export type FlagshipVolume = {
  meta: FlagshipVolumeJson;
  /** x varies fastest, then y, then z: what vtkImageData and Data3DTexture both read. */
  data: Float32Array;
  arrows: FlagshipArrows;
  velocity: VelocityGrid;
};

/**
 * Streamline integration, vtkImageStreamline's own defaults: a 1 s step and at
 * most 1,000 steps per seed. Velocity is in m/s, so one step moves a point
 * 1-8 m on this field. Both pages take these from here.
 */
export const STREAMLINE_STEP_S = 1;
export const STREAMLINE_MAX_STEPS = 1000;
/** Linear RGB for the lines, the same triple on both pages. */
export const STREAMLINE_COLOUR: [number, number, number] = [0.45, 0.85, 1.0];

/**
 * Wind arrows: one layer at ~15 m NAP, one arrow per 40 m (extract_volume.py).
 *
 * The shape is vtkArrowSource's, with thicker shaft and tip so an arrow reads
 * at the orbit's 2 km distance (at vtk.js's 0.03/0.1 the shaft is under a
 * pixel). Page 18 builds the same shape from these numbers; page 17 hands them
 * to vtkArrowSource. Length is ARROW_METRES_PER_MS times the local wind speed,
 * so the fastest wind (7.9 m/s) draws ~36 m, just under the 40 m spacing.
 */
export const ARROW_SHAPE = {
  tipResolution: 6, tipRadius: 0.15, tipLength: 0.35,
  shaftResolution: 6, shaftRadius: 0.05,
} as const;
export const ARROW_METRES_PER_MS = 4.5;
/** Linear RGB, the same triple on both pages. */
export const ARROW_COLOUR: [number, number, number] = [0.95, 0.95, 0.95];

/**
 * The ray-marching step in metres, pages 13/14's value. Frame time is roughly
 * linear in it, so both pages take it from here rather than from a literal.
 */
export const VOLUME_STEP_M = 2;

/**
 * Hard cap on samples along one ray, set on BOTH renderers.
 *
 * The box diagonal is ~2,833 m, so a grazing ray needs up to ~1,417 steps of
 * 2 m. vtk.js defaults to 1,000 and would silently truncate those rays (it only
 * warns); page 14's shader caps at 512 for a 712 m tile. One number, above the
 * worst case, so neither page stops a ray the other would finish.
 */
export const VOLUME_MAX_SAMPLES = 1500;

/**
 * 0.01, not pages 13/14's 0.3, which was tuned for a 350 m tile.
 *
 * MEASURED on this field (median speed sits at 77% of the range): at 0.3 a
 * sample carries ~0.10 opacity, so a ray saturates after ~40 samples (80 m) and
 * stops. The volume then draws as an opaque orange lid that hides the whole
 * city, and the benchmark measures the first 80 m of every ray: flattering to
 * both renderers and nothing like a see-through view. At 0.01 a typical ray
 * through the 139 m layer ends 38-62% opaque, the city shows through, and rays
 * march their full length, which is the case worth timing.
 */
export const DEFAULT_OPACITY = 0.01;

/**
 * Opacity transfer function nodes over [lo, hi]: pages 13/14's shape verbatim
 * (0 at the bottom, 0.05 at the middle, 0.6 at the top, all times the control).
 *
 * Both pages read the nodes from here. The field's own minimum is also the
 * value written into solid cells, so buildings and ground come out empty.
 */
export function opacityNodes(lo: number, hi: number, scale: number): [number, number][] {
  return [[lo, 0], [lo + 0.5 * (hi - lo), 0.05 * scale], [hi, 0.6 * scale]];
}

/** The volume's node box in the local frame: first to last cell centre. */
export function volumeBox(meta: Pick<FlagshipVolumeJson, 'dims' | 'origin' | 'spacing'>): {
  min: [number, number, number]; max: [number, number, number];
} {
  const max = meta.origin.map((o, a) => o + meta.spacing[a] * (meta.dims[a] - 1)) as [number, number, number];
  return {min: [...meta.origin] as [number, number, number], max};
}

/** x-fastest linear index of cell (i, j, k). Pure, so the order is testable. */
export function cellIndex(dims: readonly [number, number, number], i: number, j: number, k: number): number {
  return i + dims[0] * (j + dims[1] * k);
}

export type VolumeProbe = Omit<GeometryProbe, 'axis' | 'volumeField' | 'selectedObject' | 'pickCheck'> & {
  axis: 'volume';
  volumeField: {
    field: string; dims: [number, number, number]; cells: number; range: [number, number];
    stepMetres: number; maxSamples: number; opacityScale: number;
    /** Per-sample opacity after each renderer's own correction, stated rather than
     *  assumed equal: see page 17's setScalarOpacityUnitDistance. */
    opacityCorrection: string;
  };
  /** Whether wind arrows are drawn. Frame times with and without are different
   *  workloads, so every benchmark result is read against this. */
  arrows: {visible: boolean; count: number};
  /** Same for streamlines, plus what tracing them cost at load. */
  streamlines: {visible: boolean; lines: number; points: number; traceMs: number};
};

const DATA = 'data/flagship/volume';

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verified(bytes: Uint8Array, expected: VerifiedFile, what: string): Promise<void> {
  if (bytes.byteLength !== expected.byteLength) {
    throw new Error(`${what}: manifest says ${expected.byteLength} bytes, got ${bytes.byteLength}`);
  }
  const got = await sha256Hex(bytes);
  if (got !== expected.sha256) throw new Error(`${what}: sha256 ${got} != ${expected.sha256}`);
}

/** Checks a grid description before any typed-array view exists over its bytes. */
export function checkVolumeJson(meta: FlagshipVolumeJson, byteLength: number): void {
  if (meta.order !== 'x-fastest') throw new Error(`volume order ${meta.order}, expected x-fastest`);
  const cells = meta.dims[0] * meta.dims[1] * meta.dims[2];
  if (cells * 4 !== byteLength) {
    throw new Error(`volume: ${meta.dims.join('x')} float32 needs ${cells * 4} bytes, file has ${byteLength}`);
  }
  if (!(meta.range[1] > meta.range[0])) throw new Error(`volume range ${meta.range} is empty`);
}

/**
 * Fetch and verify the volume. Same rule as loadFlagshipGeometry: every file is
 * checked against the manifest's byteLength+sha256 before it is read.
 */
export async function loadFlagshipVolume(): Promise<FlagshipVolume> {
  const manifest = JSON.parse(new TextDecoder().decode(await fetchBytes(assetUrl(`${DATA}/manifest.json`)))) as {
    axis: string; grid: string; arrows: string; velocity: string; files: Record<string, VerifiedFile>;
  };
  if (manifest.axis !== 'volume') throw new Error(`flagship volume manifest: axis ${manifest.axis}`);
  const need = (name: string): VerifiedFile => {
    const entry = manifest.files[name];
    if (!entry) throw new Error(`flagship volume manifest: no record for ${name}`);
    return entry;
  };
  const jsonBytes = await fetchBytes(assetUrl(`${DATA}/${manifest.grid}`));
  await verified(jsonBytes, need(manifest.grid), `flagship ${manifest.grid}`);
  const meta = JSON.parse(new TextDecoder().decode(jsonBytes)) as FlagshipVolumeJson;

  const binName = manifest.grid.replace(/\.json$/, '.f32');
  const bin = await fetchBytes(assetUrl(`${DATA}/${binName}`));
  await verified(bin, need(binName), `flagship ${binName}`);
  checkVolumeJson(meta, bin.byteLength);

  const arrowsJsonBytes = await fetchBytes(assetUrl(`${DATA}/${manifest.arrows}`));
  await verified(arrowsJsonBytes, need(manifest.arrows), `flagship ${manifest.arrows}`);
  const arrowsMeta = JSON.parse(new TextDecoder().decode(arrowsJsonBytes)) as FlagshipArrowsJson;
  const arrowsBinName = manifest.arrows.replace(/\.json$/, '.f32');
  const arrowsBin = await fetchBytes(assetUrl(`${DATA}/${arrowsBinName}`));
  await verified(arrowsBin, need(arrowsBinName), `flagship ${arrowsBinName}`);

  const velJsonBytes = await fetchBytes(assetUrl(`${DATA}/${manifest.velocity}`));
  await verified(velJsonBytes, need(manifest.velocity), `flagship ${manifest.velocity}`);
  const velMeta = JSON.parse(new TextDecoder().decode(velJsonBytes)) as VelocityGridJson;
  const velBinName = manifest.velocity.replace(/\.json$/, '.f32');
  const velBin = await fetchBytes(assetUrl(`${DATA}/${velBinName}`));
  await verified(velBin, need(velBinName), `flagship ${velBinName}`);
  const nodes = velMeta.dims[0] * velMeta.dims[1] * velMeta.dims[2];
  if (velMeta.order !== 'x-fastest' || velBin.byteLength !== nodes * 3 * 4) {
    throw new Error(`velocity: ${velMeta.dims.join('x')}x3 float32 needs ${nodes * 12} bytes, file has ${velBin.byteLength}`);
  }

  return {
    meta,
    data: new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4),
    arrows: splitArrowRows(arrowsMeta, new Float32Array(arrowsBin.buffer, arrowsBin.byteOffset, arrowsBin.byteLength / 4)),
    velocity: {meta: velMeta, data: new Float32Array(velBin.buffer, velBin.byteOffset, velBin.byteLength / 4)},
  };
}

export type TracedLines = {
  /** All points of all lines, xyz. */
  positions: Float32Array;
  /** Line i is points lineStarts[i] .. lineStarts[i+1]-1 (one extra entry at the end). */
  lineStarts: Uint32Array;
};

/**
 * Streamlines through a velocity grid: the Three.js side's own implementation,
 * because Three.js has none. Page 17 uses vtkImageStreamline instead.
 *
 * A line-for-line port of vtkImageStreamline (vtk.js 36.12.1,
 * Filters/General/ImageStreamline), INCLUDING its float32 scratch arrays, so
 * the two produce the same points and tests/unit can require it: midpoint
 * (RK2) steps of `step` seconds, trilinear velocity, a line ends when a sample
 * leaves the image bounds (the node box plus half a cell) or after `maxSteps`, and the seed itself is not a point
 * of its line. There is no stop at walls: a line that reaches a zero-velocity
 * solid cell stalls there, on both pages alike.
 */
export function traceStreamlines(
  grid: VelocityGrid, seeds: readonly (readonly number[])[], step: number, maxSteps: number,
): TracedLines {
  const [nx, ny, nz] = grid.meta.dims;
  const origin = grid.meta.origin;
  const spacing = grid.meta.spacing;
  const ext = [nx - 1, ny - 1, nz - 1];
  // vtkImageData.getBounds() in 36.12.1 is the node box widened by HALF A
  // SPACING on every side, and the tracer's in-bounds test uses it: a point up
  // to half a cell past the last node is clamped to the edge, not dropped.
  // Stopping at the node box instead ended 1 of 4 test lines 20 points early.
  const lower = [0, 1, 2].map(a => origin[a] - spacing[a] / 2);
  const upper = [0, 1, 2].map(a => origin[a] + spacing[a] * ext[a] + spacing[a] / 2);
  const data = grid.data;
  const ijk = new Int32Array(3);
  const pc = new Float32Array(3);
  const w = new Float32Array(8);
  const ids = new Uint32Array(8);
  const velAt = new Float32Array(3);
  const xtmp = new Float32Array(3);
  const xyz = new Float32Array(3);

  // computeStructuredCoordinates, for an extent starting at 0 on every axis.
  const locate = (x: Float32Array): boolean => {
    for (let i = 0; i < 3; i++) {
      const loc = (x[i] - origin[i]) / spacing[i];
      ijk[i] = Math.floor(loc);
      pc[i] = loc - ijk[i];
      if (ijk[i] < 0) {
        if (x[i] >= lower[i]) { pc[i] = 0; ijk[i] = 0; } else return false;
      } else if (ijk[i] >= ext[i]) {
        if (x[i] <= upper[i]) { pc[i] = 1; ijk[i] = ext[i] - 1; } else return false;
      }
    }
    return true;
  };
  const vectorAt = (x: Float32Array, out: Float32Array): boolean => {
    if (!locate(x)) return false;
    const r = pc[0], s = pc[1], t = pc[2];
    const rm = 1 - r, sm = 1 - s, tm = 1 - t;
    w[0] = rm * sm * tm; w[1] = r * sm * tm; w[2] = rm * s * tm; w[3] = r * s * tm;
    w[4] = rm * sm * t; w[5] = r * sm * t; w[6] = rm * s * t; w[7] = r * s * t;
    ids[0] = ijk[2] * nx * ny + ijk[1] * nx + ijk[0];
    ids[1] = ids[0] + 1; ids[2] = ids[0] + nx; ids[3] = ids[2] + 1;
    ids[4] = ids[0] + nx * ny; ids[5] = ids[4] + 1; ids[6] = ids[4] + nx; ids[7] = ids[6] + 1;
    out[0] = 0; out[1] = 0; out[2] = 0;
    for (let n = 0; n < 8; n++) {
      for (let j = 0; j < 3; j++) out[j] += w[n] * data[ids[n] * 3 + j];
    }
    return true;
  };

  const points: number[] = [];
  const starts: number[] = [0];
  for (const seed of seeds) {
    xyz[0] = seed[0]; xyz[1] = seed[1]; xyz[2] = seed[2];
    for (let k = 0; k < maxSteps; k++) {
      if (!vectorAt(xyz, velAt)) break;
      for (let i = 0; i < 3; i++) xtmp[i] = xyz[i] + step / 2 * velAt[i];
      if (!vectorAt(xtmp, velAt)) break;
      for (let i = 0; i < 3; i++) xyz[i] += step * velAt[i];
      if (!vectorAt(xyz, velAt)) break;
      points.push(xyz[0], xyz[1], xyz[2]);
    }
    starts.push(points.length / 3);
  }
  return {positions: new Float32Array(points), lineStarts: new Uint32Array(starts)};
}

/** (x, y, z, vx, vy, vz) rows into the two arrays both renderers take. */
export function splitArrowRows(meta: FlagshipArrowsJson, rows: Float32Array): FlagshipArrows {
  if (rows.length !== meta.count * 6) {
    throw new Error(`arrows: ${meta.count} arrows need ${meta.count * 6} floats, file has ${rows.length}`);
  }
  const positions = new Float32Array(meta.count * 3);
  const vectors = new Float32Array(meta.count * 3);
  for (let i = 0; i < meta.count; i++) {
    for (let c = 0; c < 3; c++) {
      positions[i * 3 + c] = rows[i * 6 + c];
      vectors[i * 3 + c] = rows[i * 6 + 3 + c];
    }
  }
  return {meta, positions, vectors};
}
