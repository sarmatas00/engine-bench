import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, ORIGIN, METERS, whenIdle} from '@lib/deck-map';
import {DEM_SOURCE} from '@lib/synth-tiles';

if (requireWebGL2()) {
  let map: ReturnType<typeof makeMap>;
  const ui = mountChrome({
    num: '02', title: 'deck.gl floats (Limitation 1)',
    expect: 'the same six blocks, now drawn by deck.gl, stay at sea level while the terrain rises around them: five vanish inside the hill and one just pokes through. Toggle terrain off and all six reappear on the flat map.',
    claim: 'with terrain enabled, "the deck.gl data with z=0 are rendered at the sea level and not aligned with the terrain surface".',
    controls: [{kind: 'toggle', id: 'terrain', label: 'Terrain', value: true, onChange: v => map.setTerrain(v ? {source: DEM_SOURCE, exaggeration: 1} : null)}]
  });
  map = makeMap(ui.canvasHost);
  map.on('load', async () => {
    const mesh = await loadGltfMesh('/data/blocks.glb');
    makeOverlay(map, [new SimpleMeshLayer({
      id: 'blocks', data: [0], mesh,
      coordinateSystem: METERS, coordinateOrigin: ORIGIN, getPosition: () => [0, 0, 0],
      getColor: [217, 83, 79]
    })]);
    map.setTerrain({source: DEM_SOURCE, exaggeration: 1});
    ui.probe('MapLibre drapes only: background, fill, line, raster, hillshade, color-relief  (src/webgl/render_to_texture.ts:17)');
    ui.probe('Layer type "custom" — how deck.gl, Three.js or anything external attaches — is not in that list.');
    ui.probe('h(x, y) ≥ 5 m across the whole scene, so sea-level geometry is always below ground here — buried, never floating.');
    ui.probe('maplibre-gl pinned to 5.24.0: @deck.gl/mapbox 9.4.0 interleaved mode reads map.transform, removed from Map in maplibre-gl 6.x.');
    whenIdle(map, () => ui.ready());
  });
}
