import * as maplibregl from 'maplibre-gl';
import type {StyleSpecification} from 'maplibre-gl';
import {h, LON0, LAT0, EXTENT} from './scene';
import {tileToLngLat, lngLatToLocal, localToLngLat} from './geo';

export const DEM_SOURCE = 'dem';
export const INITIAL_VIEW = {center: [LON0, LAT0] as [number, number], zoom: 14.2, pitch: 60, bearing: -20};
const SIZE = 256;

export function terrainRgbTile(z: number, x: number, y: number, size = SIZE): ImageData {
  const img = new ImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const [lng, lat] = tileToLngLat(z, x, y, px + 0.5, py + 0.5, size);
    const [lx, ly] = lngLatToLocal(lng, lat);
    const v = Math.round((h(lx, ly) + 10000) / 0.1);
    const o = (py * size + px) * 4;
    img.data[o] = (v >> 16) & 255; img.data[o + 1] = (v >> 8) & 255; img.data[o + 2] = v & 255; img.data[o + 3] = 255;
  }
  return img;
}

function basemapTile(z: number, x: number, y: number, size = SIZE): ImageData {
  const img = new ImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const [lng, lat] = tileToLngLat(z, x, y, px + 0.5, py + 0.5, size);
    const [lx, ly] = lngLatToLocal(lng, lat);
    const e = h(lx, ly);
    const contour = Math.abs(((e % 10) + 10) % 10 - 5) > 4.6; // thin line every 10 m
    let r = 235, g = 235, b = 230;
    if (e > 60) { r = 215; g = 205; b = 190; }
    if (contour) { r -= 60; g -= 60; b -= 60; }
    if (Math.abs(lx) > 1000 || Math.abs(ly) > 1000) { r = 225; g = 232; b = 240; } // outside extent
    const o = (py * size + px) * 4;
    img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
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
  if (!m) throw new Error(`bad synth tile url ${url}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

let registered = false;
export function registerSynthProtocols(): void {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol('synth-dem', async ({url}) => ({data: await toPng(terrainRgbTile(...parse(url)))}));
  maplibregl.addProtocol('synth-map', async ({url}) => ({data: await toPng(basemapTile(...parse(url)))}));
}

export function synthStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      map: {type: 'raster', tiles: ['synth-map://{z}/{x}/{y}'], tileSize: SIZE, minzoom: 0, maxzoom: 17},
      [DEM_SOURCE]: {type: 'raster-dem', tiles: ['synth-dem://{z}/{x}/{y}'], tileSize: SIZE, encoding: 'mapbox', minzoom: 0, maxzoom: 17}
    },
    layers: [{id: 'basemap', type: 'raster', source: 'map'}]
  };
}

export function extentBounds(): [number, number, number, number] {
  const [w, s] = localToLngLat(-EXTENT, -EXTENT);
  const [e, n] = localToLngLat(EXTENT, EXTENT);
  return [w, s, e, n];
}

export async function extentImage(kind: 'dem' | 'map', size = 512): Promise<string> {
  const img = new ImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    // Row 0 is north. Sample in local metres directly; the bounds are the same rectangle.
    const lx = -EXTENT + (2 * EXTENT * (px + 0.5)) / size;
    const ly = EXTENT - (2 * EXTENT * (py + 0.5)) / size;
    const e = h(lx, ly);
    const o = (py * size + px) * 4;
    if (kind === 'dem') {
      const v = Math.round((e + 10000) / 0.1);
      img.data[o] = (v >> 16) & 255; img.data[o + 1] = (v >> 8) & 255; img.data[o + 2] = v & 255;
    } else {
      const contour = Math.abs(((e % 10) + 10) % 10 - 5) > 4.6;
      let r = 235, g = 235, b = 230;
      if (e > 60) { r = 215; g = 205; b = 190; }
      if (contour) { r -= 60; g -= 60; b -= 60; }
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b;
    }
    img.data[o + 3] = 255;
  }
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
