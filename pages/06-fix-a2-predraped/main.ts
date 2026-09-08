import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, ORIGIN, METERS, whenIdle} from '@lib/deck-map';
import {DEM_SOURCE} from '@lib/synth-tiles';

if (requireWebGL2()) {
  let map: ReturnType<typeof makeMap>;
  let exaggeration = 1;
  const ui = mountChrome({
    num: '06', title: 'Fix A2 — pre-draped in the pipeline',
    expect: 'the deck.gl blocks now sit on the hill. Move the exaggeration slider away from 1.0 and they detach: the file was draped against one terrain version.',
    claim: 'Sample the elevation at each point of the mesh when we generate it, so what we publish already sits on the ground. Cost: a new pipeline step, artifacts tied to a terrain version, and no switching terrain on the fly.',
    controls: [{kind: 'range', id: 'exag', label: 'Terrain exaggeration', min: 0.5, max: 2, step: 0.05, value: 1,
      onChange: v => { exaggeration = v; map.setTerrain({source: DEM_SOURCE, exaggeration: v}); }}]
  });
  map = makeMap(ui.canvasHost);
  map.on('load', async () => {
    const mesh = await loadGltfMesh('/data/blocks-draped.glb');
    makeOverlay(map, [new SimpleMeshLayer({id: 'blocks', data: [0], mesh,
      coordinateSystem: METERS, coordinateOrigin: ORIGIN, getPosition: () => [0, 0, 0], getColor: [40, 140, 80]})]);
    map.setTerrain({source: DEM_SOURCE, exaggeration});
    ui.probe('blocks-draped.glb: base z = h(x, y) sampled in scripts/generate.ts. deck.gl still draws at the z in the file; the file just has the right z.');
    whenIdle(map, () => ui.ready());
  });
}
