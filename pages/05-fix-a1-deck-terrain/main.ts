import {TerrainLayer} from '@deck.gl/geo-layers';
import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {_TerrainExtension as TerrainExtension} from '@deck.gl/extensions';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, ORIGIN, METERS, whenIdle} from '@lib/deck-map';
import {extentBounds, extentImage} from '@lib/synth-tiles';

if (requireWebGL2()) {
  let overlay: ReturnType<typeof makeOverlay>;
  let mode: 'drape' | 'offset' = 'drape';
  let mesh: Awaited<ReturnType<typeof loadGltfMesh>>;
  let dem = '', tex = '';

  const layers = () => [
    new TerrainLayer({id: 'terrain', elevationData: dem, texture: tex, bounds: extentBounds(),
      elevationDecoder: {rScaler: 6553.6, gScaler: 25.6, bScaler: 0.1, offset: -10000},
      meshMaxError: 2, operation: 'terrain+draw', material: false}),
    new SimpleMeshLayer({id: 'blocks', data: [0], mesh, coordinateSystem: METERS, coordinateOrigin: ORIGIN,
      getPosition: () => [0, 0, 0], getColor: [217, 83, 79],
      extensions: [new TerrainExtension()], terrainDrawMode: mode})
  ];

  const ui = mountChrome({
    num: '05', title: 'Fix A1 — deck.gl owns the terrain',
    expect: 'MapLibre is flat underneath; the hill is a deck.gl TerrainLayer. In "drape" the blocks are painted onto the surface and lose their height. In "offset" each vertex is lifted by the ground height, so a wide block tilts with the slope.',
    claim: 'deck.gl will drape onto any layer we mark as terrain — it picks the target by a property, not by a fixed class. Cost: MapLibre drops to a flat background map, the feature is experimental, and draping discards height.',
    controls: [{kind: 'select', id: 'mode', label: 'terrainDrawMode', options: ['drape', 'offset'], value: 'drape',
      onChange: v => { mode = v as any; overlay.setProps({layers: layers()}); }}]
  });
  const map = makeMap(ui.canvasHost);
  map.on('load', async () => {
    [dem, tex, mesh] = await Promise.all([extentImage('dem'), extentImage('map'), loadGltfMesh('/data/blocks.glb')]);
    overlay = makeOverlay(map, layers());
    ui.probe("terrain-effect.ts:74  layers.filter(l => l.props.operation.includes('terrain'))  — target chosen by property, so DTCC's terrain_surface_mesh qualifies.");
    ui.probe('TerrainExtension is exported from @deck.gl/extensions as experimental.');
    ui.probe(`terrainDrawMode in use: ${mode}  (auto-select rule, terrain-extension.ts: is3d || hasAnchor ? 'offset' : 'drape')`);
    whenIdle(map, () => ui.ready());
  });
}
