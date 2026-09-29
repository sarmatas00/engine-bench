import"./dataset-5whEyHbd.js";import{t as e}from"./chrome-BDM6kZSm.js";import{At as t,Dt as n,Et as r,G as i,I as ee,N as a,Ot as o,U as s,Y as c,_ as te,_t as ne,c as re,d as ie,f as l,g as ae,gt as u,l as oe,m as se,n as ce,o as le,pt as ue,rt as de,s as d,t as fe,tt as pe,u as me,y as he}from"./three.module-RYnr__O9.js";import{t as f}from"./colormap-CL31EnH4.js";import{i as ge,r as _e}from"./scientific-probes-OhA_8jbL.js";import{t as ve}from"./OrbitControls-B8aoyP3r.js";import{a as p,c as ye,i as be,n as xe,o as Se,r as Ce,s as we,t as m,u as h}from"./flagship-geometry-CYpKfgM8.js";import{a as Te,i as Ee,n as g,r as De,t as Oe}from"./flagship-volume-DDoSMWNS.js";l.enabled=!1;var _={width:1280,height:720},ke=`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,Ae=`
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
${f}
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
  for (int i = 0; i < ${g}; i++) {
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
}`,je=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,Me=`
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`,v=async()=>{y.setReadout(`benchmark`,`still loading, try again in a moment`)},y=e({num:`18`,title:`Three.js flagship volume`,expect:`the Delft district with a synthetic wind-speed field as a translucent volume around the buildings, orbiting once.`,claim:`vtk.js should do best on volume data, the case the geometry axis could not test`,decision:`whether either renderer struggles with an 8.7-million-cell volume drawn together with a 10,356-part city.`,controls:[{kind:`button`,id:`run-benchmark`,label:`Run benchmark (210 frames)`,onClick:()=>{v()}}],findings:[`The field is SYNTHETIC: real Delft buildings, analytic wind. Its own source says "Not a fluid solver". It is here as a realistically sized volume, not as a flow result.`,`The ray marcher is page 14's, which is code we would own: Three.js has no volume renderer. It stops at the buildings by reading their depth from an offscreen pass rasterized at the canvas's own sample count.`,`The step cap is ${g}, not page 14's 512: this box's diagonal is ~2.8 km, so a grazing ray needs ~1,417 steps of 2 m. Page 17 is given the same cap.`,`The redraws/sec readout is NOT comparable with page 17: vtk.js redraws more often while dragging and at reduced quality. Use the Run benchmark button to compare the two pages.`]});y.setReadout(`renderer`,`Three.js`);async function b(){let e,l;try{[e,l]=await Promise.all([we(),De()])}catch(e){y.fail(`flagship data failed to load: ${e.message}`);return}let{mesh:f,dataset:b,orbit:x}=e,{meta:S}=l,C=document.createElement(`canvas`);C.style.cssText=`position:absolute;inset:0;width:100%;height:100%`,y.canvasHost.prepend(C);let w=C.getContext(`webgl2`,{preserveDrawingBuffer:!1,depth:!0,alpha:!0,powerPreference:`high-performance`});if(!w){y.fail(`no WebGL2 context`);return}let T=w,E=Se(T),D=new fe({canvas:C,context:T});D.autoClear=!1,D.outputColorSpace=ee;let Ne=new ie().setRGB(.067,.086,.11);D.setClearColor(Ne,1);let Pe=Ce(T),Fe=ye(T),O=D.extensions.has(`OES_texture_float_linear`),k=new re;k.setAttribute(`position`,new d(f.positions,3)),k.setAttribute(`normal`,new d(f.normals,3)),k.setIndex(new d(f.indices,1));let A=new i;A.color.setRGB(.72,.77,.81);let j=x.radius*6,M=new pe(30,_.width/_.height,1,j);M.up.set(0,0,1);let N=new te(16777215,3);N.position.set(0,0,0),N.target.position.set(0,0,-1),M.add(N),M.add(N.target);let P=new u;P.add(new s(k,A)),P.add(M),P.add(new ce(16777215,.9));let F=new ae(1,1,r);F.minFilter=c,F.magFilter=c,T.bindFramebuffer(T.FRAMEBUFFER,null);let Ie=T.getParameter(T.SAMPLES),I=new t(1,1,{depthTexture:F,depthBuffer:!0,stencilBuffer:!1,samples:Ie,minFilter:c,magFilter:c}),[L,Le,Re]=S.dims,R=new se(l.data,L,Le,Re);R.format=ue,R.type=he,R.minFilter=O?a:c,R.magFilter=O?a:c,R.wrapS=R.wrapT=R.wrapR=me,R.unpackAlignment=4,R.needsUpdate=!0;let z=Te(S),[ze,Be]=S.range,B=Ee(0,1,Oe).map(([,e])=>e),Ve={value:new n(1,1)},He=new ne({uniforms:{uData:{value:R},uOrigin:{value:new o(...S.origin)},uSpacing:{value:new o(...S.spacing)},uSize:{value:new o(L,Le,Re)},uClim:{value:new n(ze,Be)},uAlphaNodes:{value:new o(B[0],B[1],B[2])},uStep:{value:2},uBoxMin:{value:new o(...z.min)},uBoxMax:{value:new o(...z.max)},uOpaqueDepth:{value:F},uResolution:Ve,uNear:{value:1},uFar:{value:j}},vertexShader:ke,fragmentShader:Ae,side:1,transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:201,blendDst:205,blendEquation:100}),V=z.max.map((e,t)=>e-z.min[t]),H=new le(V[0],V[1],V[2]);H.translate(z.min[0]+V[0]/2,z.min[1]+V[1]/2,z.min[2]+V[2]/2);let Ue=new s(H,He);Ue.frustumCulled=!1;let We=new u;We.add(Ue);let Ge=new de(2,2),Ke=new ne({uniforms:{uColor:{value:I.texture}},vertexShader:je,fragmentShader:Me,depthTest:!1,depthWrite:!1}),qe=new u;qe.add(new s(Ge,Ke));let Je=new oe,U=new ve(M,C);U.enableDamping=!1;let W=0,G=xe(),K=!1;function Ye(){if(K)return;G.tick();let e=G.fps();e!==null&&y.setReadout(`redraws/sec`,e.toFixed(0))}let q=()=>{D.setRenderTarget(I),D.clear(),D.render(P,M),D.setRenderTarget(null),D.clear(),D.render(qe,Je),D.render(We,M),Fe(),Ye()};U.addEventListener(`change`,q),W+=1;function J(e,t,n){D.setPixelRatio(n),D.setSize(e,t,!1);let r=Math.max(1,Math.floor(e*n)),i=Math.max(1,Math.floor(t*n));I.setSize(r,i),Ve.value.set(r,i),M.aspect=r/i,M.updateProjectionMatrix(),q()}let Y=new ResizeObserver(()=>{let e=y.canvasHost.getBoundingClientRect();e.width>0&&e.height>0&&(J(Math.max(1,Math.floor(e.width)),Math.max(1,Math.floor(e.height)),window.devicePixelRatio||1),Q())});Y.observe(y.canvasHost);let X=e=>{let t=e.eye;M.position.set(t[0],t[1],t[2]),U.target.set(e.target[0],e.target[1],e.target[2]),M.lookAt(U.target),M.updateMatrixWorld(),q()},Z={renderer:`threejs`,status:`ready`,canvasCount:y.canvasHost.querySelectorAll(`canvas`).length,axis:`volume`,counts:{buildingParts:b.counts.buildingParts,vertices:f.positions.length/3,triangles:f.indices.length/3,objectTable:e.json.objectTable.length},camera:x,lens:{fovDeg:M.fov,aspect:M.aspect,surface:[T.drawingBufferWidth,T.drawingBufferHeight]},volumeField:{field:S.field,dims:S.dims,cells:l.data.length,range:S.range,stepMetres:2,maxSamples:g,opacityScale:Oe,opacityCorrection:`none: a per sample`},resources:{buffers:E.buffers,textures:E.textures,renderTargets:E.renderTargets,listeners:W,observers:1},interactive:!0,measurementValid:!0},Xe=ge({renderFrame:X,gpuTimer:Pe??void 0,path:{cameraPath:m.cameraPath,warmupFrames:m.warmupFrames,forcedFrames:m.forcedFrames,pose:e=>p(e,x)}});_e(D.domElement,{probe:Z,stopBenchmark:()=>Xe.stop(),disposeGpuResources:()=>{Y.disconnect(),U.dispose(),A.dispose(),k.dispose(),He.dispose(),H.dispose(),R.dispose(),Ke.dispose(),Ge.dispose(),I.dispose(),D.dispose()},onLost:()=>{Q(),y.fail(`WebGL context lost. Frame times from this run are not a measurement.`)}});function Q(){Z.lens={fovDeg:M.fov,aspect:M.aspect,surface:[T.drawingBufferWidth,T.drawingBufferHeight]},Z.resources={buffers:E.buffers,textures:E.textures,renderTargets:E.renderTargets,listeners:W,observers:1},y.setProbe(`flagshipVolume`,Z)}X(p(0,x));async function Ze(){y.setReadout(`benchmark`,`running 210 frames at 1280x720...`),K=!0,G.reset();try{let e=await $(),t=e.cpuFrameTimesMs,n=e.gpuFrameTimesMs??[];y.setReadout(`cpu p50 ms`,h(t,.5).toFixed(2)),y.setReadout(`cpu p95 ms`,h(t,.95).toFixed(2)),y.setReadout(`min FPS`,(1e3/h(t,.95)).toFixed(0)),y.setReadout(`gpu p50 ms`,n.length?`${h(n,.5).toFixed(2)} (${n.length}/${t.length} kept)`:`no usable samples`),y.setReadout(`benchmark`,`done, ${t.length} measured frames`)}catch(e){y.setReadout(`benchmark`,`failed: ${e.message}`)}finally{K=!1,G.reset()}}v=Ze,y.setReadout(`volume`,`${S.field}, ${S.dims.join(` x `)} (${(l.data.length/1e6).toFixed(1)}M cells)`),y.setReadout(`GPU`,be(T)),y.setReadout(`triangles`,Z.counts.triangles),y.setReadout(`camera radius m`,Math.round(x.radius)),O||y.setReadout(`volume filter`,`NEAREST (no OES_texture_float_linear): not comparable`);async function $(){U.enabled=!1;let e=y.canvasHost.getBoundingClientRect(),t={w:Math.max(1,Math.floor(e.width)),h:Math.max(1,Math.floor(e.height)),dpr:window.devicePixelRatio||1};Y.unobserve(y.canvasHost),J(_.width,_.height,1);try{let e=await Xe.runBenchmark();return Z.benchmark=e,Z.measurementValid=e.cpuFrameTimesMs.length===m.forcedFrames,Q(),e}finally{J(t.w,t.h,t.dpr),Y.observe(y.canvasHost),U.enabled=!0,X(p(0,x))}}window.__bench.runBenchmark=$,Q(),y.ready()}b();