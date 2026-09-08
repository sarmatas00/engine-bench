import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, makeOverlay, ORIGIN, METERS, GLTF_ORIENTATION, whenIdle} from '@lib/deck-map';
import {describeModel} from '@lib/probe';
import {TemperatureScenegraphLayer} from '@lib/temperature-layer';
import {LON0, LAT0} from '@lib/scene';

const ATTR = '_TEMPERATURE';
const VIEW = {center: [LON0, LAT0] as [number, number], zoom: 13, pitch: 45, bearing: 0};

if (requireWebGL2()) {
  let overlay: ReturnType<typeof makeOverlay> | undefined;
  let tMin = 10, tMax = 35;

  const ui = mountChrome({
    num: '07', title: 'Fix B1 — custom shader',
    expect: 'the field mesh coloured by _TEMPERATURE, live. Drag the sliders and the colours move. Same file as page 04; the only difference is one subclass with its own shader.',
    claim: 'Because it fails at the shader, a small subclass that supplies its own shader does bind them. Cost: it leans on deck.gl internals that carry no stability promise, so it needs maintaining.',
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', min: 0, max: 20, step: 1, value: 10, onChange: v => { tMin = v; overlay?.setProps({layers: [build()]}); }},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', min: 20, max: 50, step: 1, value: 35, onChange: v => { tMax = v; overlay?.setProps({layers: [build()]}); }}
    ]
  });

  class ProbedTemperature extends TemperatureScenegraphLayer {
    static layerName = 'ProbedTemperature';
    draw(p: any) {
      const models = (this.state as any).models as any[] | undefined;
      if (models?.length && !window.__bench.probe.scenegraph) {
        const r = describeModel(models[0], ATTR);
        ui.setProbe('scenegraph', {loaded: true, ...r});
        ui.probe(`TemperatureScenegraphLayer  bufferLayout=${r.inBufferLayout}  shaderLayout=${r.inShaderLayout}  vsSource=${r.inVsSource}`);
      }
      super.draw(p);
    }
  }

  const build = () => new ProbedTemperature({
    id: 'field', data: [0], scenegraph: '/data/field.glb',
    coordinateSystem: METERS, coordinateOrigin: ORIGIN,
    getPosition: () => [0, 0, 0], getOrientation: GLTF_ORIENTATION, tMin, tMax
  });

  const map = makeMap(ui.canvasHost, VIEW);
  map.on('load', () => {
    overlay = makeOverlay(map, [build()]);
    ui.probe('src/lib/temperature-layer.ts: getShaders() override + a 2-float uniform block. Depends on deck.gl shader source strings (no stability promise).');
    whenIdle(map, () => ui.ready());
  });
}
