import type { CustomLayerInterface } from "maplibre-gl6";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { sceneToMercator } from "./map-frame";
import { PANEL_START, type SpikeScene } from "./scene-data";
import { ThreeSpikeScene } from "./three-scene";

/** Three.js in its own canvas inside `host`, orbiting. Returns the teardown. */
export function mountThreePanel(host: HTMLElement, data: SpikeScene): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xf4f5f7);
  renderer.autoClear = false;
  host.append(renderer.domElement);
  const scene = new ThreeSpikeScene(data);
  const camera = new THREE.PerspectiveCamera(PANEL_START.fovDeg, 1, 5, 5000);
  camera.up.set(0, 0, 1);
  camera.position.set(...PANEL_START.position);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...PANEL_START.target);
  controls.update();

  const sceneToClip = new THREE.Matrix4();
  const size = new THREE.Vector2();
  renderer.setAnimationLoop(() => {
    renderer.getDrawingBufferSize(size);
    camera.updateMatrixWorld();
    sceneToClip.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    renderer.clear();
    scene.draw(renderer, sceneToClip, size.x, size.y);
  });
  const resize = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  });
  resize.observe(host);

  return () => {
    resize.disconnect();
    renderer.setAnimationLoop(null);
    controls.dispose();
    scene.dispose();
    renderer.dispose();
    // trap: dispose() frees Three.js's objects but keeps the WebGL context alive until GC; browsers cap live contexts.
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}

/** Three.js as a MapLibre custom layer, sharing the map's WebGL context and depth buffer. */
export function threeMapLayer(data: SpikeScene): CustomLayerInterface {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: ThreeSpikeScene | null = null;
  const toMercator = new THREE.Matrix4().fromArray(sceneToMercator(data.origin));
  const sceneToClip = new THREE.Matrix4();

  const draw = (gl: WebGL2RenderingContext, mainMatrix: ArrayLike<number>) => {
    if (!renderer || !scene) return;
    sceneToClip.fromArray(Array.from(mainMatrix)).multiply(toMercator);
    // trap: MapLibre and Three.js each cache GL state; reset Three.js's view of it before and after every draw.
    renderer.resetState();
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    scene.draw(renderer, sceneToClip, gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.resetState();
  };

  return {
    id: "spike-3d-three",
    type: "custom",
    renderingMode: "3d",
    onAdd(added, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: added.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      renderer.setPixelRatio(1);
      scene = new ThreeSpikeScene(data);
    },
    render(gl, { defaultProjectionData }) {
      draw(gl, defaultProjectionData.mainMatrix);
    },
    onRemove() {
      scene?.dispose();
      // trap: never dispose() a renderer built on MapLibre's context; that would lose the map's context too.
      renderer?.resetState();
      renderer = scene = null;
    },
  };
}
