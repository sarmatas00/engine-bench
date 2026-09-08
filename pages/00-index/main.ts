import '@lib/chrome.css';
import {currentDataset} from '@lib/dataset';

const rows: [string, string, string, string][] = [
  ['01-maplibre-baseline', 'MapLibre baseline', 'Blocks follow the hill with terrain on.', "MapLibre's own layer types drape."],
  ['02-deckgl-floats', 'deck.gl floats', 'Same blocks via deck.gl stay at sea level when terrain is on.', 'Limitation one.'],
  ['03-threejs-floats', 'Three.js floats', 'Same via a Three.js custom layer. Same result.', 'Switching engine does not escape it.'],
  ['04-values-lost', 'Values lost', 'A mesh with _TEMPERATURE renders flat grey on both stock paths.', 'Limitation two.'],
  ['05-fix-a1-deck-terrain', 'Fix A1', 'deck.gl owns the terrain; blocks drape but flatten.', 'Cost of A1.'],
  ['06-fix-a2-predraped', 'Fix A2', 'Pre-draped file sits on the hill; exaggeration detaches it.', 'A2 recommended.'],
  ['07-fix-b1-shader', 'Fix B1', 'Custom shader colours by _TEMPERATURE with live sliders.', 'B1 works, is small.'],
  ['08-fix-b2-baked', 'Fix B2', 'Baked COLOR_0 on a stock layer; sliders disabled.', 'B2 recommended.'],
  ['09-cesium-terrain', 'Cesium terrain', 'Polygon clamps; model clamps only at its origin.', 'Why Cesium lost.'],
  ['10-cesium-voxels', 'Cesium voxels', '3-D temperature plume as a VoxelPrimitive.', 'Why it was reopened.'],
  ['11-vtkjs-grid', 'VTK.js', 'Grid volume + isosurface; the mesh itself never loaded.', 'Narrowed to one job.'],
  ['12-playcanvas', 'PlayCanvas', 'Mesh renders; no CRS, basemap or terrain API.', 'Rejected.']
];

const ds = currentDataset();
const q = ds === 'real' ? '?dataset=real' : '';
document.body.innerHTML = `
  <header class="bench"><h1>engine-bench</h1>
  <div class="expect">Every page draws the same scene in its own engine. Differences are the engine's.</div>
  <div class="dataset">Dataset: <b>${ds}</b> ·
    <a href="/00-index/">synthetic</a> · <a href="/00-index/?dataset=real">real (Gothenburg tile)</a>
    — the real dataset needs <code>scripts/real/stage1_build.py</code> to have run.</div></header>
  <main style="padding:14px;overflow:auto"><table style="border-collapse:collapse">
  <thead><tr><th align="left">Page</th><th align="left">What you should see</th><th align="left">Claim</th></tr></thead>
  <tbody>${rows.map(([slug, t, e, c]) => `<tr><td style="padding:4px 12px 4px 0"><a href="/${slug}/${q}">${slug.slice(0, 2)} · ${t}</a></td><td style="padding:4px 12px 4px 0">${e}</td><td>${c}</td></tr>`).join('')}</tbody>
  </table></main>`;
window.__bench = {ready: true, probe: {}};
