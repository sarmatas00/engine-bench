import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, origin, METERS, whenIdle} from '@lib/deck-map';
import {DEM_SOURCE} from '@lib/tiles';
import {loadScene, datasetChrome} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  let map: ReturnType<typeof makeMap>;
  let exaggeration = 1;
  const ui = mountChrome({
    num: '06', title: 'Fix A2 — pre-draped in the pipeline',
    expect: scene.dataset === 'real'
      ? 'the real buildings now sit on the real ground — most of them on the flat, a handful up on the Skansen Kronan hill. Move the exaggeration slider away from 1.0 and they detach: the file was draped against one terrain version. At 2.0 the ground rises by its own height, so the median building takes on 3.7 m of ground against its 9.4 m of height and the hilltop one is swallowed by 50 m.'
      : 'the deck.gl blocks now sit on the hill. Move the exaggeration slider away from 1.0 and they detach: the file was draped against one terrain version.',
    claim: 'Sample the elevation at each point of the mesh when we generate it, so what we publish already sits on the ground. Cost: a new pipeline step, artifacts tied to a terrain version, and no switching terrain on the fly.',
    decision: 'A2 works and is the cheapest fix for Limitation 1, which is why it is the MVP recommendation. Its cost is the exaggeration slider: the file is draped against one terrain version, so terrain cannot change at runtime.',
    dataset: datasetChrome(scene),
    controls: [{kind: 'range', id: 'exag', label: 'Terrain exaggeration', min: 0.5, max: 2, step: 0.05, value: 1,
      onChange: v => { exaggeration = v; map.setTerrain({source: DEM_SOURCE, exaggeration: v}); }}]
  });
  map = makeMap(ui.canvasHost, scene);
  map.on('load', async () => {
    const mesh = await loadGltfMesh(scene.files.blocksDraped);
    makeOverlay(map, [new SimpleMeshLayer({id: 'blocks', data: [0], mesh,
      coordinateSystem: METERS, coordinateOrigin: origin(scene), getPosition: () => [0, 0, 0], getColor: [40, 140, 80]})]);
    map.setTerrain({source: DEM_SOURCE, exaggeration});
    ui.probe(scene.dataset === 'real'
      ? 'blocks-draped.glb: buildings at their real ground height. deck.gl still draws at the z in the file; the file just has the right z.'
      : 'blocks-draped.glb: base z = h(x, y) sampled in scripts/generate.ts. deck.gl still draws at the z in the file; the file just has the right z.');
    whenIdle(map, () => ui.ready());
  });
})();
