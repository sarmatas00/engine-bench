import {ScenegraphLayer, SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, loadGltfMesh, ORIGIN, METERS, GLTF_ORIENTATION, whenIdle} from '@lib/deck-map';
import {describeModel} from '@lib/probe';
import {LON0, LAT0} from '@lib/scene';

const ATTR = '_TEMPERATURE';
const VIEW = {center: [LON0, LAT0] as [number, number], zoom: 12.3, pitch: 45, bearing: 0};

if (requireWebGL2()) {
  const ui = mountChrome({
    num: '04', title: 'Values lost (Limitation 2)',
    expect: 'two copies of the field mesh, both flat grey. Left: glTF path (ScenegraphLayer). Right: mesh path (SimpleMeshLayer). The temperature attribute is in the file and never reaches the screen.',
    claim: 'Two of them — mesh and point cloud — copy only a fixed list of attributes and discard everything else immediately. The third path, used for glTF models, is subtler: the values survive all the way to a live buffer on the graphics card, and fail only at the final lookup because the standard shader does not declare them.'
  });
  const map = makeMap(ui.canvasHost, VIEW);

  class ProbedScenegraph extends ScenegraphLayer<any> {
    static layerName = 'ProbedScenegraph';
    draw(p: any) {
      const models = (this.state as any).models as any[] | undefined;
      if (models?.length && !window.__bench.probe.scenegraph) {
        const r = describeModel(models[0], ATTR);
        ui.setProbe('scenegraph', {loaded: true, ...r});
        ui.probe(`ScenegraphLayer  loaded=yes  bufferLayout=${r.inBufferLayout}  shaderLayout=${r.inShaderLayout}  vsSource=${r.inVsSource}`);
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
      }
      super.draw(p);
    }
  }

  map.on('load', async () => {
    const mesh = await loadGltfMesh('/data/field.glb');
    ui.probe(`glTF attributes in file: ${mesh.attributeNames.join(', ')}`);
    ui.probe('normalizeGeometryAttributes (simple-mesh-layer.ts:44) returns exactly: positions, colors, normals, texCoords');
    makeOverlay(map, [
      new ProbedScenegraph({id: 'sg', data: [0], scenegraph: '/data/field.glb',
        coordinateSystem: METERS, coordinateOrigin: ORIGIN, getPosition: () => [-1050, 0, 0], getOrientation: GLTF_ORIENTATION, _lighting: 'flat'}),
      new ProbedSimpleMesh({id: 'sm', data: [0], mesh,
        coordinateSystem: METERS, coordinateOrigin: ORIGIN, getPosition: () => [1050, 0, 0], getColor: [180, 180, 180]})
    ]);
    ui.probe('accessors: model.bufferLayout[].name / model.pipeline.shaderLayout.attributes[].name / model.props.vs');
    whenIdle(map, () => ui.ready());
  });
}
