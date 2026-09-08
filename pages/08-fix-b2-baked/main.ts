import {ScenegraphLayer, SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, ORIGIN, METERS, GLTF_ORIENTATION, whenIdle} from '@lib/deck-map';
import {describeModel} from '@lib/probe';
import {LON0, LAT0} from '@lib/scene';

const VIEW = {center: [LON0, LAT0] as [number, number], zoom: 12.3, pitch: 45, bearing: 0};

if (requireWebGL2()) {
  const ui = mountChrome({
    num: '08', title: 'Fix B2 — baked colours',
    expect: 'a coloured temperature field with no client code. Right copy (SimpleMeshLayer) must be coloured. Left copy (ScenegraphLayer) shows whether the glTF path honours COLOR_0 at all. Sliders are disabled: a new scale means regenerating the file. ScenegraphLayer ignores COLOR_0 on deck.gl 9.4.0 — B2 requires the mesh path (SimpleMeshLayer / Tile3DLayer mesh content).',
    claim: 'Decide the colour scale when we generate the file, and ship colours instead of raw values. No client work at all, works in every viewer today, and it is exactly what the Table already does. Cost: no changing the colour scale in the browser.',
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', min: 0, max: 20, step: 1, value: 10, disabled: true, onChange: () => {}},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', min: 20, max: 50, step: 1, value: 35, disabled: true, onChange: () => {}}
    ]
  });
  const map = makeMap(ui.canvasHost, VIEW);

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
    const mesh = await loadGltfMesh('/data/field-baked.glb');
    ui.probe(`glTF attributes in file: ${mesh.attributeNames.join(', ')}`);
    // loadGltfMesh's Attr type ({value, size}) drops the glTF accessor's `normalized` flag.
    // COLOR_0 here is a normalized Uint8 VEC3 accessor; without normalized:true, luma.gl's
    // VertexFormatDecoder rejects a 3-component uint8 vertex format outright (throws "size: 3").
    // Restore the flag on the object loadGltfMesh already returned — same attribute the file declares.
    const color0 = (mesh.attributes as any).COLOR_0;
    if (color0) color0.normalized = true;
    makeOverlay(map, [
      new ProbedScenegraph({id: 'sg', data: [0], scenegraph: '/data/field-baked.glb',
        coordinateSystem: METERS, coordinateOrigin: ORIGIN, getPosition: () => [-1050, 0, 0], getOrientation: GLTF_ORIENTATION, _lighting: 'flat'}),
      new ProbedSimpleMesh({id: 'sm', data: [0], mesh,
        coordinateSystem: METERS, coordinateOrigin: ORIGIN, getPosition: () => [1050, 0, 0], getColor: [255, 255, 255]})
    ]);
    whenIdle(map, () => ui.ready());
  });
}
