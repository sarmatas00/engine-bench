import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {MapboxOverlay} from '@deck.gl/mapbox';
import {COORDINATE_SYSTEM, type Layer} from '@deck.gl/core';
import {load} from '@loaders.gl/core';
import {GLTFLoader, postProcessGLTF} from '@loaders.gl/gltf';
import {registerSynthProtocols, synthStyle, INITIAL_VIEW} from './synth-tiles';
import {LON0, LAT0} from './scene';

export const ORIGIN: [number, number, number] = [LON0, LAT0, 0];
export const METERS = COORDINATE_SYSTEM.METER_OFFSETS;
export const GLTF_ORIENTATION: [number, number, number] = [0, 0, 90];

export function makeMap(host: HTMLElement, view = INITIAL_VIEW): maplibregl.Map {
  registerSynthProtocols();
  const el = document.createElement('div');
  host.prepend(el);
  return new maplibregl.Map({container: el, style: synthStyle(), ...view, maxPitch: 85});
}

export function makeOverlay(map: maplibregl.Map, layers: Layer[]): MapboxOverlay {
  const overlay = new MapboxOverlay({interleaved: true, layers});
  map.addControl(overlay);
  return overlay;
}

export function whenIdle(map: maplibregl.Map, cb: () => void) { map.once('idle', cb); }

type Attr = {value: any; size: number; normalized?: boolean};
/** glTF Y-up → local z-up: (x, y, z) → (x, -z, y). */
function toZUp(a: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 3) { out[i] = a[i]; out[i + 1] = -a[i + 2]; out[i + 2] = a[i + 1]; }
  return out;
}

export async function loadGltfMesh(url: string) {
  const gltf = postProcessGLTF(await load(url, GLTFLoader));
  const prim = gltf.meshes[0].primitives[0];
  const raw = prim.attributes; // GLTFAccessorPostprocessed: size lives in `.components`, not `.size`
  const attributeNames = Object.keys(raw);
  const attributes: Record<string, Attr> = {};
  for (const [name, a] of Object.entries(raw)) {
    attributes[name] = name === 'POSITION' || name === 'NORMAL'
      ? {value: toZUp(a.value as Float32Array), size: 3, normalized: a.normalized}
      : {value: a.value, size: a.components, normalized: a.normalized};
  }
  if (!prim.indices) throw new Error('loadGltfMesh expects indexed geometry');
  return {attributes, indices: {value: prim.indices.value, size: 1 as const}, attributeNames};
}
