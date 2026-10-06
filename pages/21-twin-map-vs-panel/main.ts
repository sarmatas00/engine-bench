/**
 * Page 21: the dtcc-twin spike (NOTES.md "3D inside dtcc-twin"), outside Atlas so anyone can open it.
 * The same renderers, the same Chalmers scene and the same MapLibre 6.10, behind one variant switch.
 * Each 3D library loads only when its variant is picked, which is the lazy loading the twin needs (test #6).
 */
import 'maplibre-gl6/dist/maplibre-gl.css';
import {Map as MapLibreMap, NavigationControl, setWorkerUrl} from 'maplibre-gl6';
import workerUrl from 'maplibre-gl6/dist/maplibre-gl-worker.mjs?worker&url';
import {mountChrome} from '@lib/chrome';
import {loadSceneFiles} from '@lib/twin-demo/scene-files';

// MapLibre 6 looks for its worker next to its own module, which the bundler moves.
setWorkerUrl(workerUrl);

const VARIANTS = ['map-only', 'three-map', 'vtk-map', 'three-panel', 'vtk-panel'] as const;
type Variant = (typeof VARIANTS)[number];
const DEMO_AREA: [number, number, number, number] = [11.97, 57.686, 11.98, 57.692];
const STYLES = {bright: 'https://tiles.openfreemap.org/styles/bright', liberty: 'https://tiles.openfreemap.org/styles/liberty'};

const query = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(query.get(key) ?? '') ? (query.get(key) as T) : fallback;
const variant = pick('variant', VARIANTS, 'three-map');
const basemap = pick('basemap', ['bright', 'liberty'] as const, 'bright');
// The wind solve (scripts/twin-demo/) ran out of memory here; the page draws the smoke field until it's published.
const fieldName = 'smoke';
const onMap = variant === 'three-map' || variant === 'vtk-map';
const go = (key: string, value: string) => {
  const next = new URLSearchParams(location.search);
  next.set(key, value);
  location.search = next.toString();
};

const ui = mountChrome({
  num: '21',
  title: '3D on the map vs in a panel',
  expect: 'The Chalmers campus (Atlas\'s demo area) as LoD1 buildings and a volume, either drawn into the MapLibre map or in a panel beside it.',
  claim: 'Where 3D goes in the Twin, on the map or in its own panel, is a business decision. This page shows what each choice looks like and costs.',
  decision: 'On the map means Three.js: only it can be drawn inside the map, under its labels and among its 3D buildings. '
    + 'vtk.js can only sit on top of the map, covering labels. In a panel, either works.',
  findings: [
    'This is the dtcc-twin spike (dtcc-twin demo-atlas, MapLibre 6.10) without Atlas around it: the renderer code is the same files, the React wrapper is not. Measured inside Atlas: 60 FPS on every variant on an M4; panel drags leak nothing; both renderers needed an explicit WebGL context release on unmount.',
    'Switch the basemap to liberty and zoom in: MapLibre draws its own 3D buildings. three-map shares the map\'s depth buffer and stays under the labels; vtk-map paints over labels and the map\'s buildings alike.',
    'Neither renderer can stop the volume at MapLibre\'s own buildings: the map\'s depth buffer can\'t be sampled. The volume stops at the spike\'s own buildings.',
    'The 3D library is downloaded only when a 3D variant is open; the readouts show how much. In Atlas as spiked, both libraries sat in the entry chunk every page loads (+427 KB gzipped).',
    'Scene: 297 LoD1 buildings (dtcc-core, Lantmäteriet footprints and point cloud) and dtcc-core\'s synthetic smoke field, 64^3 over 0-100 m. A real dtcc-sim wind solve for this area was attempted and ran out of memory (about 260,000 unknowns against Docker\'s free memory); scripts/twin-demo/ holds it for a bigger machine.',
  ],
  controls: [
    {kind: 'select', id: 'variant', label: 'View', options: [...VARIANTS], value: variant, onChange: v => go('variant', v)},
    {kind: 'select', id: 'basemap', label: 'Basemap', options: ['bright', 'liberty'], value: basemap, onChange: v => go('basemap', v)},
    {kind: 'button', id: 'orbit', label: 'Orbit test (8 s)', onClick: () => void orbitTest()},
  ],
});

const bootMark = performance.now();
/** JavaScript actually fetched from the network since `after` (KB over the wire); cached files count 0. */
const scriptKb = (after: number) => Math.round(performance.getEntriesByType('resource')
  .filter((e): e is PerformanceResourceTiming => e instanceof PerformanceResourceTiming && /\.js(\?|$)/.test(e.name) && e.startTime >= after)
  .reduce((sum, e) => sum + e.transferSize, 0) / 1024);

// Layout: the map alone, or the map and a panel with a draggable splitter between them.
const root = document.createElement('div');
root.style.cssText = 'position:absolute;inset:0;display:flex';
ui.canvasHost.style.position = 'relative';
ui.canvasHost.prepend(root);
const mapPane = document.createElement('div');
mapPane.style.cssText = 'position:relative;flex:1 1 50%;min-width:200px';
root.append(mapPane);
let panelPane: HTMLDivElement | null = null;
if (!onMap && variant !== 'map-only') {
  const splitter = document.createElement('div');
  splitter.setAttribute('role', 'separator');
  splitter.style.cssText = 'flex:0 0 8px;cursor:col-resize;background:#d7dbe0';
  panelPane = document.createElement('div');
  panelPane.style.cssText = 'position:relative;flex:1 1 50%;min-width:200px';
  root.append(splitter, panelPane);
  splitter.addEventListener('pointerdown', down => {
    splitter.setPointerCapture(down.pointerId);
    const move = (e: PointerEvent) => {
      const box = root.getBoundingClientRect();
      const share = Math.min(0.85, Math.max(0.15, (e.clientX - box.left) / box.width));
      mapPane.style.flexBasis = `${share * 100}%`;
      panelPane!.style.flexBasis = `${(1 - share) * 100}%`;
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', () => splitter.removeEventListener('pointermove', move), {once: true});
  });
}

const map = new MapLibreMap({
  container: mapPane,
  style: STYLES[basemap],
  bounds: DEMO_AREA,
  fitBoundsOptions: {padding: 40},
  pitch: onMap ? 55 : 0,
  bearing: onMap ? -20 : 0,
  maxPitch: 80,
});
map.addControl(new NavigationControl({visualizePitch: true}), 'top-right');
const frameStamps: number[] = [];
map.on('render', () => frameStamps.push(performance.now()));
const mapLoaded = new Promise<void>(resolve => map.once('load', () => resolve()));

async function start() {
  const files = await loadSceneFiles(fieldName);
  ui.setReadout('scene data', `${Math.round(files.bytes / 1024)} KB (buildings + ${fieldName} field)`);
  if (files.field.source) ui.setReadout('volume source', files.field.source);
  await mapLoaded;
  ui.setReadout('page + map JS downloaded', `${scriptKb(0)} KB (0 if your browser had it cached)`);
  if (variant === 'map-only') return;

  // The lazy part: nothing below is in the page's first download.
  const loadMark = performance.now();
  const {buildScene} = await import('@lib/twin-demo/scene-data');
  const scene = buildScene(files.buildings, files.field, files.speed);
  if (variant === 'three-map') {
    const {threeMapLayer} = await import('@lib/twin-demo/three-hosts');
    const labels = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
    map.addLayer(threeMapLayer(scene), labels);
  } else if (variant === 'vtk-map') {
    const {mountVtkOverlay} = await import('@lib/twin-demo/vtk-hosts');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    mapPane.append(overlay);
    mountVtkOverlay(overlay, map, scene);
  } else if (variant === 'three-panel') {
    const {mountThreePanel} = await import('@lib/twin-demo/three-hosts');
    mountThreePanel(panelPane!, scene);
  } else {
    const {mountVtkPanel} = await import('@lib/twin-demo/vtk-hosts');
    mountVtkPanel(panelPane!, scene);
  }
  map.triggerRepaint();
  ui.setReadout('3D library downloaded on demand', `${scriptKb(loadMark)} KB in ${Math.round(performance.now() - loadMark)} ms (0 KB if cached)`);
  ui.setReadout('buildings', `${files.buildings.buildings.length} (${scene.buildings.triangles} triangles)`);
}

/** The orbit the twin spike was measured with: zoom 15.6, pitch 60, one turn in 8 s, rAF gaps. */
async function orbitTest() {
  map.jumpTo({center: [11.975, 57.689], zoom: 15.6, pitch: 60, bearing: 0});
  await new Promise(r => setTimeout(r, 800));
  const gaps: number[] = [];
  let last = 0, running = true;
  const tick = (t: number) => { if (last) gaps.push(t - last); last = t; if (running) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise<void>(resolve => { map.once('moveend', () => resolve()); map.easeTo({bearing: 359, duration: 8000, easing: x => x}); });
  running = false;
  gaps.sort((a, b) => a - b);
  const q = (p: number) => gaps[Math.min(gaps.length - 1, Math.floor(p * (gaps.length - 1)))]!;
  const refresh = q(0.1);
  const late = gaps.filter(g => g > refresh * 1.5).length / gaps.length;
  const result = {variant, basemap, field: fieldName, dpr: window.devicePixelRatio,
    window: `${innerWidth}x${innerHeight}`, p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), late: +(late * 100).toFixed(1)};
  ui.setReadout('orbit test', `p50 ${result.p50} ms, p95 ${result.p95} ms, ${result.late}% late frames `
    + `(${variant}, ${result.window} at ${result.dpr}x). Paste this line in the thread.`);
  ui.setProbe('orbit', result);
}

start().then(() => {
  ui.setProbe('twinDemo', {variant, basemap, field: fieldName, bootMs: Math.round(performance.now() - bootMark)});
  window.__bench.ready = true;
}).catch(error => {
  ui.fail(String(error instanceof Error ? error.message : error));
});
