import{At as e,F as t,G as n,K as r,Nt as i,W as a,_t as o,c as s,d as c,g as l,ht as u,jt as d,kt as f,l as p,n as m,o as h,q as g,rt as _,s as v,t as y,v as b,vt as x,x as S,y as C,yt as w}from"./three.module-DPj775aY.js";import{t as T}from"./OrbitControls-BSvOUn1r.js";import{t as E}from"./21-twin-map-vs-panel-DxiKq_Gj.js";import{PANEL_START as D,opacityNodes as O}from"./scene-data--WfNMKj8.js";import{t as k}from"./sweref-BnQ7EwJe.js";function A(e){let t=(t,n)=>{let[r,i]=k.inverse([e[0]+t,e[1]+n]);return E.fromLngLat([r,i])},n=t(0,0),r=t(1,0),i=t(0,1),a=n.meterInMercatorCoordinateUnits();return new Float64Array([r.x-n.x,r.y-n.y,0,0,i.x-n.x,i.y-n.y,0,0,0,0,a,0,n.x,n.y,0,1])}var j=600,M=`
varying vec3 vScene;
void main() {
  vScene = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,N=`
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
  for (int i = 0; i < ${j}; i++) {
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
}`,P=class{scene=new x;camera=new p;depthScene=new x;depthTarget=new i(1,1,{depthBuffer:!0});volumeMaterial=null;disposables=[];constructor(i){let d=new s;d.setAttribute(`position`,new v(i.buildings.positions,3)),d.setAttribute(`normal`,new v(i.buildings.normals,3));let{colors:p}=i.buildings;if(p){let e=new Float32Array(p.length),t=new c;for(let n=0;n<p.length;n+=3)t.setRGB(p[n]/255,p[n+1]/255,p[n+2]/255,o),e.set([t.r,t.g,t.b],n);d.setAttribute(`color`,new v(e,3))}let _=p?new g({vertexColors:!0}):new g({color:12109007});this.scene.add(new n(d,_)),this.depthScene.add(new n(d,new r({colorWrite:!1}))),this.scene.add(new m(16777215,1.6));let y=new C(16777215,1.8);if(y.position.set(.4,-.6,1),this.scene.add(y),this.depthTarget.depthTexture=new b(1,1),this.disposables.push(d,_,this.depthTarget,this.depthTarget.depthTexture),!i.field)return;let{dims:x,origin:T,spacing:E,range:D,speed:k}=i.field,A=new l(k,...x);A.format=u,A.type=S,A.minFilter=A.magFilter=t,A.needsUpdate=!0;let j=new e(...T),P=new e(...x.map((e,t)=>T[t]+(e-1)*E[t])),[,F,I]=O(D);this.volumeMaterial=new w({vertexShader:M,fragmentShader:N,side:1,transparent:!0,depthWrite:!1,depthTest:!1,blending:5,blendSrc:201,blendDst:205,uniforms:{uData:{value:A},uDepth:{value:this.depthTarget.depthTexture},uClipToScene:{value:new a},uEye:{value:new e},uOrigin:{value:j.clone()},uSpacing:{value:new e(...E)},uSize:{value:new e(...x)},uBoxMin:{value:j},uBoxMax:{value:P},uAlpha:{value:new e(0,F[1],I[1])},uClim:{value:new f(...D)},uResolution:{value:new f},uStep:{value:2}}});let L=new h(...P.clone().sub(j).toArray());L.translate(...j.clone().add(P).multiplyScalar(.5).toArray());let R=new n(L,this.volumeMaterial);R.renderOrder=1,this.scene.add(R),this.disposables.push(A,this.volumeMaterial,L)}draw(e,t,n,r,i=null){if(this.camera.projectionMatrix.copy(t),this.camera.projectionMatrixInverse.copy(t).invert(),!this.volumeMaterial){e.setRenderTarget(i),e.render(this.scene,this.camera);return}let a=this.volumeMaterial.uniforms;a.uClipToScene.value.copy(this.camera.projectionMatrixInverse);let o=new d(0,0,1,0).applyMatrix4(this.camera.projectionMatrixInverse);a.uEye.value.set(o.x/o.w,o.y/o.w,o.z/o.w),a.uResolution.value.set(n,r),(this.depthTarget.width!==n||this.depthTarget.height!==r)&&this.depthTarget.setSize(n,r),e.setRenderTarget(this.depthTarget),e.clear(!0,!0,!1),e.render(this.depthScene,this.camera),e.setRenderTarget(i),e.render(this.scene,this.camera)}dispose(){for(let e of this.disposables)e.dispose()}};function F(e,t){let n=new y({antialias:!0});n.setPixelRatio(window.devicePixelRatio),n.setClearColor(16053751),n.autoClear=!1,e.append(n.domElement);let r=new P(t),i=new _(D.fovDeg,1,5,5e3);i.up.set(0,0,1),i.position.set(...D.position);let o=new T(i,n.domElement);o.target.set(...D.target),o.update();let s=new a,c=new f;n.setAnimationLoop(()=>{n.getDrawingBufferSize(c),i.updateMatrixWorld(),s.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),n.clear(),r.draw(n,s,c.x,c.y)});let l=new ResizeObserver(([e])=>{if(!e)return;let{width:t,height:r}=e.contentRect;n.setSize(t,r),i.aspect=t/Math.max(r,1),i.updateProjectionMatrix()});return l.observe(e),()=>{l.disconnect(),n.setAnimationLoop(null),o.dispose(),r.dispose(),n.dispose(),n.forceContextLoss(),n.domElement.remove()}}function I(e){let t=null,n=null,r=new a().fromArray(A(e.origin)),i=new a,o=(e,a)=>{t&&n&&(i.fromArray(Array.from(a)).multiply(r),t.resetState(),t.setSize(e.drawingBufferWidth,e.drawingBufferHeight,!1),n.draw(t,i,e.drawingBufferWidth,e.drawingBufferHeight),t.resetState())};return{id:`spike-3d-three`,type:`custom`,renderingMode:`3d`,onAdd(r,i){t=new y({canvas:r.getCanvas(),context:i,antialias:!0}),t.autoClear=!1,t.setPixelRatio(1),n=new P(e)},render(e,{defaultProjectionData:t}){o(e,t.mainMatrix)},onRemove(){n?.dispose(),t?.resetState(),t=n=null}}}export{F as mountThreePanel,I as threeMapLayer};