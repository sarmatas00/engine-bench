import{t as e}from"./colormap-CL31EnH4.js";import{s as t}from"./flagship-volume-CzW75_Kr.js";var n=`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,r=`
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
${e}
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
  for (int i = 0; i < ${t}; i++) {
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
}`,i=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,a=`
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`;export{n as i,i as n,r,a as t};