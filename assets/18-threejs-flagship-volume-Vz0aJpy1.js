import"./dataset-5whEyHbd.js";import{t as e}from"./chrome-BDM6kZSm.js";import{At as t,F as n,G as r,M as i,Mt as a,Ot as o,P as s,R as ee,T as te,W as ne,Z as c,at as re,c as ie,d as ae,f as l,g as oe,h as u,ht as se,kt as ce,l as le,n as ue,o as de,p as fe,q as pe,rt as me,s as d,t as he,u as ge,ut as _e,v as ve,vt as ye,x as be,y as xe,yt as Se}from"./three.module-LrS3GEFD.js";import{t as f}from"./BufferGeometryUtils-BDysBbj0.js";import{t as p}from"./colormap-CL31EnH4.js";import{i as Ce,r as we}from"./scientific-probes-OhA_8jbL.js";import{t as Te}from"./OrbitControls-BKyPVBA0.js";import{a as m,c as Ee,i as De,n as Oe,o as ke,r as Ae,s as je,t as h,u as g}from"./flagship-geometry-CYpKfgM8.js";import{a as Me,c as Ne,d as Pe,i as Fe,l as Ie,n as Le,o as Re,r as _,s as v,t as ze,u as Be}from"./flagship-volume-CzW75_Kr.js";l.enabled=!1;var y={width:1280,height:720},Ve=`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,He=`
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
${p}
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
  for (int i = 0; i < ${v}; i++) {
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
}`,Ue=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,We=`
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`;function Ge(){let{shaftRadius:e,shaftResolution:t,tipRadius:n,tipResolution:r,tipLength:i}=_,a=new u(e,e,1-i,t);a.translate(0,(1-i)/2,0);let o=new fe(n,i,r);o.translate(0,1-i/2,0);let s=f([a.toNonIndexed(),o.toNonIndexed()]);return a.dispose(),o.dispose(),s.rotateZ(-Math.PI/2),s.translate(-.5+i/2,0,0),s.computeVertexNormals(),s}var Ke=()=>{},qe=()=>{},Je=async()=>{b.setReadout(`benchmark`,`still loading, try again in a moment`)},b=e({num:`18`,title:`Three.js flagship volume`,expect:`the Delft district with a synthetic wind-speed field as a translucent volume around the buildings, orbiting once.`,claim:`vtk.js should do best on volume data, the case the geometry axis could not test`,decision:`whether either renderer struggles with an 8.7-million-cell volume drawn together with a 10,356-part city.`,controls:[{kind:`toggle`,id:`arrows`,label:`Wind arrows`,value:!0,onChange:e=>Ke(e)},{kind:`toggle`,id:`streamlines`,label:`Streamlines`,value:!0,onChange:e=>qe(e)},{kind:`button`,id:`run-benchmark`,label:`Run benchmark (210 frames)`,onClick:()=>{Je()}}],findings:[`The field is SYNTHETIC: real Delft buildings, analytic wind. Its own source says "Not a fluid solver". It is here as a realistically sized volume, not as a flow result.`,`The ray marcher is page 14's, which is code we would own: Three.js has no volume renderer. It stops at the buildings by reading their depth from an offscreen pass rasterized at the canvas's own sample count.`,`The step cap is ${v}, not page 14's 512: this box's diagonal is ~2.8 km, so a grazing ray needs ~1,417 steps of 2 m. Page 17 is given the same cap.`,`The redraws/sec readout is NOT comparable with page 17: vtk.js redraws more often while dragging and at reduced quality. Use the Run benchmark button to compare the two pages.`,`Wind arrows are code we would own here: vtkArrowSource's shape rebuilt from cylinder and cone, and one InstancedMesh with a matrix per arrow turned and sized from the velocity field. Page 17 gets both from vtk.js. The benchmark measures whatever the toggle shows, and the readout says which.`,`Streamlines need a tracer Three.js does not have. traceStreamlines (flagship-volume.ts) is a port of vtk.js's vtkImageStreamline, and a unit test requires the two to produce the same points. Lines are one pixel wide on both pages: WebGL implementations may ignore any other width.`]});b.setReadout(`renderer`,`Three.js`);async function x(){let e,l;try{[e,l]=await Promise.all([je(),Ne()])}catch(e){b.fail(`flagship data failed to load: ${e.message}`);return}let{mesh:u,dataset:fe,orbit:f}=e,{meta:p}=l,_=document.createElement(`canvas`);_.style.cssText=`position:absolute;inset:0;width:100%;height:100%`,b.canvasHost.prepend(_);let x=_.getContext(`webgl2`,{preserveDrawingBuffer:!1,depth:!0,alpha:!0,powerPreference:`high-performance`});if(!x){b.fail(`no WebGL2 context`);return}let S=x,C=ke(S),w=new he({canvas:_,context:S});w.autoClear=!1,w.outputColorSpace=ee;let Ye=new ae().setRGB(.067,.086,.11);w.setClearColor(Ye,1);let Xe=Ae(S),Ze=Ee(S),T=w.extensions.has(`OES_texture_float_linear`),E=new ie;E.setAttribute(`position`,new d(u.positions,3)),E.setAttribute(`normal`,new d(u.normals,3)),E.setIndex(new d(u.indices,1));let D=new pe;D.color.setRGB(.72,.77,.81);let Qe=f.radius*6,O=new me(30,y.width/y.height,1,Qe);O.up.set(0,0,1);let k=new xe(16777215,3);k.position.set(0,0,0),k.target.position.set(0,0,-1),O.add(k),O.add(k.target);let A=new ye;A.add(new r(E,D));let{arrows:j}=l,$e=Ge(),M=new pe;M.color.setRGB(...ze);let N=new te($e,M,j.meta.count);{let e=new t(1,0,0),n=new t,r=new t,i=new _e,a=new t,o=new ne;for(let t=0;t<j.meta.count;t++){n.fromArray(j.vectors,t*3);let s=n.length()*Le;i.setFromUnitVectors(e,n.normalize()),o.compose(r.fromArray(j.positions,t*3),i,a.setScalar(s)),N.setMatrixAt(t,o)}N.instanceMatrix.needsUpdate=!0}N.frustumCulled=!1,A.add(N);let et=performance.now(),P=Be(l.velocity,l.velocity.meta.seeds,1,Re),tt=performance.now()-et,nt=[];for(let e=0;e+1<P.lineStarts.length;e++)for(let t=P.lineStarts[e];t+1<P.lineStarts[e+1];t++)nt.push(t,t+1);let F=new ie;F.setAttribute(`position`,new d(P.positions,3)),F.setIndex(nt);let I=new i;I.color.setRGB(...Me);let L=new s(F,I);L.frustumCulled=!1,A.add(L);let R=P.lineStarts.length-1,rt=()=>({visible:L.visible,lines:R,points:P.positions.length/3,traceMs:Math.round(tt)});A.add(O),A.add(new ue(16777215,.9));let z=new ve(1,1,o);z.minFilter=c,z.magFilter=c,S.bindFramebuffer(S.FRAMEBUFFER,null);let it=S.getParameter(S.SAMPLES),B=new a(1,1,{depthTexture:z,depthBuffer:!0,stencilBuffer:!1,samples:it,minFilter:c,magFilter:c}),[at,ot,st]=p.dims,V=new oe(l.data,at,ot,st);V.format=se,V.type=be,V.minFilter=T?n:c,V.magFilter=T?n:c,V.wrapS=V.wrapT=V.wrapR=ge,V.unpackAlignment=4,V.needsUpdate=!0;let H=Pe(p),[ct,lt]=p.range,U=Ie(0,1,Fe).map(([,e])=>e),ut={value:new ce(1,1)},dt=new Se({uniforms:{uData:{value:V},uOrigin:{value:new t(...p.origin)},uSpacing:{value:new t(...p.spacing)},uSize:{value:new t(at,ot,st)},uClim:{value:new ce(ct,lt)},uAlphaNodes:{value:new t(U[0],U[1],U[2])},uStep:{value:2},uBoxMin:{value:new t(...H.min)},uBoxMax:{value:new t(...H.max)},uOpaqueDepth:{value:z},uResolution:ut,uNear:{value:1},uFar:{value:Qe}},vertexShader:Ve,fragmentShader:He,side:1,transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:201,blendDst:205,blendEquation:100}),W=H.max.map((e,t)=>e-H.min[t]),G=new de(W[0],W[1],W[2]);G.translate(H.min[0]+W[0]/2,H.min[1]+W[1]/2,H.min[2]+W[2]/2);let ft=new r(G,dt);ft.frustumCulled=!1;let pt=new ye;pt.add(ft);let mt=new re(2,2),ht=new Se({uniforms:{uColor:{value:B.texture}},vertexShader:Ue,fragmentShader:We,depthTest:!1,depthWrite:!1}),gt=new ye;gt.add(new r(mt,ht));let _t=new le,K=new Te(O,_);K.enableDamping=!1;let q=0,J=Oe(),vt=!1;function yt(){if(vt)return;J.tick();let e=J.fps();e!==null&&b.setReadout(`redraws/sec`,e.toFixed(0))}let Y=()=>{w.setRenderTarget(B),w.clear(),w.render(A,O),w.setRenderTarget(null),w.clear(),w.render(gt,_t),w.render(pt,O),Ze(),yt()};K.addEventListener(`change`,Y),q+=1;function bt(e,t,n){w.setPixelRatio(n),w.setSize(e,t,!1);let r=Math.max(1,Math.floor(e*n)),i=Math.max(1,Math.floor(t*n));B.setSize(r,i),ut.value.set(r,i),O.aspect=r/i,O.updateProjectionMatrix(),Y()}let X=new ResizeObserver(()=>{let e=b.canvasHost.getBoundingClientRect();e.width>0&&e.height>0&&(bt(Math.max(1,Math.floor(e.width)),Math.max(1,Math.floor(e.height)),window.devicePixelRatio||1),$())});X.observe(b.canvasHost);let Z=e=>{let t=e.eye;O.position.set(t[0],t[1],t[2]),K.target.set(e.target[0],e.target[1],e.target[2]),O.lookAt(K.target),O.updateMatrixWorld(),Y()},Q={renderer:`threejs`,status:`ready`,canvasCount:b.canvasHost.querySelectorAll(`canvas`).length,axis:`volume`,counts:{buildingParts:fe.counts.buildingParts,vertices:u.positions.length/3,triangles:u.indices.length/3,objectTable:e.json.objectTable.length},camera:f,lens:{fovDeg:O.fov,aspect:O.aspect,surface:[S.drawingBufferWidth,S.drawingBufferHeight]},volumeField:{field:p.field,dims:p.dims,cells:l.data.length,range:p.range,stepMetres:2,maxSamples:v,opacityScale:Fe,opacityCorrection:`none: a per sample`},arrows:{visible:N.visible,count:j.meta.count},streamlines:rt(),resources:{buffers:C.buffers,textures:C.textures,renderTargets:C.renderTargets,listeners:q,observers:1},interactive:!0,measurementValid:!0},xt=Ce({renderFrame:Z,gpuTimer:Xe??void 0,path:{cameraPath:h.cameraPath,warmupFrames:h.warmupFrames,forcedFrames:h.forcedFrames,pose:e=>m(e,f)}});we(w.domElement,{probe:Q,stopBenchmark:()=>xt.stop(),disposeGpuResources:()=>{X.disconnect(),K.dispose(),D.dispose(),E.dispose(),dt.dispose(),G.dispose(),V.dispose(),N.dispose(),$e.dispose(),M.dispose(),F.dispose(),I.dispose(),ht.dispose(),mt.dispose(),B.dispose(),w.dispose()},onLost:()=>{$(),b.fail(`WebGL context lost. Frame times from this run are not a measurement.`)}});function $(){Q.arrows={visible:N.visible,count:j.meta.count},Q.streamlines=rt(),Q.lens={fovDeg:O.fov,aspect:O.aspect,surface:[S.drawingBufferWidth,S.drawingBufferHeight]},Q.resources={buffers:C.buffers,textures:C.textures,renderTargets:C.renderTargets,listeners:q,observers:1},b.setProbe(`flagshipVolume`,Q)}Z(m(0,f));async function St(){b.setReadout(`benchmark`,`running 210 frames at 1280x720...`),vt=!0,J.reset();try{let e=await Ct(),t=e.cpuFrameTimesMs,n=e.gpuFrameTimesMs??[];b.setReadout(`cpu p50 ms`,g(t,.5).toFixed(2)),b.setReadout(`cpu p95 ms`,g(t,.95).toFixed(2)),b.setReadout(`min FPS`,(1e3/g(t,.95)).toFixed(0)),b.setReadout(`gpu p50 ms`,n.length?`${g(n,.5).toFixed(2)} (${n.length}/${t.length} kept)`:`no usable samples`),b.setReadout(`benchmark`,`done, ${t.length} measured frames`)}catch(e){b.setReadout(`benchmark`,`failed: ${e.message}`)}finally{vt=!1,J.reset()}}Je=St,qe=e=>{L.visible=e,b.setReadout(`streamlines`,e?`on (${R})`:`off`),Y(),$()},Ke=e=>{N.visible=e,b.setReadout(`arrows`,e?`on (${j.meta.count})`:`off`),Y(),$()},b.setReadout(`volume`,`${p.field}, ${p.dims.join(` x `)} (${(l.data.length/1e6).toFixed(1)}M cells)`),b.setReadout(`arrows`,`on (${j.meta.count})`),b.setReadout(`streamlines`,`on (${R})`),b.setReadout(`trace ms`,Math.round(tt)),b.setReadout(`GPU`,De(S)),b.setReadout(`triangles`,Q.counts.triangles),b.setReadout(`camera radius m`,Math.round(f.radius)),T||b.setReadout(`volume filter`,`NEAREST (no OES_texture_float_linear): not comparable`);async function Ct(){K.enabled=!1;let e=b.canvasHost.getBoundingClientRect(),t={w:Math.max(1,Math.floor(e.width)),h:Math.max(1,Math.floor(e.height)),dpr:window.devicePixelRatio||1};X.unobserve(b.canvasHost),bt(y.width,y.height,1);try{let e=await xt.runBenchmark();return Q.benchmark=e,Q.measurementValid=e.cpuFrameTimesMs.length===h.forcedFrames,$(),e}finally{bt(t.w,t.h,t.dpr),X.observe(b.canvasHost),K.enabled=!0,Z(m(0,f))}}window.__bench.runBenchmark=Ct,$(),b.ready()}x();