import * as THREE from "three";
import { opacityNodes, type SpikeScene, VOLUME_STEP_M } from "./scene-data";

const MAX_SAMPLES = 600;

// Adapted from engine-bench's threejs-volume.ts: the ray starts at uEye and stops at the buildings' depth, both given
// as local metres through uClipToScene, so the same shader serves a Three.js camera and MapLibre's matrix.
const VOLUME_VERTEX = /* glsl */ `
varying vec3 vScene;
void main() {
  vScene = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const VOLUME_FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform sampler3D uData;
uniform sampler2D uDepth;
uniform mat4 uClipToScene;
uniform vec3 uEye;
uniform vec3 uOrigin, uSpacing, uSize, uBoxMin, uBoxMax, uAlpha;
uniform vec2 uClim, uResolution;
uniform float uStep;
varying vec3 vScene;
vec3 colormap(float u) {
  vec3 s0 = vec3(33., 102., 172.) / 255., s1 = vec3(67., 200., 220.) / 255., s2 = vec3(120., 200., 80.) / 255.;
  vec3 s3 = vec3(250., 220., 50.) / 255., s4 = vec3(200., 30., 30.) / 255.;
  float x = clamp(u, 0., 1.) * 4.;
  if (x < 1.) return mix(s0, s1, x);
  if (x < 2.) return mix(s1, s2, x - 1.);
  if (x < 3.) return mix(s2, s3, x - 2.);
  return mix(s3, s4, x - 3.);
}
void main() {
  vec3 dir = normalize(vScene - uEye);
  vec3 ta = (uBoxMin - uEye) / dir, tb = (uBoxMax - uEye) / dir;
  vec3 tn = min(ta, tb), tf = max(ta, tb);
  float tNear = max(max(max(tn.x, tn.y), tn.z), 0.0);
  float tFar = min(min(tf.x, tf.y), tf.z);
  vec2 uv = gl_FragCoord.xy / uResolution;
  float depth = texture(uDepth, uv).x;
  if (depth < 1.0) {
    vec4 hit = uClipToScene * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    tFar = min(tFar, distance(uEye, hit.xyz / hit.w));
  }
  if (tFar <= tNear) discard;
  vec4 acc = vec4(0.0);
  float t = tNear + 0.5 * uStep;
  for (int i = 0; i < ${MAX_SAMPLES}; i++) {
    if (t >= tFar || acc.a >= 0.99) break;
    vec3 index = (uEye + dir * t - uOrigin) / uSpacing;
    float f = clamp((texture(uData, (index + 0.5) / uSize).r - uClim.x) / (uClim.y - uClim.x), 0.0, 1.0);
    float a = f < 0.5 ? mix(uAlpha.x, uAlpha.y, f / 0.5) : mix(uAlpha.y, uAlpha.z, (f - 0.5) / 0.5);
    acc.rgb += (1.0 - acc.a) * a * colormap(f);
    acc.a += (1.0 - acc.a) * a;
    t += uStep;
  }
  if (acc.a < 0.004) discard;
  gl_FragColor = acc;
}`;

/**
 * The spike scene in Three.js, drawn from a clip-space matrix alone, so a Three.js camera (panel) and MapLibre's
 * projection (custom layer) drive the identical draw. Buildings first into a depth target, then buildings and volume.
 */
export class ThreeSpikeScene {
  readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly depthScene = new THREE.Scene();
  private readonly depthTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  /** null when the scene has no volume: then the depth pass is skipped too. */
  private readonly volumeMaterial: THREE.ShaderMaterial | null = null;
  private readonly disposables: { dispose(): void }[] = [];

  constructor(data: SpikeScene) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.buildings.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(data.buildings.normals, 3));
    const { colors } = data.buildings;
    if (colors) {
      // trap: Three.js takes vertex colours as linear light and brightens them on output, which washes the sRGB
      // colormap out (every dark blue turns pale). Convert to linear, so the screen shows the colormap's own colours.
      const linear = new Float32Array(colors.length);
      const c = new THREE.Color();
      for (let i = 0; i < colors.length; i += 3) {
        c.setRGB(colors[i]! / 255, colors[i + 1]! / 255, colors[i + 2]! / 255, THREE.SRGBColorSpace);
        linear.set([c.r, c.g, c.b], i);
      }
      geometry.setAttribute("color", new THREE.BufferAttribute(linear, 3));
    }
    const buildingMaterial = colors
      ? new THREE.MeshLambertMaterial({ vertexColors: true })
      : new THREE.MeshLambertMaterial({ color: 0xb8c4cf });
    this.scene.add(new THREE.Mesh(geometry, buildingMaterial));
    this.depthScene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ colorWrite: false })));
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(0.4, -0.6, 1);
    this.scene.add(sun);

    this.depthTarget.depthTexture = new THREE.DepthTexture(1, 1);
    this.disposables.push(geometry, buildingMaterial, this.depthTarget, this.depthTarget.depthTexture);
    if (!data.field) return;
    const { dims, origin, spacing, range, speed } = data.field;
    const texture = new THREE.Data3DTexture(speed, ...dims);
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    const boxMin = new THREE.Vector3(...origin);
    const boxMax = new THREE.Vector3(...dims.map((n, i) => origin[i]! + (n - 1) * spacing[i]!));
    const [, mid, top] = opacityNodes(range);
    this.volumeMaterial = new THREE.ShaderMaterial({
      vertexShader: VOLUME_VERTEX,
      fragmentShader: VOLUME_FRAGMENT,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        uData: { value: texture },
        uDepth: { value: this.depthTarget.depthTexture },
        uClipToScene: { value: new THREE.Matrix4() },
        uEye: { value: new THREE.Vector3() },
        uOrigin: { value: boxMin.clone() },
        uSpacing: { value: new THREE.Vector3(...spacing) },
        uSize: { value: new THREE.Vector3(...dims) },
        uBoxMin: { value: boxMin },
        uBoxMax: { value: boxMax },
        uAlpha: { value: new THREE.Vector3(0, mid![1], top![1]) },
        uClim: { value: new THREE.Vector2(...range) },
        uResolution: { value: new THREE.Vector2() },
        uStep: { value: VOLUME_STEP_M },
      },
    });
    const box = new THREE.BoxGeometry(...boxMax.clone().sub(boxMin).toArray());
    box.translate(...boxMin.clone().add(boxMax).multiplyScalar(0.5).toArray());
    const volume = new THREE.Mesh(box, this.volumeMaterial);
    volume.renderOrder = 1;
    this.scene.add(volume);
    this.disposables.push(texture, this.volumeMaterial, box);
  }

  /** Draws into whatever framebuffer `renderer` targets, from local metres to clip space through `sceneToClip`. */
  draw(
    renderer: THREE.WebGLRenderer,
    sceneToClip: THREE.Matrix4,
    width: number,
    height: number,
    target: THREE.WebGLRenderTarget | null = null,
  ) {
    this.camera.projectionMatrix.copy(sceneToClip);
    this.camera.projectionMatrixInverse.copy(sceneToClip).invert();
    if (!this.volumeMaterial) {
      renderer.setRenderTarget(target);
      renderer.render(this.scene, this.camera);
      return;
    }
    const uniforms = this.volumeMaterial.uniforms as Record<"uClipToScene" | "uEye" | "uResolution", THREE.IUniform>;
    uniforms.uClipToScene.value.copy(this.camera.projectionMatrixInverse);
    // The eye is where every ray through the frustum meets: clip (0, 0, 1, 0) taken back to the scene.
    const eye = new THREE.Vector4(0, 0, 1, 0).applyMatrix4(this.camera.projectionMatrixInverse);
    uniforms.uEye.value.set(eye.x / eye.w, eye.y / eye.w, eye.z / eye.w);
    uniforms.uResolution.value.set(width, height);
    if (this.depthTarget.width !== width || this.depthTarget.height !== height) this.depthTarget.setSize(width, height);

    renderer.setRenderTarget(this.depthTarget);
    renderer.clear(true, true, false);
    renderer.render(this.depthScene, this.camera);
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
  }
}
