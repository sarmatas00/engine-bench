/**
 * Pages 18 and 20's volume compositor: page 14's two-pass design (opaque pass
 * into a multisampled target with a depth texture, then a front-to-back march
 * that stops at the buildings). Three.js ships no volume renderer, so this is
 * code we would own. Shared so both pages march the identical shader.
 *
 * The step cap is VOLUME_MAX_SAMPLES (a ~2.8 km box diagonal; page 14's 512
 * would truncate grazing rays), and the opacity curve comes in as uniforms
 * built from opacityNodes(), the same nodes the vtk.js pages hand
 * vtkPiecewiseFunction.
 */
import {COLORMAP_GLSL} from './colormap';
import {VOLUME_MAX_SAMPLES} from './flagship-volume';

export const VOLUME_VERTEX_GLSL = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export const VOLUME_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
precision highp sampler3D;
#include <packing>
uniform highp sampler3D uData;
uniform vec3 uOrigin;
uniform vec3 uSpacing;
uniform vec3 uSize;
uniform vec2 uClim;
uniform vec3 uAlphaNodes;
uniform float uStep;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform sampler2D uOpaqueDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
varying vec3 vWorld;
${COLORMAP_GLSL}
float benchSampleVolume(vec3 world) {
  vec3 index = (world - uOrigin) / uSpacing;
  return texture(uData, (index + 0.5) / uSize).r;
}
float benchVolumeAlpha(float f) {
  return f < 0.5 ? mix(uAlphaNodes.x, uAlphaNodes.y, f / 0.5)
                 : mix(uAlphaNodes.y, uAlphaNodes.z, (f - 0.5) / 0.5);
}
void main() {
  vec3 rayOrigin = cameraPosition;
  vec3 rayDir = normalize(vWorld - rayOrigin);
  vec3 ta = (uBoxMin - rayOrigin) / rayDir;
  vec3 tb = (uBoxMax - rayOrigin) / rayDir;
  vec3 tsmall = min(ta, tb);
  vec3 tbig = max(ta, tb);
  float tNear = max(max(max(tsmall.x, tsmall.y), tsmall.z), 0.0);
  float tFar = min(min(tbig.x, tbig.y), tbig.z);
  if (tFar <= tNear) discard;
  float opaqueDepth = texture(uOpaqueDepth, gl_FragCoord.xy / uResolution).x;
  float opaqueViewZ = perspectiveDepthToViewZ(opaqueDepth, uNear, uFar);
  float rayViewZ = (viewMatrix * vec4(rayDir, 0.0)).z;
  if (rayViewZ < 0.0) tFar = min(tFar, opaqueViewZ / rayViewZ);
  if (tFar <= tNear) discard;
  vec4 acc = vec4(0.0);
  float t = tNear + 0.5 * uStep;
  for (int i = 0; i < ${VOLUME_MAX_SAMPLES}; i++) {
    if (t >= tFar || acc.a >= 0.99) break;
    float value = benchSampleVolume(rayOrigin + rayDir * t);
    float f = clamp((value - uClim.x) / (uClim.y - uClim.x), 0.0, 1.0);
    float a = benchVolumeAlpha(f);
    acc.rgb += (1.0 - acc.a) * a * benchColormap(f);
    acc.a += (1.0 - acc.a) * a;
    t += uStep;
  }
  if (acc.a < 0.004) discard;
  gl_FragColor = acc;
}`;

export const BLIT_VERTEX_GLSL = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const BLIT_FRAGMENT_GLSL = /* glsl */ `
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`;
