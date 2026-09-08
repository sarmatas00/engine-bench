import {localToLngLat} from './geo';

export const LON0 = 11.97;
export const LAT0 = 57.70;
export const EXTENT = 1000;

export function h(x: number, y: number): number {
  return 5 + 120 * Math.exp(-((x / 350) ** 2)) * (0.7 + 0.3 * Math.cos(y / 400));
}

export function T(x: number, y: number, z: number): number {
  return 10 + 25 * Math.exp(-(((x - 100) ** 2 + (y + 150) ** 2) / 300 ** 2)) * Math.exp(-z / 150);
}

export type Block = {cx: number; cy: number; w: number; d: number; height: number};
export function blocks(): Block[] {
  return [-450, -300, -150, 0, 150, 300].map((cx, i) => ({cx, cy: 60 * i - 150, w: 60, d: 40, height: 30}));
}

export type Mesh = {positions: Float32Array; normals: Float32Array; indices: Uint32Array; temperature?: Float32Array};

/** Axis-aligned boxes, 24 vertices each (4 per face) so normals are flat. */
export function blocksMesh(baseZ: (x: number, y: number) => number): Mesh {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  const faces: Array<[number[], number[]]> = [
    // [normal, corner order as (sx, sy, sz) in {0,1}]
    [[0, 0, 1], [0,0,1, 1,0,1, 1,1,1, 0,1,1]],
    [[0, 0, -1], [0,0,0, 0,1,0, 1,1,0, 1,0,0]],
    [[1, 0, 0], [1,0,0, 1,1,0, 1,1,1, 1,0,1]],
    [[-1, 0, 0], [0,0,0, 0,0,1, 0,1,1, 0,1,0]],
    [[0, 1, 0], [0,1,0, 0,1,1, 1,1,1, 1,1,0]],
    [[0, -1, 0], [0,0,0, 1,0,0, 1,0,1, 0,0,1]]
  ];
  for (const b of blocks()) {
    const x0 = b.cx - b.w / 2, y0 = b.cy - b.d / 2, z0 = baseZ(b.cx, b.cy);
    for (const [n, c] of faces) {
      const base = pos.length / 3;
      for (let k = 0; k < 4; k++) {
        pos.push(x0 + c[k * 3] * b.w, y0 + c[k * 3 + 1] * b.d, z0 + c[k * 3 + 2] * b.height);
        nrm.push(n[0], n[1], n[2]);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return {positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint32Array(idx)};
}

export function fieldSurface(): Mesh {
  const N = 41, z = 2;
  const pos = new Float32Array(N * N * 3), nrm = new Float32Array(N * N * 3), tmp = new Float32Array(N * N);
  const idx: number[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    const x = -EXTENT + (2 * EXTENT * i) / (N - 1), y = -EXTENT + (2 * EXTENT * j) / (N - 1);
    pos.set([x, y, z], k * 3); nrm.set([0, 0, 1], k * 3); tmp[k] = T(x, y, 0);
    if (i < N - 1 && j < N - 1) idx.push(k, k + 1, k + N + 1, k, k + N + 1, k + N);
  }
  return {positions: pos, normals: nrm, indices: new Uint32Array(idx), temperature: tmp};
}

export type Grid = {dims: [number, number, number]; origin: [number, number, number]; spacing: [number, number, number]; data: Float32Array; min: number; max: number};
export function fieldGrid(): Grid {
  const dims: [number, number, number] = [64, 64, 32];
  const origin: [number, number, number] = [-EXTENT, -EXTENT, 0];
  const spacing: [number, number, number] = [(2 * EXTENT) / 63, (2 * EXTENT) / 63, 300 / 31];
  const data = new Float32Array(64 * 64 * 32);
  let min = Infinity, max = -Infinity, k = 0;
  for (let kz = 0; kz < 32; kz++) for (let ky = 0; ky < 64; ky++) for (let kx = 0; kx < 64; kx++) {
    const v = T(origin[0] + kx * spacing[0], origin[1] + ky * spacing[1], origin[2] + kz * spacing[2]);
    data[k++] = v; if (v < min) min = v; if (v > max) max = v;
  }
  return {dims, origin, spacing, data, min, max};
}

export function blockFootprintsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: blocks().map(b => {
      const x0 = b.cx - b.w / 2, x1 = b.cx + b.w / 2, y0 = b.cy - b.d / 2, y1 = b.cy + b.d / 2;
      const ring = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map(([x, y]) => localToLngLat(x, y));
      return {type: 'Feature', properties: {height: b.height}, geometry: {type: 'Polygon', coordinates: [ring]}};
    })
  };
}
