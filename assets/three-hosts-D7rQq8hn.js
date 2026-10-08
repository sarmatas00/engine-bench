import{At as e,F as t,G as n,K as r,Nt as i,W as a,c as o,g as s,ht as c,jt as l,kt as u,l as d,n as f,o as p,q as m,rt as h,s as g,t as _,v,vt as y,x as b,y as x,yt as S}from"./three.module-DPj775aY.js";import{t as C}from"./OrbitControls-BSvOUn1r.js";import{t as w}from"./21-twin-map-vs-panel-CzbPuULm.js";import{PANEL_START as T,opacityNodes as E}from"./scene-data-BbrJ1Qcv.js";import{t as D}from"./sweref-BnQ7EwJe.js";function O(e){let t=(t,n)=>{let[r,i]=D.inverse([e[0]+t,e[1]+n]);return w.fromLngLat([r,i])},n=t(0,0),r=t(1,0),i=t(0,1),a=n.meterInMercatorCoordinateUnits();return new Float64Array([r.x-n.x,r.y-n.y,0,0,i.x-n.x,i.y-n.y,0,0,0,0,a,0,n.x,n.y,0,1])}var k=600,A=`
varying vec3 vScene;
void main() {
  vScene = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,j=`
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
  for (int i = 0; i < ${k}; i++) {
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
}`,M=class{scene=new y;camera=new d;depthScene=new y;depthTarget=new i(1,1,{depthBuffer:!0});volumeMaterial;disposables=[];constructor(i){let l=new o;l.setAttribute(`position`,new g(i.buildings.positions,3)),l.setAttribute(`normal`,new g(i.buildings.normals,3));let d=new m({color:12109007});this.scene.add(new n(l,d)),this.depthScene.add(new n(l,new r({colorWrite:!1}))),this.scene.add(new f(16777215,1.6));let h=new x(16777215,1.8);h.position.set(.4,-.6,1),this.scene.add(h),this.depthTarget.depthTexture=new v(1,1);let{dims:_,origin:y,spacing:C,range:w,speed:T}=i.field,D=new s(T,..._);D.format=c,D.type=b,D.minFilter=D.magFilter=t,D.needsUpdate=!0;let O=new e(...y),k=new e(..._.map((e,t)=>y[t]+(e-1)*C[t])),[,M,N]=E(w);this.volumeMaterial=new S({vertexShader:A,fragmentShader:j,side:1,transparent:!0,depthWrite:!1,depthTest:!1,blending:5,blendSrc:201,blendDst:205,uniforms:{uData:{value:D},uDepth:{value:this.depthTarget.depthTexture},uClipToScene:{value:new a},uEye:{value:new e},uOrigin:{value:O.clone()},uSpacing:{value:new e(...C)},uSize:{value:new e(..._)},uBoxMin:{value:O},uBoxMax:{value:k},uAlpha:{value:new e(0,M[1],N[1])},uClim:{value:new u(...w)},uResolution:{value:new u},uStep:{value:2}}});let P=new p(...k.clone().sub(O).toArray());P.translate(...O.clone().add(k).multiplyScalar(.5).toArray());let F=new n(P,this.volumeMaterial);F.renderOrder=1,this.scene.add(F),this.disposables.push(l,d,this.depthTarget,this.depthTarget.depthTexture,D,this.volumeMaterial,P)}draw(e,t,n,r,i=null){this.camera.projectionMatrix.copy(t),this.camera.projectionMatrixInverse.copy(t).invert();let a=this.volumeMaterial.uniforms;a.uClipToScene.value.copy(this.camera.projectionMatrixInverse);let o=new l(0,0,1,0).applyMatrix4(this.camera.projectionMatrixInverse);a.uEye.value.set(o.x/o.w,o.y/o.w,o.z/o.w),a.uResolution.value.set(n,r),(this.depthTarget.width!==n||this.depthTarget.height!==r)&&this.depthTarget.setSize(n,r),e.setRenderTarget(this.depthTarget),e.clear(!0,!0,!1),e.render(this.depthScene,this.camera),e.setRenderTarget(i),e.render(this.scene,this.camera)}dispose(){for(let e of this.disposables)e.dispose()}};function N(e,t){let n=new _({antialias:!0});n.setPixelRatio(window.devicePixelRatio),n.setClearColor(16053751),n.autoClear=!1,e.append(n.domElement);let r=new M(t),i=new h(T.fovDeg,1,5,5e3);i.up.set(0,0,1),i.position.set(...T.position);let o=new C(i,n.domElement);o.target.set(...T.target),o.update();let s=new a,c=new u;n.setAnimationLoop(()=>{n.getDrawingBufferSize(c),i.updateMatrixWorld(),s.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),n.clear(),r.draw(n,s,c.x,c.y)});let l=new ResizeObserver(([e])=>{if(!e)return;let{width:t,height:r}=e.contentRect;n.setSize(t,r),i.aspect=t/Math.max(r,1),i.updateProjectionMatrix()});return l.observe(e),()=>{l.disconnect(),n.setAnimationLoop(null),o.dispose(),r.dispose(),n.dispose(),n.forceContextLoss(),n.domElement.remove()}}function P(e){let t=null,n=null,r=new a().fromArray(O(e.origin)),i=new a,o=(e,a)=>{t&&n&&(i.fromArray(Array.from(a)).multiply(r),t.resetState(),t.setSize(e.drawingBufferWidth,e.drawingBufferHeight,!1),n.draw(t,i,e.drawingBufferWidth,e.drawingBufferHeight),t.resetState())};return{id:`spike-3d-three`,type:`custom`,renderingMode:`3d`,onAdd(r,i){t=new _({canvas:r.getCanvas(),context:i,antialias:!0}),t.autoClear=!1,t.setPixelRatio(1),n=new M(e)},render(e,{defaultProjectionData:t}){o(e,t.mainMatrix)},onRemove(){n?.dispose(),t?.resetState(),t=n=null}}}export{N as mountThreePanel,P as threeMapLayer};