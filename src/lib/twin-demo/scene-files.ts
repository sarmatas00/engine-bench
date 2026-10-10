// The demo scene's files, fetched before any 3D library loads. Building them into geometry is scene-data.ts's job.
import {assetUrl} from '../dataset';

/** One footprint ring in SWEREF 99 TM metres, its LoD1 height, from dtcc-core's `buildings` Dataset. */
export type BuildingsJson = {
  crs: 'EPSG:3006';
  bounds: [number, number, number, number];
  buildings: {ring: [number, number][]; height: number}[];
};
export type FieldJson = {
  crs: 'EPSG:3006';
  dims: [number, number, number];
  order: 'x-fastest';
  origin: [number, number, number];
  spacing: [number, number, number];
  speed_range: [number, number];
  source?: string;
};
/** scripts/twin-demo/sample_surface.py's mesh.json, next to core's city.obj. */
export type CoreMeshJson = {
  crs: 'EPSG:3006';
  vertices: number;
  triangles: number;
  buildings: number;
  speed_range: [number, number];
  source: string;
};
/**
 * dtcc-core's city surface mesh as core wrote it (`obj`, SWEREF 99 TM metres, z absolute), the ground height to take
 * off each vertex so it sits on the flat map, and the wind speed near each vertex, both in the OBJ's vertex order.
 */
export type CoreMeshFiles = {obj: string; ground: Float32Array; speed: Float32Array; meta: CoreMeshJson};
export type SceneFiles = {
  buildings: BuildingsJson;
  /** null when no volume is drawn. */
  field: FieldJson | null;
  speed: Float32Array | null;
  coreMesh: CoreMeshFiles | null;
  bytes: number;
};

/**
 * `field` picks the volume: `smoke` (dtcc-core's synthetic field), `wind` (a dtcc-sim solve, same grid) or `none`.
 * `coreMesh` adds dtcc-core's city surface mesh with its wind heatmap.
 */
export async function loadSceneFiles(field: 'smoke' | 'wind' | 'none', coreMesh = false): Promise<SceneFiles> {
  const dir = field === 'wind' ? 'data/twin-demo/wind' : 'data/twin-demo';
  const mesh = 'data/twin-demo/core-mesh';
  const get = async (path: string) => {
    const response = await fetch(assetUrl(path));
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.arrayBuffer();
  };
  const skip = Promise.resolve(null);
  const [buildings, meta, speed, obj, ground, surfaceSpeed, surfaceMeta] = await Promise.all([
    get('data/twin-demo/buildings.json'),
    field === 'none' ? skip : get(`${dir}/field.json`),
    field === 'none' ? skip : get(`${dir}/speed.f32`),
    ...[`${mesh}/city.obj`, `${mesh}/ground.f32`, `${mesh}/speed.f32`, `${mesh}/mesh.json`].map(path => coreMesh ? get(path) : skip),
  ]);
  const text = (b: ArrayBuffer) => new TextDecoder().decode(b);
  const bytes = [buildings, meta, speed, obj, ground, surfaceSpeed, surfaceMeta].reduce((sum, b) => sum + (b?.byteLength ?? 0), 0);
  return {
    buildings: JSON.parse(text(buildings)),
    field: meta ? JSON.parse(text(meta)) : null,
    speed: speed ? new Float32Array(speed) : null,
    coreMesh: obj && ground && surfaceSpeed && surfaceMeta
      ? {obj: text(obj), ground: new Float32Array(ground), speed: new Float32Array(surfaceSpeed), meta: JSON.parse(text(surfaceMeta))}
      : null,
    bytes,
  };
}
