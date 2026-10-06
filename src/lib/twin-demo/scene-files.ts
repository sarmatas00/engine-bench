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
export type SceneFiles = {buildings: BuildingsJson; field: FieldJson; speed: Float32Array; bytes: number};

/** `field` picks the volume: `smoke` (dtcc-core's synthetic field) or `wind` (a dtcc-sim solve), same grid. */
export async function loadSceneFiles(field: 'smoke' | 'wind'): Promise<SceneFiles> {
  const dir = field === 'wind' ? 'data/twin-demo/wind' : 'data/twin-demo';
  const get = async (path: string) => {
    const response = await fetch(assetUrl(path));
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response;
  };
  const [buildings, meta, speed] = await Promise.all([
    get('data/twin-demo/buildings.json').then(r => r.arrayBuffer()),
    get(`${dir}/field.json`).then(r => r.arrayBuffer()),
    get(`${dir}/speed.f32`).then(r => r.arrayBuffer()),
  ]);
  const text = (b: ArrayBuffer) => JSON.parse(new TextDecoder().decode(b));
  return {buildings: text(buildings), field: text(meta), speed: new Float32Array(speed),
    bytes: buildings.byteLength + meta.byteLength + speed.byteLength};
}
