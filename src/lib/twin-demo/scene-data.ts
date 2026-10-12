// Ported from the dtcc-twin spike (docs/twin-spike/). One change: roofs are cut with earcut, which Three.js's ShapeUtils
// wraps, so the vtk.js views don't download Three.js just to triangulate. Loaded only once a 3D view is picked.
import earcut from "earcut";
import { colormap, diverging } from "../colormap";
import { type BuildingsJson, type CoreMeshFiles, DELTA_LIMIT_M, type FieldJson } from "./scene-files";

/**
 * The scene every variant draws, in local metres: x and y along SWEREF 99 TM's east and north axes, measured from the
 * centre of the demo area, z up from the ground. Buildings sit on z = 0 because the map is flat.
 */
export type SpikeScene = {
  /** The local origin in SWEREF 99 TM metres. */
  origin: [number, number];
  /** `colors` (RGB 0-255 per vertex) only for the core mesh (wind heatmap or OSM comparison); the boxes are one flat grey. */
  buildings: SceneMesh;
  /** Drawn see-through over `buildings` (OVERLAY_TINT at OVERLAY_OPACITY), or null. */
  overlay: SceneMesh | null;
  /** null when no volume is drawn. */
  field: {
    dims: [number, number, number];
    origin: [number, number, number];
    spacing: [number, number, number];
    range: [number, number];
    speed: Float32Array;
  } | null;
};

/** Flat-shaded, non-indexed triangles; `colors` (RGB 0-255 per vertex) only for the core mesh's heatmap. */
export type SceneMesh = { positions: Float32Array; normals: Float32Array; colors: Uint8Array | null; count: number; triangles: number };

/** The see-through core mesh in the `both` view: one tint, so where it and the boxes differ shows as shape, not colour. */
export const OVERLAY_TINT: [number, number, number] = [0.18, 0.44, 0.84];
export const OVERLAY_OPACITY = 0.35;
/** The OSM comparison's colour where nothing is compared: dark slate, apart from liberty's light-grey OSM buildings. */
export const NO_COMPARISON: [number, number, number] = [95, 95, 110];

/**
 * `coreMesh`, when given, replaces the extruded footprints with dtcc-core's city surface mesh and its heatmap; with
 * `overlay`, the footprints stay and core's mesh is drawn see-through over them instead, for comparing the two. With
 * `delta` (per vertex, core minus OSM height), core's buildings are coloured by it instead, without core's terrain, so
 * the basemap's own OSM footprints show beneath.
 */
export function buildScene(
  buildings: BuildingsJson,
  field: FieldJson | null,
  speed: Float32Array | null,
  coreMesh: CoreMeshFiles | null = null,
  overlay = false,
  delta: Float32Array | null = null,
): SpikeScene {
  const [minX, minY, maxX, maxY] = buildings.bounds;
  const origin: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
  let volume: SpikeScene["field"] = null;
  if (field && speed) {
    const [nx, ny, nz] = field.dims;
    if (speed.length !== nx * ny * nz)
      throw new Error(`speed.f32 holds ${speed.length} values, field.json says ${nx * ny * nz}`);
    volume = {
      dims: field.dims,
      origin: [field.origin[0] - origin[0], field.origin[1] - origin[1], field.origin[2]],
      spacing: field.spacing,
      range: field.speed_range,
      speed,
    };
  }
  return {
    origin,
    buildings: !coreMesh || overlay ? { ...extrude(buildings.buildings, origin), colors: null }
      : delta ? withoutGround(surface(coreMesh, origin, deltaColor(delta)))
      : surface(coreMesh, origin, windColor(coreMesh)),
    overlay: coreMesh && overlay ? { ...withoutGround(surface(coreMesh, origin, windColor(coreMesh))), colors: null } : null,
    field: volume,
  };
}

/**
 * An OBJ's vertices (`v x y z`) and triangles (`f a b c`, 1-based, `a/b/c` forms allowed), x and y taken off `origin`
 * while still in float64: SWEREF northings are ~6.4e6, where float32 steps by 0.5 m.
 */
export function parseObj(text: string, [ox, oy]: [number, number]) {
  const xyz: number[] = [];
  const faces: number[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [x, y, z] = line.slice(2).trim().split(/\s+/).map(Number);
      xyz.push(x! - ox, y! - oy, z!);
    } else if (line.startsWith("f ")) {
      const corners = line.slice(2).trim().split(/\s+/);
      if (corners.length !== 3) throw new Error(`OBJ face with ${corners.length} corners; expected triangles`);
      for (const c of corners) faces.push(Number.parseInt(c, 10) - 1);
    }
  }
  return { positions: new Float64Array(xyz), faces: new Uint32Array(faces) };
}

type VertexColor = { values: Float32Array; color: (value: number) => [number, number, number] };
/** The wind near each vertex, through the shared colormap over the mesh's own speed range. */
const windColor = ({ speed, meta }: CoreMeshFiles): VertexColor =>
  ({ values: speed, color: (value) => colormap(value, ...meta.speed_range) });
/** Core minus OSM height per vertex, diverging around 0; NaN (nothing to compare) NO_COMPARISON. */
export const deltaColor = (delta: Float32Array): VertexColor =>
  ({ values: delta, color: (value) => Number.isNaN(value) ? NO_COMPARISON : diverging(value, DELTA_LIMIT_M) });

/** Core's mesh flattened onto the map (z minus `ground`), flat-shaded like the boxes, coloured per vertex by `by`. */
function surface({ obj, ground }: CoreMeshFiles, origin: [number, number], by: VertexColor) {
  const { positions: xyz, faces } = parseObj(obj, origin);
  const vertexCount = xyz.length / 3;
  if (ground.length !== vertexCount || by.values.length !== vertexCount)
    throw new Error(`core mesh: ${vertexCount} vertices, ${ground.length} ground and ${by.values.length} colour values`);
  const count = faces.length;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Uint8Array(count * 3);
  const p = [0, 0, 0].map(() => [0, 0, 0]);
  for (let t = 0; t < count; t += 3) {
    for (let c = 0; c < 3; c++) {
      const v = faces[t + c]!;
      p[c] = [xyz[3 * v]!, xyz[3 * v + 1]!, xyz[3 * v + 2]! - ground[v]!];
      positions.set(p[c]!, 3 * (t + c));
      colors.set(by.color(by.values[v]!), 3 * (t + c));
    }
    const [a, b, d] = p as [number[], number[], number[]];
    const u = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!], w = [d[0]! - a[0]!, d[1]! - a[1]!, d[2]! - a[2]!];
    const n = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
    const length = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    for (let c = 0; c < 3; c++) normals.set([n[0]! / length, n[1]! / length, n[2]! / length], 3 * (t + c));
  }
  return { positions, normals, colors, count, triangles: count / 3 };
}

/**
 * The mesh minus its terrain: after flattening, terrain is every up-facing triangle with all three corners at z = 0,
 * which no roof or wall can be. For the overlay, where a see-through ground would tint every box beneath it, and the
 * OSM comparison, where it would hide the basemap's footprints.
 */
function withoutGround(mesh: SceneMesh): SceneMesh {
  const keep: number[] = [];
  for (let t = 0; t < mesh.triangles; t++) {
    const flat = [0, 1, 2].every((c) => Math.abs(mesh.positions[9 * t + 3 * c + 2]!) < 0.01);
    if (!(flat && mesh.normals[9 * t + 2]! > 0.9)) keep.push(t);
  }
  const pick = <T extends Float32Array | Uint8Array>(array: T): T => {
    const out = new (array.constructor as new (n: number) => T)(keep.length * 9);
    keep.forEach((t, i) => out.set(array.subarray(9 * t, 9 * t + 9), 9 * i));
    return out;
  };
  return {
    positions: pick(mesh.positions), normals: pick(mesh.normals), colors: mesh.colors && pick(mesh.colors),
    count: keep.length * 3, triangles: keep.length,
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
