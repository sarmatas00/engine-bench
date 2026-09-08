import * as maplibregl from 'maplibre-gl';
import type {StyleSpecification} from 'maplibre-gl';
import {tileToLngLat, lngLatToLocal} from './geo';
import {basemapColour, encodeTerrainRgbPixel, type Scene} from './dataset';

export const DEM_SOURCE = 'dem';
const SIZE = 256;

export const initialView = (s: Scene) => ({center: s.anchor, zoom: s.zoom, pitch: 60, bearing: -20});

function tileImage(scene: Scene, kind: 'dem' | 'map', z: number, x: number, y: number, size = SIZE): ImageData {
  const img = new ImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const [lng, lat] = tileToLngLat(z, x, y, px + 0.5, py + 0.5, size);
    const [lx, ly] = lngLatToLocal(lng, lat, scene.anchor);
    const o = (py * size + px) * 4;
    if (kind === 'dem') {
      const [r, g, b] = encodeTerrainRgbPixel(scene.elevation(lx, ly));
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b;
    } else {
      const outside = Math.abs(lx) > scene.extent || Math.abs(ly) > scene.extent;
      const [r, g, b] = outside ? [225, 232, 240] : basemapColour(scene.elevation(lx, ly));
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b;
    }
    img.data[o + 3] = 255;
  }
  return img;
}

async function toPng(img: ImageData): Promise<ArrayBuffer> {
  const c = new OffscreenCanvas(img.width, img.height);
  c.getContext('2d')!.putImageData(img, 0, 0);
  return (await c.convertToBlob({type: 'image/png'})).arrayBuffer();
}

function parse(url: string): [number, number, number] {
  const m = /^[a-z-]+:\/\/(\d+)\/(\d+)\/(\d+)/.exec(url);
  if (!m) throw new Error(`bad bench tile url ${url}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

let registered = false;
/** Registers the two bench tile protocols against this scene's elevation. */
export function registerProtocols(scene: Scene): void {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol('bench-dem', async ({url}) => ({data: await toPng(tileImage(scene, 'dem', ...parse(url)))}));
  maplibregl.addProtocol('bench-map', async ({url}) => ({data: await toPng(tileImage(scene, 'map', ...parse(url)))}));
}

export function benchStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      map: {type: 'raster', tiles: ['bench-map://{z}/{x}/{y}'], tileSize: SIZE, minzoom: 0, maxzoom: 17},
      [DEM_SOURCE]: {type: 'raster-dem', tiles: ['bench-dem://{z}/{x}/{y}'], tileSize: SIZE, encoding: 'mapbox', minzoom: 0, maxzoom: 17}
    },
    layers: [{id: 'basemap', type: 'raster', source: 'map'}]
  };
}
