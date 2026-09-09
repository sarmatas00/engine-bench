import '@lib/chrome.css';
import {currentDataset} from '@lib/dataset';

const rows: [string, string, string, string, string][] = [
  ['01-maplibre-baseline', 'MapLibre baseline', 'Blocks follow the hill with terrain on.', "MapLibre's own layer types drape.", 'Control page. Keeps MapLibre as the base map.'],
  ['02-deckgl-floats', 'deck.gl floats', 'Same blocks via deck.gl stay at sea level when terrain is on.', 'Limitation one.', 'Limitation 1 is real on our own data. Forces A1 / A2 / A3.'],
  ['03-threejs-floats', 'Three.js floats', 'Same via a Three.js custom layer. Same result.', 'Switching engine does not escape it.', 'Removes "use Three.js instead" from the table.'],
  ['04-values-lost', 'Values lost', 'A mesh with _TEMPERATURE renders flat grey on both stock paths.', 'Limitation two.', 'Limitation 2 is real and silent. Forces B1 / B2 / B3.'],
  ['05-fix-a1-deck-terrain', 'Fix A1', 'deck.gl owns the terrain; blocks drape but flatten.', 'Cost of A1.', 'A1 works. Costs the real basemap and all height.'],
  ['06-fix-a2-predraped', 'Fix A2', 'Pre-draped file sits on the hill; exaggeration detaches it.', 'A2 recommended.', 'A2 works. Cheapest fix for Limitation 1; terrain is then fixed at build time.'],
  ['07-fix-b1-shader', 'Fix B1', 'Custom shader colours by _TEMPERATURE with live sliders.', 'B1 works, is small.', 'B1 works and is small. Buys a live colour scale, needs maintaining.'],
  ['08-fix-b2-baked', 'Fix B2', 'Baked COLOR_0 on a stock layer; sliders disabled.', 'B2 recommended.', 'B2 works on the mesh path ONLY. Read the correction before confirming it.'],
  ['09-cesium-terrain', 'Cesium terrain', 'Polygon clamps; model clamps only at its origin.', 'Why Cesium lost.', 'Cesium does not solve Limitation 1 for 3D shapes.'],
  ['10-cesium-voxels', 'Cesium voxels', '3-D temperature plume as a VoxelPrimitive.', 'Why it was reopened.', 'The only engine that draws volume data. Candidate for a simulation view, not the map.'],
  ['11-vtkjs-grid', 'VTK.js', 'Grid volume + isosurface; the mesh itself never loaded.', 'Narrowed to one job.', 'Needs a grid, not our mesh. That conversion now exists and feeds page 10 too.'],
  ['12-playcanvas', 'PlayCanvas', 'Mesh renders; no CRS, basemap or terrain API.', 'Rejected.', 'Rejected on geography, not rendering.']
];

// The briefing's own argument order, so the index reads as the case rather than a file listing.
const sections: Record<string, string> = {
  '01-maplibre-baseline': 'The recommendation',
  '02-deckgl-floats': 'Limitation 1 — our data will not follow the hills',
  '04-values-lost': 'Limitation 2 — colouring by simulation results',
  '05-fix-a1-deck-terrain': 'What the fixes cost',
  '09-cesium-terrain': 'What else was considered, and why it lost'
};

// Three rows describe something the synthetic scene does and the real tile does not. Overridden
// rather than reworded for both, because the difference is the finding: on the real tile z = 0 is
// the tile floor (buried, never floating) and the solved field has no single hot spot to plume.
const realExpect: Record<string, string> = {
  '01-maplibre-baseline': '217 real footprints extruded onto the hillside with terrain on.',
  '02-deckgl-floats': 'Same buildings via deck.gl stay at the tile floor and are buried when terrain is on.',
  '10-cesium-voxels': 'The solved field as a VoxelPrimitive: a broad haze, not a sharp plume.'
};

const ds = currentDataset();
const q = ds === 'real' ? '?dataset=real' : '';
const blurb = ds === 'real'
  ? 'Every page draws the same real Gothenburg tile in its own engine. Differences are the engine\'s.'
  : 'Every page draws the same synthetic hill, six blocks and a temperature field. Differences are the engine\'s.';
// The round-trip result belongs on the index, not on any one page: it is a property of the
// pipeline behind the real dataset, and it is the one number in this bench that speaks to the
// blocker both threads of the briefing run into. The scope limit is stated because "no loss"
// reads far broader than what was actually compared.
const roundTrip = ds === 'real'
  ? '<div class="decision"><b>Round trip (dtcc-core #85):</b> on this tile, <code>save_volume_mesh</code> '
    + 'in the dtcc-sim container then <code>load_volume_mesh</code> natively preserved 50,729 vertices, '
    + '182,331 cells, the field name, the float64 dtype and every one of 50,729 temperature values exactly '
    + '(max |ΔT| = 0.0), across two different dtcc-core revisions. <b>Scope limit:</b> that compares counts '
    + 'and field values, not vertex coordinates, so it says nothing about the coordinate rounding #85 '
    + 'actually measures. Full record in <code>public/data/real/dataset.json</code> under '
    + '<code>stage2.roundtrip</code>.</div>'
  : '';
// Findings that belong to the pipeline rather than to any one page. Kept here so nothing in
// NOTES.md lives only in a file the meeting will not open.
const pipeline: string[] = [
  'maplibre-gl is pinned to 5.24.0, not 6.x: @deck.gl/mapbox 9.4.0 interleaved mode reads map.transform, which maplibre-gl 6.x removed from Map (verified on 6.8.0, map.transform === undefined). Every page in this bench depends on that pin.',
  "DTCC's dtcc-sim image does not build as shipped on an Apple Silicon machine, and neither failure is about FEniCSx or TetGen. First, conda-forge's compilers metapackage puts no plain ar on PATH and the Dockerfile never sets CMAKE_AR, so CMake execs the literal string CMAKE_AR-NOTFOUND at the vendored TetGen link step; adding binutils fixes it. Second, the dtcc-core wheel build with unbounded ninja parallelism exhausts host memory under amd64 emulation; CMAKE_BUILD_PARALLEL_LEVEL=2 fixes it. Both are one line each in dtcc-sim/Dockerfile.",
  'dtcc_core.__version__ does not exist on the installed package, so any tooling that records a version by reading it silently gets whatever default it passed. We only noticed because the round-trip measurement needed an attributable revision; the real commit is recoverable from pip\'s direct_url.json. A provenance trap worth fixing upstream.',
  "The container's solve and Stage 1's raster disagree on the tile's terrain minimum by 0.12 m: heat.xdmf's volume mesh bottoms at 1.2397 m absolute, exactly 80.0 m of domain height above its own floor, while dataset.json's z0 — the value everything here treats as local zero — is 1.1192 m. Harmless against 53.45 m of relief (0.2% of it), and exactly the class of cross-revision fact worth recording rather than rediscovering.",
  'The bench draws the real tile rotated 2.57° from true north. Local metres here are EPSG:3006 grid metres, while geo.ts converts them to lon/lat as a true-north offset from the anchor; the two agree only at the anchor and differ by 15.5–16.2 m at the tile corners. Uniform across every page and harmless for comparing engines, but this bench is not a georeferenced product and nothing in it should be screenshotted next to a real basemap.',
  'Defect we found and fixed: the colour-scale sliders misreported the real scale. One printed 17.99999987228115, and the Scale max track was hard-coded 20–50 so it could not contain the real 18.75 — the handle pinned left while the number beside it read 18.75.'
];
const pipelineBlock = `<details class="findings"><summary>Pipeline findings, not specific to one page (${pipeline.length}) — also in NOTES.md</summary><ul>${pipeline.map(f => `<li>${f}</li>`).join('')}</ul></details>`;
document.body.innerHTML = `
  <header class="bench"><h1>engine-bench</h1>
  <div class="expect">${blurb}</div>
  <div class="decision"><b>How to use this:</b> every page states what you should see, the briefing claim it tests, and what it decides. Where the render disagrees with the briefing there is an amber <b>correction</b> block — those are the corrections owed before the meeting, and they are collected with their numbers in <code>NOTES.md</code>.</div>
  <div class="dataset">Dataset: <b>${ds}</b> ·
    <a href="/00-index/">synthetic</a> · <a href="/00-index/?dataset=real">real (Gothenburg tile)</a>
    — the real dataset needs <code>scripts/real/stage1_build.py</code> to have run.</div>
  ${roundTrip}
  ${pipelineBlock}</header>
  <main style="padding:14px;overflow:auto"><table style="border-collapse:collapse">
  <thead><tr><th align="left">Page</th><th align="left">What you should see</th><th align="left">What it decides</th></tr></thead>
  <tbody>${rows.map(([slug, t, e, , d]) => (sections[slug] ? `<tr><td colspan="3" style="padding:14px 0 4px;font-weight:600;border-bottom:1px solid #ccc">${sections[slug]}</td></tr>` : '') + `<tr><td style="padding:4px 12px 4px 0;white-space:nowrap"><a href="/${slug}/${q}">${slug.slice(0, 2)} · ${t}</a></td><td style="padding:4px 12px 4px 0">${(ds === 'real' && realExpect[slug]) || e}</td><td style="padding:4px 0">${d}</td></tr>`).join('')}</tbody>
  </table></main>`;
window.__bench = {ready: true, probe: {}};
