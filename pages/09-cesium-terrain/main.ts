import * as Cesium from 'cesium';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeViewer, enuMatrix, whenTilesLoaded} from '@lib/cesium-setup';
import {localToLngLat} from '@lib/geo';
import {loadScene, datasetChrome} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  const ui = mountChrome({
    num: '09', title: 'Cesium — terrain follows lines, not models',
    expect: scene.dataset === 'real'
      ? 'a blue polygon draped on the real terrain — it folds down the hill flank, one corner at 47 m against 1.5–7.8 m for the other three — and a gold line that stays straight because the ground it crosses only moves 2.8 m. The red glTF blocks clamp at one point, the tile anchor, and the anchor sits near the tile floor at 3.4 m, so here they are mostly sunk rather than floating: of the 103 building groups, 55 sink in — 14 of them out of sight — 47 float, clearing by at most 3.0 m, and 1 lands level.'
      : 'a blue polygon and a yellow line wrapped perfectly over the ridge; the red glTF blocks clamp only at their shared origin point, so the ones on the flanks still float clear of it.',
    claim: 'The only one that follows terrain natively, but only for flat outlines and lines, not for 3D shapes — so it does not solve our case.',
    dataset: datasetChrome(scene)
  });
  const viewer = makeViewer(ui.canvasHost, scene);

  // A flat outline over the hill: classified onto terrain, follows every fold.
  const k = scene.extent / 1000;
  const ring = [[-400, -600], [400, -600], [400, 600], [-400, 600]].flatMap(([x, y]) => localToLngLat(x * k, y * k));
  viewer.entities.add({polygon: {hierarchy: Cesium.Cartesian3.fromDegreesArray(ring),
    material: Cesium.Color.ROYALBLUE.withAlpha(0.45), classificationType: Cesium.ClassificationType.TERRAIN}});
  const line = [-900, -600, -300, 0, 300, 600, 900].flatMap(x => localToLngLat(x * k, 0));
  viewer.entities.add({polyline: {positions: Cesium.Cartesian3.fromDegreesArray(line), width: 6,
    material: Cesium.Color.GOLD, clampToGround: true}});

  // A 3-D model: heightReference clamps ONE point (the model origin), not every vertex.
  Cesium.Model.fromGltfAsync({url: scene.files.blocks, modelMatrix: enuMatrix(scene), scene: viewer.scene,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    color: Cesium.Color.fromCssColorString('#d9534f')})
    .then(model => {
      viewer.scene.primitives.add(model);
      ui.probe('polygon: classificationType TERRAIN  → per-pixel projection onto the terrain');
      ui.probe('polyline: clampToGround true         → per-pixel projection onto the terrain');
      ui.probe('Model: heightReference CLAMP_TO_GROUND → the origin (one point at the anchor) is clamped; vertices keep their z');
      whenTilesLoaded(viewer, () => ui.ready());
    });
})();
