import {ScenegraphLayer, SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2, noFieldForThisDataset} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, origin, METERS, GLTF_ORIENTATION, whenIdle} from '@lib/deck-map';
import {describeModel} from '@lib/probe';
import {loadScene, datasetChrome, wideView, sideOffset, scaleMinBounds, scaleMaxBounds} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  const [tMin, tMax] = scene.colourRange;
  const ui = mountChrome({
    num: '08', title: 'Fix B2 — baked colours',
    expect: scene.dataset === 'real'
      ? 'the same two copies as page 04, but the colours are baked into the file. Right copy (SimpleMeshLayer) is coloured — deep blue ground with warm rims along the building walls; left copy (ScenegraphLayer) is plain white, because deck.gl 9.4.0 ignores COLOR_0 on the glTF path, so B2 requires the mesh path (SimpleMeshLayer / Tile3DLayer mesh content). The baked scale is the header range, 0.75 °C end to end, and the sliders are disabled: changing it means regenerating the file.'
      : 'a coloured temperature field with no client code. Right copy (SimpleMeshLayer) must be coloured. Left copy (ScenegraphLayer) shows whether the glTF path honours COLOR_0 at all. Sliders are disabled: a new scale means regenerating the file. ScenegraphLayer ignores COLOR_0 on deck.gl 9.4.0 — B2 requires the mesh path (SimpleMeshLayer / Tile3DLayer mesh content).',
    claim: 'Decide the colour scale when we generate the file, and ship colours instead of raw values. No client work at all, works in every viewer today, and it is exactly what the Table already does. Cost: no changing the colour scale in the browser.',
    dataset: datasetChrome(scene),
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', ...scaleMinBounds(scene), step: 1, value: tMin, disabled: true, onChange: () => {}},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', ...scaleMaxBounds(scene), step: 1, value: tMax, disabled: true, onChange: () => {}}
    ]
  });
  ui.setProbe('field', scene.hasField);
  if (!scene.hasField) { noFieldForThisDataset(ui, scene.name); return; }
  const map = makeMap(ui.canvasHost, scene, wideView(scene));

  class ProbedScenegraph extends ScenegraphLayer<any> {
    static layerName = 'ProbedScenegraphColors';
    draw(p: any) {
      const models = (this.state as any).models as any[] | undefined;
      if (models?.length && !window.__bench.probe.scenegraph) {
        const r = describeModel(models[0], 'COLOR_0');
        ui.setProbe('scenegraph', r);
        ui.probe(`ScenegraphLayer  COLOR_0 bufferLayout=${r.inBufferLayout}  shaderLayout=${r.inShaderLayout}`);
        ui.probe(`ScenegraphLayer  bufferLayout names: ${models[0].bufferLayout.map((l: any) => l.name).join(', ')}`);
      }
      super.draw(p);
    }
  }
  class ProbedSimpleMesh extends SimpleMeshLayer<any> {
    static layerName = 'ProbedSimpleMeshColors';
    draw(p: any) {
      const model = (this.state as any).model;
      if (model && !window.__bench.probe.simpleMesh) {
        const r = describeModel(model, 'colors');
        ui.setProbe('simpleMesh', r);
        ui.probe(`SimpleMeshLayer  colors bufferLayout=${r.inBufferLayout}  shaderLayout=${r.inShaderLayout}`);
        ui.probe(`SimpleMeshLayer  bufferLayout names: ${model.bufferLayout.map((l: any) => l.name).join(', ')}`);
      }
      super.draw(p);
    }
  }

  map.on('load', async () => {
    const mesh = await loadGltfMesh(scene.files.fieldBaked);
    ui.probe(`glTF attributes in file: ${mesh.attributeNames.join(', ')}`);
    ui.probe('deck.gl renames COLOR_0 → colors in normalizeGeometryAttributes (mesh path); the glTF path keeps the original name.');
    makeOverlay(map, [
      new ProbedScenegraph({id: 'sg', data: [0], scenegraph: scene.files.fieldBaked,
        coordinateSystem: METERS, coordinateOrigin: origin(scene), getPosition: () => [-sideOffset(scene), 0, 0], getOrientation: GLTF_ORIENTATION, _lighting: 'flat'}),
      new ProbedSimpleMesh({id: 'sm', data: [0], mesh,
        coordinateSystem: METERS, coordinateOrigin: origin(scene), getPosition: () => [sideOffset(scene), 0, 0], getColor: [255, 255, 255]})
    ]);
    whenIdle(map, () => ui.ready());
  });
})();
