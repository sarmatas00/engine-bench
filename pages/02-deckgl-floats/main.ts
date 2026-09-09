import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, origin, METERS, whenIdle} from '@lib/deck-map';
import {DEM_SOURCE} from '@lib/tiles';
import {loadScene, datasetChrome} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  let map: ReturnType<typeof makeMap>;
  const ui = mountChrome({
    num: '02', title: 'deck.gl floats (Limitation 1)',
    expect: scene.dataset === 'real'
      ? 'the same real buildings, now drawn by deck.gl, stay at z = 0 while the terrain rises around them: the ones on the hill vanish inside it and the ones on low ground keep only the height that clears the ground. Toggle terrain off and they all stand full height on the flat map.'
      : 'the same six blocks, now drawn by deck.gl, stay at sea level while the terrain rises around them: five vanish inside the hill and one just pokes through. Toggle terrain off and all six reappear on the flat map.',
    claim: 'with terrain enabled, "the deck.gl data with z=0 are rendered at the sea level and not aligned with the terrain surface".',
    decision: 'Limitation 1 is real, and it holds on DTCC\'s own city data rather than only on a synthetic scene. The cause is a MapLibre constraint, not a deck.gl bug, so it binds anything we attach on top. This is the page that forces the choice between A1, A2 and A3.',
    correction: 'The briefing says our data sits \'at sea level, floating above or below the ground\'. Both datasets are above sea level everywhere, so z = 0 geometry is buried, never floating. The mechanism is exactly as described; the word is wrong.',
    findings: [
      'Nothing stands clear on the real tile, and not for the reason the plan predicted. The local zero is an empty low corner of the DEM, not where the city is: terrain under a footprint centroid is 1.20 m at its lowest, median 3.60 m, mean 5.65 m, max 53.00 m, against buildings 2.50–28.26 m tall (median 8.69 m). 58 of 217 vanish completely, including all 8 standing on ground above 20 m; the median building keeps 4.22 m of its 8.7 m above local ground, roughly half.',
      'Defect we found and fixed (found in Task 7, fixed in Task 3b): blocks.glb carried torn geometry. flatten_buildings re-based per face marker, but adjacent buildings share vertices, so a shared vertex was lowered twice by two different amounts — 11,171 of 37,672 triangles distorted, tallest vertical edge stretched from 16.59 m to 50.34 m, showing on screen as a 50 m spike where page 06 draws a clean octagon. Fixed by grouping on connected components so a welded pair moves as one rigid unit; every edge length now matches exactly. That spike was our bug, not tile behaviour.',
      'Probe wording corrected: the real DEM bottoms out at exactly 0.000 m by construction, so at the low point z = 0 geometry is at ground, not below it. Now reads \'nowhere above the ground\', which is exactly true on both datasets.',
      'Vertex-level, on the drawn mesh: 18,477 of 20,726 vertices drop by more than 1 m when buildings is flattened into buildings-flat (median 1.27 m, mean 2.84 m, max 50.34 m).',
    ],
    dataset: datasetChrome(scene),
    controls: [{kind: 'toggle', id: 'terrain', label: 'Terrain', value: true, onChange: v => map.setTerrain(v ? {source: DEM_SOURCE, exaggeration: 1} : null)}]
  });
  map = makeMap(ui.canvasHost, scene);
  map.on('load', async () => {
    const mesh = await loadGltfMesh(scene.files.blocks);
    makeOverlay(map, [new SimpleMeshLayer({
      id: 'blocks', data: [0], mesh,
      coordinateSystem: METERS, coordinateOrigin: origin(scene), getPosition: () => [0, 0, 0],
      getColor: [217, 83, 79]
    })]);
    map.setTerrain({source: DEM_SOURCE, exaggeration: 1});
    ui.probe('MapLibre drapes only: background, fill, line, raster, hillshade, color-relief  (src/webgl/render_to_texture.ts:17)');
    ui.probe('Layer type "custom" — how deck.gl, Three.js or anything external attaches — is not in that list.');
    const [zmin, zmax] = scene.relief;
    ui.probe(`terrain is ${zmin.toFixed(1)}–${zmax.toFixed(1)} m above the scene zero, so z = 0 geometry is nowhere above the ground here — buried, never floating.`);
    ui.probe('maplibre-gl pinned to 5.24.0: @deck.gl/mapbox 9.4.0 interleaved mode reads map.transform, removed from Map in maplibre-gl 6.x.');
    whenIdle(map, () => ui.ready());
  });
})();
