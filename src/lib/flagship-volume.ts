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

export type FlagshipVolume = {
  meta: FlagshipVolumeJson;
  /** x varies fastest, then y, then z: what vtkImageData and Data3DTexture both read. */
  data: Float32Array;
};

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
    axis: string; grid: string; files: Record<string, VerifiedFile>;
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
  return {meta, data: new Float32Array(bin.buffer, bin.byteOffset, bin.byteLength / 4)};
}
