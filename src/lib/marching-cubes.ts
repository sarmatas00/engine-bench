/**
 * Isosurfaces for the Three.js pages: a line-for-line port of vtk.js 36.12.1's
 * vtkImageMarchingCubes (Filters/General/ImageMarchingCubes), because Three.js
 * has none. Page 19 uses vtk.js's filter; page 20 uses this.
 *
 * Same rule as traceStreamlines: the port must give vtk.js's output exactly,
 * point for point, normal for normal, and tests/unit/marching-cubes.test.ts
 * requires it. That means the same voxel walk (k, then j, then i), the same
 * corner order, the same interpolation arithmetic in doubles, and, when points
 * are merged, vtk.js's own EdgeLocator key. The only thing left out is the
 * per-voxel `slice()` copies, which change no value.
 */
import {MC_CASES, MC_EDGES} from './marching-cubes-tables';

export type ImageGrid = {
  dims: readonly [number, number, number];
  origin: readonly number[];
  spacing: readonly number[];
  /** One value per node, x fastest. */
  scalars: ArrayLike<number>;
};

export type IsoSurface = {
  positions: Float32Array;
  /** Per point, unit length; null unless computeNormals. */
  normals: Float32Array | null;
  /** Three point ids per triangle. */
  triangles: Uint32Array;
};

/** vtk.js's corner order for the case index (VERT_MAP), and its bit per corner. */
const VERT_MAP = [0, 1, 3, 2, 4, 5, 7, 6];

/**
 * vtk.js 36.12.1 EdgeLocator.computeEdgeKey, unoriented. Reproduced as is,
 * because merged output depends on it. Note what it is: p(p+1)/2 + b with
 * p = a*b, in doubles. It is not a pairing function, and above ~1e8 for p it
 * runs out of float precision; see edgeKeyCollisions.
 */
export function vtkEdgeKey(a: number, b: number): number {
  return a < b ? .5 * (a * b) * (a * b + 1) + b : .5 * (b * a) * (b * a + 1) + a;
}

/** vtk.js's one-sided/central difference gradient at node (i, j, k). */
function pointGradient(i: number, j: number, k: number, dims: readonly number[], slice: number,
                       spacing: readonly number[], s: ArrayLike<number>, g: Float64Array, o: number): void {
  let sp: number;
  let sm: number;
  if (i === 0) {
    sp = s[i + 1 + j * dims[0] + k * slice]; sm = s[i + j * dims[0] + k * slice];
    g[o] = (sm - sp) / spacing[0];
  } else if (i === dims[0] - 1) {
    sp = s[i + j * dims[0] + k * slice]; sm = s[i - 1 + j * dims[0] + k * slice];
    g[o] = (sm - sp) / spacing[0];
  } else {
    sp = s[i + 1 + j * dims[0] + k * slice]; sm = s[i - 1 + j * dims[0] + k * slice];
    g[o] = .5 * (sm - sp) / spacing[0];
  }
  if (j === 0) {
    sp = s[i + (j + 1) * dims[0] + k * slice]; sm = s[i + j * dims[0] + k * slice];
    g[o + 1] = (sm - sp) / spacing[1];
  } else if (j === dims[1] - 1) {
    sp = s[i + j * dims[0] + k * slice]; sm = s[i + (j - 1) * dims[0] + k * slice];
    g[o + 1] = (sm - sp) / spacing[1];
  } else {
    sp = s[i + (j + 1) * dims[0] + k * slice]; sm = s[i + (j - 1) * dims[0] + k * slice];
    g[o + 1] = .5 * (sm - sp) / spacing[1];
  }
  if (k === 0) {
    sp = s[i + j * dims[0] + (k + 1) * slice]; sm = s[i + j * dims[0] + k * slice];
    g[o + 2] = (sm - sp) / spacing[2];
  } else if (k === dims[2] - 1) {
    sp = s[i + j * dims[0] + k * slice]; sm = s[i + j * dims[0] + (k - 1) * slice];
    g[o + 2] = (sm - sp) / spacing[2];
  } else {
    sp = s[i + j * dims[0] + (k + 1) * slice]; sm = s[i + j * dims[0] + (k - 1) * slice];
    g[o + 2] = .5 * (sm - sp) / spacing[2];
  }
}

export function marchingCubes(grid: ImageGrid, value: number,
                              opts: {computeNormals?: boolean; mergePoints?: boolean} = {}): IsoSurface {
  const {dims, origin, spacing, scalars: s} = grid;
  const computeNormals = opts.computeNormals ?? false;
  const mergePoints = opts.mergePoints ?? false;
  const slice = dims[0] * dims[1];
  const ids = new Float64Array(8);
  const vs = new Float64Array(8);
  const vp = new Float64Array(24);
  const vg = new Float64Array(24);
  const n = new Float64Array(3);
  const points: number[] = [];
  const normals: number[] = [];
  const tris: number[] = [];
  const edges = new Map<number, number>();

  for (let k = 0; k < dims[2] - 1; ++k) for (let j = 0; j < dims[1] - 1; ++j) for (let i = 0; i < dims[0] - 1; ++i) {
    ids[0] = k * slice + j * dims[0] + i;
    ids[1] = ids[0] + 1; ids[2] = ids[0] + dims[0]; ids[3] = ids[2] + 1;
    ids[4] = ids[0] + slice; ids[5] = ids[4] + 1; ids[6] = ids[4] + dims[0]; ids[7] = ids[6] + 1;
    for (let c = 0; c < 8; c++) vs[c] = s[ids[c]];
    let index = 0;
    for (let c = 0; c < 8; c++) if (vs[VERT_MAP[c]] >= value) index |= 1 << c;
    const cell = MC_CASES[index];
    if (cell.length === 0) continue;

    vp[0] = origin[0] + i * spacing[0]; vp[1] = origin[1] + j * spacing[1]; vp[2] = origin[2] + k * spacing[2];
    vp[3] = vp[0] + spacing[0]; vp[4] = vp[1]; vp[5] = vp[2];
    vp[6] = vp[0]; vp[7] = vp[1] + spacing[1]; vp[8] = vp[2];
    vp[9] = vp[3]; vp[10] = vp[7]; vp[11] = vp[2];
    vp[12] = vp[0]; vp[13] = vp[1]; vp[14] = vp[2] + spacing[2];
    vp[15] = vp[3]; vp[16] = vp[1]; vp[17] = vp[14];
    vp[18] = vp[0]; vp[19] = vp[7]; vp[20] = vp[14];
    vp[21] = vp[3]; vp[22] = vp[7]; vp[23] = vp[14];
    if (computeNormals) {
      pointGradient(i, j, k, dims, slice, spacing, s, vg, 0);
      pointGradient(i + 1, j, k, dims, slice, spacing, s, vg, 3);
      pointGradient(i, j + 1, k, dims, slice, spacing, s, vg, 6);
      pointGradient(i + 1, j + 1, k, dims, slice, spacing, s, vg, 9);
      pointGradient(i, j, k + 1, dims, slice, spacing, s, vg, 12);
      pointGradient(i + 1, j, k + 1, dims, slice, spacing, s, vg, 15);
      pointGradient(i, j + 1, k + 1, dims, slice, spacing, s, vg, 18);
      pointGradient(i + 1, j + 1, k + 1, dims, slice, spacing, s, vg, 21);
    }
    for (let t = 0; t < cell.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const [a, b] = MC_EDGES[cell[t + e]];
        let pId: number | undefined;
        const key = mergePoints ? vtkEdgeKey(ids[a], ids[b]) : 0;
        if (mergePoints) pId = edges.get(key);
        if (pId === undefined) {
          const f = (value - vs[a]) / (vs[b] - vs[a]);
          pId = points.length / 3;
          for (let c = 0; c < 3; c++) points.push(vp[a * 3 + c] + f * (vp[b * 3 + c] - vp[a * 3 + c]));
          if (computeNormals) {
            for (let c = 0; c < 3; c++) n[c] = vg[a * 3 + c] + f * (vg[b * 3 + c] - vg[a * 3 + c]);
            const den = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
            if (den !== 0) { n[0] /= den; n[1] /= den; n[2] /= den; }
            normals.push(n[0], n[1], n[2]);
          }
          if (mergePoints) edges.set(key, pId);
        }
        tris.push(pId);
      }
    }
  }
  return {
    positions: new Float32Array(points),
    normals: computeNormals ? new Float32Array(normals) : null,
    triangles: new Uint32Array(tris),
  };
}
