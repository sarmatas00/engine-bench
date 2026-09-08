import {TerrainLayer} from '@deck.gl/geo-layers';
import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {_TerrainExtension as TerrainExtension} from '@deck.gl/extensions';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, origin, METERS} from '@lib/deck-map';
import {loadScene, datasetChrome} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  let overlay: ReturnType<typeof makeOverlay>;
  let mode: 'drape' | 'offset' = 'drape';
  let mesh: Awaited<ReturnType<typeof loadGltfMesh>>;
  let dem = '', tex = '';
  let bounds: [number, number, number, number] = [0, 0, 0, 0];
  // Held so the ready-check below can read isLoaded off the exact instance deck.gl is tracking.
  let terrain: TerrainLayer;

  const layers = () => {
    terrain = new TerrainLayer({id: 'terrain', elevationData: dem, texture: tex, bounds,
      elevationDecoder: {rScaler: 6553.6, gScaler: 25.6, bScaler: 0.1, offset: -10000},
      meshMaxError: 2, operation: 'terrain+draw', material: false});
    return [
      terrain,
      new SimpleMeshLayer({id: 'blocks', data: [0], mesh, coordinateSystem: METERS, coordinateOrigin: origin(scene),
        getPosition: () => [0, 0, 0], getColor: [217, 83, 79],
        extensions: [new TerrainExtension()], terrainDrawMode: mode})
    ];
  };

  const ui = mountChrome({
    num: '05', title: 'Fix A1 — deck.gl owns the terrain',
    expect: scene.dataset === 'real'
      ? 'MapLibre is flat underneath; the Skansen Kronan hill is a deck.gl TerrainLayer built from the real DEM. In "drape" the buildings are painted flat onto the surface and lose their height. In "offset" each vertex is lifted by the ground height and they stand up again — but the ground under a building here spans only 0.7 m (median), so almost none of them visibly tilt.'
      : 'MapLibre is flat underneath; the hill is a deck.gl TerrainLayer. In "drape" the blocks are painted onto the surface and lose their height. In "offset" each vertex is lifted by the ground height, so a wide block tilts with the slope.',
    claim: 'deck.gl will drape onto any layer we mark as terrain — it picks the target by a property, not by a fixed class. Cost: MapLibre drops to a flat background map, the feature is experimental, and draping discards height.',
    dataset: datasetChrome(scene),
    controls: [{kind: 'select', id: 'mode', label: 'terrainDrawMode', options: ['drape', 'offset'], value: 'drape',
      onChange: v => { mode = v as any; overlay.setProps({layers: layers()}); ui.probe(`terrainDrawMode now: ${mode}`); }}]
  });
  const map = makeMap(ui.canvasHost, scene);
  map.on('load', async () => {
    const [images, m] = await Promise.all([scene.elevationImage(), loadGltfMesh(scene.files.blocks)]);
    dem = images.dem; tex = images.map; bounds = images.bounds; mesh = m;
    overlay = makeOverlay(map, layers());
    ui.probe("terrain-effect.ts:74  layers.filter(l => l.props.operation.includes('terrain'))  — target chosen by property, so DTCC's terrain_surface_mesh qualifies.");
    ui.probe('TerrainExtension is exported from @deck.gl/extensions as experimental.');
    ui.probe(`terrainDrawMode in use: ${mode}  (auto-select rule, terrain-extension.ts: is3d || hasAnchor ? 'offset' : 'drape')`);
    // MapLibre's `idle` fires as soon as its own flat raster tiles settle — it has no idea the
    // deck.gl TerrainLayer is still decoding the two data-URL images and building a terrain mesh,
    // or that TerrainExtension needs a render pass with that mesh loaded before it has a terrain
    // cover to drape the blocks onto. Wait for deck.gl itself to report the terrain as loaded and
    // for a render to actually happen with it, instead of trusting MapLibre's idle.
    let signaled = false;
    overlay.setProps({
      onAfterRender: () => {
        if (!signaled && terrain.isLoaded) { signaled = true; ui.ready(); }
      }
    });
  });
})();
