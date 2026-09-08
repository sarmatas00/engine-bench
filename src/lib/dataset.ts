import {h, LON0, LAT0, EXTENT, blockFootprintsGeoJSON} from './scene';
import {setAnchor, localToLngLat, type Anchor} from './geo';

export type Dataset = 'synthetic' | 'real';

export type Scene = {
  dataset: Dataset;
  name: string;
  anchor: Anchor;
  /** Half-size of the scene in metres: the scene covers [-extent, extent]^2. */
  extent: number;
  /** Map zoom that frames the whole extent. Pages derive their own from this. */
  zoom: number;
  /** Metres above the scene's zero, in local metres. */
  elevation: (x: number, y: number) => number;
  /** DEM + basemap for deck.gl's TerrainLayer, plus the lon/lat rectangle they cover. */
  elevationImage: () => Promise<{dem: string; map: string; bounds: [number, number, number, number]}>;
  footprints: () => Promise<GeoJSON.FeatureCollection>;
  files: {blocks: string; blocksDraped: string; field: string; fieldBaked: string; gridJson: string};
  /** Colour-scale range for the temperature field, degC. */
  colourRange: [number, number];
  relief: [number, number];
  /** False when this dataset has no temperature field (stage 2 has not run). */
  hasField: boolean;
  /** Header line: what this dataset is. */
  headerText: string;
  other: {label: string; href: string};
};

const TERRAIN_RGB_BASE = 10000;
const TERRAIN_RGB_SCALE = 0.1;

export function encodeTerrainRgbPixel(height: number): [number, number, number] {
  const v = Math.round((height + TERRAIN_RGB_BASE) / TERRAIN_RGB_SCALE);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** RGBA pixels (row 0 = north) -> heights in metres above the scene's zero. */
export function decodeTerrainRgb(data: Uint8ClampedArray | Uint8Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const v = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2];
    out[i] = v * TERRAIN_RGB_SCALE - TERRAIN_RGB_BASE;
  }
  return out;
}

/**
 * Bilinear sample of a heightfield laid over [-extent, extent]^2, row 0 = north.
 * Pixel centres sit at (i + 0.5) / size of the span, matching the Python sampler
 * in scripts/real/stage1_build.py. Outside the field, clamps to the edge.
 */
export function sampleBilinear(field: Float32Array, width: number, height: number, extent: number, x: number, y: number): number {
  const fx = ((x + extent) / (2 * extent)) * width - 0.5;
  const fy = ((extent - y) / (2 * extent)) * height - 0.5;
  const cx = Math.min(width - 1, Math.max(0, fx));
  const cy = Math.min(height - 1, Math.max(0, fy));
  const x0 = Math.floor(cx), y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = cx - x0, ty = cy - y0;
  const a = field[y0 * width + x0], b = field[y0 * width + x1];
  const c = field[y1 * width + x0], d = field[y1 * width + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export function currentDataset(): Dataset {
  if (typeof location === 'undefined') return 'synthetic';
  return new URLSearchParams(location.search).get('dataset') === 'real' ? 'real' : 'synthetic';
}

export function dataUrl(name: string, dataset: Dataset = currentDataset()): string {
  return `/data/${dataset}/${name}`;
}

/** Page 04 and 08 put two copies side by side and pull back to see both. */
export const wideView = (s: Scene) => ({center: s.anchor, zoom: s.zoom - 1.9, pitch: 45, bearing: 0});
/** Page 07 shows one copy of the field. */
export const fieldView = (s: Scene) => ({center: s.anchor, zoom: s.zoom - 1.2, pitch: 45, bearing: 0});
/** Half the separation between the two side-by-side copies, in metres. */
export const sideOffset = (s: Scene) => 1.05 * s.extent;

async function renderExtentImage(scene: Scene, kind: 'dem' | 'map', size = 512): Promise<string> {
  const img = new ImageData(size, size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    // Row 0 is north. Sample in local metres; the bounds are the same rectangle.
    const lx = -scene.extent + (2 * scene.extent * (px + 0.5)) / size;
    const ly = scene.extent - (2 * scene.extent * (py + 0.5)) / size;
    const e = scene.elevation(lx, ly);
    const o = (py * size + px) * 4;
    if (kind === 'dem') {
      const [r, g, b] = encodeTerrainRgbPixel(e);
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b;
    } else {
      const [r, g, b] = basemapColour(e);
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b;
    }
    img.data[o + 3] = 255;
  }
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/** The one basemap rule set, shared by the map tiles and the TerrainLayer texture. */
export function basemapColour(e: number): [number, number, number] {
  let r = 235, g = 235, b = 230;
  if (e > 60) { r = 215; g = 205; b = 190; }
  const contour = Math.abs(((e % 10) + 10) % 10 - 5) > 4.6; // thin line every 10 m
  if (contour) { r -= 60; g -= 60; b -= 60; }
  return [r, g, b];
}

function syntheticScene(): Scene {
  const anchor: Anchor = [LON0, LAT0];
  const files = {
    blocks: dataUrl('blocks.glb', 'synthetic'),
    blocksDraped: dataUrl('blocks-draped.glb', 'synthetic'),
    field: dataUrl('field.glb', 'synthetic'),
    fieldBaked: dataUrl('field-baked.glb', 'synthetic'),
    gridJson: dataUrl('field.grid.json', 'synthetic')
  };
  const scene: Scene = {
    dataset: 'synthetic', name: 'synthetic ridge', anchor, extent: EXTENT, zoom: 14.2,
    elevation: h,
    elevationImage: async () => ({
      dem: await renderExtentImage(scene, 'dem'),
      map: await renderExtentImage(scene, 'map'),
      bounds: extentLngLatBounds(scene)
    }),
    footprints: async () => blockFootprintsGeoJSON(),
    files, colourRange: [10, 35], relief: [5, 125], hasField: true,
    headerText: `Dataset: synthetic ridge · ${2 * EXTENT} m · relief 120 m · field from T(x, y, z)`,
    other: {label: 'real', href: '?dataset=real'}
  };
  return scene;
}

export function extentLngLatBounds(s: Scene): [number, number, number, number] {
  const [w, south] = localToLngLat(-s.extent, -s.extent, s.anchor);
  const [e, north] = localToLngLat(s.extent, s.extent, s.anchor);
  return [w, south, e, north];
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function realScene(): Promise<Scene> {
  const meta = await fetchJson(dataUrl('dataset.json', 'real'));
  const terrain = await fetchJson(dataUrl('terrain.json', 'real'));
  const bitmap = await createImageBitmap(await (await fetch(dataUrl('terrain-rgb.png', 'real'))).blob());
  const canvas = new OffscreenCanvas(terrain.width, terrain.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, terrain.width, terrain.height).data;
  const field = decodeTerrainRgb(pixels, terrain.width, terrain.height);

  const hasField = meta.stages?.stage2 != null;
  let colourRange: [number, number] = [0, 1];
  if (hasField) {
    const fieldMeta = await fetchJson(dataUrl('field.json', 'real'));
    colourRange = [fieldMeta.tmin, fieldMeta.tmax];
  }
  const anchor = meta.anchor_lonlat as Anchor;
  const extent = meta.extent as number;
  const relief: [number, number] = [0, meta.relief.relief];

  const files = {
    blocks: dataUrl('blocks.glb', 'real'),
    blocksDraped: dataUrl('blocks-draped.glb', 'real'),
    field: dataUrl('field.glb', 'real'),
    fieldBaked: dataUrl('field-baked.glb', 'real'),
    gridJson: dataUrl('field.grid.json', 'real')
  };
  const scene: Scene = {
    // Zoom derived, not pinned: 14.2 frames the synthetic 1000 m extent, and every page's view
    // is a fixed delta off this, so the delta only holds if zoom tracks extent. (Spec section 7's
    // parenthetical "zoom 15.2 for a 500 m box" was an estimate; 250 m is 4x smaller than 1000 m,
    // which is 14.2 + log2(4) = 16.2. Task 7 confirms the framing on screen.)
    dataset: 'real', name: meta.name, anchor, extent, zoom: 14.2 + Math.log2(EXTENT / extent),
    elevation: (x, y) => sampleBilinear(field, terrain.width, terrain.height, extent, x, y),
    elevationImage: async () => ({
      dem: dataUrl('terrain-rgb.png', 'real'),
      map: dataUrl('basemap.png', 'real'),
      bounds: terrain.bounds_lonlat as [number, number, number, number]
    }),
    footprints: async () => fetchJson(dataUrl('footprints.geojson', 'real')),
    files, colourRange, relief, hasField,
    headerText: `Dataset: ${meta.name} · ${2 * extent} m · relief ${meta.relief.relief.toFixed(0)} m · `
      + (hasField ? `field from dtcc-sim urban_heat, ${colourRange[0].toFixed(1)}–${colourRange[1].toFixed(1)} °C`
                  : 'no field for this dataset'),
    other: {label: 'synthetic', href: typeof location === 'undefined' ? '/' : location.pathname}
  };
  return scene;
}

let cached: Promise<Scene> | undefined;

/**
 * A dataset that will not load must say so on screen and in the console. Without this every
 * page's bare `(async () => …)()` swallows the rejection: the page stays blank, `__bench.ready`
 * never flips, and the smoke test reports a 30-second timeout instead of the reason.
 */
function reportSceneFailure(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  const detail = currentDataset() === 'real'
    ? 'The real dataset is generated, not committed. Run:\n'
      + '  .venv/bin/python scripts/real/stage1_build.py\n'
      + '  bun run generate:real'
    : 'The synthetic dataset is generated by `bun run generate`.';
  document.body.innerHTML = `<pre style="padding:14px;white-space:pre-wrap">`
    + `Could not load dataset "${currentDataset()}".\n\n${message}\n\n${detail}</pre>`;
  console.error(`loadScene failed for dataset "${currentDataset()}": ${message}`);
  window.__bench = {ready: true, probe: {sceneError: message}};
  throw err;
}

/** Resolve the scene for `?dataset=`. Sets the active geo anchor as a side effect. */
export function loadScene(): Promise<Scene> {
  if (!cached) {
    cached = (currentDataset() === 'real' ? realScene() : Promise.resolve(syntheticScene()))
      .then(scene => { setAnchor(scene.anchor); return scene; })
      .catch(reportSceneFailure);
  }
  return cached;
}

/** The header block every page passes to mountChrome. */
export const datasetChrome = (s: Scene) => ({text: s.headerText, otherLabel: s.other.label, otherHref: s.other.href});
