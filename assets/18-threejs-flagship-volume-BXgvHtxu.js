import"./dataset-5whEyHbd.js";import{t as e}from"./chrome-BDM6kZSm.js";import{At as t,F as n,G as r,Mt as i,Ot as a,R as o,T as s,W as ee,Z as c,at as te,c as ne,d as re,f as l,g as ie,h as u,ht as ae,kt as oe,l as se,n as ce,o as le,p as ue,q as de,rt as fe,s as d,t as pe,u as me,ut as he,v as ge,vt as f,x as _e,y as ve,yt as ye}from"./three.module-LrS3GEFD.js";import{t as p}from"./BufferGeometryUtils-BDysBbj0.js";import{t as m}from"./colormap-CL31EnH4.js";import{i as be,r as xe}from"./scientific-probes-OhA_8jbL.js";import{t as Se}from"./OrbitControls-BKyPVBA0.js";import{a as h,c as Ce,i as we,n as Te,o as Ee,r as De,s as Oe,t as g,u as _}from"./flagship-geometry-CYpKfgM8.js";import{a as v,c as ke,i as Ae,n as je,o as Me,r as y,s as Ne,t as Pe}from"./flagship-volume-Cu57Plpp.js";l.enabled=!1;var b={width:1280,height:720},Fe=`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,Ie=`
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
${m}
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
}`,Le=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,Re=`
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`;function ze(){let{shaftRadius:e,shaftResolution:t,tipRadius:n,tipResolution:r,tipLength:i}=y,a=new u(e,e,1-i,t);a.translate(0,(1-i)/2,0);let o=new ue(n,i,r);o.translate(0,1-i/2,0);let s=p([a.toNonIndexed(),o.toNonIndexed()]);return a.dispose(),o.dispose(),s.rotateZ(-Math.PI/2),s.translate(-.5+i/2,0,0),s.computeVertexNormals(),s}var Be=()=>{},Ve=async()=>{x.setReadout(`benchmark`,`still loading, try again in a moment`)},x=e({num:`18`,title:`Three.js flagship volume`,expect:`the Delft district with a synthetic wind-speed field as a translucent volume around the buildings, orbiting once.`,claim:`vtk.js should do best on volume data, the case the geometry axis could not test`,decision:`whether either renderer struggles with an 8.7-million-cell volume drawn together with a 10,356-part city.`,controls:[{kind:`toggle`,id:`arrows`,label:`Wind arrows`,value:!0,onChange:e=>Be(e)},{kind:`button`,id:`run-benchmark`,label:`Run benchmark (210 frames)`,onClick:()=>{Ve()}}],findings:[`The field is SYNTHETIC: real Delft buildings, analytic wind. Its own source says "Not a fluid solver". It is here as a realistically sized volume, not as a flow result.`,`The ray marcher is page 14's, which is code we would own: Three.js has no volume renderer. It stops at the buildings by reading their depth from an offscreen pass rasterized at the canvas's own sample count.`,`The step cap is ${v}, not page 14's 512: this box's diagonal is ~2.8 km, so a grazing ray needs ~1,417 steps of 2 m. Page 17 is given the same cap.`,`The redraws/sec readout is NOT comparable with page 17: vtk.js redraws more often while dragging and at reduced quality. Use the Run benchmark button to compare the two pages.`,`Wind arrows are code we would own here: vtkArrowSource's shape rebuilt from cylinder and cone, and one InstancedMesh with a matrix per arrow turned and sized from the velocity field. Page 17 gets both from vtk.js. The benchmark measures whatever the toggle shows, and the readout says which.`]});x.setReadout(`renderer`,`Three.js`);async function S(){let e,l;try{[e,l]=await Promise.all([Oe(),Me()])}catch(e){x.fail(`flagship data failed to load: ${e.message}`);return}let{mesh:u,dataset:ue,orbit:p}=e,{meta:m}=l,y=document.createElement(`canvas`);y.style.cssText=`position:absolute;inset:0;width:100%;height:100%`,x.canvasHost.prepend(y);let S=y.getContext(`webgl2`,{preserveDrawingBuffer:!1,depth:!0,alpha:!0,powerPreference:`high-performance`});if(!S){x.fail(`no WebGL2 context`);return}let C=S,w=Ee(C),T=new pe({canvas:y,context:C});T.autoClear=!1,T.outputColorSpace=o;let He=new re().setRGB(.067,.086,.11);T.setClearColor(He,1);let Ue=De(C),We=Ce(C),E=T.extensions.has(`OES_texture_float_linear`),D=new ne;D.setAttribute(`position`,new d(u.positions,3)),D.setAttribute(`normal`,new d(u.normals,3)),D.setIndex(new d(u.indices,1));let O=new de;O.color.setRGB(.72,.77,.81);let Ge=p.radius*6,k=new fe(30,b.width/b.height,1,Ge);k.up.set(0,0,1);let A=new ve(16777215,3);A.position.set(0,0,0),A.target.position.set(0,0,-1),k.add(A),k.add(A.target);let j=new f;j.add(new r(D,O));let{arrows:M}=l,Ke=ze(),N=new de;N.color.setRGB(...Pe);let P=new s(Ke,N,M.meta.count);{let e=new t(1,0,0),n=new t,r=new t,i=new he,a=new t,o=new ee;for(let t=0;t<M.meta.count;t++){n.fromArray(M.vectors,t*3);let s=n.length()*je;i.setFromUnitVectors(e,n.normalize()),o.compose(r.fromArray(M.positions,t*3),i,a.setScalar(s)),P.setMatrixAt(t,o)}P.instanceMatrix.needsUpdate=!0}P.frustumCulled=!1,j.add(P),j.add(k),j.add(new ce(16777215,.9));let F=new ge(1,1,a);F.minFilter=c,F.magFilter=c,C.bindFramebuffer(C.FRAMEBUFFER,null);let qe=C.getParameter(C.SAMPLES),I=new i(1,1,{depthTexture:F,depthBuffer:!0,stencilBuffer:!1,samples:qe,minFilter:c,magFilter:c}),[Je,Ye,Xe]=m.dims,L=new ie(l.data,Je,Ye,Xe);L.format=ae,L.type=_e,L.minFilter=E?n:c,L.magFilter=E?n:c,L.wrapS=L.wrapT=L.wrapR=me,L.unpackAlignment=4,L.needsUpdate=!0;let R=ke(m),[Ze,Qe]=m.range,z=Ne(0,1,Ae).map(([,e])=>e),$e={value:new oe(1,1)},et=new ye({uniforms:{uData:{value:L},uOrigin:{value:new t(...m.origin)},uSpacing:{value:new t(...m.spacing)},uSize:{value:new t(Je,Ye,Xe)},uClim:{value:new oe(Ze,Qe)},uAlphaNodes:{value:new t(z[0],z[1],z[2])},uStep:{value:2},uBoxMin:{value:new t(...R.min)},uBoxMax:{value:new t(...R.max)},uOpaqueDepth:{value:F},uResolution:$e,uNear:{value:1},uFar:{value:Ge}},vertexShader:Fe,fragmentShader:Ie,side:1,transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:201,blendDst:205,blendEquation:100}),B=R.max.map((e,t)=>e-R.min[t]),V=new le(B[0],B[1],B[2]);V.translate(R.min[0]+B[0]/2,R.min[1]+B[1]/2,R.min[2]+B[2]/2);let tt=new r(V,et);tt.frustumCulled=!1;let H=new f;H.add(tt);let nt=new te(2,2),rt=new ye({uniforms:{uColor:{value:I.texture}},vertexShader:Le,fragmentShader:Re,depthTest:!1,depthWrite:!1}),it=new f;it.add(new r(nt,rt));let at=new se,U=new Se(k,y);U.enableDamping=!1;let W=0,G=Te(),K=!1;function ot(){if(K)return;G.tick();let e=G.fps();e!==null&&x.setReadout(`redraws/sec`,e.toFixed(0))}let q=()=>{T.setRenderTarget(I),T.clear(),T.render(j,k),T.setRenderTarget(null),T.clear(),T.render(it,at),T.render(H,k),We(),ot()};U.addEventListener(`change`,q),W+=1;function J(e,t,n){T.setPixelRatio(n),T.setSize(e,t,!1);let r=Math.max(1,Math.floor(e*n)),i=Math.max(1,Math.floor(t*n));I.setSize(r,i),$e.value.set(r,i),k.aspect=r/i,k.updateProjectionMatrix(),q()}let Y=new ResizeObserver(()=>{let e=x.canvasHost.getBoundingClientRect();e.width>0&&e.height>0&&(J(Math.max(1,Math.floor(e.width)),Math.max(1,Math.floor(e.height)),window.devicePixelRatio||1),Q())});Y.observe(x.canvasHost);let X=e=>{let t=e.eye;k.position.set(t[0],t[1],t[2]),U.target.set(e.target[0],e.target[1],e.target[2]),k.lookAt(U.target),k.updateMatrixWorld(),q()},Z={renderer:`threejs`,status:`ready`,canvasCount:x.canvasHost.querySelectorAll(`canvas`).length,axis:`volume`,counts:{buildingParts:ue.counts.buildingParts,vertices:u.positions.length/3,triangles:u.indices.length/3,objectTable:e.json.objectTable.length},camera:p,lens:{fovDeg:k.fov,aspect:k.aspect,surface:[C.drawingBufferWidth,C.drawingBufferHeight]},volumeField:{field:m.field,dims:m.dims,cells:l.data.length,range:m.range,stepMetres:2,maxSamples:v,opacityScale:Ae,opacityCorrection:`none: a per sample`},arrows:{visible:P.visible,count:M.meta.count},resources:{buffers:w.buffers,textures:w.textures,renderTargets:w.renderTargets,listeners:W,observers:1},interactive:!0,measurementValid:!0},st=be({renderFrame:X,gpuTimer:Ue??void 0,path:{cameraPath:g.cameraPath,warmupFrames:g.warmupFrames,forcedFrames:g.forcedFrames,pose:e=>h(e,p)}});xe(T.domElement,{probe:Z,stopBenchmark:()=>st.stop(),disposeGpuResources:()=>{Y.disconnect(),U.dispose(),O.dispose(),D.dispose(),et.dispose(),V.dispose(),L.dispose(),P.dispose(),Ke.dispose(),N.dispose(),rt.dispose(),nt.dispose(),I.dispose(),T.dispose()},onLost:()=>{Q(),x.fail(`WebGL context lost. Frame times from this run are not a measurement.`)}});function Q(){Z.arrows={visible:P.visible,count:M.meta.count},Z.lens={fovDeg:k.fov,aspect:k.aspect,surface:[C.drawingBufferWidth,C.drawingBufferHeight]},Z.resources={buffers:w.buffers,textures:w.textures,renderTargets:w.renderTargets,listeners:W,observers:1},x.setProbe(`flagshipVolume`,Z)}X(h(0,p));async function ct(){x.setReadout(`benchmark`,`running 210 frames at 1280x720...`),K=!0,G.reset();try{let e=await $(),t=e.cpuFrameTimesMs,n=e.gpuFrameTimesMs??[];x.setReadout(`cpu p50 ms`,_(t,.5).toFixed(2)),x.setReadout(`cpu p95 ms`,_(t,.95).toFixed(2)),x.setReadout(`min FPS`,(1e3/_(t,.95)).toFixed(0)),x.setReadout(`gpu p50 ms`,n.length?`${_(n,.5).toFixed(2)} (${n.length}/${t.length} kept)`:`no usable samples`),x.setReadout(`benchmark`,`done, ${t.length} measured frames`)}catch(e){x.setReadout(`benchmark`,`failed: ${e.message}`)}finally{K=!1,G.reset()}}Ve=ct,Be=e=>{P.visible=e,x.setReadout(`arrows`,e?`on (${M.meta.count})`:`off`),q(),Q()},x.setReadout(`volume`,`${m.field}, ${m.dims.join(` x `)} (${(l.data.length/1e6).toFixed(1)}M cells)`),x.setReadout(`arrows`,`on (${M.meta.count})`),x.setReadout(`GPU`,we(C)),x.setReadout(`triangles`,Z.counts.triangles),x.setReadout(`camera radius m`,Math.round(p.radius)),E||x.setReadout(`volume filter`,`NEAREST (no OES_texture_float_linear): not comparable`);async function $(){U.enabled=!1;let e=x.canvasHost.getBoundingClientRect(),t={w:Math.max(1,Math.floor(e.width)),h:Math.max(1,Math.floor(e.height)),dpr:window.devicePixelRatio||1};Y.unobserve(x.canvasHost),J(b.width,b.height,1);try{let e=await st.runBenchmark();return Z.benchmark=e,Z.measurementValid=e.cpuFrameTimesMs.length===g.forcedFrames,Q(),e}finally{J(t.w,t.h,t.dpr),Y.observe(x.canvasHost),U.enabled=!0,X(h(0,p))}}window.__bench.runBenchmark=$,Q(),x.ready()}S();