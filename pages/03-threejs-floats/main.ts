import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mountChrome, requireWebGL2} from '@lib/chrome';
import {makeMap, whenIdle} from '@lib/deck-map';
import {DEM_SOURCE} from '@lib/tiles';
import {loadScene, datasetChrome} from '@lib/dataset';

if (requireWebGL2()) (async () => {
  const scene = await loadScene();
  let map: maplibregl.Map;
  const ui = mountChrome({
    num: '03', title: 'Three.js floats',
    expect: scene.dataset === 'real'
      ? 'the same real buildings drawn by Three.js inside a MapLibre custom layer. With terrain on, the same ones are buried and the same ones poke through as on page 02 — the same buried result, from a different engine.'
      : 'the same six blocks drawn by Three.js inside a MapLibre custom layer. With terrain on, five are buried in the hill and one just pokes through — the same buried result as page 02.',
    claim: 'it attaches to MapLibre the same way, so it inherits the terrain limit exactly.',
    dataset: datasetChrome(scene),
    controls: [{kind: 'toggle', id: 'terrain', label: 'Terrain', value: true, onChange: v => map.setTerrain(v ? {source: DEM_SOURCE, exaggeration: 1} : null)}]
  });
  map = makeMap(ui.canvasHost, scene);

  const origin = maplibregl.MercatorCoordinate.fromLngLat(scene.anchor, 0);
  const scale = origin.meterInMercatorCoordinateUnits();
  // Model space (glTF Y-up, metres) → mercator: translate to origin, scale metres, flip so +Z(glTF -Z = local +y) points north.
  const modelMatrix = new THREE.Matrix4()
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(scale, -scale, scale))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  // Gate ready() on both the async glTF load and at least one custom-layer render — MapLibre's
  // `idle` fires as soon as its own tiles settle, with no idea the GLTFLoader is still fetching.
  let loaded = false, rendered = false, idle = false, signaled = false;
  const maybeReady = () => { if (loaded && rendered && idle && !signaled) { signaled = true; ui.ready(); } };

  const layer: maplibregl.CustomLayerInterface = {
    id: 'three-blocks', type: 'custom', renderingMode: '3d',
    onAdd(m, gl) {
      const s = this as any;
      s.camera = new THREE.Camera();
      s.scene = new THREE.Scene();
      s.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      new GLTFLoader().load(scene.files.blocks, g => {
        g.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = new THREE.MeshBasicMaterial({color: 0xd9534f}); });
        s.scene.add(g.scene);
        loaded = true;
        maybeReady();
      });
      s.renderer = new THREE.WebGLRenderer({canvas: m.getCanvas(), context: gl, antialias: true});
      s.renderer.autoClear = false;
    },
    render(_gl, options) {
      const s = this as any;
      const m = new THREE.Matrix4().fromArray(options.defaultProjectionData.mainMatrix);
      s.camera.projectionMatrix = m.multiply(modelMatrix);
      s.renderer.resetState();
      s.renderer.render(s.scene, s.camera);
      map.triggerRepaint();
      rendered = true;
      maybeReady();
    }
  };

  map.on('load', () => {
    map.addLayer(layer);
    map.setTerrain({source: DEM_SOURCE, exaggeration: 1});
    ui.probe('MapLibre custom layer → type "custom" → not in LAYERS_TO_TEXTURES → drawn in world space at the z in the file, never draped.');
    whenIdle(map, () => { idle = true; maybeReady(); });
  });
})();
