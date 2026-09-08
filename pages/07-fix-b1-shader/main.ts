import {mountChrome, requireWebGL2, noFieldForThisDataset} from '@lib/chrome';
import {makeMap, makeOverlay, origin, METERS, GLTF_ORIENTATION, whenIdle} from '@lib/deck-map';
import {describeModel} from '@lib/probe';
import {TemperatureScenegraphLayer} from '@lib/temperature-layer';
import {loadScene, datasetChrome, fieldView, scaleMinBounds, scaleMaxBounds} from '@lib/dataset';

const ATTR = '_TEMPERATURE';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  let overlay: ReturnType<typeof makeOverlay> | undefined;
  let [tMin, tMax] = scene.colourRange;

  const ui = mountChrome({
    num: '07', title: 'Fix B1 — custom shader',
    expect: !scene.hasField
      ? 'nothing — this dataset has no temperature field (stage 2 has not run), so there is no mesh to colour. See the probe panel below for how to generate one.'
      : scene.dataset === 'real'
      ? 'the real ground mesh coloured by _TEMPERATURE, live: deep blue nearly everywhere, with cyan-to-red rims hugging the building walls and white gaps where the buildings themselves stand. Read the header range before the colours: the solve pins the ground to 18 °C (Dirichlet), so the whole ramp spans 0.75 °C and those red rims are tenths of a degree, not a heat wave. Drag Scale max up to 30 and the surface goes almost uniformly blue — same data, honest scale. Same file as page 04; the only difference is one subclass with its own shader.'
      : 'the field mesh coloured by _TEMPERATURE, live. Drag the sliders and the colours move. Same file as page 04; the only difference is one subclass with its own shader.',
    claim: 'Because it fails at the shader, a small subclass that supplies its own shader does bind them. Cost: it leans on deck.gl internals that carry no stability promise, so it needs maintaining.',
    dataset: datasetChrome(scene),
    controls: [
      {kind: 'range', id: 'min', label: 'Scale min (°C)', ...scaleMinBounds(tMin), step: 1, value: tMin, onChange: v => { tMin = v; overlay?.setProps({layers: [build()]}); }},
      {kind: 'range', id: 'max', label: 'Scale max (°C)', ...scaleMaxBounds(tMax), step: 1, value: tMax, onChange: v => { tMax = v; overlay?.setProps({layers: [build()]}); }}
    ]
  });
  ui.setProbe('field', scene.hasField);
  if (!scene.hasField) { noFieldForThisDataset(ui, scene.name); return; }

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
    id: 'field', data: [0], scenegraph: scene.files.field,
    coordinateSystem: METERS, coordinateOrigin: origin(scene),
    getPosition: () => [0, 0, 0], getOrientation: GLTF_ORIENTATION, tMin, tMax
  });

  const map = makeMap(ui.canvasHost, scene, fieldView(scene));
  map.on('load', () => {
    overlay = makeOverlay(map, [build()]);
    ui.probe('src/lib/temperature-layer.ts: getShaders() override + a 2-float uniform block. Depends on deck.gl shader source strings (no stability promise).');
    // Sample the center pixel while the WebGL context is live, right after a render, so the
    // smoke test has a colour reading that does not depend on preserveDrawingBuffer being set —
    // by the time a test's page.evaluate runs, the drawing buffer may already be cleared/swapped.
    overlay.setProps({
      onAfterRender: () => {
        // Wait until the ProbedTemperature layer's draw() has actually loaded the model —
        // otherwise an early frame (before the async glTF load resolves) samples the bare
        // basemap background instead of the coloured mesh.
        if (window.__bench.probe.centerPixel || !window.__bench.probe.scenegraph) return;
        const canvas = document.querySelector('#host canvas.maplibregl-canvas') as HTMLCanvasElement | null;
        const gl = canvas?.getContext('webgl2') as WebGL2RenderingContext | null;
        if (!canvas || !gl) return;
        const cx = Math.floor(canvas.width / 2);
        const cy = Math.floor(canvas.height / 2);
        const px = new Uint8Array(4);
        gl.readPixels(cx, gl.drawingBufferHeight - cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        ui.setProbe('centerPixel', [px[0], px[1], px[2]]);
      }
    });
    whenIdle(map, () => ui.ready());
  });
})();
