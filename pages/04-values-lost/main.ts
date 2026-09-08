import {ScenegraphLayer, SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, origin, METERS, GLTF_ORIENTATION, whenIdle} from '@lib/deck-map';
import {describeModel} from '@lib/probe';
import {loadScene, datasetChrome, wideView, sideOffset} from '@lib/dataset';

const ATTR = '_TEMPERATURE';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  const ui = mountChrome({
    num: '04', title: 'Values lost (Limitation 2)',
    expect: 'two copies of the field mesh, both flat grey. Left: glTF path (ScenegraphLayer). Right: mesh path (SimpleMeshLayer). The temperature attribute is in the file and never reaches the screen.',
    claim: 'Two of them — mesh and point cloud — copy only a fixed list of attributes and discard everything else immediately. The third path, used for glTF models, is subtler: the values survive all the way to a live buffer on the graphics card, and fail only at the final lookup because the standard shader does not declare them.',
    dataset: datasetChrome(scene)
  });
  const map = makeMap(ui.canvasHost, scene, wideView(scene));

  class ProbedScenegraph extends ScenegraphLayer<any> {
    static layerName = 'ProbedScenegraph';
    draw(p: any) {
      const models = (this.state as any).models as any[] | undefined;
      if (models?.length && !window.__bench.probe.scenegraph) {
        const r = describeModel(models[0], ATTR);
        ui.setProbe('scenegraph', {loaded: true, ...r});
        ui.probe(`ScenegraphLayer  loaded=yes  bufferLayout=${r.inBufferLayout}  shaderLayout=${r.inShaderLayout}  vsSource=${r.inVsSource}`);
        ui.probe(`bufferLayout names: ${models[0].bufferLayout.map((l: any) => l.name).join(', ')}`);
      }
      super.draw(p);
    }
  }
  class ProbedSimpleMesh extends SimpleMeshLayer<any> {
    static layerName = 'ProbedSimpleMesh';
    draw(p: any) {
      const model = (this.state as any).model;
      if (model && !window.__bench.probe.simpleMesh) {
        const r = describeModel(model, ATTR);
        ui.setProbe('simpleMesh', {loaded: true, ...r});
        ui.probe(`SimpleMeshLayer  loaded=yes  bufferLayout=${r.inBufferLayout}  shaderLayout=${r.inShaderLayout}  vsSource=${r.inVsSource}`);
        ui.probe(`bufferLayout names: ${model.bufferLayout.map((l: any) => l.name).join(', ')}`);
      }
      super.draw(p);
    }
  }

  map.on('load', async () => {
    const mesh = await loadGltfMesh(scene.files.field);
    ui.probe(`glTF attributes in file: ${mesh.attributeNames.join(', ')}`);
    ui.probe('normalizeGeometryAttributes (simple-mesh-layer.ts:44) returns exactly: positions, colors, normals, texCoords');
    makeOverlay(map, [
      new ProbedScenegraph({id: 'sg', data: [0], scenegraph: scene.files.field,
        coordinateSystem: METERS, coordinateOrigin: origin(scene), getPosition: () => [-sideOffset(scene), 0, 0], getOrientation: GLTF_ORIENTATION, _lighting: 'flat', getColor: [180, 180, 180]}),
      new ProbedSimpleMesh({id: 'sm', data: [0], mesh,
        coordinateSystem: METERS, coordinateOrigin: origin(scene), getPosition: () => [sideOffset(scene), 0, 0], getColor: [180, 180, 180]})
    ]);
    ui.probe('accessors: model.bufferLayout[].name / model.pipeline.shaderLayout.attributes[].name / model.props.vs');
    whenIdle(map, () => ui.ready());
  });
})();
