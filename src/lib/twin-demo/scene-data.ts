// Ported from the dtcc-twin spike (docs/twin-spike/). One change: roofs are cut with earcut, which Three.js's ShapeUtils
// wraps, so the vtk.js views don't download Three.js just to triangulate. Loaded only once a 3D view is picked.
import earcut from "earcut";
import type { BuildingsJson, FieldJson } from "./scene-files";

/**
 * The scene every variant draws, in local metres: x and y along SWEREF 99 TM's east and north axes, measured from the
 * centre of the demo area, z up from the ground. Buildings sit on z = 0 because the map is flat.
 */
export type SpikeScene = {
  /** The local origin in SWEREF 99 TM metres. */
  origin: [number, number];
  buildings: { positions: Float32Array; normals: Float32Array; count: number; triangles: number };
  field: {
    dims: [number, number, number];
    origin: [number, number, number];
    spacing: [number, number, number];
    range: [number, number];
    speed: Float32Array;
  };
};

export function buildScene(buildings: BuildingsJson, field: FieldJson, speed: Float32Array): SpikeScene {
  const [minX, minY, maxX, maxY] = buildings.bounds;
  const origin: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  const [nx, ny, nz] = field.dims;
  if (speed.length !== nx * ny * nz)
    throw new Error(`speed.f32 holds ${speed.length} values, field.json says ${nx * ny * nz}`);
  return {
    origin,
    buildings: extrude(buildings.buildings, origin),
    field: {
      dims: field.dims,
      origin: [field.origin[0] - origin[0], field.origin[1] - origin[1], field.origin[2]],
      spacing: field.spacing,
      range: field.speed_range,
      speed,
    },
  };
}

/** Flat-shaded prisms: a roof and one quad per wall, non-indexed so every face keeps its own normal. */
function extrude(buildings: BuildingsJson["buildings"], [ox, oy]: [number, number]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const push = (x: number, y: number, z: number, n: [number, number, number]) => {
    positions.push(x, y, z);
    normals.push(...n);
  };
  for (const { ring, height } of buildings) {
    let points = ring.map(([x, y]) => ({ x: x - ox, y: y - oy }));
    const first = points[0],
      last = points.at(-1);
    if (first && last && first.x === last.x && first.y === last.y) points = points.slice(0, -1);
    if (points.length < 3) continue;
    if (signedArea(points) < 0) points.reverse();
    for (const i of earcut(points.flatMap((p) => [p.x, p.y]))) push(points[i]!.x, points[i]!.y, height, [0, 0, 1]);
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!,
        q = points[(i + 1) % points.length]!;
      const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const n: [number, number, number] = [(q.y - p.y) / length, -(q.x - p.x) / length, 0];
      push(p.x, p.y, 0, n);
      push(q.x, q.y, 0, n);
      push(q.x, q.y, height, n);
      push(p.x, p.y, 0, n);
      push(q.x, q.y, height, n);
      push(p.x, p.y, height, n);
    }
  }
  const count = positions.length / 3;
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), count, triangles: count / 3 };
}

/** Twice the ring's signed area: positive when counter-clockwise, as ShapeUtils.isClockWise's negation. */
function signedArea(points: { x: number; y: number }[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!, q = points[(i + 1) % points.length]!;
    sum += p.x * q.y - q.x * p.y;
  }
  return sum;
}

/** The camera both panel renderers start from: south-east of the centre, 35 degrees up, looking at the middle of the field. */
export const PANEL_START = {
  position: [520, -620, 520] as [number, number, number],
  target: [0, 0, 20] as [number, number, number],
  fovDeg: 36.87,
};

/** The transfer function both renderers use: opacity per 2 m step, ramping 0 -> 0.5s -> s over the speed range. */
export const VOLUME_STEP_M = 2;
export const OPACITY_PER_STEP = 0.02;
export const opacityNodes = ([lo, hi]: [number, number]): [number, number][] => [
  [lo, 0],
  [(lo + hi) / 2, OPACITY_PER_STEP / 2],
  [hi, OPACITY_PER_STEP],
];
