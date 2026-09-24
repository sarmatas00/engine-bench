import{i as e}from"./rolldown-runtime-Dd_uD5pT.js";import{$ as t,$t as n,A as r,At as i,B as a,Bt as o,C as s,Cn as c,Ct as l,D as u,Dt as d,E as f,Et as p,Ft as m,G as h,Gt as g,H as _,Ht as v,J as y,Jt as b,K as x,Lt as S,M as C,Mt as w,Nt as T,O as E,Ot as D,Pt as ee,Q as O,Qt as te,Rt as ne,S as re,Sn as k,St as A,T as ie,Tn as ae,U as oe,Ut as se,Vt as ce,W as le,Wt as ue,X as de,Xt as fe,Y as j,Yt as pe,Zt as M,_ as me,_n as he,_t as ge,a as _e,an as ve,b as ye,bn as be,bt as N,c as xe,cn as Se,ct as Ce,d as we,dn as Te,dt as Ee,en as De,et as Oe,f as ke,fn as Ae,ft as je,g as Me,gn as Ne,gt as Pe,h as Fe,hn as Ie,in as P,it as Le,j as Re,jt as ze,k as Be,kt as Ve,l as He,ln as Ue,m as We,mn as Ge,nn as Ke,nt as F,on as qe,p as Je,pn as Ye,pt as Xe,q as I,qt as L,r as Ze,rn as Qe,rt as $e,s as et,sn as tt,tn as nt,tt as R,u as rt,un as it,ut as at,v as ot,vn as z,w as st,wn as ct,wt as lt,x as ut,xn as dt,xt as ft,y as B,yn as pt,yt as mt,z as ht,zt as gt}from"./FullScreenRenderWindow-BzMRZhNj.js";var _t={SlicingMode:{NONE:-1,I:0,J:1,K:2,X:3,Y:4,Z:5}},V={NEAREST:0,LINEAR:1},vt={InterpolationType:V};function yt(e,t,n){return e.length>0?`${e.map(e=>e?.getMTime()??`x`).join(`/`)}-${t}-${n}`:`0`}function bt(e,t){return`${t.getMTime()}`}var{vtkErrorMacro:xt}=pt,{SlicingMode:H}=_t;function St(e){let t=e.split(`
`),n=[];for(let e=0;e<t.length;++e){let r=t[e].trim();r.length>0&&n.push(r)}return n}function Ct(e,n){n.classHierarchy.push(`vtkOpenGLImageMapper`);function r(t){n.openGLTexture.releaseGraphicsResources(t),[n._colorTransferFunc,n._pwFunc,n._labelOutlineThicknessArray,n._labelOutlineOpacity].forEach(n=>t.unregisterGraphicsResourceUser(n,e))}e.buildPass=t=>{if(t){n.currentRenderPass=null,n.openGLImageSlice=e.getFirstAncestorOfType(`vtkOpenGLImageSlice`),n._openGLRenderer=e.getFirstAncestorOfType(`vtkOpenGLRenderer`);let t=n._openGLRenderWindow;n._openGLRenderWindow=n._openGLRenderer.getLastAncestorOfType(`vtkOpenGLRenderWindow`),t&&!t.isDeleted()&&t!==n._openGLRenderWindow&&r(t),n.context=n._openGLRenderWindow.getContext(),n.tris.setOpenGLRenderWindow(n._openGLRenderWindow);let i=n._openGLRenderer.getRenderable();n.openGLCamera=n._openGLRenderer.getViewNodeFor(i.getActiveCamera(),n.openGLCamera),n.renderable.isA(`vtkImageMapper`)&&n.renderable.getSliceAtFocalPoint()&&n.renderable.setSliceFromCamera(i.getActiveCamera())}},e.translucentPass=(t,r)=>{t&&(n.currentRenderPass=r,e.render())},e.zBufferPass=t=>{t&&(n.haveSeenDepthRequest=!0,n.renderDepth=!0,e.render(),n.renderDepth=!1)},e.opaqueZBufferPass=t=>e.zBufferPass(t),e.opaquePass=t=>{t&&e.render()},e.getCoincidentParameters=(e,t)=>n.renderable.getResolveCoincidentTopology()==O.PolygonOffset?n.renderable.getCoincidentTopologyPolygonOffsetParameters():null,e.render=()=>{let t=n.openGLImageSlice.getRenderable(),r=n._openGLRenderer.getRenderable();e.renderPiece(r,t)},e.getShaderTemplate=(e,t,n)=>{e.Vertex=le,e.Fragment=oe,e.Geometry=``},e.replaceShaderValues=(t,r,i)=>{let a=t.Vertex,o=t.Fragment;a=I.substitute(a,`//VTK::Camera::Dec`,[`uniform mat4 MCPCMatrix;`]).result,a=I.substitute(a,`//VTK::PositionVC::Impl`,[`  gl_Position = MCPCMatrix * vertexMC;`]).result,a=I.substitute(a,`//VTK::TCoord::Impl`,`tcoordVCVSOutput = tcoordMC;`).result,a=I.substitute(a,`//VTK::TCoord::Dec`,`attribute vec2 tcoordMC; varying vec2 tcoordVCVSOutput;`).result;let s=n.openGLTexture.getComponents(),c=i.getProperty().getIndependentComponents(),l=[`varying vec2 tcoordVCVSOutput;`,`uniform float cshift0;`,`uniform float cscale0;`,`uniform float pwfshift0;`,`uniform float pwfscale0;`,`uniform sampler2D texture1;`,`uniform sampler2D colorTexture1;`,`uniform sampler2D pwfTexture1;`,`uniform float opacity;`];if(i.getProperty().getUseLabelOutline()&&(l=l.concat([`uniform sampler2D labelOutlineTexture1;`,`uniform sampler2D labelOutlineOpacityTexture1;`])),c){for(let e=1;e<s;e++)l=l.concat([`uniform float cshift${e};`,`uniform float cscale${e};`,`uniform float pwfshift${e};`,`uniform float pwfscale${e};`]);switch(s){case 1:l=l.concat([`uniform float mix0;`,`#define height0 0.5`]);break;case 2:l=l.concat([`uniform float mix0;`,`uniform float mix1;`,`#define height0 0.25`,`#define height1 0.75`]);break;case 3:l=l.concat([`uniform float mix0;`,`uniform float mix1;`,`uniform float mix2;`,`#define height0 0.17`,`#define height1 0.5`,`#define height2 0.83`]);break;case 4:l=l.concat([`uniform float mix0;`,`uniform float mix1;`,`uniform float mix2;`,`uniform float mix3;`,`#define height0 0.125`,`#define height1 0.375`,`#define height2 0.625`,`#define height3 0.875`]);break;default:xt(`Unsupported number of independent coordinates.`)}}if(o=I.substitute(o,`//VTK::TCoord::Dec`,l).result,i.getProperty().getUseLabelOutline()===!0&&(o=I.substitute(o,`//VTK::LabelOutline::Dec`,[`uniform float vpWidth;`,`uniform float vpHeight;`,`uniform float vpOffsetX;`,`uniform float vpOffsetY;`,`uniform mat4 PCWCMatrix;`,`uniform mat4 vWCtoIDX;`,`uniform ivec3 imageDimensions;`,`uniform int sliceAxis;`]).result,o=I.substitute(o,`//VTK::ImageLabelOutlineOn`,`#define vtkImageLabelOutlineOn`).result,o=I.substitute(o,`//VTK::LabelOutlineHelperFunction`,[`#ifdef vtkImageLabelOutlineOn`,`vec3 fragCoordToIndexSpace(vec4 fragCoord) {`,`  vec4 pcPos = vec4(`,`    (fragCoord.x / vpWidth - vpOffsetX - 0.5) * 2.0,`,`    (fragCoord.y / vpHeight - vpOffsetY - 0.5) * 2.0,`,`    (fragCoord.z - 0.5) * 2.0,`,`    1.0);`,``,`  vec4 worldCoord = PCWCMatrix * pcPos;`,`  vec4 vertex = (worldCoord/worldCoord.w);`,``,`  vec3 index = (vWCtoIDX * vertex).xyz;`,``,`  // half voxel fix for labelmapOutline`,`  return (index + vec3(0.5)) / vec3(imageDimensions);`,`}`,`vec2 getSliceCoords(vec3 coord, int axis) {`,`  if (axis == 0) return coord.yz;`,`  if (axis == 1) return coord.xz;`,`  if (axis == 2) return coord.xy;`,`}`,`#endif`]).result),c){let e=[`r`,`g`,`b`,`a`],t=[`vec4 tvalue = texture2D(texture1, tcoordVCVSOutput);`];for(let n=0;n<s;n++)t=t.concat([`vec3 tcolor${n} = mix${n} * texture2D(colorTexture1, vec2(tvalue.${e[n]} * cscale${n} + cshift${n}, height${n})).rgb;`,`float compWeight${n} = mix${n} * texture2D(pwfTexture1, vec2(tvalue.${e[n]} * pwfscale${n} + pwfshift${n}, height${n})).r;`]);switch(s){case 1:t=t.concat([`gl_FragData[0] = vec4(tcolor0.rgb, opacity);`]);break;case 2:t=t.concat([`float weightSum = compWeight0 + compWeight1;`,`gl_FragData[0] = vec4(vec3((tcolor0.rgb * (compWeight0 / weightSum)) + (tcolor1.rgb * (compWeight1 / weightSum))), opacity);`]);break;case 3:t=t.concat([`float weightSum = compWeight0 + compWeight1 + compWeight2;`,`gl_FragData[0] = vec4(vec3((tcolor0.rgb * (compWeight0 / weightSum)) + (tcolor1.rgb * (compWeight1 / weightSum)) + (tcolor2.rgb * (compWeight2 / weightSum))), opacity);`]);break;case 4:t=t.concat([`float weightSum = compWeight0 + compWeight1 + compWeight2 + compWeight3;`,`gl_FragData[0] = vec4(vec3((tcolor0.rgb * (compWeight0 / weightSum)) + (tcolor1.rgb * (compWeight1 / weightSum)) + (tcolor2.rgb * (compWeight2 / weightSum)) + (tcolor3.rgb * (compWeight3 / weightSum))), opacity);`]);break;default:xt(`Unsupported number of independent coordinates.`)}o=I.substitute(o,`//VTK::TCoord::Impl`,t).result}else switch(s){case 1:o=I.substitute(o,`//VTK::TCoord::Impl`,[...St(`
                #ifdef vtkImageLabelOutlineOn
                  vec3 centerPosIS = fragCoordToIndexSpace(gl_FragCoord);
                  float centerValue = texture2D(texture1, getSliceCoords(centerPosIS, sliceAxis)).r;
                  bool pixelOnBorder = false;
                  vec3 tColor = texture2D(colorTexture1, vec2(centerValue * cscale0 + cshift0, 0.5)).rgb;
                  float scalarOpacity = texture2D(pwfTexture1, vec2(centerValue * pwfscale0 + pwfshift0, 0.5)).r;
                  float opacityToUse = scalarOpacity * opacity;
                  int segmentIndex = int(centerValue * 255.0);
                  float textureCoordinate = float(segmentIndex - 1) / 1024.0;
                  float textureValue = texture2D(labelOutlineTexture1, vec2(textureCoordinate, 0.5)).r;
                  float outlineOpacity = texture2D(labelOutlineOpacityTexture1, vec2(textureCoordinate, 0.5)).r;
                  int actualThickness = int(textureValue * 255.0);

                  if (segmentIndex == 0){
                    gl_FragData[0] = vec4(0.0, 0.0, 0.0, 0.0);
                    return;
                  }

                  for (int i = -actualThickness; i <= actualThickness; i++) {
                    for (int j = -actualThickness; j <= actualThickness; j++) {
                      if (i == 0 && j == 0) {
                        continue;
                      }
                      vec4 neighborPixelCoord = vec4(gl_FragCoord.x + float(i),
                        gl_FragCoord.y + float(j),
                        gl_FragCoord.z, gl_FragCoord.w);
                      vec3 neighborPosIS = fragCoordToIndexSpace(neighborPixelCoord);
                      float value = texture2D(texture1, getSliceCoords(neighborPosIS, sliceAxis)).r;
                      if (value != centerValue) {
                        pixelOnBorder = true;
                        break;
                      }
                    }
                    if (pixelOnBorder == true) {
                      break;
                    }
                  }
                  if (pixelOnBorder == true) {
                    gl_FragData[0] = vec4(tColor, outlineOpacity);
                  }
                  else {
                    gl_FragData[0] = vec4(tColor, opacityToUse);
                  }
                #else
                  float intensity = texture2D(texture1, tcoordVCVSOutput).r;
                  vec3 tcolor = texture2D(colorTexture1, vec2(intensity * cscale0 + cshift0, 0.5)).rgb;
                  float scalarOpacity = texture2D(pwfTexture1, vec2(intensity * pwfscale0 + pwfshift0, 0.5)).r;
                  gl_FragData[0] = vec4(tcolor, scalarOpacity * opacity);
                #endif
                `)]).result;break;case 2:o=I.substitute(o,`//VTK::TCoord::Impl`,[`vec4 tcolor = texture2D(texture1, tcoordVCVSOutput);`,`float intensity = tcolor.r*cscale0 + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(intensity, 0.5)).rgb, pwfscale0*tcolor.g + pwfshift0);`]).result;break;case 3:o=I.substitute(o,`//VTK::TCoord::Impl`,[`vec4 tcolor = cscale0*texture2D(texture1, tcoordVCVSOutput.st) + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(tcolor.r,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.g,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.b,0.5)).r, opacity);`]).result;break;default:o=I.substitute(o,`//VTK::TCoord::Impl`,[`vec4 tcolor = cscale0*texture2D(texture1, tcoordVCVSOutput.st) + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(tcolor.r,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.g,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.b,0.5)).r, tcolor.a);`]).result}n.haveSeenDepthRequest&&(o=I.substitute(o,`//VTK::ZBuffer::Dec`,`uniform int depthRequest;`).result,o=I.substitute(o,`//VTK::ZBuffer::Impl`,[`if (depthRequest == 1) {`,`float iz = floor(gl_FragCoord.z*65535.0 + 0.1);`,`float rf = floor(iz/256.0)/255.0;`,`float gf = mod(iz,256.0)/255.0;`,`gl_FragData[0] = vec4(rf, gf, 0.0, 1.0); }`]).result),t.Vertex=a,t.Fragment=o,e.replaceShaderClip(t,r,i),e.replaceShaderCoincidentOffset(t,r,i)},e.replaceShaderClip=(e,t,r)=>{let i=e.Vertex,a=e.Fragment;if(n.renderable.getNumberOfClippingPlanes()){let e=n.renderable.getNumberOfClippingPlanes();e>6&&(ct(`OpenGL has a limit of 6 clipping planes`),e=6),i=I.substitute(i,`//VTK::Clip::Dec`,[`uniform int numClipPlanes;`,`uniform vec4 clipPlanes[6];`,`varying float clipDistancesVSOutput[6];`]).result,i=I.substitute(i,`//VTK::Clip::Impl`,[`for (int planeNum = 0; planeNum < 6; planeNum++)`,`    {`,`    if (planeNum >= numClipPlanes)`,`        {`,`        break;`,`        }`,`    clipDistancesVSOutput[planeNum] = dot(clipPlanes[planeNum], vertexMC);`,`    }`]).result,a=I.substitute(a,`//VTK::Clip::Dec`,[`uniform int numClipPlanes;`,`varying float clipDistancesVSOutput[6];`]).result,a=I.substitute(a,`//VTK::Clip::Impl`,[`for (int planeNum = 0; planeNum < 6; planeNum++)`,`    {`,`    if (planeNum >= numClipPlanes)`,`        {`,`        break;`,`        }`,`    if (clipDistancesVSOutput[planeNum] < 0.0) discard;`,`    }`]).result}e.Vertex=i,e.Fragment=a},e.getNeedToRebuildShaders=(e,t,r)=>{let i=n.openGLTexture.getComponents(),a=r.getProperty().getIndependentComponents(),o=!1;return(!n.currentRenderPass&&n.lastRenderPassShaderReplacement||n.currentRenderPass&&n.currentRenderPass.getShaderReplacement()!==n.lastRenderPassShaderReplacement)&&(o=!0),o||n.lastHaveSeenDepthRequest!==n.haveSeenDepthRequest||e.getProgram()?.getHandle()===0||e.getShaderSourceTime().getMTime()<n.renderable.getMTime()||e.getShaderSourceTime().getMTime()<n.currentInput.getMTime()||e.getShaderSourceTime().getMTime()<r.getProperty().getMTime()||n.lastTextureComponents!==i||n.lastIndependentComponents!==a?(n.lastHaveSeenDepthRequest=n.haveSeenDepthRequest,n.lastTextureComponents=i,n.lastIndependentComponents=a,!0):!1},e.updateShaders=(t,r,i)=>{if(n.lastBoundBO=t,e.getNeedToRebuildShaders(t,r,i)){let a={Vertex:null,Fragment:null,Geometry:null};e.buildShaders(a,r,i);let o=n._openGLRenderWindow.getShaderCache().readyShaderProgramArray(a.Vertex,a.Fragment,a.Geometry);o!==t.getProgram()&&(t.setProgram(o),t.getVAO().releaseGraphicsResources()),t.getShaderSourceTime().modified()}else n._openGLRenderWindow.getShaderCache().readyShaderProgram(t.getProgram());t.getVAO().bind(),e.setMapperShaderParameters(t,r,i),e.setCameraShaderParameters(t,r,i),e.setPropertyShaderParameters(t,r,i)},e.setMapperShaderParameters=(t,r,i)=>{t.getCABO().getElementCount()&&(n.VBOBuildTime>t.getAttributeUpdateTime().getMTime()||t.getShaderSourceTime().getMTime()>t.getAttributeUpdateTime().getMTime())&&(t.getProgram().isAttributeUsed(`vertexMC`)&&(t.getVAO().addAttributeArray(t.getProgram(),t.getCABO(),`vertexMC`,t.getCABO().getVertexOffset(),t.getCABO().getStride(),n.context.FLOAT,3,n.context.FALSE)||xt(`Error setting vertexMC in shader VAO.`)),t.getProgram().isAttributeUsed(`tcoordMC`)&&t.getCABO().getTCoordOffset()&&(t.getVAO().addAttributeArray(t.getProgram(),t.getCABO(),`tcoordMC`,t.getCABO().getTCoordOffset(),t.getCABO().getStride(),n.context.FLOAT,t.getCABO().getTCoordComponents(),n.context.FALSE)||xt(`Error setting tcoordMC in shader VAO.`)),t.getAttributeUpdateTime().modified());let a=n.openGLTexture.getTextureUnit();t.getProgram().setUniformi(`texture1`,a);let s=n.openGLTexture.getComponents(),c=i.getProperty().getIndependentComponents();if(c)for(let e=0;e<s;e++)t.getProgram().setUniformf(`mix${e}`,i.getProperty().getComponentWeight(e));let l=n.openGLTexture.getShiftAndScale();for(let e=0;e<s;e++){let n=i.getProperty().getColorWindow(),r=i.getProperty().getColorLevel(),a=c?e:0,o=i.getProperty().getRGBTransferFunction(a);if(o&&i.getProperty().getUseLookupTableScalarRange()){let e=o.getRange();n=e[1]-e[0],r=.5*(e[1]+e[0])}let s=l.scale/n,u=(l.shift-r)/n+.5;t.getProgram().setUniformf(`cshift${e}`,u),t.getProgram().setUniformf(`cscale${e}`,s)}for(let e=0;e<s;e++){let n=1,r=0,a=c?e:0,o=i.getProperty().getPiecewiseFunction(a);if(o){let e=o.getRange(),t=e[1]-e[0],i=.5*(e[0]+e[1]);n=l.scale/t,r=(l.shift-i)/t+.5}t.getProgram().setUniformf(`pwfshift${e}`,r),t.getProgram().setUniformf(`pwfscale${e}`,n)}if(n.haveSeenDepthRequest&&t.getProgram().setUniformi(`depthRequest`,+!!n.renderDepth),t.getProgram().isUniformUsed(`coffset`)){let n=e.getCoincidentParameters(r,i);t.getProgram().setUniformf(`coffset`,n.offset),t.getProgram().isUniformUsed(`cfactor`)&&t.getProgram().setUniformf(`cfactor`,n.factor)}let u=n.colorTexture.getTextureUnit();t.getProgram().setUniformi(`colorTexture1`,u);let d=n.pwfTexture.getTextureUnit();if(t.getProgram().setUniformi(`pwfTexture1`,d),i.getProperty().getUseLabelOutline()){let e=n.labelOutlineThicknessTexture.getTextureUnit();t.getProgram().setUniformi(`labelOutlineTexture1`,e);let r=n.labelOutlineOpacityTexture.getTextureUnit();t.getProgram().setUniformi(`labelOutlineOpacityTexture1`,r)}if(n.renderable.getNumberOfClippingPlanes()){let e=n.renderable.getNumberOfClippingPlanes();e>6&&(ct(`OpenGL has a limit of 6 clipping planes`),e=6);let r=t.getCABO().getCoordShiftAndScaleEnabled()?t.getCABO().getInverseShiftAndScaleMatrix():null,a=r?o(n.imagematinv,i.getMatrix()):i.getMatrix();r&&(P(a,a),M(a,a,r),P(a,a)),P(n.imagemat,n.currentInput.getIndexToWorld()),M(n.imagematinv,a,n.imagemat);let s=[];for(let t=0;t<e;t++){let e=[];n.renderable.getClippingPlaneInDataCoords(n.imagematinv,t,e);for(let t=0;t<4;t++)s.push(e[t])}t.getProgram().setUniformi(`numClipPlanes`,e),t.getProgram().setUniform4fv(`clipPlanes`,s)}},e.setCameraShaderParameters=(t,r,i)=>{let a=t.getProgram(),o=n.openGLImageSlice.getKeyMatrices(),s=n.currentInput,c=s.getIndexToWorld();M(n.imagemat,o.mcwc,c);let l=n.openGLCamera.getKeyMatrices(r);if(M(n.imagemat,l.wcpc,n.imagemat),t.getCABO().getCoordShiftAndScaleEnabled()){let e=t.getCABO().getInverseShiftAndScaleMatrix();M(n.imagemat,n.imagemat,e)}if(a.setUniformMatrix(`MCPCMatrix`,n.imagemat),i.getProperty().getUseLabelOutline()===!0){let t=s.getWorldToIndex(),i=s.getDimensions(),o=n.renderable.getClosestIJKAxis().ijkMode;o===H.NONE&&(o=H.K),a.setUniform3i(`imageDimensions`,i[0],i[1],i[2]),a.setUniformi(`sliceAxis`,o),a.setUniformMatrix(`vWCtoIDX`,t);let c=n.openGLCamera.getKeyMatrices(r);b(n.projectionToWorld,c.wcpc),n.openGLCamera.getKeyMatrices(r),a.setUniformMatrix(`PCWCMatrix`,n.projectionToWorld);let l=e.getRenderTargetSize();a.setUniformf(`vpWidth`,l[0]),a.setUniformf(`vpHeight`,l[1]);let u=e.getRenderTargetOffset();a.setUniformf(`vpOffsetX`,u[0]/l[0]),a.setUniformf(`vpOffsetY`,u[1]/l[1])}},e.setPropertyShaderParameters=(e,t,n)=>{let r=e.getProgram(),i=n.getProperty().getOpacity();r.setUniformf(`opacity`,i)},e.renderPieceStart=(t,r)=>{e.updateBufferObjects(t,r),n.lastBoundBO=null},e.renderPieceDraw=(t,r)=>{let i=n.context;n.openGLTexture.activate(),n.colorTexture.activate(),r.getProperty().getUseLabelOutline()&&(n.labelOutlineThicknessTexture.activate(),n.labelOutlineOpacityTexture.activate()),n.pwfTexture.activate(),n.tris.getCABO().getElementCount()&&(e.updateShaders(n.tris,t,r),i.drawArrays(i.TRIANGLES,0,n.tris.getCABO().getElementCount()),n.tris.getVAO().release()),n.openGLTexture.deactivate(),n.colorTexture.deactivate(),r.getProperty().getUseLabelOutline()&&(n.labelOutlineThicknessTexture.deactivate(),n.labelOutlineOpacityTexture.deactivate()),n.pwfTexture.deactivate()},e.renderPieceFinish=(e,t)=>{},e.renderPiece=(t,r)=>{if(e.invokeEvent({type:`StartEvent`}),n.renderable.update(),n.currentInput=n.renderable.getCurrentImage(),e.invokeEvent({type:`EndEvent`}),!n.currentInput){xt(`No input!`);return}e.renderPieceStart(t,r),e.renderPieceDraw(t,r),e.renderPieceFinish(t,r)},e.updateBufferObjects=(t,n)=>{e.getNeedToRebuildBufferObjects(t,n)&&e.buildBufferObjects(t,n)},e.getNeedToRebuildBufferObjects=(t,r)=>n.VBOBuildTime.getMTime()<e.getMTime()||n.VBOBuildTime.getMTime()<r.getMTime()||n.VBOBuildTime.getMTime()<n.renderable.getMTime()||n.VBOBuildTime.getMTime()<r.getProperty().getMTime()||n.VBOBuildTime.getMTime()<n.currentInput.getMTime()||!n.openGLTexture?.getHandle()||!n.colorTexture?.getHandle()||r.getProperty().getUseLabelOutline()&&(!n.labelOutlineThicknessTexture?.getHandle()||!n.labelOutlineOpacityTexture?.getHandle())||!n.pwfTexture?.getHandle(),e.buildBufferObjects=(r,i)=>{let a=n.currentInput;if(!a)return;let o=a.getPointData()&&a.getPointData().getScalars();if(!o)return;let s=o.getDataType(),c=o.getNumberOfComponents(),l=i.getProperty(),u=l.getInterpolationType(),d=l.getIndependentComponents(),f=d?c:1,p=d?2*f:1,m=[];for(let e=0;e<f;++e)m.push(l.getRGBTransferFunction(e));let h=yt(m,d,f),g=l.getRGBTransferFunction(),_=n._openGLRenderWindow.getGraphicsResourceForObject(g);if(!_?.oglObject?.getHandle()||_?.hash!==h){n.colorTexture=y.newInstance({resizable:!0}),n.colorTexture.setOpenGLRenderWindow(n._openGLRenderWindow);let t=n.renderable.getColorTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let r=t*p*3,i=new Uint8ClampedArray(r);if(u===V.NEAREST?(n.colorTexture.setMinificationFilter(j.NEAREST),n.colorTexture.setMagnificationFilter(j.NEAREST)):(n.colorTexture.setMinificationFilter(j.LINEAR),n.colorTexture.setMagnificationFilter(j.LINEAR)),g){let e=new Float32Array(t*3);for(let n=0;n<f;n++){let r=l.getRGBTransferFunction(n),a=r.getRange();if(r.getTable(a[0],a[1],t,e,1),d)for(let r=0;r<t*3;r++)i[n*t*6+r]=255*e[r],i[n*t*6+r+t*3]=255*e[r];else for(let r=0;r<t*3;r++)i[n*t*6+r]=255*e[r]}n.colorTexture.resetFormatAndType(),n.colorTexture.create2DFromRaw({width:t,height:p,numComps:3,dataType:N.UNSIGNED_CHAR,data:i})}else{for(let e=0;e<t*3;++e)i[e]=255*e/((t-1)*3),i[e+1]=255*e/((t-1)*3),i[e+2]=255*e/((t-1)*3);n.colorTexture.create2DFromRaw({width:t,height:1,numComps:3,dataType:N.UNSIGNED_CHAR,data:i})}g&&(n._openGLRenderWindow.setGraphicsResourceForObject(g,n.colorTexture,h),g!==n._colorTransferFunc&&(n._openGLRenderWindow.registerGraphicsResourceUser(g,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._colorTransferFunc,e)),n._colorTransferFunc=g)}else n.colorTexture=_.oglObject;let v=[];for(let e=0;e<f;++e)v.push(l.getPiecewiseFunction(e));let b=yt(v,d,f),x=l.getPiecewiseFunction(),S=n._openGLRenderWindow.getGraphicsResourceForObject(x);if(!S?.oglObject?.getHandle()||S?.hash!==b){let t=n.renderable.getOpacityTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let r=t*p,i=new Uint8ClampedArray(r);if(n.pwfTexture=y.newInstance({resizable:!0}),n.pwfTexture.setOpenGLRenderWindow(n._openGLRenderWindow),u===V.NEAREST?(n.pwfTexture.setMinificationFilter(j.NEAREST),n.pwfTexture.setMagnificationFilter(j.NEAREST)):(n.pwfTexture.setMinificationFilter(j.LINEAR),n.pwfTexture.setMagnificationFilter(j.LINEAR)),x){let e=new Float32Array(r),i=new Float32Array(t);for(let n=0;n<f;++n){let r=l.getPiecewiseFunction(n);if(r===null)e.fill(1);else{let a=r.getRange();if(r.getTable(a[0],a[1],t,i,1),d)for(let r=0;r<t;r++)e[n*t*2+r]=i[r],e[n*t*2+r+t]=i[r];else for(let r=0;r<t;r++)e[n*t*2+r]=i[r]}}n.pwfTexture.resetFormatAndType(),n.pwfTexture.create2DFromRaw({width:t,height:p,numComps:1,dataType:N.FLOAT,data:e})}else i.fill(255),n.pwfTexture.create2DFromRaw({width:t,height:1,numComps:1,dataType:N.UNSIGNED_CHAR,data:i});x&&(n._openGLRenderWindow.setGraphicsResourceForObject(x,n.pwfTexture,b),x!==n._pwFunc&&(n._openGLRenderWindow.registerGraphicsResourceUser(x,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._pwFunc,e)),n._pwFunc=x)}else n.pwfTexture=S.oglObject;i.getProperty().getUseLabelOutline()&&(e.updatelabelOutlineThicknessTexture(i),e.updateLabelOutlineOpacityTexture(i));let{ijkMode:C}=n.renderable.getClosestIJKAxis(),w=n.renderable.getSlice();C!==n.renderable.getSlicingMode()&&(w=n.renderable.getSliceAtPosition(w));let T=n.renderable.isA(`vtkImageArrayMapper`)?n.renderable.getSubSlice():Math.round(w),E=a.getExtent(),D;C===H.I&&(D=T-E[0]),C===H.J&&(D=T-E[2]),(C===H.K||C===H.NONE)&&(D=T-E[4]);let ee=`${w}A${a.getMTime()}A${o.getMTime()}B${e.getMTime()}C${n.renderable.getSlicingMode()}D${i.getProperty().getInterpolationType()}`;if(n.VBOBuildString!==ee){let e=a.getDimensions();n.openGLTexture||=y.newInstance({resizable:!0}),n.openGLTexture.setOpenGLRenderWindow(n._openGLRenderWindow),n.openGLTexture.setOglNorm16Ext(n.context.getExtension(`EXT_texture_norm16`)),u===V.NEAREST?(new Set([1,3,4]).has(c)&&s===N.UNSIGNED_CHAR&&!d&&n.openGLTexture.setGenerateMipmap(!0),n.openGLTexture.setMinificationFilter(j.NEAREST),n.openGLTexture.setMagnificationFilter(j.NEAREST)):(c===4&&s===N.UNSIGNED_CHAR&&!d?(n.openGLTexture.setGenerateMipmap(!0),n.openGLTexture.setMinificationFilter(j.LINEAR_MIPMAP_LINEAR)):n.openGLTexture.setMinificationFilter(j.LINEAR),n.openGLTexture.setMagnificationFilter(j.LINEAR)),n.openGLTexture.setWrapS(de.CLAMP_TO_EDGE),n.openGLTexture.setWrapT(de.CLAMP_TO_EDGE);let r=e[0]*e[1]*c,i=new Float32Array(12),l=new Float32Array(8);for(let e=0;e<4;e++)l[e*2]=e%2?1:0,l[e*2+1]=+(e>1);let f=[H.X,H.Y,H.Z].includes(n.renderable.getSlicingMode())?w:T,p=a.getSpatialExtent(),m=o.getData(),h=null;if(C===H.I){h=new m.constructor(e[2]*e[1]*c);let t=0;for(let n=0;n<e[2];n++)for(let r=0;r<e[1];r++){let i=(D+r*e[0]+n*e[0]*e[1])*c;t=(n*e[1]+r)*c;let a=i+c;for(;i<a;)h[t++]=m[i++]}e[0]=e[1],e[1]=e[2],i[0]=f,i[1]=p[2],i[2]=p[4],i[3]=f,i[4]=p[3],i[5]=p[4],i[6]=f,i[7]=p[2],i[8]=p[5],i[9]=f,i[10]=p[3],i[11]=p[5]}else if(C===H.J){h=new m.constructor(e[2]*e[0]*c);let t=0;for(let n=0;n<e[2];n++)for(let r=0;r<e[0];r++){let i=(r+D*e[0]+n*e[0]*e[1])*c;t=(n*e[0]+r)*c;let a=i+c;for(;i<a;)h[t++]=m[i++]}e[1]=e[2],i[0]=p[0],i[1]=f,i[2]=p[4],i[3]=p[1],i[4]=f,i[5]=p[4],i[6]=p[0],i[7]=f,i[8]=p[5],i[9]=p[1],i[10]=f,i[11]=p[5]}else C===H.K||C===H.NONE?(h=m.subarray(D*r,(D+1)*r),i[0]=p[0],i[1]=p[2],i[2]=f,i[3]=p[1],i[4]=p[2],i[5]=f,i[6]=p[0],i[7]=p[3],i[8]=f,i[9]=p[1],i[10]=p[3],i[11]=f):xt(`Reformat slicing not yet supported.`);let g=o.getRanges();n.openGLTexture.resetFormatAndType(),n.openGLTexture.create2DFilterableFromRaw({width:e[0],height:e[1],numComps:c,dataType:o.getDataType(),data:h,preferSizeOverAccuracy:!!n.renderable.getPreferSizeOverAccuracy?.(),ranges:g}),n.openGLTexture.activate(),n.openGLTexture.sendParameters(),n.openGLTexture.deactivate();let _=R.newInstance({numberOfComponents:3,values:i});_.setName(`points`);let v=R.newInstance({numberOfComponents:2,values:l});v.setName(`tcoords`);let b=new Uint16Array(8);b[0]=3,b[1]=0,b[2]=1,b[3]=3,b[4]=3,b[5]=0,b[6]=3,b[7]=2;let x=Oe.newInstance({values:b});n.tris.getCABO().createVBO(x,`polys`,t.SURFACE,{points:_,tcoords:v,cellOffset:0,forceFlatten:!0}),n.VBOBuildTime.modified(),n.VBOBuildString=ee}},e.updateLabelOutlineOpacityTexture=t=>{let r=t.getProperty().getLabelOutlineOpacity();typeof r==`number`&&(r=n._cachedLabelOutlineOpacityObj?.[0]===r?n._cachedLabelOutlineOpacityObj:[r],n._cachedLabelOutlineOpacityObj=r);let i=n._openGLRenderWindow.getGraphicsResourceForObject(r),a=`${r.join(`-`)}`;if(!i?.oglObject?.getHandle()||i?.hash!==a){let t=n.renderable.getLabelOutlineTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let i=t*1,o=new Float32Array(i);for(let e=0;e<t;++e)o[e]=r[e]??r[0];n.labelOutlineOpacityTexture=y.newInstance({resizable:!1}),n.labelOutlineOpacityTexture.setOpenGLRenderWindow(n._openGLRenderWindow),n.labelOutlineOpacityTexture.resetFormatAndType(),n.labelOutlineOpacityTexture.setMinificationFilter(j.NEAREST),n.labelOutlineOpacityTexture.setMagnificationFilter(j.NEAREST),n.labelOutlineOpacityTexture.create2DFromRaw({width:t,height:1,numComps:1,dataType:N.FLOAT,data:o}),r&&(n._openGLRenderWindow.setGraphicsResourceForObject(r,n.labelOutlineOpacityTexture,a),r!==n._labelOutlineOpacity&&(n._openGLRenderWindow.registerGraphicsResourceUser(r,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._labelOutlineOpacity,e)),n._labelOutlineOpacity=r)}else n.labelOutlineOpacityTexture=i.oglObject},e.updatelabelOutlineThicknessTexture=t=>{let r=t.getProperty().getLabelOutlineThicknessByReference(),i=n._openGLRenderWindow.getGraphicsResourceForObject(r),a=`${r.join(`-`)}`;if(!i?.oglObject?.getHandle()||i?.hash!==a){let t=n.renderable.getLabelOutlineTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let i=t*1,o=new Uint8Array(i);for(let e=0;e<t;++e)o[e]=r[e]===void 0?r[0]:r[e];n.labelOutlineThicknessTexture=y.newInstance({resizable:!1}),n.labelOutlineThicknessTexture.setOpenGLRenderWindow(n._openGLRenderWindow),n.labelOutlineThicknessTexture.resetFormatAndType(),n.labelOutlineThicknessTexture.setMinificationFilter(j.NEAREST),n.labelOutlineThicknessTexture.setMagnificationFilter(j.NEAREST),n.labelOutlineThicknessTexture.create2DFromRaw({width:t,height:1,numComps:1,dataType:N.UNSIGNED_CHAR,data:o}),r&&(n._openGLRenderWindow.setGraphicsResourceForObject(r,n.labelOutlineThicknessTexture,a),r!==n._labelOutlineThicknessArray&&(n._openGLRenderWindow.registerGraphicsResourceUser(r,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._labelOutlineThicknessArray,e)),n._labelOutlineThicknessArray=r)}else n.labelOutlineThicknessTexture=i.oglObject},e.getRenderTargetSize=()=>{if(n._useSmallViewport)return[n._smallViewportWidth,n._smallViewportHeight];let{usize:e,vsize:t}=n._openGLRenderer.getTiledSizeAndOrigin();return[e,t]},e.getRenderTargetOffset=()=>{let{lowerLeftU:e,lowerLeftV:t}=n._openGLRenderer.getTiledSizeAndOrigin();return[e,t]},e.delete=Ne(()=>{n._openGLRenderWindow&&r(n._openGLRenderWindow)},e.delete)}var wt={VBOBuildTime:0,VBOBuildString:null,openGLTexture:null,tris:null,imagemat:null,imagematinv:null,colorTexture:null,pwfTexture:null,labelOutlineThicknessTexture:null,labelOutlineOpacityTexture:null,lastHaveSeenDepthRequest:!1,haveSeenDepthRequest:!1,lastTextureComponents:0};function Tt(e,t,n={}){Object.assign(t,wt,n),Ge.extend(e,t,n),_.implementReplaceShaderCoincidentOffset(e,t,n),_.implementBuildShadersWithReplacements(e,t,n),t.tris=h.newInstance(),t.imagemat=L(new Float64Array(16)),t.imagematinv=L(new Float64Array(16)),t.projectionToWorld=L(new Float64Array(16)),t.idxToView=L(new Float64Array(16)),t.idxNormalMatrix=tt(new Float64Array(9)),t.modelToView=L(new Float64Array(16)),t.projectionToView=L(new Float64Array(16)),c(e,t,[]),t.VBOBuildTime={},k(t.VBOBuildTime),Ct(e,t)}var Et=be(Tt,`vtkOpenGLImageMapper`);Ye(`vtkAbstractImageMapper`,Et);function Dt(e,t){t.classHierarchy.push(`vtkOpenGLImageSlice`),e.buildPass=n=>{if(t.renderable&&t.renderable.getVisibility()&&n){if(!t.renderable)return;t._openGLRenderWindow=e.getLastAncestorOfType(`vtkOpenGLRenderWindow`),t._openGLRenderer=e.getFirstAncestorOfType(`vtkOpenGLRenderer`),t.context=t._openGLRenderWindow.getContext(),e.prepareNodes(),e.addMissingNode(t.renderable.getMapper()),e.removeUnusedNodes()}},e.traverseZBufferPass=n=>{t.renderable&&t.renderable.getNestedVisibility()&&(!t._openGLRenderer.getSelector()||t.renderable.getNestedPickable())&&(e.apply(n,!0),t.children.forEach(e=>{e.traverse(n)}),e.apply(n,!1))},e.traverseOpaqueZBufferPass=t=>e.traverseOpaquePass(t),e.traverseOpaquePass=n=>{t.renderable&&t.renderable.getNestedVisibility()&&t.renderable.getIsOpaque()&&(!t._openGLRenderer.getSelector()||t.renderable.getNestedPickable())&&(e.apply(n,!0),t.children.forEach(e=>{e.traverse(n)}),e.apply(n,!1))},e.traverseTranslucentPass=n=>{!t.renderable||!t.renderable.getNestedVisibility()||t.renderable.getIsOpaque()||t._openGLRenderer.getSelector()&&!t.renderable.getNestedPickable()||(e.apply(n,!0),t.children.forEach(e=>{e.traverse(n)}),e.apply(n,!1))},e.queryPass=(e,n)=>{if(e){if(!t.renderable||!t.renderable.getVisibility())return;t.renderable.getIsOpaque()?n.incrementOpaqueActorCount():n.incrementTranslucentActorCount()}},e.zBufferPass=(t,n)=>e.opaquePass(t,n),e.opaqueZBufferPass=(t,n)=>e.opaquePass(t,n),e.opaquePass=(e,n)=>{e&&t.context.depthMask(!0)},e.translucentPass=(e,n)=>{t.context.depthMask(!e)},e.getKeyMatrices=()=>(t.renderable.getMTime()>t.keyMatrixTime.getMTime()&&(o(t.keyMatrices.mcwc,t.renderable.getMatrix()),P(t.keyMatrices.mcwc,t.keyMatrices.mcwc),t.keyMatrixTime.modified()),t.keyMatrices)}var Ot={context:null,keyMatrixTime:null,keyMatrices:null};function kt(e,t,n={}){Object.assign(t,Ot,n),Ge.extend(e,t,n),t.keyMatrixTime={},k(t.keyMatrixTime,{mtime:0}),t.keyMatrices={mcwc:L(new Float64Array(16))},c(e,t,[`context`]),Dt(e,t)}var At=be(kt,`vtkOpenGLImageSlice`);Ye(`vtkImageSlice`,At);var{vtkWarningMacro:jt}=z,Mt;function Nt(e,t){t.classHierarchy.push(`vtkAbstractTransform`,`vtkHomogeneousTransform`,`vtkTransform`),e.transformPoint=(e,n)=>(ne(n,e,t.matrix),n),e.transformPoints=(e,n)=>{let r=new Float64Array(3),i=new Float64Array(3);for(let a=0;a<e.length;a+=3)r[0]=e[a],r[1]=e[a+1],r[2]=e[a+2],ne(i,r,t.matrix),n[a]=i[0],n[a+1]=i[1],n[a+2]=i[2];return n},e.preMultiply=()=>{e.setPreMultiplyFlag(!0)},e.postMultiply=()=>{e.setPreMultiplyFlag(!1)},e.transformMatrix=(e,n)=>(t.preMultiplyFlag?M(n,t.matrix,e):M(n,e,t.matrix),n),e.transformMatrices=(e,n)=>{let r=new Float64Array(16),i=new Float64Array(16),a=t.preMultiplyFlag?()=>M(i,t.matrix,r):()=>M(i,r,t.matrix);for(let t=0;t<e.length;t+=16){for(let n=0;n<16;++n)r[n]=e[t+n];a();for(let e=0;e<16;++e)n[t+e]=i[e]}return n},e.getInverse=()=>Mt({matrix:F.invertMatrix(Array.from(t.matrix),[],4),preMultiplyFlag:t.preMultiplyFlag}),e.translate=(n,r,i)=>{if(n===0&&r===0&&i===0)return;let a=ce();g(a,[n,r,i]),t.preMultiplyFlag?M(t.matrix,t.matrix,a):M(t.matrix,a,t.matrix),e.modified()},e.rotateWXYZ=(n,r,i,a)=>{if(r===0&&i===0&&a===0){jt(`No rotation applied, axis is zero vector.`);return}if(n===0)return;let o=F.radiansFromDegrees(n),s=ft();A(s,[r,i,a],o);let c=new Float64Array(16);v(c,s),t.preMultiplyFlag?M(t.matrix,t.matrix,c):M(t.matrix,c,t.matrix),e.modified()},e.rotateX=t=>{e.rotateWXYZ(t,1,0,0)},e.rotateY=t=>{e.rotateWXYZ(t,0,1,0)},e.rotateZ=t=>{e.rotateWXYZ(t,0,0,1)},e.scale=(n,r,i)=>{if(n===1&&r===1&&i===1)return;let a=ce();ue(a,[n,r,i]),t.preMultiplyFlag?M(t.matrix,t.matrix,a):M(t.matrix,a,t.matrix),e.modified()},e.transformNormal=(n,r=[])=>{let i=qe(ve(),t.matrix),a=ve();Se(a,i);let o=ve();return Te(o,a),e.transformVector(n,r,o),F.normalize(r),r},e.transformNormals=(n,r)=>{let i=n.getData(),a=r.getData(),o=[0,0,0],s=qe(ve(),t.matrix),c=ve();Se(c,s);let l=ve();Te(l,c);for(let t=0;t<i.length;t+=3)o[0]=i[t],o[1]=i[t+1],o[2]=i[t+2],e.transformVector(o,o,l),F.normalize(o),a[t]=o[0],a[t+1]=o[1],a[t+2]=o[2]},e.transformVector=(e,n=[],r=null)=>{let i=r||qe(ve(),t.matrix);return S(n,e,i),n},e.transformVectors=(t,n)=>{let r=t.getData(),i=n.getData(),a=[0,0,0];for(let t=0;t<r.length;t+=3)a[0]=r[t],a[1]=r[t+1],a[2]=r[t+2],e.transformVector(a,a),F.normalize(a),i[t]=a[0],i[t+1]=a[1],i[t+2]=a[2]},e.transformPointsNormalsVectors=(t,n,r,i,a,o,s=null,c=null)=>{let l=t.getNumberOfPoints(),u=s?.length??0,d=new Float64Array(3),f=new Float64Array(3),p=new Float64Array(3),m=new Float64Array(3),h=!1,g=!1,_=!1,v=[];for(let y=0;y<l;y++){if(t.getPoint(y,d),f.set(d),e.transformPoint(d,d),n.setPoint(y,...d),F.areEquals(f,d)||(h=!0),a){let t=a.getData(),n=o.getData();d[0]=t[y*3],d[1]=t[y*3+1],d[2]=t[y*3+2],p.set(d),e.transformVector(d,d),n[y*3]=d[0],n[y*3+1]=d[1],n[y*3+2]=d[2],F.areEquals(p,d)||(g=!0)}if(r){let t=r.getData(),n=i.getData();d[0]=t[y*3],d[1]=t[y*3+1],d[2]=t[y*3+2],m.set(d),e.transformNormal(d,d),n[y*3]=d[0],n[y*3+1]=d[1],n[y*3+2]=d[2],F.areEquals(m,d)||(_=!0)}if(s)for(let t=0;t<u;t++){let n=s[t].getData(),r=c[t].getData();d[0]=n[y*3],d[1]=n[y*3+1],d[2]=n[y*3+2],p.set(d),e.transformVector(d,d),r[y*3]=d[0],r[y*3+1]=d[1],r[y*3+2]=d[2],!F.arrayEqual(p,d)&&!v.includes(t)&&v.push(t)}}h&&n.modified(),g&&o.modified(),_&&i.modified(),v.forEach(e=>c[e].modified())}}var Pt={preMultiplyFlag:!1,matrix:[...mt]};function Ft(e,t,n={}){Object.assign(t,Pt,n),z.obj(e,t),z.setGet(e,t,[`preMultiplyFlag`]),z.setGetArray(e,t,[`matrix`],16),Nt(e,t)}Mt=z.newInstance(Ft,`vtkTransform`);var It={newInstance:Mt,extend:Ft},{vtkErrorMacro:Lt}=pt;function Rt(e){let t=e.getPolys().getData(),n=e.getStrips().getData(),r={cellSize:0,cell:[],done:!1,polyIdx:0,stripIdx:0,remainingStripLength:0,next(){if(r.polyIdx<t.length){r.cellSize=t[r.polyIdx];let e=r.polyIdx+1,n=e+r.cellSize;r.polyIdx=n;let i=0;for(let a=e;a<n;++a)r.cell[i++]=t[a]}else if(r.stripIdx<n.length){r.cellSize=3,r.remainingStripLength===0&&(r.remainingStripLength=n[r.stripIdx]-2,r.stripIdx+=3);let e=r.stripIdx-2,t=r.stripIdx+1;r.stripIdx++,r.remainingStripLength--;let i=0;for(let a=e;a<t;++a)r.cell[i++]=n[a]}else if(!r.done)r.done=!0;else throw Error(`Iterator is done`)}};return r.next(),r}function zt(e,t){t.classHierarchy.push(`vtkCutter`);let n={...e};e.getMTime=()=>{let e=n.getMTime();return t.cutFunction&&(e=Math.max(e,t.cutFunction.getMTime())),e};function r(e,n){let r=e.getPoints(),i=r.getData(),a=e.getPointData(),o=r.getNumberOfPoints(),s=[],c=[],l=[],u={},d=a.getNumberOfArrays();for(let e=0;e<d;e++)u[a.getArrayName(e)]=[];(!t.cutScalars||t.cutScalars.length<o)&&(t.cutScalars=new Float32Array(o));let f=0,p=0;for(;f<i.length;)t.cutScalars[p++]=t.cutFunction.evaluateFunction(i[f++],i[f++],i[f++]);let m=[],h=[,,,],g=[,,,],_=[];for(let n=Rt(e);!n.done;n.next()){if(n.cellSize<=2)continue;for(let e=0;e<n.cellSize;)_[e]=t.cutScalars[n.cell[e++]];let e=_[0]>0,r=!0;for(let t=1;t<n.cell.length;t++)if(_[t]>0!==e){r=!1;break}if(r)continue;let o=[];for(let e=0;e<n.cellSize;e++){let r=e+1===n.cellSize?0:e+1,s=_[e]>0;if(_[r]>0===s)continue;let c=e,l=r,u=_[l]-_[c];u<=0&&(c=r,l=e,u*=-1);let f=0;u!==0&&(f=(t.cutValue-_[c])/u);let p=n.cell[c],m=n.cell[l];h[0]=i[p*3],h[1]=i[p*3+1],h[2]=i[p*3+2],g[0]=i[m*3],g[1]=i[m*3+1],g[2]=i[m*3+2];let v=[h[0]+f*(g[0]-h[0]),h[1]+f*(g[1]-h[1]),h[2]+f*(g[2]-h[2])],y={};for(let e=0;e<d;e++){let t=a.getArrayByIndex(e),n=a.getArrayName(e),r=t.getData(),i=t.getNumberOfComponents(),o=Array(i);for(let e=0;e<i;e++){let t=r[i*p+e],n=r[i*m+e];o.push(t+f*(n-t))}y[n]=o}o.push({pointEdge1:p,pointEdge2:m,intersectedPoint:v,intersectedArrays:y,newPointID:-1})}for(let e=0;e<o.length;e++){let t=o[e],n=!1;for(let r=0;r<m.length;r++){let i=m[r],a=t.pointEdge1===i.pointEdge1&&t.pointEdge2===i.pointEdge2,s=t.intersectedPoint[0]===i.intersectedPoint[0]&&t.intersectedPoint[1]===i.intersectedPoint[1]&&t.intersectedPoint[2]===i.intersectedPoint[2];if(a||s){n=!0,o[e].newPointID=m[r].newPointID;break}}n||(s.push(t.intersectedPoint[0]),s.push(t.intersectedPoint[1]),s.push(t.intersectedPoint[2]),Object.keys(t.intersectedArrays).forEach(e=>{u[e].push(...t.intersectedArrays[e])}),o[e].newPointID=s.length/3-1,m.push(o[e]))}let f=o.length;f===2?c.push(f,o[0].newPointID,o[1].newPointID):f>2&&(l.push(f),o.forEach(e=>{l.push(e.newPointID)}))}n.getPoints().setData(dt(r.getDataType(),s),3);let v=n.getPointData();for(let e=0;e<d;e++){let t=a.getArrayName(e),n=R.newInstance({name:t,dataType:a.getArrayByIndex(e).getDataType(),values:u[t],numberOfComponents:a.getArrayByIndex(e).getNumberOfComponents()});v.addArray(n)}c.length!==0&&n.getLines().setData(Uint16Array.from(c)),l.length!==0&&n.getPolys().setData(Uint16Array.from(l))}e.requestData=(e,n)=>{let i=e[0];if(!i){Lt(`Invalid or missing input`);return}if(!t.cutFunction){Lt(`Missing cut function`);return}let a=n[0]?.initialize()||C.newInstance();r(i,a),n[0]=a}}var Bt={cutFunction:null,cutScalars:null,cutValue:0};function Vt(e,t,n={}){Object.assign(t,Bt,n),k(e,t),Ie(e,t,1,1),c(e,t,[`cutFunction`,`cutValue`]),zt(e,t)}var Ht={newInstance:be(Vt,`vtkCutter`),extend:Vt},{vtkErrorMacro:Ut}=z,Wt=class{constructor(){this.segmentMapping={},this.segments=[null],this.faces=[]}addSegment(e){let t=e[0],n=e[e.length-1];if(t===n||e.length<2)return;let r=this.segmentMapping[t],i=this.segmentMapping[n];if(r!==void 0&&i!==void 0){if(Math.abs(r)===Math.abs(i)){let a=r<i?i:r,o=this.segments[a];if(r>0)for(let t=1;t<e.length-1;t++)o.push(e[t]);else for(let t=1;t<e.length-1;t++)o.unshift(e[e.length-1-t]);this.faces.push(o),this.segments[a]=null,this.segmentMapping[t]=void 0,this.segmentMapping[n]=void 0}else{let t=Math.abs(r),n=Math.abs(i),a=this.segments[t],o=this.segments[n];this.segments[t]=null,this.segments[n]=null,this.segmentMapping[a[0]]=void 0,this.segmentMapping[o[0]]=void 0,this.segmentMapping[a[a.length-1]]=void 0,this.segmentMapping[o[o.length-1]]=void 0,this.addSegment(e),this.addSegment(a),this.addSegment(o)}}else if(r!==void 0){if(r>0){let t=this.segments[r];for(let n=1;n<e.length;n++)t.push(e[n]);this.segmentMapping[n]=r}else{let t=this.segments[-r];this.segmentMapping[n]=r;for(let n=1;n<e.length;n++)t.unshift(e[n])}this.segmentMapping[t]=void 0}else if(i!==void 0){if(i>0){let n=this.segments[i];for(let t=1;t<e.length;t++)n.push(e[e.length-1-t]);this.segmentMapping[t]=i}else{let n=this.segments[-i];this.segmentMapping[t]=i;for(let t=1;t<e.length;t++)n.unshift(e[e.length-t-1])}this.segmentMapping[n]=void 0}else{let r=this.segments.length;this.segments.push(e),this.segmentMapping[t]=-r,this.segmentMapping[n]=r}}};function Gt(e,t){t.classHierarchy.push(`vtkClosedPolyLineToSurfaceFilter`),e.requestData=(e,t)=>{let n=e[0];if(!n){Ut(`Invalid or missing input`);return}let r=t[0]?.initialize()||C.newInstance();r.shallowCopy(n);let i=new Wt,a=n.getLines().getData(),o=0;for(;o<a.length;){let e=a[o++],t=[];for(let n=0;n<e;n++)t.push(a[o+n]);i.addSegment(t),o+=e}let{faces:s}=i,c=s.length;for(let e=0;e<s.length;e++)c+=s[e].length;let l=new Uint16Array(c);o=0;for(let e=0;e<s.length;e++){let t=s[e];l[o++]=t.length;for(let e=0;e<t.length;e++)l[o++]=t[e]}r.setPolys(Oe.newInstance({values:l,name:`faces`})),t[0]=r}}var Kt={};function qt(e,t,n={}){Object.assign(t,Kt,n),z.obj(e,t),z.algo(e,t,1,1),Gt(e,t)}var Jt={newInstance:z.newInstance(qt,`vtkClosedPolyLineToSurfaceFilter`),extend:qt},Yt=e=>e,Xt=1e-6,Zt=class{constructor(e=!1){this.matrix=L(new Float64Array(16)),this.tmp=new Float64Array(3),this.angleConv=e?Ae:Yt}rotateFromDirections(e,t){let n=new Float64Array(3),r=new Float64Array(3),i=new Float64Array(16);m(n,e[0],e[1],e[2]),m(r,t[0],t[1],t[2]),T(n,n),T(r,r);let a=D(n,r);return a>=1?this:(d(this.tmp,n,r),ze(this.tmp)<Xt&&(d(this.tmp,[1,0,0],e),ze(this.tmp)<Xt&&d(this.tmp,[0,1,0],e)),se(i,Math.acos(a),this.tmp),M(this.matrix,this.matrix,i),this)}rotate(e,t){return m(this.tmp,...t),T(this.tmp,this.tmp),te(this.matrix,this.matrix,this.angleConv(e),this.tmp),this}rotateX(e){return n(this.matrix,this.matrix,this.angleConv(e)),this}rotateY(e){return De(this.matrix,this.matrix,this.angleConv(e)),this}rotateZ(e){return nt(this.matrix,this.matrix,this.angleConv(e)),this}translate(e,t,n){return m(this.tmp,e,t,n),Qe(this.matrix,this.matrix,this.tmp),this}scale(e,t,n){return m(this.tmp,e,t,n),Ke(this.matrix,this.matrix,this.tmp),this}multiply(e){return M(this.matrix,this.matrix,e),this}multiply3x3(e){return M(this.matrix,this.matrix,[e[0],e[1],e[2],0,e[3],e[4],e[5],0,e[6],e[7],e[8],0,0,0,0,1]),this}invert(){return b(this.matrix,this.matrix),this}identity(){return L(this.matrix),this}apply(e,t=0,n=-1){if($e(mt,this.matrix))return this;let r=n===-1?e.length:t+n*3;for(let n=t;n<r;n+=3)m(this.tmp,e[n],e[n+1],e[n+2]),ne(this.tmp,this.tmp,this.matrix),e[n]=this.tmp[0],e[n+1]=this.tmp[1],e[n+2]=this.tmp[2];return this}getMatrix(){return this.matrix}setMatrix(e){return e&&e.length===16&&o(this.matrix,e),this}};function Qt(){return new Zt(!0)}function $t(){return new Zt(!1)}var en={buildFromDegree:Qt,buildFromRadian:$t},tn=[2,0,1,2,2,3,2,4,5,2,6,7,2,0,2,2,1,3,2,4,6,2,5,7,2,0,4,2,1,5,2,2,6,2,3,7],nn=[4,0,1,3,2,4,4,6,7,5,4,8,10,11,9,4,12,13,15,14,4,16,18,19,17,4,20,21,23,22];function rn(e,t){t.classHierarchy.push(`vtkCubeSource`),e.requestData=(e,n)=>{let r=n[0]?.initialize()||C.newInstance();n[0]=r;let i=z.newTypedArray(t.pointType,72);r.getPoints().setData(i,3);let a=z.newTypedArray(t.pointType,72),o=R.newInstance({name:`Normals`,values:a,numberOfComponents:3});r.getPointData().setNormals(o);let s=2;t.generate3DTextureCoordinates===!0&&(s=3);let c=z.newTypedArray(t.pointType,24*s),l=R.newInstance({name:`TextureCoordinates`,values:c,numberOfComponents:s});r.getPointData().setTCoords(l);let u=[0,0,0],d=[0,0,0],f=[0,0],p=0;u[0]=-t.xLength/2,d[0]=-1,d[1]=0,d[2]=0;for(let e=0;e<2;e++){u[1]=-t.yLength/2;for(let n=0;n<2;n++){f[1]=u[1]+.5,u[2]=-t.zLength/2;for(let r=0;r<2;r++)f[0]=(u[2]+.5)*(1-2*e),i[p*3]=u[0],i[p*3+1]=u[1],i[p*3+2]=u[2],a[p*3]=d[0],a[p*3+1]=d[1],a[p*3+2]=d[2],s===2?(c[p*s]=f[0],c[p*s+1]=f[1]):(c[p*s]=2*e-1,c[p*s+1]=2*n-1,c[p*s+2]=2*r-1),p++,u[2]+=t.zLength;u[1]+=t.yLength}u[0]+=t.xLength,d[0]+=2}u[1]=-t.yLength/2,d[1]=-1,d[0]=0,d[2]=0;for(let e=0;e<2;e++){u[0]=-t.xLength/2;for(let n=0;n<2;n++){f[0]=(u[0]+.5)*(2*e-1),u[2]=-t.zLength/2;for(let r=0;r<2;r++)f[1]=(u[2]+.5)*-1,i[p*3]=u[0],i[p*3+1]=u[1],i[p*3+2]=u[2],a[p*3]=d[0],a[p*3+1]=d[1],a[p*3+2]=d[2],s===2?(c[p*s]=f[0],c[p*s+1]=f[1]):(c[p*s]=2*n-1,c[p*s+1]=2*e-1,c[p*s+2]=2*r-1),p++,u[2]+=t.zLength;u[0]+=t.xLength}u[1]+=t.yLength,d[1]+=2}u[2]=-t.zLength/2,d[2]=-1,d[0]=0,d[1]=0;for(let e=0;e<2;e++){u[1]=-t.yLength/2;for(let n=0;n<2;n++){f[1]=u[1]+.5,u[0]=-t.xLength/2;for(let r=0;r<2;r++)f[0]=(u[0]+.5)*(2*e-1),i[p*3]=u[0],i[p*3+1]=u[1],i[p*3+2]=u[2],a[p*3]=d[0],a[p*3+1]=d[1],a[p*3+2]=d[2],s===2?(c[p*s]=f[0],c[p*s+1]=f[1]):(c[p*s]=2*r-1,c[p*s+1]=2*n-1,c[p*s+2]=2*e-1),p++,u[0]+=t.xLength;u[1]+=t.yLength}u[2]+=t.zLength,d[2]+=2}if(t.rotations&&en.buildFromDegree().rotateX(t.rotations[0]).rotateY(t.rotations[1]).rotateZ(t.rotations[2]).apply(i).apply(a),t.center&&en.buildFromRadian().translate(...t.center).apply(i),t.matrix){en.buildFromRadian().setMatrix(t.matrix).apply(i);let e=[t.matrix[0],t.matrix[1],t.matrix[2],0,t.matrix[4],t.matrix[5],t.matrix[6],0,t.matrix[8],t.matrix[9],t.matrix[10],0,0,0,0,1];en.buildFromRadian().setMatrix(e).apply(a)}t.generateFaces?r.getPolys().deepCopy(t._polys):r.getPolys().initialize(),t.generateLines?(r.getLines().deepCopy(t._lineCells),r.getPointData().setNormals(null)):r.getLines().initialize(),r.modified()},e.setBounds=(...t)=>{let n=[];if(Array.isArray(t[0]))n=t[0];else for(let e=0;e<t.length;e++)n.push(t[e]);n.length===6&&(e.setXLength(n[1]-n[0]),e.setYLength(n[3]-n[2]),e.setZLength(n[5]-n[4]),e.setCenter([(n[0]+n[1])/2,(n[2]+n[3])/2,(n[4]+n[5])/2]))}}var an={xLength:1,yLength:1,zLength:1,pointType:`Float64Array`,generate3DTextureCoordinates:!1,generateFaces:!0,generateLines:!1};function on(e,t,n={}){Object.assign(t,an,n),z.obj(e,t),z.setGet(e,t,[`xLength`,`yLength`,`zLength`,`generate3DTextureCoordinates`,`generateFaces`,`generateLines`]),z.setGetArray(e,t,[`center`,`rotations`],3),z.setGetArray(e,t,[`matrix`],16),t._polys=Oe.newInstance({values:Uint16Array.from(nn)}),t._lineCells=Oe.newInstance({values:Uint16Array.from(tn)}),z.moveToProtected(e,t,[`polys`,`lineCells`]),z.algo(e,t,0,1),rn(e,t)}var sn={newInstance:z.newInstance(on,`vtkCubeSource`),extend:on},{vtkErrorMacro:cn}=z;function ln(e,t){t.classHierarchy.push(`vtkImageDataOutlineFilter`);let n={...e};e.requestData=(e,n)=>{let r=e[0];if(!r||!r.isA(`vtkImageData`)){cn(`Invalid or missing input`);return}let i=r.getSpatialExtent();if(!i){cn(`Unable to fetch spatial extents of input image.`);return}t._cubeSource.setBounds(i),t._cubeSource.setMatrix(r.getIndexToWorld()),n[0]=t._cubeSource.getOutputData()},e.getMTime=()=>Math.max(n.getMTime(),t._cubeSource.getMTime()),e.setGenerateFaces=t._cubeSource.setGenerateFaces,e.setGenerateLines=t._cubeSource.setGenerateLines,e.getGenerateFaces=t._cubeSource.getGenerateFaces,e.getGenerateLines=t._cubeSource.getGenerateLines}var un={};function dn(e,t,n={}){Object.assign(t,un,n),z.obj(e,t),z.algo(e,t,1,1),t._cubeSource=sn.newInstance(),z.moveToProtected(e,t,[`cubeSource`,`tmpOut`]),ln(e,t)}var fn={newInstance:z.newInstance(dn,`vtkImageDataOutlineFilter`),extend:dn};function pn({colorWindow:e,colorLevel:t,useLookupTableScalarRange:n,colorRange:r,volumeScale:i=1,volumeOffset:a=0}){let o=e,s=t;return n&&r&&(o=r[1]-r[0],s=.5*(r[1]+r[0])),{colorScale:i/o,colorShift:(a-s)/o+.5}}function mn({pwfRange:e,volumeScale:t=1,volumeOffset:n=0}){if(!e)return{opacityScale:1,opacityShift:0};let r=e[1]-e[0],i=.5*(e[0]+e[1]);return{opacityScale:t/r,opacityShift:(n-i)/r+.5}}function hn({currentValidInputs:e,independentComponents:t,numberOfRows:n,kind:r,getInputProperty:i}){if(!e.length)return`0`;let a=r===`color`?`getRGBTransferFunction`:`getPiecewiseFunction`,o=[];for(let r=0;r<n;r++){let n=i(t?e[r].inputIndex:e[0].inputIndex),s=n?.[a]?.(t?0:r);o.push(`${n?.getMTime?.()??0}:${s?.getMTime?.()??0}`)}return o.join(`|`)}var gn=new Float64Array(9),U=[0,0,0],W=[0,0,0],_n=p(),vn=p();function yn(e,t=[0,0,1]){if(t[0]=0,t[1]=0,t[2]=1,e){let n=e.getNormal();t[0]=n[0],t[1]=n[1],t[2]=n[2]}return F.normalize(t),U[0]=0,U[1]=0,U[2]=0,W[0]=0,W[1]=0,W[2]=0,e?(F.perpendiculars(t,U,W,0),(F.norm(U)<1e-6||F.norm(W)<1e-6)&&(U[0]=1,U[1]=0,U[2]=0,W[0]=0,W[1]=1,W[2]=0)):(U[0]=1,W[1]=1),{planeNormal:t,tangent1:U,tangent2:W}}function bn(e,t,n,r){it(gn,...e.getDirection()),Se(gn,gn),S(_n,t,gn),S(vn,n,gn);let i=e.getDimensions(),a=e.getSpacing(),o=Math.min(Math.abs(a[0]),Math.abs(a[1]),Math.abs(a[2]));return r[0]=o/(i[0]*Math.abs(a[0])),r[1]=o/(i[1]*Math.abs(a[1])),r[2]=o/(i[2]*Math.abs(a[2])),{tangent1:_n,tangent2:vn,texelSize:r}}var xn=[0,0,0];function Sn(e){F.normalize(e);for(let t=0;t<3;++t){gt(xn),xn[t]=1;let n=F.dot(e,xn);if(n<-.999999||n>.999999)return[!0,t]}return[!1,2]}function Cn(e,t,n){for(let r=0;r<n;++r)e[3*r]=t[0],e[3*r+1]=t[1],e[3*r+2]=t[2]}function wn(e,t){let n=``,r=!0,i=2,o=t?.getBounds(),s=e.getSlicePolyData(),c=e.getSlicePlane();if(s)n=`PolyData${s.getMTime()}`;else if(c){if(n=`Plane${c.getMTime()}`,t){n=`${n}Image${t.getMTime()}`;let e=ve();it(e,...t.getDirection()),Se(e,e);let a=[...c.getNormal()];S(a,a,e),[r,i]=Sn(a)}}else{c=a.newInstance(),c.setNormal(0,0,1);let r=[0,1,0,1,0,1];t&&(r=o),c.setOrigin(r[0],r[2],.5*(r[4]+r[5])),e.setSlicePlane(c),n=`Plane${c.getMTime()}Image${t?.getMTime?.()??0}`}return{resGeomString:n,slicePD:s,slicePlane:c,orthoSlicing:r,orthoAxis:i}}function Tn(e,t,n,r,i){n.setInputData(e),r.setInputConnection(n.getOutputPort()),r.setCutFunction(t),i.setInputConnection(r.getOutputPort()),i.update();let a=i.getOutputData(),o=a.getPoints().getData(),s=a.getPolys().getData(),c=[...t.getNormal()];F.normalize(c);let l=a.getPoints().getNumberOfPoints(),u=new Float32Array(l*3);return Cn(u,c,l),{points:o,polys:s,normalsData:u}}function En(e,t,n,r){let i=new Float32Array(12),a=e.worldToIndex(t.getOrigin(),[0,0,0]),o=[(n+1)%3,(n+2)%3].sort(),s=e.getSpatialExtent(),c=0;for(let e=0;e<2;++e)for(let t=0;t<2;++t)i[c+n]=a[n],i[c+o[0]]=s[2*o[0]+t],i[c+o[1]]=s[2*o[1]+e],c+=3;r.setMatrix(e.getIndexToWorld()),r.transformPoints(i,i);let l=new Uint16Array([3,0,1,3,3,0,3,2]),u=[...t.getNormal()];F.normalize(u);let d=new Float32Array(12);return Cn(d,u,4),{points:i,polys:l,normalsData:d}}var Dn=`//VTK::System::Dec

/*=========================================================================

  Program:   Visualization Toolkit
  Module:    vtkImageResliceMapperVS.glsl

  Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
  All rights reserved.
  See Copyright.txt or http://www.kitware.com/Copyright.htm for details.

     This software is distributed WITHOUT ANY WARRANTY; without even
     the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
     PURPOSE.  See the above copyright notice for more information.

=========================================================================*/

// all variables that represent positions or directions have a suffix
// indicating the coordinate system they are in. The possible values are
// MC - Model coordinates
// WC - World coordinates
// VC - View coordinates
// DC - Display coordinates
// TC - Texture coordinates

// frag position in VC
//VTK::PositionVC::Dec

// Texture coordinates
//VTK::TCoord::Dec

// picking support
//VTK::Picking::Dec

// camera and actor matrix values
//VTK::Camera::Dec

void main()
{
  //VTK::PositionVC::Impl

  //VTK::TCoord::Impl

  //VTK::Picking::Impl
}
`,On=`//VTK::System::Dec

/*=========================================================================

  Program:   Visualization Toolkit
  Module:    vtkImageResliceMapperFS.glsl

  Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
  All rights reserved.
  See Copyright.txt or http://www.kitware.com/Copyright.htm for details.

     This software is distributed WITHOUT ANY WARRANTY; without even
     the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
     PURPOSE.  See the above copyright notice for more information.

=========================================================================*/
// Template for the gpu image mapper fragment shader

// VC position of this fragment
//VTK::PositionVC::Dec

// Texture coordinates
//VTK::TCoord::Dec

// picking support
//VTK::Picking::Dec

// handle coincident offsets
//VTK::Coincident::Dec

//VTK::ZBuffer::Dec

// the output of this shader
//VTK::Output::Dec

void main()
{
  // VC position of this fragment. This should not branch/return/discard.
  //VTK::PositionVC::Impl

  // Place any calls that require uniform flow (e.g. dFdx) here.
  //VTK::UniformFlow::Impl

  // Set gl_FragDepth here (gl_FragCoord.z by default)
  //VTK::Depth::Impl

  // Early depth peeling abort:
  //VTK::DepthPeeling::PreColor

  //VTK::TCoord::Impl

  if (gl_FragData[0].a <= 0.0)
    {
    discard;
    }

  //VTK::DepthPeeling::Impl

  //VTK::Picking::Impl

  // handle coincident offsets
  //VTK::Coincident::Impl

  //VTK::ZBuffer::Impl

  //VTK::RenderPassFragmentShader::Impl
}
`,{vtkErrorMacro:kn}=pt,An=e=>e.split(`
`).map(e=>e.trim()).filter(Boolean);function jn(e,t,n){return t.identity(n),e.reduce((e,n,r)=>r===0?n?t.copy(e,n):t.identity(e):n?t.multiply(e,e,n):e,n)}function Mn(e,n){n.classHierarchy.push(`vtkOpenGLImageResliceMapper`);let r=new Map;function i(t,n){if(!n)return;let i=(r.get(n)??0)-1;i<=0?(t.unregisterGraphicsResourceUser(n,e),r.delete(n)):r.set(n,i)}function a(t,n){if(!n)return;let i=r.get(n)??0,a=i+1;r.set(n,a),i<=0&&t.registerGraphicsResourceUser(n,e)}function s(e,t,n){t!==n&&(i(e,t),a(e,n))}function c(t){[...r.keys()].forEach(n=>t.unregisterGraphicsResourceUser(n,e))}e.buildPass=t=>{if(t){n.currentRenderPass=null,n._openGLImageSlice=e.getFirstAncestorOfType(`vtkOpenGLImageSlice`),n._openGLRenderer=e.getFirstAncestorOfType(`vtkOpenGLRenderer`);let t=n._openGLRenderer.getRenderable();n._openGLCamera=n._openGLRenderer.getViewNodeFor(t.getActiveCamera(),n.openGLCamera);let r=n._openGLRenderWindow;n._openGLRenderWindow=n._openGLRenderer.getLastAncestorOfType(`vtkOpenGLRenderWindow`),r&&!r.isDeleted()&&r!==n._openGLRenderWindow&&c(r),n.context=n._openGLRenderWindow.getContext(),n.tris.setOpenGLRenderWindow(n._openGLRenderWindow)}},e.translucentPass=(t,r)=>{t&&(n.currentRenderPass=r,e.render())},e.zBufferPass=t=>{t&&(n.haveSeenDepthRequest=!0,n.renderDepth=!0,e.render(),n.renderDepth=!1)},e.opaqueZBufferPass=t=>e.zBufferPass(t),e.opaquePass=t=>{t&&e.render()},e.getCoincidentParameters=(e,t)=>n.renderable.getResolveCoincidentTopology()==O.PolygonOffset?n.renderable.getCoincidentTopologyPolygonOffsetParameters():null,e.render=()=>{let t=n._openGLImageSlice.getRenderable(),r=n._openGLRenderer.getRenderable();e.renderPiece(r,t)},e.renderPiece=(t,r)=>{e.invokeEvent({type:`StartEvent`}),n.renderable.update();let i=n.renderable.getNumberOfInputPorts();n.currentValidInputs=[];for(let e=0;e<i;++e){let t=n.renderable.getInputData(e);t&&!t.isDeleted()&&n.currentValidInputs.push({imageData:t,inputIndex:e})}let a=n.currentValidInputs.length;if(a<=0){kn(`No input!`);return}n.labelOutlineProperties=Be(r,n.currentValidInputs);let o=n.currentValidInputs[0].imageData.getPointData().getScalars();n.multiTexturePerVolumeEnabled=a>1,n.numberOfComponents=n.multiTexturePerVolumeEnabled?a:o.getNumberOfComponents(),e.updateResliceGeometry(),e.renderPieceStart(t,r),e.renderPieceDraw(t,r),e.renderPieceFinish(t,r),e.invokeEvent({type:`EndEvent`})},e.renderPieceStart=(t,r)=>{e.updateBufferObjects(t,r);let i=r.getProperties();n.currentValidInputs.forEach(({inputIndex:e},t)=>{let r=i[e],a=n.scalarTextures[t];r&&a&&(r.getInterpolationType()===V.NEAREST?(a.setMinificationFilter(j.NEAREST),a.setMagnificationFilter(j.NEAREST)):(a.setMinificationFilter(j.LINEAR),a.setMagnificationFilter(j.LINEAR)))}),i[n.currentValidInputs[0].inputIndex]?.getInterpolationType()===V.NEAREST?(n.colorTexture.setMinificationFilter(j.NEAREST),n.colorTexture.setMagnificationFilter(j.NEAREST),n.pwfTexture.setMinificationFilter(j.NEAREST),n.pwfTexture.setMagnificationFilter(j.NEAREST)):(n.colorTexture.setMinificationFilter(j.LINEAR),n.colorTexture.setMagnificationFilter(j.LINEAR),n.pwfTexture.setMinificationFilter(j.LINEAR),n.pwfTexture.setMagnificationFilter(j.LINEAR)),n.lastBoundBO=null},e.renderPieceDraw=(t,r)=>{let i=n.context,a=n.labelOutlineProperties.length>0,o=[...n.scalarTextures,n.colorTexture,n.pwfTexture];a&&(o.push(n.labelOutlineThicknessTexture),o.push(n.labelOutlineOpacityTexture)),o.forEach(e=>e.activate()),e.updateShaders(n.tris,t,r),i.drawArrays(i.TRIANGLES,0,n.tris.getCABO().getElementCount()),n.tris.getVAO().release(),o.forEach(e=>e.deactivate())},e.renderPieceFinish=(e,t)=>{},e.updateBufferObjects=(t,n)=>{e.getNeedToRebuildBufferObjects(t,n)&&e.buildBufferObjects(t,n)},e.getNeedToRebuildBufferObjects=(t,r)=>{let i=r.getProperty(n.currentValidInputs[0].inputIndex),a=n.labelOutlineProperties.length>0;return n.VBOBuildTime.getMTime()<e.getMTime()||n.VBOBuildTime.getMTime()<r.getMTime()||n.VBOBuildTime.getMTime()<n.renderable.getMTime()||n.VBOBuildTime.getMTime()<i?.getMTime()||n.currentValidInputs.some(({imageData:e})=>n.VBOBuildTime.getMTime()<e.getMTime())||n.VBOBuildTime.getMTime()<n.resliceGeom.getMTime()||n.scalarTextures.length!==n.currentValidInputs.length||!n.scalarTextures.every(e=>!!e?.getHandle())||!n.colorTexture?.getHandle()||!n.pwfTexture?.getHandle()||a&&(!n.labelOutlineThicknessTexture?.getHandle()||!n.labelOutlineOpacityTexture?.getHandle())},e.buildBufferObjects=(r,i)=>{let a=i.getProperties();n.currentValidInputs.forEach(({imageData:e,inputIndex:t},r)=>{let i=e.getPointData().getScalars(),o=n._openGLRenderWindow.getGraphicsResourceForObject(i),c=bt(e,i),l=!o?.oglObject?.getHandle()||o?.hash!==c,u=a[t],d=u?.getUpdatedExtents()??[],f=!!d.length;if(l&&!f){let t=y.newInstance();t.setOpenGLRenderWindow(n._openGLRenderWindow);let a=e.getDimensions();t.setOglNorm16Ext(n.context.getExtension(`EXT_texture_norm16`)),t.resetFormatAndType(),t.create3DFilterableFromDataArray({width:a[0],height:a[1],depth:a[2],dataArray:i}),n._openGLRenderWindow.setGraphicsResourceForObject(i,t,c),n.scalarTextures[r]=t}else n.scalarTextures[r]=o.oglObject;if(f){u.setUpdatedExtents([]);let t=e.getDimensions();n.scalarTextures[r].create3DFilterableFromDataArray({width:t[0],height:t[1],depth:t[2],dataArray:i,updatedExtents:d})}s(n._openGLRenderWindow,n._scalarTexturesCore[r],i),n._scalarTexturesCore[r]=i});let o=a[n.currentValidInputs[0].inputIndex];if(!o){kn(`Missing property for first input`);return}let c=o.getIndependentComponents(),l=c?n.numberOfComponents:1,u=c?2*l:1,d=[];for(let e=0;e<l;++e)if(n.multiTexturePerVolumeEnabled){let t=n.currentValidInputs[e],r=t?a[t.inputIndex]:null;d.push(r?.getRGBTransferFunction()||null)}else d.push(o.getRGBTransferFunction(e));let f=yt(d,c,l),p=o.getRGBTransferFunction(),m=n._openGLRenderWindow.getGraphicsResourceForObject(p);if(!m?.oglObject?.getHandle()||m?.hash!==f){let e=n.renderable.getColorTextureWidth();e<=0&&(e=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let t=e*u*3,r=new Uint8ClampedArray(t),i=y.newInstance();if(i.setOpenGLRenderWindow(n._openGLRenderWindow),p){let t=new Float32Array(e*3);for(let n=0;n<l;n++){let i=d[n];if(i){let a=i.getRange();if(i.getTable(a[0],a[1],e,t,1),c)for(let i=0;i<e*3;i++)r[n*e*6+i]=255*t[i],r[n*e*6+i+e*3]=255*t[i];else for(let i=0;i<e*3;i++)r[n*e*3+i]=255*t[i]}}i.resetFormatAndType(),i.create2DFromRaw({width:e,height:u,numComps:3,dataType:N.UNSIGNED_CHAR,data:r})}else{for(let t=0;t<e*3;++t){let n=255*t/((e-1)*3);for(let i=0;i<u;++i)r[i*e*3+t+0]=n,r[i*e*3+t+1]=n,r[i*e*3+t+2]=n}i.resetFormatAndType(),i.create2DFromRaw({width:e,height:1,numComps:3,dataType:N.UNSIGNED_CHAR,data:r})}p&&n._openGLRenderWindow.setGraphicsResourceForObject(p,i,f),n.colorTexture=i}else n.colorTexture=m.oglObject;s(n._openGLRenderWindow,n._colorTextureCore,p),n._colorTextureCore=p;let h=[];for(let e=0;e<l;++e)if(n.multiTexturePerVolumeEnabled){let t=n.currentValidInputs[e],r=t?a[t.inputIndex]:null;h.push(r?.getPiecewiseFunction()||null)}else h.push(o.getPiecewiseFunction(e));let g=yt(h,c,l),_=o.getPiecewiseFunction(),v=n._openGLRenderWindow.getGraphicsResourceForObject(_);if(!v?.oglObject?.getHandle()||v?.hash!==g){let e=n.renderable.getOpacityTextureWidth();e<=0&&(e=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let t=e*u,r=new Uint8ClampedArray(t),i=y.newInstance();if(i.setOpenGLRenderWindow(n._openGLRenderWindow),_){let n=new Float32Array(t),r=new Float32Array(e);for(let t=0;t<l;++t){let i=h[t];if(i===null)n.fill(1);else{let a=i.getRange();if(i.getTable(a[0],a[1],e,r,1),c)for(let i=0;i<e;i++)n[t*e*2+i]=r[i],n[t*e*2+i+e]=r[i];else for(let t=0;t<e;t++)n[t]=r[t]}}i.resetFormatAndType(),i.create2DFromRaw({width:e,height:u,numComps:1,dataType:N.FLOAT,data:n})}else r.fill(255),i.resetFormatAndType(),i.create2DFromRaw({width:e,height:u,numComps:1,dataType:N.UNSIGNED_CHAR,data:r});_&&n._openGLRenderWindow.setGraphicsResourceForObject(_,i,g),n.pwfTexture=i}else n.pwfTexture=v.oglObject;s(n._openGLRenderWindow,n._pwfTextureCore,_),n._pwfTextureCore=_,n.labelOutlineProperties.length>0&&(e.updateLabelOutlineThicknessTexture(n.labelOutlineProperties),e.updateLabelOutlineOpacityTexture(n.labelOutlineProperties));let b=`${n.resliceGeom.getMTime()}A${n.renderable.getSlabThickness()}`;if(!n.tris.getCABO().getElementCount()||n.VBOBuildString!==b){let e=R.newInstance({numberOfComponents:3,values:n.resliceGeom.getPoints().getData()});e.setName(`points`);let r=Oe.newInstance({values:n.resliceGeom.getPolys().getData()}),i={points:e,cellOffset:0,forceFlatten:!0};if(n.renderable.getSlabThickness()>0){let e=n.resliceGeom.getPointData().getNormals();e?i.normals=e:kn(`Slab mode requested without normals`)}n.tris.getCABO().createVBO(r,`polys`,t.SURFACE,i)}n.VBOBuildString=b,n.VBOBuildTime.modified()},e.updateShaders=(t,r,i)=>{if(n.lastBoundBO=t,e.getNeedToRebuildShaders(t,r,i)){let a={Vertex:null,Fragment:null,Geometry:null};e.buildShaders(a,r,i);let o=n._openGLRenderWindow.getShaderCache().readyShaderProgramArray(a.Vertex,a.Fragment,a.Geometry);o!==t.getProgram()&&(t.setProgram(o),t.getVAO().releaseGraphicsResources()),t.getShaderSourceTime().modified()}else n._openGLRenderWindow.getShaderCache().readyShaderProgram(t.getProgram());t.getVAO().bind(),e.setMapperShaderParameters(t,r,i),e.setCameraShaderParameters(t,r,i),e.setPropertyShaderParameters(t,r,i)},e.setMapperShaderParameters=(t,r,i)=>{let a=t.getProgram(),s=n.currentValidInputs[0].imageData;if(t.getCABO().getElementCount()&&(n.VBOBuildTime.getMTime()>t.getAttributeUpdateTime().getMTime()||t.getShaderSourceTime().getMTime()>t.getAttributeUpdateTime().getMTime())){n.scalarTextures.forEach((e,t)=>{a.setUniformi(`volumeTexture[${t}]`,e.getTextureUnit())}),a.isAttributeUsed(`vertexWC`)&&(t.getVAO().addAttributeArray(a,t.getCABO(),`vertexWC`,t.getCABO().getVertexOffset(),t.getCABO().getStride(),n.context.FLOAT,3,n.context.FALSE)||kn(`Error setting vertexWC in shader VAO.`)),a.isAttributeUsed(`normalWC`)&&(t.getVAO().addAttributeArray(a,t.getCABO(),`normalWC`,t.getCABO().getNormalOffset(),t.getCABO().getStride(),n.context.FLOAT,3,n.context.FALSE)||kn(`Error setting normalWC in shader VAO.`)),a.isUniformUsed(`slabThickness`)&&a.setUniformf(`slabThickness`,n.renderable.getSlabThickness()),a.isUniformUsed(`spacing`)&&a.setUniform3fv(`spacing`,s.getSpacing()),a.isUniformUsed(`slabType`)&&a.setUniformi(`slabType`,n.renderable.getSlabType()),a.isUniformUsed(`slabTrapezoid`)&&a.setUniformi(`slabTrapezoid`,n.renderable.getSlabTrapezoidIntegration());let e=t.getCABO().getCoordShiftAndScaleEnabled()?t.getCABO().getInverseShiftAndScaleMatrix():null;for(let t=0;t<n.currentValidInputs.length;t++){let r=`WCTCMatrix${t}`;if(a.isUniformUsed(r)){let i=n.currentValidInputs[t].imageData,s=i.getDimensions();o(n.tmpMat4,i.getIndexToWorld()),Qe(n.tmpMat4,n.tmpMat4,[-.5,-.5,-.5]),Ke(n.tmpMat4,n.tmpMat4,s),b(n.tmpMat4,n.tmpMat4),e&&M(n.tmpMat4,n.tmpMat4,e),a.setUniformMatrix(r,n.tmpMat4)}}a.isUniformUsed(`vboScaling`)&&a.setUniform3fv(`vboScaling`,t.getCABO().getCoordScale()??[1,1,1]),t.getAttributeUpdateTime().modified()}if(n.haveSeenDepthRequest&&t.getProgram().setUniformi(`depthRequest`,+!!n.renderDepth),t.getProgram().isUniformUsed(`coffset`)){let n=e.getCoincidentParameters(r,i);t.getProgram().setUniformf(`coffset`,n.offset),t.getProgram().isUniformUsed(`cfactor`)&&t.getProgram().setUniformf(`cfactor`,n.factor)}},e.setCameraShaderParameters=(e,t,r)=>{let i=n._openGLCamera.getKeyMatrices(t),a=n._openGLImageSlice.getKeyMatrices(),o=e.getCABO().getCoordShiftAndScaleEnabled()?e.getCABO().getInverseShiftAndScaleMatrix():null,s=e.getProgram();s.isUniformUsed(`MCPCMatrix`)&&(L(n.tmpMat4),s.setUniformMatrix(`MCPCMatrix`,jn([i.wcpc,a.mcwc,o],pe,n.tmpMat4))),s.isUniformUsed(`MCVCMatrix`)&&(L(n.tmpMat4),s.setUniformMatrix(`MCVCMatrix`,jn([i.wcvc,a.mcwc,o],pe,n.tmpMat4)))},e.setPropertyShaderParameters=(e,t,r)=>{let i=e.getProgram(),a=r.getProperty(n.currentValidInputs[0].inputIndex),o=n.multiTexturePerVolumeEnabled?1:a.getOpacity();i.setUniformf(`opacity`,o);let s=n.numberOfComponents,c=a.getIndependentComponents(),l=n.multiTexturePerVolumeEnabled,u=r.getProperties();if(c)for(let e=0;e<s;++e){let t=l?u[n.currentValidInputs[e].inputIndex]:a;i.setUniformf(`mix${e}`,t.getComponentWeight(0))}for(let e=0;e<s;e++){let t=l?e:0,r=l?0:e,o=n.scalarTextures[t].getVolumeInfo(),s=o.scale[r],d=o.offset[r],f=c?e:0,p=l?u[n.currentValidInputs[e].inputIndex]:a,m=p.getColorWindow(),h=p.getColorLevel(),g=p.getRGBTransferFunction(l?0:f),{colorScale:_,colorShift:v}=pn({colorWindow:m,colorLevel:h,useLookupTableScalarRange:p.getUseLookupTableScalarRange(),colorRange:g?.getRange?.(),volumeScale:s,volumeOffset:d});i.setUniformf(`cshift${e}`,v),i.setUniformf(`cscale${e}`,_);let{opacityScale:y,opacityShift:b}=mn({pwfRange:p.getPiecewiseFunction(l?0:f)?.getRange?.(),volumeScale:s,volumeOffset:d});i.setUniformf(`pwfshift${e}`,b),i.setUniformf(`pwfscale${e}`,y)}let d=n.colorTexture.getTextureUnit();i.setUniformi(`colorTexture1`,d);let f=n.pwfTexture.getTextureUnit();if(i.setUniformi(`pwfTexture1`,f),i.setUniform4fv(`backgroundColor`,n.renderable.getBackgroundColor()),n.labelOutlineProperties.length>0){let e=n.labelOutlineThicknessTexture.getTextureUnit();i.setUniformi(`labelOutlineThicknessTexture`,e);let t=n.labelOutlineOpacityTexture.getTextureUnit();i.setUniformi(`labelOutlineOpacityTexture`,t);let r=n.renderable.getLabelOutlineTextureWidth();r<=0&&(r=n.context.getParameter(n.context.MAX_TEXTURE_SIZE)),i.setUniformf(`labelOutlineTextureWidth`,r),i.setUniformf(`numLabelmaps`,n.labelOutlineProperties.length);let{tangent1:a,tangent2:o}=yn(n.renderable.getSlicePlane());for(let e=0;e<n.currentValidInputs.length;e++){let t=n.currentValidInputs[e].imageData,{tangent1:r,tangent2:s}=bn(t,a,o,n._tmpTexelSize),c=`outlineTangent1_${e}`,l=`outlineTangent2_${e}`;i.isUniformUsed(c)&&i.setUniform3fv(c,r),i.isUniformUsed(l)&&i.setUniform3fv(l,s)}for(let e=0;e<n.currentValidInputs.length;e++){let t=`texelSize${e}`;if(i.isUniformUsed(t)){let r=n.currentValidInputs[e].imageData,{texelSize:s}=bn(r,a,o,n._tmpTexelSize);i.setUniform3fv(t,s)}}}},e.getNeedToRebuildShaders=(e,t,r)=>{let i=r.getProperty(n.currentValidInputs[0].inputIndex).getIndependentComponents(),a=n.labelOutlineProperties.length>0,o=n.renderable.getSlabThickness(),s=n.renderable.getSlabType(),c=n.renderable.getSlabTrapezoidIntegration(),l=!1;(!n.currentRenderPass&&n.lastRenderPassShaderReplacement||n.currentRenderPass&&n.currentRenderPass.getShaderReplacement()!==n.lastRenderPassShaderReplacement)&&(l=!0);let u=n.currentValidInputs?.length??0;return l||n.lastHaveSeenDepthRequest!==n.haveSeenDepthRequest||n.lastNumberOfComponents!==n.numberOfComponents||n.lastMultiTexturePerVolumeEnabled!==n.multiTexturePerVolumeEnabled||e.getProgram()?.getHandle()===0||n.lastIndependentComponents!==i||n.lastUseLabelOutline!==a||n.lastNumValidInputs!==u||n.lastSlabThickness!==o||n.lastSlabType!==s||n.lastSlabTrapezoidIntegration!==c?(n.lastHaveSeenDepthRequest=n.haveSeenDepthRequest,n.lastNumberOfComponents=n.numberOfComponents,n.lastMultiTexturePerVolumeEnabled=n.multiTexturePerVolumeEnabled,n.lastIndependentComponents=i,n.lastUseLabelOutline=a,n.lastNumValidInputs=u,n.lastSlabThickness=o,n.lastSlabType=s,n.lastSlabTrapezoidIntegration=c,!0):!1},e.getShaderTemplate=(e,t,n)=>{e.Vertex=Dn,e.Fragment=On,e.Geometry=``},e.replaceShaderValues=(t,r,i)=>{if(e.replaceShaderTCoord(t,r,i),e.replaceShaderPositionVC(t,r,i),n.haveSeenDepthRequest){let e=t.Fragment;e=I.substitute(e,`//VTK::ZBuffer::Dec`,`uniform int depthRequest;`).result,e=I.substitute(e,`//VTK::ZBuffer::Impl`,[`if (depthRequest == 1) {`,`float iz = floor(gl_FragCoord.z*65535.0 + 0.1);`,`float rf = floor(iz/256.0)/255.0;`,`float gf = mod(iz,256.0)/255.0;`,`gl_FragData[0] = vec4(rf, gf, 0.0, 1.0); }`]).result,t.Fragment=e}e.replaceShaderCoincidentOffset(t,r,i)};function l(e,t){let n=[`r`,`g`,`b`,`a`],r=Array.from({length:t},(e,t)=>t).filter(t=>!e.includes(t)),i=e.map(e=>`vec3 labelTexCoord${e} = (WCTCMatrix${e} * vec4(fragWorldPos, 1.0)).xyz;`).join(`
                `),a=e.length===0?``:`float neighborLabel = ${e.map((e,t)=>t===0?`(labelInputIdx == ${t}) ? texture(volumeTexture[${e}], neighborTexCoord).r`:` : (labelInputIdx == ${t}) ? texture(volumeTexture[${e}], neighborTexCoord).r`).join(``)} : 0.0;`,o=[...r,...e].map(t=>{let r=e.includes(t),i=e.indexOf(t);return r?`
        // Process input ${t} as labelmap
        {
          float labelValue = tvalue.${n[t]};
          int segmentIndex = int(labelValue * 255.0);

          if (segmentIndex > 0) {
            float textureCoordinate = float(segmentIndex - 1) / labelOutlineTextureWidth;
            float labelmapRow = (float(${i}) + 0.5) / numLabelmaps;
            float thicknessValue = texture2D(labelOutlineThicknessTexture, vec2(textureCoordinate, labelmapRow)).r;
            float labelOutlineOpacityValue = texture2D(labelOutlineOpacityTexture, vec2(textureCoordinate, labelmapRow)).r;
            int actualThickness = int(thicknessValue * 255.0);

            vec3 currentLabelTC = labelTexCoord${t};
            vec3 currentTexelSize = texelSize${t};
            vec3 currentTangent1 = outlineTangent1_${t};
            vec3 currentTangent2 = outlineTangent2_${t};

            bool pixelOnBorder = false;
            int labelInputIdx = ${i};
            for (int i = -actualThickness; i <= actualThickness; i++) {
              for (int j = -actualThickness; j <= actualThickness; j++) {
                if (i == 0 && j == 0) continue;
                vec3 neighborTexCoord = currentLabelTC + float(i) * currentTangent1 * currentTexelSize + float(j) * currentTangent2 * currentTexelSize;
                if (any(greaterThan(neighborTexCoord, vec3(1.0))) || any(lessThan(neighborTexCoord, vec3(0.0)))) {
                  pixelOnBorder = true;
                  break;
                }
                ${a}
                if (neighborLabel != labelValue) {
                  pixelOnBorder = true;
                  break;
                }
              }
              if (pixelOnBorder) break;
            }

            if (pixelOnBorder) {
              convergentColor.rgb = mix(convergentColor.rgb, tcolor${t}.rgb, labelOutlineOpacityValue);
              convergentColor.a = max(convergentColor.a, labelOutlineOpacityValue);
            } else if (compWeight${t} > 0.0) {
              float fillAlpha = compWeight${t} * opacity;
              convergentColor.rgb = mix(convergentColor.rgb, tcolor${t}.rgb, fillAlpha);
              convergentColor.a = max(convergentColor.a, fillAlpha);
            }
          }
        }`:`
        // Process input ${t} as background image
        {
          float bgAlpha = compWeight${t} * opacity;
          convergentColor.rgb = mix(convergentColor.rgb, tcolor${t}.rgb, bgAlpha);
          convergentColor.a = max(convergentColor.a, bgAlpha);
        }`}).join(`
        `);return An(`
      // Multi-texture mode: ${e.length>0?`labelmaps at input${e.length>1?`s`:``} ${e.join(`, `)}`:`no labelmaps`}, ${r.length>0?`background at input${r.length>1?`s`:``} ${r.join(`, `)}`:`no background`}
      vec4 convergentColor = vec4(0.0, 0.0, 0.0, 0.0);

      // Compute labelmap texture coordinates
      ${i}

      // Process each input in order
      ${o}

      gl_FragData[0] = convergentColor;
    `)}function u(){return[`vec4 compositeValue(vec4 currVal, vec4 valToComp, int trapezoid)`,`{`,`  vec4 retVal = vec4(1.0);`,`  if (slabType == 0) // min`,`  {`,`    retVal = min(currVal, valToComp);`,`  }`,`  else if (slabType == 1) // max`,`  {`,`    retVal = max(currVal, valToComp);`,`  }`,`  else if (slabType == 3) // sum`,`  {`,`    retVal = currVal + (trapezoid > 0 ? 0.5 * valToComp : valToComp); `,`  }`,`  else // mean`,`  {`,`    retVal = currVal + (trapezoid > 0 ? 0.5 * valToComp : valToComp); `,`  }`,`  return retVal;`,`}`]}function d(){return[`// Get the first and last samples`,`int numSlices = 1;`,`float scaling = min(min(spacing.x, spacing.y), spacing.z) * 0.5;`,`vec3 slabNormal = normalize(normalWCVSOutput);`,`vec3 normalxspacing = scaling * slabNormal;`,`float distTraveled = length(normalxspacing);`,`int trapezoid = 0;`,`// Each march direction leaves the volume for good once it exits the`,`// unit cube (the sample positions are monotonic along a line and the`,`// cube is convex), so the loop can stop as soon as both directions`,`// have exited. Slab thicknesses larger than the volume then only cost`,`// the in-volume portion of the march.`,`bool negExited = false;`,`bool posExited = false;`,`while (distTraveled < slabThickness * 0.5)`,`{`,`  distTraveled += length(normalxspacing);`,`  float fnumSlices = float(numSlices);`,`  bool atSlabBoundary = false;`,`  if (distTraveled > slabThickness * 0.5)`,`  {`,`    // Before stepping outside the slab, sample at the boundaries`,`    normalxspacing = slabNormal * slabThickness * 0.5 / fnumSlices;`,`    trapezoid = slabTrapezoid;`,`    atSlabBoundary = true;`,`  }`,`  vec3 worldPosNeg = vertexWCVSOutput.xyz - fnumSlices * normalxspacing * vboScaling;`,`  vec3 fragTCoordNeg = (WCTCMatrix0 * vec4(worldPosNeg, 1.0)).xyz;`,`  if (!any(greaterThan(fragTCoordNeg, vec3(1.0))) && !any(lessThan(fragTCoordNeg, vec3(0.0))))`,`  {`,`    vec4 newVal = rawSampleTexture(worldPosNeg);`,`    tvalue = compositeValue(tvalue, newVal, trapezoid);`,`    numSlices += 1;`,`  }`,`  else if (!atSlabBoundary)`,`  {`,`    negExited = true;`,`  }`,`  vec3 worldPosPos = vertexWCVSOutput.xyz + fnumSlices * normalxspacing * vboScaling;`,`  vec3 fragTCoordPos = (WCTCMatrix0 * vec4(worldPosPos, 1.0)).xyz;`,`  if (!any(greaterThan(fragTCoordPos, vec3(1.0))) && !any(lessThan(fragTCoordPos, vec3(0.0))))`,`  {`,`    vec4 newVal = rawSampleTexture(worldPosPos);`,`    tvalue = compositeValue(tvalue, newVal, trapezoid);`,`    numSlices += 1;`,`  }`,`  else if (!atSlabBoundary)`,`  {`,`    posExited = true;`,`  }`,`  if (negExited && posExited) { break; }`,`}`,`// Finally, if slab type is *mean*, divide the sum by the numSlices`,`if (slabType == 2)`,`{`,`  tvalue = tvalue / float(numSlices);`,`}`]}function f(){return[`// Returns a bitmask of the labels (1..31) present along the slab`,`// centered at startTC. Marches in texture space and exits as soon as`,`// the ray leaves the unit cube, so only the in-volume portion of the`,`// slab is sampled regardless of how large the slab thickness is.`,`int labelSlabMask(vec3 startTC, vec3 stepTC, float halfSlab, float stepLen)`,`{`,`  int mask = 0;`,`  vec3 tc = startTC;`,`  float dist = 0.0;`,`  for (int i = 0; i < 4096; ++i)`,`  {`,`    if (dist > halfSlab) { break; }`,`    if (any(greaterThan(tc, vec3(1.0))) || any(lessThan(tc, vec3(0.0)))) { break; }`,`    int label = int(texture(volumeTexture[0], tc).r * 255.0 + 0.5);`,`    if (label > 0 && label < 32) { mask |= (1 << label); }`,`    tc += stepTC;`,`    dist += stepLen;`,`  }`,`  tc = startTC - stepTC;`,`  dist = stepLen;`,`  for (int i = 0; i < 4096; ++i)`,`  {`,`    if (dist > halfSlab) { break; }`,`    if (any(greaterThan(tc, vec3(1.0))) || any(lessThan(tc, vec3(0.0)))) { break; }`,`    int label = int(texture(volumeTexture[0], tc).r * 255.0 + 0.5);`,`    if (label > 0 && label < 32) { mask |= (1 << label); }`,`    tc -= stepTC;`,`    dist += stepLen;`,`  }`,`  return mask;`,`}`,``,`// Number of stepTC-sized steps from p that stay inside the unit cube`,`float labelSlabBoxSteps(vec3 p, vec3 stepTC)`,`{`,`  vec3 limit = vec3(65536.0);`,`  if (stepTC.x > 1e-8) { limit.x = (1.0 - p.x) / stepTC.x; }`,`  else if (stepTC.x < -1e-8) { limit.x = -p.x / stepTC.x; }`,`  if (stepTC.y > 1e-8) { limit.y = (1.0 - p.y) / stepTC.y; }`,`  else if (stepTC.y < -1e-8) { limit.y = -p.y / stepTC.y; }`,`  if (stepTC.z > 1e-8) { limit.z = (1.0 - p.z) / stepTC.z; }`,`  else if (stepTC.z < -1e-8) { limit.z = -p.z / stepTC.z; }`,`  return min(limit.x, min(limit.y, limit.z));`,`}`,``,`// First label of labelMask found when marching the slab from its`,`// viewer-side end toward the back, so overlapping labels resolve in`,`// depth order; returns 0 when none of the mask labels is found`,`int labelSlabFrontLabel(vec3 startTC, vec3 towardCameraTC, float halfSlab, float stepLen, int labelMask)`,`{`,`  float slabSteps = halfSlab / stepLen;`,`  float nFront = min(slabSteps, labelSlabBoxSteps(startTC, towardCameraTC));`,`  float nBack = min(slabSteps, labelSlabBoxSteps(startTC, -towardCameraTC));`,`  vec3 tc = startTC + towardCameraTC * nFront;`,`  int totalSteps = int(nFront + nBack) + 1;`,`  for (int i = 0; i < 8192; ++i)`,`  {`,`    if (i >= totalSteps) { break; }`,`    int label = int(texture(volumeTexture[0], tc).r * 255.0 + 0.5);`,`    if (label > 0 && label < 32 && (labelMask & (1 << label)) != 0) { return label; }`,`    tc -= towardCameraTC;`,`  }`,`  return 0;`,`}`]}function p(){return An(`
      // Slab-projected label outline for single component
      vec4 slabOutlineResult = vec4(0.0, 0.0, 0.0, 0.0);
      // For MAX slabs, a composited value of 0 means no label anywhere
      // along the slab, so the expensive mask marches can be skipped.
      if (slabType != 1 || tvalue.r >= 0.5 / 255.0) {
        vec3 outlineStepTC = (WCTCMatrix0 * vec4(scaling * slabNormal * vboScaling, 0.0)).xyz;
        float halfSlab = slabThickness * 0.5;
        int centerMask = labelSlabMask(fragTexCoord, outlineStepTC, halfSlab, scaling);

        if (centerMask != 0) {
          // A label is on its projected edge when present here but missing in
          // some neighbor probed at that label's own outline thickness. Labels
          // sharing a thickness reuse the same neighbor masks, so the common
          // case still costs four neighbor marches.
          float labelmapRow = 0.5 / numLabelmaps;
          int edgeLabels = 0;
          int prevThickness = -1;
          int neighborMask = 0;
          for (int s = 1; s < 32; ++s) {
            if ((centerMask & (1 << s)) == 0) { continue; }
            float thicknessCoordinate = (float(s) - 1.0) / labelOutlineTextureWidth;
            int segmentThickness = max(1, int(texture2D(labelOutlineThicknessTexture, vec2(thicknessCoordinate, labelmapRow)).r * 255.0));
            if (segmentThickness != prevThickness) {
              vec3 outlineOffset1 = outlineTangent1_0 * texelSize0 * float(segmentThickness);
              vec3 outlineOffset2 = outlineTangent2_0 * texelSize0 * float(segmentThickness);
              neighborMask =
                labelSlabMask(fragTexCoord + outlineOffset1, outlineStepTC, halfSlab, scaling) &
                labelSlabMask(fragTexCoord - outlineOffset1, outlineStepTC, halfSlab, scaling) &
                labelSlabMask(fragTexCoord + outlineOffset2, outlineStepTC, halfSlab, scaling) &
                labelSlabMask(fragTexCoord - outlineOffset2, outlineStepTC, halfSlab, scaling);
              prevThickness = segmentThickness;
            }
            if ((neighborMask & (1 << s)) == 0) { edgeLabels |= (1 << s); }
          }

          // When several edge labels compete for this fragment, the one nearest
          // the viewer along the slab wins. The camera looks down -z in view
          // coordinates, so the slab normal points toward the viewer when its
          // view-space z component is positive.
          float slabNormalTowardCamera = (MCVCMatrix * vec4(slabNormal, 0.0)).z;
          vec3 towardCameraTC = slabNormalTowardCamera > 0.0 ? outlineStepTC : -outlineStepTC;

          if (edgeLabels != 0) {
            int edgeLabel = labelSlabFrontLabel(fragTexCoord, towardCameraTC, halfSlab, scaling, edgeLabels);
            if (edgeLabel == 0) {
              // numeric fallback: smallest edge label
              for (int s = 1; s < 32; ++s) {
                if ((edgeLabels & (1 << s)) != 0) { edgeLabel = s; break; }
              }
            }
            float labelValue = float(edgeLabel) / 255.0;
            vec3 edgeColor = texture2D(colorTexture1, vec2(labelValue * cscale0 + cshift0, 0.5)).rgb;
            float opacityCoordinate = (float(edgeLabel) - 1.0) / labelOutlineTextureWidth;
            float edgeOpacity = texture2D(labelOutlineOpacityTexture, vec2(opacityCoordinate, labelmapRow)).r;
            slabOutlineResult = vec4(edgeColor, edgeOpacity);
          } else {
            // Interior of the projected labels: regular fill through the
            // transfer functions using the label nearest the viewer
            int fillLabel = labelSlabFrontLabel(fragTexCoord, towardCameraTC, halfSlab, scaling, centerMask);
            float fillValue = fillLabel != 0 ? float(fillLabel) / 255.0 : tvalue.r;
            vec3 fillColor = texture2D(colorTexture1, vec2(fillValue * cscale0 + cshift0, 0.5)).rgb;
            float fillOpacity = texture2D(pwfTexture1, vec2(fillValue * pwfscale0 + pwfshift0, 0.5)).r;
            slabOutlineResult = vec4(fillColor, fillOpacity * opacity);
          }
        }
      }
      gl_FragData[0] = slabOutlineResult;
    `)}function m(e,t){let n=[];for(let r=0;r<e;r++)t(r)&&n.push(r);return n}e.replaceShaderTCoord=(e,t,r)=>{let i=e.Vertex,a=e.Geometry,o=e.Fragment,s=n.labelOutlineProperties.length>0,c=n.renderable.getSlabThickness();i=I.substitute(i,`//VTK::TCoord::Dec`,[]).result,i=I.substitute(i,`//VTK::TCoord::Impl`,[]).result;let h=n.numberOfComponents,g=r.getProperty(n.currentValidInputs[0].inputIndex).getIndependentComponents(),_=n.scalarTextures.length,v=[`uniform highp sampler3D volumeTexture[${_}];`,`uniform float cshift0;`,`uniform float cscale0;`,`uniform float pwfshift0;`,`uniform float pwfscale0;`,`uniform sampler2D colorTexture1;`,`uniform sampler2D pwfTexture1;`,`uniform float opacity;`,`uniform vec4 backgroundColor;`];for(let e=0;e<_;e++)v.push(`uniform mat4 WCTCMatrix${e};`);if(s){v=v.concat([`uniform sampler2D labelOutlineThicknessTexture;`,`uniform sampler2D labelOutlineOpacityTexture;`,`uniform float labelOutlineTextureWidth;`,`uniform float numLabelmaps;`]);for(let e=0;e<_;e++)v.push(`uniform vec3 outlineTangent1_${e};`),v.push(`uniform vec3 outlineTangent2_${e};`),v.push(`uniform vec3 texelSize${e};`)}if(v.push(`vec4 rawSampleTexture(vec3 worldPos) {`),!n.multiTexturePerVolumeEnabled)v.push(`vec3 tc0 = (WCTCMatrix0 * vec4(worldPos, 1.0)).xyz;`,`return texture(volumeTexture[0], tc0);`,`}`);else{v.push(`vec4 rawSample;`);for(let e=0;e<_;++e)v.push(`vec3 tc${e} = (WCTCMatrix${e} * vec4(worldPos, 1.0)).xyz;`,`rawSample[${e}] = texture(volumeTexture[${e}], tc${e})[0];`);v.push(`return rawSample;`,`}`)}if(g){for(let e=1;e<h;e++)v=v.concat([`uniform float cshift${e};`,`uniform float cscale${e};`,`uniform float pwfshift${e};`,`uniform float pwfscale${e};`]);switch(h){case 1:v=v.concat([`uniform float mix0;`,`#define height0 0.5`]);break;case 2:v=v.concat([`uniform float mix0;`,`uniform float mix1;`,`#define height0 0.25`,`#define height1 0.75`]);break;case 3:v=v.concat([`uniform float mix0;`,`uniform float mix1;`,`uniform float mix2;`,`#define height0 0.17`,`#define height1 0.5`,`#define height2 0.83`]);break;case 4:v=v.concat([`uniform float mix0;`,`uniform float mix1;`,`uniform float mix2;`,`uniform float mix3;`,`#define height0 0.125`,`#define height1 0.375`,`#define height2 0.625`,`#define height3 0.875`]);break;default:kn(`Unsupported number of independent coordinates.`)}}c>0&&(v=v.concat([`uniform vec3 spacing;`,`uniform float slabThickness;`,`uniform int slabType;`,`uniform int slabTrapezoid;`,`uniform vec3 vboScaling;`]),v=v.concat(u()),s&&!g&&h===1&&(v=v.concat([`uniform mat4 MCVCMatrix;`]),v=v.concat(f()))),o=I.substitute(o,`//VTK::TCoord::Dec`,v).result;let y=[`vec3 fragWorldPos = vertexWCVSOutput.xyz;`,`vec3 fragTexCoord = (WCTCMatrix0 * vec4(fragWorldPos, 1.0)).xyz;`,`if (any(greaterThan(fragTexCoord, vec3(1.0))) || any(lessThan(fragTexCoord, vec3(0.0))))`,`{`,`  // set the background color and exit`,`  gl_FragData[0] = backgroundColor;`,`  return;`,`}`,`vec4 tvalue = rawSampleTexture(fragWorldPos);`];if(c>0&&(y=y.concat(d())),g){let e=[`r`,`g`,`b`,`a`];for(let t=0;t<h;++t)y=y.concat([`vec3 tcolor${t} = texture2D(colorTexture1, vec2(tvalue.${e[t]} * cscale${t} + cshift${t}, height${t})).rgb;`,`float compWeight${t} = mix${t} * texture2D(pwfTexture1, vec2(tvalue.${e[t]} * pwfscale${t} + pwfshift${t}, height${t})).r;`]);let t=s?m(h,e=>r.getProperty(n.currentValidInputs[e].inputIndex)?.getUseLabelOutline()):[];y=t.length>0?y.concat(l(t,h)):y.concat((e=>{if(e===1)return[`gl_FragData[0] = vec4(tcolor0.rgb, compWeight0 * opacity);`];let t=Array.from({length:e},(e,t)=>t),n=t.map(e=>`compWeight${e}`).join(` + `),r=t.map(e=>`(tcolor${e}.rgb * (compWeight${e} / weightSum))`).join(` + `);return[`float weightSum = ${n};`,`gl_FragData[0] = vec4(vec3(${r}), opacity);`]})(h))}else switch(h){case 1:y=s&&c>0?y.concat(p()):s?y.concat([...An(`
                // Label outline mode for single component
                float centerValue = tvalue.r;
                int segmentIndex = int(centerValue * 255.0);

                // Skip background (segment 0)
                if (segmentIndex == 0) {
                  gl_FragData[0] = vec4(0.0, 0.0, 0.0, 0.0);
                  return;
                }

                // Get outline parameters for this segment (row 0 for single labelmap)
                float textureCoordinate = float(segmentIndex - 1) / labelOutlineTextureWidth;
                float labelmapRow = 0.5 / numLabelmaps;
                float thicknessValue = texture2D(labelOutlineThicknessTexture, vec2(textureCoordinate, labelmapRow)).r;
                float outlineOpacity = texture2D(labelOutlineOpacityTexture, vec2(textureCoordinate, labelmapRow)).r;
                int actualThickness = int(thicknessValue * 255.0);

                // Get color for this segment
                vec3 tColor = texture2D(colorTexture1, vec2(centerValue * cscale0 + cshift0, 0.5)).rgb;
                float scalarOpacity = texture2D(pwfTexture1, vec2(centerValue * pwfscale0 + pwfshift0, 0.5)).r;
                float opacityToUse = scalarOpacity * opacity;

                // Check neighbors for border detection
                bool pixelOnBorder = false;
                for (int i = -actualThickness; i <= actualThickness; i++) {
                  for (int j = -actualThickness; j <= actualThickness; j++) {
                    if (i == 0 && j == 0) {
                      continue;
                    }
                    // Sample neighbor using tangent vectors in texture space
                    vec3 neighborTexCoord = fragTexCoord + float(i) * outlineTangent1_0 * texelSize0 + float(j) * outlineTangent2_0 * texelSize0;

                    // Skip if outside texture bounds
                    if (any(greaterThan(neighborTexCoord, vec3(1.0))) || any(lessThan(neighborTexCoord, vec3(0.0)))) {
                      pixelOnBorder = true;
                      break;
                    }

                    float neighborValue = texture(volumeTexture[0], neighborTexCoord).r;
                    if (neighborValue != centerValue) {
                      pixelOnBorder = true;
                      break;
                    }
                  }
                  if (pixelOnBorder) {
                    break;
                  }
                }

                if (pixelOnBorder) {
                  gl_FragData[0] = vec4(tColor, outlineOpacity);
                } else {
                  gl_FragData[0] = vec4(tColor, opacityToUse);
                }
              `)]):y.concat([`// Dependent components`,`float intensity = tvalue.r;`,`vec3 tcolor = texture2D(colorTexture1, vec2(intensity * cscale0 + cshift0, 0.5)).rgb;`,`float scalarOpacity = texture2D(pwfTexture1, vec2(intensity * pwfscale0 + pwfshift0, 0.5)).r;`,`gl_FragData[0] = vec4(tcolor, scalarOpacity * opacity);`]);break;case 2:y=y.concat([`float intensity = tvalue.r*cscale0 + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(intensity, 0.5)).rgb, pwfscale0*tvalue.g + pwfshift0);`]);break;case 3:y=y.concat([`vec4 tcolor = cscale0*tvalue + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(tcolor.r,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.g,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.b,0.5)).r, opacity);`]);break;default:y=y.concat([`vec4 tcolor = cscale0*tvalue + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(tcolor.r,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.g,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.b,0.5)).r, tcolor.a);`])}o=I.substitute(o,`//VTK::TCoord::Impl`,y).result,e.Vertex=i,e.Fragment=o,e.Geometry=a},e.replaceShaderPositionVC=(t,r,i)=>{let a=t.Vertex,o=t.Geometry,s=t.Fragment,c=n.renderable.getSlabThickness(),l=[`attribute vec4 vertexWC;`,`varying vec4 vertexWCVSOutput;`];l=l.concat([`//${e.getMTime()}${n.resliceGeomUpdateString}`]),c>0&&(l=l.concat([`attribute vec3 normalWC;`,`varying vec3 normalWCVSOutput;`])),a=I.substitute(a,`//VTK::PositionVC::Dec`,l).result;let u=[`gl_Position = MCPCMatrix * vertexWC;`,`vertexWCVSOutput = vertexWC;`];c>0&&(u=u.concat([`normalWCVSOutput = normalWC;`])),a=I.substitute(a,`//VTK::PositionVC::Impl`,u).result,a=I.substitute(a,`//VTK::Camera::Dec`,[`uniform mat4 MCPCMatrix;`,`uniform mat4 MCVCMatrix;`]).result;let d=[`varying vec4 vertexWCVSOutput;`];c>0&&(d=d.concat([`varying vec3 normalWCVSOutput;`])),s=I.substitute(s,`//VTK::PositionVC::Dec`,d).result,t.Vertex=a,t.Geometry=o,t.Fragment=s},e.updateResliceGeometry=()=>{let e=n.currentValidInputs[0].imageData,{resGeomString:t,slicePD:r,slicePlane:i,orthoSlicing:a,orthoAxis:o}=wn(n.renderable,e);if(!n.resliceGeom||n.resliceGeomUpdateString!==t){if(r)n.resliceGeom||=C.newInstance(),n.resliceGeom.getPoints().setData(r.getPoints().getData(),3),n.resliceGeom.getPolys().setData(r.getPolys().getData(),1),n.resliceGeom.getPointData().setNormals(r.getPointData().getNormals());else if(i){if(n.resliceGeom||=C.newInstance(),a){let{points:t,polys:r,normalsData:a}=En(e,i,o,n.transform);n.resliceGeom.getPoints().setData(t,3),n.resliceGeom.getPolys().setData(r,1);let s=R.newInstance({numberOfComponents:3,values:a,name:`Normals`});n.resliceGeom.getPointData().setNormals(s)}else{let{points:t,polys:r,normalsData:a}=Tn(e,i,n.outlineFilter,n.cutter,n.lineToSurfaceFilter);n.resliceGeom.getPoints().setData(t,3),n.resliceGeom.getPolys().setData(r,1);let o=R.newInstance({numberOfComponents:3,values:a,name:`Normals`});n.resliceGeom.getPointData().setNormals(o)}}else kn(`Something went wrong.`,`A default slice plane should have been created in the beginning of`,`updateResliceGeometry.`);n.resliceGeomUpdateString=t,n.resliceGeom?.modified()}};function h(e,t,r){let{width:i,height:a}=Re(e.map(e=>({property:e})),e=>e),o=n.renderable.getLabelOutlineTextureWidth();o<=0&&(o=Math.max(i,n.context.getParameter(n.context.MAX_TEXTURE_SIZE)));let s=new t(o*a);E(s,e,o);let c=y.newInstance({resizable:!1});return c.setOpenGLRenderWindow(n._openGLRenderWindow),c.resetFormatAndType(),c.setMinificationFilter(j.NEAREST),c.setMagnificationFilter(j.NEAREST),c.create2DFromRaw({width:o,height:a,numComps:1,dataType:r,data:s}),c}function g(e,t,r,i,a){let{hash:o}=Re(e.map(e=>({property:e})),e=>e);o!==n[i]&&(n[i]=o,n[a]&&n[a].releaseGraphicsResources(),n[a]=h(e,t,r))}e.updateLabelOutlineThicknessTexture=e=>{g(e.map(({property:e})=>e.getLabelOutlineThicknessByReference()),Uint8Array,N.UNSIGNED_CHAR,`_labelOutlineThicknessHash`,`labelOutlineThicknessTexture`)},e.updateLabelOutlineOpacityTexture=e=>{g(e.map(({property:e})=>{let t=e.getLabelOutlineOpacity();return typeof t==`number`&&(t=[t]),t}),Float32Array,N.FLOAT,`_labelOutlineOpacityHash`,`labelOutlineOpacityTexture`)},e.setScalarTextures=e=>{n.scalarTextures=[...e],n._externalOpenGLTexture=!0},e.delete=Ne(()=>{n._openGLRenderWindow&&c(n._openGLRenderWindow),n.labelOutlineThicknessTexture&&=(n.labelOutlineThicknessTexture.releaseGraphicsResources(),null),n.labelOutlineOpacityTexture&&=(n.labelOutlineOpacityTexture.releaseGraphicsResources(),null)},e.delete)}var Nn={VBOBuildTime:{},VBOBuildString:null,haveSeenDepthRequest:!1,lastHaveSeenDepthRequest:!1,lastIndependentComponents:!1,lastUseLabelOutline:!1,lastNumValidInputs:0,lastNumberOfComponents:0,lastMultiTexturePerVolumeEnabled:!1,lastSlabThickness:0,lastSlabTrapezoidIntegration:0,lastSlabType:-1,scalarTextures:[],_scalarTexturesCore:[],colorTexture:null,_colorTextureCore:null,pwfTexture:null,_pwfTextureCore:null,labelOutlineProperties:[],labelOutlineThicknessTexture:null,_labelOutlineThicknessHash:null,labelOutlineOpacityTexture:null,_labelOutlineOpacityHash:null,_externalOpenGLTexture:!1,resliceGeom:null,resliceGeomUpdateString:null,tris:null};function Pn(e,t,n={}){Object.assign(t,Nn,n),Ge.extend(e,t,n),_.implementReplaceShaderCoincidentOffset(e,t,n),_.implementBuildShadersWithReplacements(e,t,n),t.tris=h.newInstance(),t.scalarTextures=[],t.colorTexture=null,t.pwfTexture=null,t.VBOBuildTime={},k(t.VBOBuildTime),t.tmpMat4=L(new Float64Array(16)),t._tmpTexelSize=[0,0,0],t.outlineFilter=fn.newInstance(),t.outlineFilter.setGenerateFaces(!0),t.outlineFilter.setGenerateLines(!1),t.cubePolyData=C.newInstance(),t.cutter=Ht.newInstance(),t.lineToSurfaceFilter=Jt.newInstance(),t.transform=It.newInstance(),he(e,t,[`scalarTextures`]),Mn(e,t)}var Fn=be(Pn,`vtkOpenGLImageResliceMapper`);Ye(`vtkImageResliceMapper`,Fn);function In(e,t){t.classHierarchy.push(`vtkOpenGLVolume`),e.buildPass=n=>{t.renderable&&t.renderable.getVisibility()&&n&&(t._openGLRenderWindow=e.getLastAncestorOfType(`vtkOpenGLRenderWindow`),t._openGLRenderer=e.getFirstAncestorOfType(`vtkOpenGLRenderer`),t.context=t._openGLRenderWindow.getContext(),e.prepareNodes(),e.addMissingNode(t.renderable.getMapper()),e.removeUnusedNodes())},e.queryPass=(e,n)=>{if(e){if(!t.renderable||!t.renderable.getVisibility())return;n.incrementVolumeCount()}},e.traverseVolumePass=n=>{t.renderable&&t.renderable.getNestedVisibility()&&(!t._openGLRenderer.getSelector()||t.renderable.getNestedPickable())&&(e.apply(n,!0),t.children[0].traverse(n),e.apply(n,!1))},e.volumePass=e=>{t.renderable&&t.renderable.getVisibility()&&t.context.depthMask(!e)},e.getKeyMatrices=()=>(t.renderable.getMTime()>t.keyMatrixTime.getMTime()&&(t.renderable.computeMatrix(),o(t.MCWCMatrix,t.renderable.getMatrix()),P(t.MCWCMatrix,t.MCWCMatrix),t.renderable.getIsIdentity()?tt(t.normalMatrix):(qe(t.normalMatrix,t.MCWCMatrix),Se(t.normalMatrix,t.normalMatrix),Te(t.normalMatrix,t.normalMatrix)),t.keyMatrixTime.modified()),{mcwc:t.MCWCMatrix,normalMatrix:t.normalMatrix})}var Ln={};function Rn(e,t,n={}){Object.assign(t,Ln,n),Ge.extend(e,t,n),t.keyMatrixTime={},k(t.keyMatrixTime,{mtime:0}),t.normalMatrix=new Float64Array(9),t.MCWCMatrix=new Float64Array(16),c(e,t,[`context`]),In(e,t)}var zn=be(Rn,`vtkOpenGLVolume`);Ye(`vtkVolume`,zn);var Bn=`//VTK::System::Dec

/*=========================================================================

  Program:   Visualization Toolkit
  Module:    vtkVolumeVS.glsl

  Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
  All rights reserved.
  See Copyright.txt or http://www.kitware.com/Copyright.htm for details.

     This software is distributed WITHOUT ANY WARRANTY; without even
     the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
     PURPOSE.  See the above copyright notice for more information.

=========================================================================*/

attribute vec4 vertexDC;

varying vec3 vertexVCVSOutput;
uniform mat4 PCVCMatrix;

uniform float dcxmin;
uniform float dcxmax;
uniform float dcymin;
uniform float dcymax;

void main()
{
  // dcsmall is the device coords reduced to the
  // x y area covered by the volume
  vec4 dcsmall = vec4(
    dcxmin + 0.5 * (vertexDC.x + 1.0) * (dcxmax - dcxmin),
    dcymin + 0.5 * (vertexDC.y + 1.0) * (dcymax - dcymin),
    vertexDC.z,
    vertexDC.w);
  vec4 vcpos = PCVCMatrix * dcsmall;
  vertexVCVSOutput = vcpos.xyz/vcpos.w;
  gl_Position = dcsmall;
}
`,Vn=`//VTK::System::Dec

/*=========================================================================

  Program:   Visualization Toolkit
  Module:    vtkVolumeFS.glsl

  Copyright (c) Ken Martin, Will Schroeder, Bill Lorensen
  All rights reserved.
  See Copyright.txt or http://www.kitware.com/Copyright.htm for details.

     This software is distributed WITHOUT ANY WARRANTY; without even
     the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
     PURPOSE.  See the above copyright notice for more information.

=========================================================================*/
// Template for the volume mappers fragment shader

const float infinity = 3.402823466e38;

// the output of this shader
//VTK::Output::Dec

in vec3 vertexVCVSOutput;

// From Sources\\Rendering\\Core\\VolumeProperty\\Constants.js
#define COMPOSITE_BLEND 0
#define MAXIMUM_INTENSITY_BLEND 1
#define MINIMUM_INTENSITY_BLEND 2
#define AVERAGE_INTENSITY_BLEND 3
#define ADDITIVE_INTENSITY_BLEND 4
#define RADON_TRANSFORM_BLEND 5
#define LABELMAP_EDGE_PROJECTION_BLEND 6

#define vtkNumberOfLights //VTK::NumberOfLights
#define vtkMaxLaoKernelSize //VTK::MaxLaoKernelSize
#define vtkNumberOfComponents //VTK::NumberOfComponents
#define vtkBlendMode //VTK::BlendMode
#define vtkMaximumNumberOfSamples //VTK::MaximumNumberOfSamples

//VTK::EnabledColorFunctions

//VTK::EnabledLightings

//VTK::EnabledMultiTexturePerVolume

//VTK::EnabledGradientOpacity

//VTK::EnabledIndependentComponents

//VTK::vtkProportionalComponents

//VTK::vtkForceNearestComponents

uniform int twoSidedLighting;

#if vtkMaxLaoKernelSize > 0
  vec2 kernelSample[vtkMaxLaoKernelSize];
#endif

// Textures
#ifdef EnabledMultiTexturePerVolume
  #define vtkNumberOfVolumeTextures vtkNumberOfComponents
#else
  #define vtkNumberOfVolumeTextures 1
#endif
uniform highp sampler3D volumeTexture[vtkNumberOfVolumeTextures];
uniform sampler2D colorTexture;
uniform sampler2D opacityTexture;
uniform sampler2D jtexture;
uniform sampler2D labelOutlineThicknessTexture;

struct Volume {
  // ---- Volume geometry settings ----

  vec3 originVC;          // in VC
  vec3 spacing;           // in VC per IC
  vec3 inverseSpacing;    // 1/spacing
  ivec3 dimensions;       // in IC
  vec3 inverseDimensions; // 1/vec3(dimensions)
  mat3 vecISToVCMatrix;   // convert from IS to VC without translation
  mat3 vecVCToISMatrix;   // convert from VC to IS without translation
  mat3 normalISToVCMatrix; // convert a normal from IS to VC
  mat4 PCWCMatrix;
  mat4 worldToIndex;
  float diagonalLength; // in VC, this is the length of the actor bounds diagonal

  // ---- Texture settings ----

  // Texture shift and scale
  vec4 colorTextureScale;
  vec4 colorTextureShift;
  vec4 opacityTextureScale;
  vec4 opacityTextureShift;

  // The heights defined below are the locations for the up to four components
  // of the transfer functions. The transfer functions have a height of (2 *
  // numberOfComponents) pixels so the values are computed to hit the middle of
  // the two rows for that component
  vec4 transferFunctionsSampleHeight;

  // ---- Mode specific settings ----

  // Independent component default preset settings per component
  vec4 independentComponentMix;

  // Additive / average blending mode settings
  vec4 ipScalarRangeMin;
  vec4 ipScalarRangeMax;

  // ---- Rendering settings ----

  // Lighting
  float ambient;
  float diffuse;
  float specular;
  float specularPower;
  int computeNormalFromOpacity;

  // Gradient opacity
  vec4 gradientOpacityScale;
  vec4 gradientOpacityShift;
  vec4 gradientOpacityMin;
  vec4 gradientOpacityMax;

  // Volume shadow
  float volumetricScatteringBlending;
  float globalIlluminationReach;
  float anisotropy;
  float anisotropySquared;

  // LAO
  int kernelSize;
  int kernelRadius;

  // Label outline
  float outlineOpacity;
};
uniform Volume volume;

struct Light {
  vec3 color;
  vec3 positionVC;
  vec3 directionVC; // normalized
  vec3 halfAngleVC;
  vec3 attenuation;
  float exponent;
  float coneAngle;
  int isPositional;
};
#if vtkNumberOfLights > 0
  uniform Light lights[vtkNumberOfLights];
#endif

uniform float vpWidth;
uniform float vpHeight;
uniform float vpOffsetX;
uniform float vpOffsetY;

// Bitmasks for label outline
const int MAX_SEGMENT_INDEX = 256; // Define as per expected maximum
#define MAX_SEGMENTS 256
#define UINT_SIZE 32
// We add UINT_SIZE - 1, as we want the ceil of the division instead of the
// floor
#define BITMASK_SIZE ((MAX_SEGMENTS + UINT_SIZE - 1) / UINT_SIZE)
uint labelOutlineBitmasks[BITMASK_SIZE];

// Set the corresponding bit in the bitmask
void setLabelOutlineBit(int segmentIndex) {
  int arrayIndex = segmentIndex / UINT_SIZE;
  int bitIndex = segmentIndex % UINT_SIZE;
  labelOutlineBitmasks[arrayIndex] |= 1u << bitIndex;
}

// Check if a bit is set in the bitmask
bool isLabelOutlineBitSet(int segmentIndex) {
  int arrayIndex = segmentIndex / UINT_SIZE;
  int bitIndex = segmentIndex % UINT_SIZE;
  return ((labelOutlineBitmasks[arrayIndex] & (1u << bitIndex)) != 0u);
}

// camera values
uniform float camThick;
uniform float camNear;
uniform float camFar;
uniform int cameraParallel;

//VTK::ClipPlane::Dec

// A random number between 0 and 1 that only depends on the fragment
// It uses the jtexture, so this random seed repeats by blocks of 32 fragments
// in screen space
float fragmentSeed;

// sample texture is global
uniform float sampleDistance;
uniform float volumeShadowSampleDistance;

// declaration for intermixed geometry
//VTK::ZBuffer::Dec

//=======================================================================
// global and custom variables (a temporary section before photorealistics
// rendering module is complete)
vec3 rayDirVC;

#define INV4PI 0.0796
#define EPSILON 0.001
#define PI 3.1415
#define PI2 9.8696

vec4 rawSampleTexture(vec3 pos) {
  #ifdef EnabledMultiTexturePerVolume
    vec4 rawSample;
    rawSample[0] = texture(volumeTexture[0], pos)[0];
  #if vtkNumberOfComponents > 1
    rawSample[1] = texture(volumeTexture[1], pos)[0];
  #endif
  #if vtkNumberOfComponents > 2
    rawSample[2] = texture(volumeTexture[2], pos)[0];
  #endif
  #if vtkNumberOfComponents > 3
    rawSample[3] = texture(volumeTexture[3], pos)[0];
  #endif
    return rawSample;
  #else
    return texture(volumeTexture[0], pos);
  #endif
}

vec4 rawFetchTexture(ivec3 pos) {
  #ifdef EnabledMultiTexturePerVolume
    vec4 rawSample;
    #if vtkNumberOfComponents > 0
      rawSample[0] = texelFetch(volumeTexture[0], pos, 0)[0];
    #endif
    #if vtkNumberOfComponents > 1
      rawSample[1] = texelFetch(volumeTexture[1], pos, 0)[0];
    #endif
    #if vtkNumberOfComponents > 2
      rawSample[2] = texelFetch(volumeTexture[2], pos, 0)[0];
    #endif
    #if vtkNumberOfComponents > 3
      rawSample[3] = texelFetch(volumeTexture[3], pos, 0)[0];
    #endif
    return rawSample;
  #else
    return texelFetch(volumeTexture[0], pos, 0);
  #endif
}

vec4 getTextureValue(vec3 pos) {
  vec4 tmp = rawSampleTexture(pos);

  // Force nearest
  #if defined(vtkComponent0ForceNearest) || \\
      defined(vtkComponent1ForceNearest) || \\
      defined(vtkComponent2ForceNearest) || \\
      defined(vtkComponent3ForceNearest)
    vec3 nearestPos = (floor(pos * vec3(volume.dimensions)) + 0.5) *
                      volume.inverseDimensions;
    vec4 nearestValue = rawSampleTexture(nearestPos);
    #ifdef vtkComponent0ForceNearest
      tmp[0] = nearestValue[0];
    #endif
    #ifdef vtkComponent1ForceNearest
      tmp[1] = nearestValue[1];
    #endif
    #ifdef vtkComponent2ForceNearest
      tmp[2] = nearestValue[2];
    #endif
    #ifdef vtkComponent3ForceNearest
      tmp[3] = nearestValue[3];
    #endif
  #endif

  // Set alpha when using dependent components
  #ifndef EnabledIndependentComponents
    #if vtkNumberOfComponents == 1
      tmp.a = tmp.r;
    #endif
    #if vtkNumberOfComponents == 2
      tmp.a = tmp.g;
    #endif
    #if vtkNumberOfComponents == 3
      tmp.a = length(tmp.rgb);
    #endif
  #endif

  return tmp;
}

// \`height\` is usually \`volume.transferFunctionsSampleHeight[component]\`
// when using independent component and \`0.5\` otherwise. Don't move the if
// statement in these function, as the callers usually already knows if it is
// using independent component or not
float getOpacityFromTexture(float scalar, int component, float height) {
  float scaledScalar = scalar * volume.opacityTextureScale[component] +
                       volume.opacityTextureShift[component];
  return texture2D(opacityTexture, vec2(scaledScalar, height)).r;
}
vec3 getColorFromTexture(float scalar, int component, float height) {
  float scaledScalar = scalar * volume.colorTextureScale[component] +
                       volume.colorTextureShift[component];
  return texture2D(colorTexture, vec2(scaledScalar, height)).rgb;
}

float getRadonOpacity(vec4 tValue) {
  #ifdef EnabledIndependentComponents
    return getOpacityFromTexture(tValue.r, 0, 0.5);
  #else
    #if vtkNumberOfComponents == 1
      return getOpacityFromTexture(tValue.r, 0, 0.5);
    #endif
    #if vtkNumberOfComponents == 2
      return getOpacityFromTexture(tValue.a, 1, 0.5);
    #endif
    #if vtkNumberOfComponents == 3
      return getOpacityFromTexture(tValue.a, 0, 0.5);
    #endif
    #if vtkNumberOfComponents == 4
      return getOpacityFromTexture(tValue.a, 3, 0.5);
    #endif
  #endif
}

vec3 getRadonColor(float normalizedRayIntensity) {
  float colorCoord = clamp(normalizedRayIntensity, 0.0, 1.0);
  return texture2D(colorTexture, vec2(colorCoord, 0.5)).rgb;
}

//=======================================================================
// transformation between VC and IS space

// convert vector position from idx to vc
vec3 posIStoVC(vec3 posIS) {
  return volume.vecISToVCMatrix * posIS + volume.originVC;
}

// convert vector position from vc to idx
vec3 posVCtoIS(vec3 posVC) {
  return volume.vecVCToISMatrix * (posVC - volume.originVC);
}

// Rotate vector to view coordinate
vec3 vecISToVC(vec3 dirIS) {
  return volume.vecISToVCMatrix * dirIS;
}

// Rotate a normal to view coordinate
// Normals use the inverse transpose transform, which is different from
// vecISToVCMatrix when the actor matrix scales or shears the volume
vec3 normalISToVC(vec3 normalIS) {
  return volume.normalISToVCMatrix * normalIS;
}

// Rotate vector to idx coordinate
vec3 vecVCToIS(vec3 dirVC) {
  return volume.vecVCToISMatrix * dirVC;
}

//=======================================================================
// Given a normal compute the gradient opacity factors
float computeGradientOpacityFactor(float normalMag, int component) {
  float goscale = volume.gradientOpacityScale[component];
  float goshift = volume.gradientOpacityShift[component];
  float gomin = volume.gradientOpacityMin[component];
  float gomax = volume.gradientOpacityMax[component];
  return clamp(normalMag * goscale + goshift, gomin, gomax);
}

#ifdef vtkClippingPlanesOn
  bool isPointClipped(vec3 posVC) {
    for (int i = 0; i < clip_numPlanes; ++i) {
      if (dot(vec3(vClipPlaneOrigins[i] - posVC), vClipPlaneNormals[i]) > 0.0) {
        return true;
      }
    }
    return false;
  }
#endif

//=======================================================================
// compute the normal and gradient magnitude for a position, uses forward
// difference

// The output normal is in VC
vec4 computeDensityNormal(vec3 opacityUCoords[2], float opacityTextureHeight,
                          float gradientOpacity, int component) {
  // Pass the scalars through the opacity functions
  vec4 opacityG;
  opacityG.x += getOpacityFromTexture(opacityUCoords[0].x, component,
                                      opacityTextureHeight);
  opacityG.y += getOpacityFromTexture(opacityUCoords[0].y, component,
                                      opacityTextureHeight);
  opacityG.z += getOpacityFromTexture(opacityUCoords[0].z, component,
                                      opacityTextureHeight);
  opacityG.x -= getOpacityFromTexture(opacityUCoords[1].x, component,
                                      opacityTextureHeight);
  opacityG.y -= getOpacityFromTexture(opacityUCoords[1].y, component,
                                      opacityTextureHeight);
  opacityG.z -= getOpacityFromTexture(opacityUCoords[1].z, component,
                                      opacityTextureHeight);

  // Divide by spacing and convert to VC
  opacityG.xyz *= gradientOpacity * volume.inverseSpacing;
  opacityG.w = length(opacityG.xyz);
  if (opacityG.w == 0.0) {
    return vec4(0.0);
  }

  // Normalize
  opacityG.xyz = normalize(normalISToVC(opacityG.xyz));

  return opacityG;
}

// The output normal is in VC
vec4 computeNormalForDensity(vec3 posIS, out vec3 scalarInterp[2],
                             const int opacityComponent) {
  vec3 offsetedPosIS;
  for (int axis = 0; axis < 3; ++axis) {
    // Positive direction
    offsetedPosIS = posIS;
    offsetedPosIS[axis] += volume.inverseDimensions[axis];
    scalarInterp[0][axis] =
        getTextureValue(offsetedPosIS)[opacityComponent];
    #ifdef vtkClippingPlanesOn
      if (isPointClipped(posIStoVC(offsetedPosIS))) {
        scalarInterp[0][axis] = 0.0;
      }
    #endif

    // Negative direction
    offsetedPosIS = posIS;
    offsetedPosIS[axis] -= volume.inverseDimensions[axis];
    scalarInterp[1][axis] =
        getTextureValue(offsetedPosIS)[opacityComponent];
    #ifdef vtkClippingPlanesOn
      if (isPointClipped(posIStoVC(offsetedPosIS))) {
        scalarInterp[1][axis] = 0.0;
      }
    #endif
  }

  vec4 result;
  result.xyz = (scalarInterp[0] - scalarInterp[1]) * volume.inverseSpacing;
  result.w = length(result.xyz);
  if (result.w == 0.0) {
    return vec4(0.0);
  }
  result.xyz = normalize(normalISToVC(result.xyz));
  return result;
}

vec4 fragCoordToPCPos(vec4 fragCoord) {
  return vec4((fragCoord.x / vpWidth - vpOffsetX - 0.5) * 2.0,
              (fragCoord.y / vpHeight - vpOffsetY - 0.5) * 2.0,
              (fragCoord.z - 0.5) * 2.0, 1.0);
}

vec4 pcPosToWorldCoord(vec4 pcPos) {
  return volume.PCWCMatrix * pcPos;
}

vec3 fragCoordToIndexSpace(vec4 fragCoord) {
  vec4 pcPos = fragCoordToPCPos(fragCoord);
  vec4 worldCoord = pcPosToWorldCoord(pcPos);
  vec4 vertex = (worldCoord / worldCoord.w);

  vec3 index = (volume.worldToIndex * vertex).xyz;

  // half voxel fix for labelmapOutline
  return (index + vec3(0.5)) * volume.inverseDimensions;
}

vec3 fragCoordToWorld(vec4 fragCoord) {
  vec4 pcPos = fragCoordToPCPos(fragCoord);
  vec4 worldCoord = pcPosToWorldCoord(pcPos);
  return worldCoord.xyz;
}

//=======================================================================
// Compute the normals and gradient magnitudes for a position for independent
// components The output normals are in VC
mat4 computeMat4Normal(vec3 posIS, vec4 tValue) {
  vec3 xvec = vec3(volume.inverseDimensions.x, 0.0, 0.0);
  vec3 yvec = vec3(0.0, volume.inverseDimensions.y, 0.0);
  vec3 zvec = vec3(0.0, 0.0, volume.inverseDimensions.z);

  vec4 distX = getTextureValue(posIS + xvec) - getTextureValue(posIS - xvec);
  vec4 distY = getTextureValue(posIS + yvec) - getTextureValue(posIS - yvec);
  vec4 distZ = getTextureValue(posIS + zvec) - getTextureValue(posIS - zvec);

  // divide by spacing
  distX *= 0.5 * volume.inverseSpacing.x;
  distY *= 0.5 * volume.inverseSpacing.y;
  distZ *= 0.5 * volume.inverseSpacing.z;

  mat4 result;

  // optionally compute the 1st component
  #if vtkNumberOfComponents > 0 && !defined(vtkComponent0Proportional)
    {
      const int component = 0;
      vec3 normal = vec3(distX[component], distY[component], distZ[component]);
      float normalLength = length(normal);
      if (normalLength > 0.0) {
        normal = normalize(normalISToVC(normal));
      }
      result[component] = vec4(normal, normalLength);
    }
  #endif

  // optionally compute the 2nd component
  #if vtkNumberOfComponents > 1 && !defined(vtkComponent1Proportional)
    {
      const int component = 1;
      vec3 normal = vec3(distX[component], distY[component], distZ[component]);
      float normalLength = length(normal);
      if (normalLength > 0.0) {
        normal = normalize(normalISToVC(normal));
      }
      result[component] = vec4(normal, normalLength);
    }
  #endif

  // optionally compute the 3rd component
  #if vtkNumberOfComponents > 2 && !defined(vtkComponent2Proportional)
    {
      const int component = 2;
      vec3 normal = vec3(distX[component], distY[component], distZ[component]);
      float normalLength = length(normal);
      if (normalLength > 0.0) {
        normal = normalize(normalISToVC(normal));
      }
      result[component] = vec4(normal, normalLength);
    }
  #endif

  // optionally compute the 4th component
  #if vtkNumberOfComponents > 3 && !defined(vtkComponent3Proportional)
    {
      const int component = 3;
      vec3 normal = vec3(distX[component], distY[component], distZ[component]);
      float normalLength = length(normal);
      if (normalLength > 0.0) {
        normal = normalize(normalISToVC(normal));
      }
      result[component] = vec4(normal, normalLength);
    }
  #endif

  return result;
}

//=======================================================================
// global shadow - secondary ray

// henyey greenstein phase function
float phaseFunction(float cos_angle) {
  // divide by 2.0 instead of 4pi to increase intensity
  float anisotropy = volume.anisotropy;
  if (abs(anisotropy) <= EPSILON) {
    // isotropic scatter returns 0.5 instead of 1/4pi to increase intensity
    return 0.5;
  }
  float anisotropy2 = volume.anisotropySquared;
  return ((1.0 - anisotropy2) /
          pow(1.0 + anisotropy2 - 2.0 * anisotropy * cos_angle, 1.5)) /
         2.0;
}

// Compute the two intersection distances of the ray with the volume in VC
// The entry point is \`rayOriginVC + distanceMin * rayDirVC\` and the exit point
// is \`rayOriginVC + distanceMax * rayDirVC\` If distanceMin < distanceMax, the
// volume is not intersected The ray origin is inside the box when distanceMin <
// 0.0 < distanceMax
vec2 rayIntersectVolumeDistances(vec3 rayOriginVC, vec3 rayDirVC) {
  // Compute origin and direction in IS
  vec3 rayOriginIS = posVCtoIS(rayOriginVC);
  vec3 rayDirIS = vecVCToIS(rayDirVC);
  // Don't check for infinity as the min/max combination afterward will always
  // find an intersection before infinity
  vec3 invDir = 1.0 / rayDirIS;

  // We have: bound = origin + t * dir
  // So: t = (1/dir) * (bound - origin)
  vec3 distancesTo0 = invDir * (vec3(0.0) - rayOriginIS);
  vec3 distancesTo1 = invDir * (vec3(1.0) - rayOriginIS);
  // Min and max distances to plane intersection per plane
  vec3 dMinPerAxis = min(distancesTo0, distancesTo1);
  vec3 dMaxPerAxis = max(distancesTo0, distancesTo1);
  // Overall first and last intersection
  float distanceMin = max(dMinPerAxis.x, max(dMinPerAxis.y, dMinPerAxis.z));
  float distanceMax = min(dMaxPerAxis.x, min(dMaxPerAxis.y, dMaxPerAxis.z));
  return vec2(distanceMin, distanceMax);
}

//=======================================================================
// local ambient occlusion
#if vtkMaxLaoKernelSize > 0

  // Return a random point on the unit sphere
  vec3 sampleDirectionUniform(int rayIndex) {
    // Each ray of each fragment should be different, two sources of randomness
    // are used. Only depends on ray index
    vec2 rayRandomness = kernelSample[rayIndex];
    // Only depends on fragment
    float fragmentRandomness = fragmentSeed;
    // Merge both source of randomness in a single uniform random variable using
    // the formula (x+y < 1 ? x+y : x+y-1). The simpler formula (x+y)/2 doesn't
    // result in a uniform distribution
    vec2 mergedRandom = rayRandomness + vec2(fragmentRandomness);
    mergedRandom -= vec2(greaterThanEqual(mergedRandom, vec2(1.0)));

    // Insipred by:
    // https://karthikkaranth.me/blog/generating-random-points-in-a-sphere/#better-choice-of-spherical-coordinates
    float u = mergedRandom[0];
    float v = mergedRandom[1];
    float theta = u * 2.0 * PI;
    float phi = acos(2.0 * v - 1.0);
    float sinTheta = sin(theta);
    float cosTheta = cos(theta);
    float sinPhi = sin(phi);
    float cosPhi = cos(phi);
    return vec3(sinPhi * cosTheta, sinPhi * sinTheta, cosPhi);
  }

  float computeLAO(vec3 posVC, vec4 normalVC, float originalOpacity) {
    // apply LAO only at selected locations, otherwise return full brightness
    if (normalVC.w <= 0.0 || originalOpacity <= 0.05) {
      return 1.0;
    }

    #ifdef EnabledGradientOpacity
      float gradientOpacityFactor = computeGradientOpacityFactor(normalVC.w, 0);
    #endif

    float visibilitySum = 0.0;
    float weightSum = 0.0;
    for (int i = 0; i < volume.kernelSize; i++) {
      // Only sample on an hemisphere around the normalVC.xyz axis, so
      // normalDotRay should be negative
      vec3 rayDirectionVC = sampleDirectionUniform(i);
      float normalDotRay = dot(normalVC.xyz, rayDirectionVC);
      if (normalDotRay > 0.0) {
        // Flip rayDirectionVC when it is in the wrong hemisphere
        rayDirectionVC = -rayDirectionVC;
        normalDotRay = -normalDotRay;
      }

      vec3 currPosIS = posVCtoIS(posVC);
      float visibility = 1.0;
      vec3 randomDirStepIS = vecVCToIS(rayDirectionVC * sampleDistance);
      for (int j = 0; j < volume.kernelRadius; j++) {
        currPosIS += randomDirStepIS;
        // If out of the volume, we are done
        if (any(lessThan(currPosIS, vec3(0.0))) ||
            any(greaterThan(currPosIS, vec3(1.0)))) {
          break;
        }
        float opacity = getOpacityFromTexture(getTextureValue(currPosIS).r, 0, 0.5);
        #ifdef EnabledGradientOpacity
          opacity *= gradientOpacityFactor;
        #endif
        visibility *= 1.0 - opacity;
        // If visibility is less than EPSILON, consider it to be 0
        if (visibility < EPSILON) {
          visibility = 0.0;
          break;
        }
      }
      float rayWeight = -normalDotRay;
      visibilitySum += visibility * rayWeight;
      weightSum += rayWeight;
    }

    // If no sample, LAO factor is one
    if (weightSum == 0.0) {
      return 1.0;
    }

    // LAO factor is the average visibility:
    // - visibility low => ambient low
    // - visibility high => ambient high
    float lao = visibilitySum / weightSum;

    // Reduce variance by clamping
    return clamp(lao, 0.3, 1.0);
  }
#endif

//=======================================================================
// Volume shadows
#if vtkNumberOfLights > 0

  // Non-memoised version
  float computeVolumeShadowWithoutCache(vec3 posVC, vec3 lightDirNormVC) {
    // modify sample distance with a random number between 1.5 and 3.0
    float rayStepLength =
        volumeShadowSampleDistance * mix(1.5, 3.0, fragmentSeed);

    // in case the first sample near surface has a very tiled light ray, we need
    // to offset start position
    vec3 initialPosVC = posVC + rayStepLength * lightDirNormVC;

    #ifdef vtkClippingPlanesOn
      float clippingPlanesMaxDistance = infinity;
      for (int i = 0; i < clip_numPlanes; ++i) {
        // Find distance of intersection with the plane
        // Points are clipped when:
        // dot(planeOrigin - (rayOrigin + distance * rayDirection), planeNormal) > 0
        // This is equivalent to:
        // dot(planeOrigin - rayOrigin, planeNormal) - distance * dot(rayDirection,
        // planeNormal) > 0.0
        // We precompute the dot products, so we clip ray points when:
        // dotOrigin - distance * dotDirection > 0.0
        float dotOrigin =
            dot(vClipPlaneOrigins[i] - initialPosVC, vClipPlaneNormals[i]);
        if (dotOrigin > 0.0) {
          // The initialPosVC is clipped by this plane
          return 1.0;
        }
        float dotDirection = dot(lightDirNormVC, vClipPlaneNormals[i]);
        if (dotDirection < 0.0) {
          // We only hit the plane if dotDirection is negative, as (distance is
          // positive)
          float intersectionDistance =
              dotOrigin / dotDirection; // negative divided by negative => positive
          clippingPlanesMaxDistance =
              min(clippingPlanesMaxDistance, intersectionDistance);
        }
      }
    #endif

    vec2 intersectionDistances =
        rayIntersectVolumeDistances(initialPosVC, lightDirNormVC);

    if (intersectionDistances[1] <= intersectionDistances[0] ||
        intersectionDistances[1] <= 0.0) {
      // Volume not hit or behind the ray
      return 1.0;
    }

    // When globalIlluminationReach is 0, no sample at all
    // When globalIlluminationReach is 1, the ray will go through the whole
    // volume
    float maxTravelDistance = mix(0.0, volume.diagonalLength,
                                  volume.globalIlluminationReach);
    float startDistance = max(intersectionDistances[0], 0.0);
    float endDistance = min(intersectionDistances[1], startDistance + maxTravelDistance);
    #ifdef vtkClippingPlanesOn
      endDistance = min(endDistance, clippingPlanesMaxDistance);
    #endif
    if (endDistance - startDistance < 0.0) {
      return 1.0;
    }

    // These two variables are used to compute posIS, without having to call
    // VCtoIS at each step
    vec3 initialPosIS = posVCtoIS(initialPosVC);
    // The light dir is scaled and rotated, but not translated, as it is a
    // vector (w = 0)
    vec3 scaledLightDirIS = vecVCToIS(lightDirNormVC);

    float shadow = 1.0;
    for (float currentDistance = startDistance; currentDistance <= endDistance;
          currentDistance += rayStepLength) {
      vec3 posIS = initialPosIS + currentDistance * scaledLightDirIS;
      vec4 scalar = getTextureValue(posIS);
      float opacity = getOpacityFromTexture(scalar.r, 0, 0.5);
      #if defined(EnabledGradientOpacity) && !defined(EnabledIndependentComponents)
        vec3 scalarInterp[2];
        vec4 normal = computeNormalForDensity(posIS, scalarInterp, 3);
        float opacityFactor = computeGradientOpacityFactor(normal.w, 0);
        opacity *= opacityFactor;
      #endif
      shadow *= 1.0 - opacity;

      // Early termination if shadow coeff is near 0.0
      if (shadow < EPSILON) {
        return 0.0;
      }
    }
    return shadow;
  }

  // Some cache for volume shadows
  struct {
    vec3 posVC;
    float shadow;
  } cachedShadows[vtkNumberOfLights];

  // Memoised version
  float computeVolumeShadow(vec3 posVC, vec3 lightDirNormVC, int lightIdx) {
    if (posVC == cachedShadows[lightIdx].posVC) {
      return cachedShadows[lightIdx].shadow;
    }
    float shadow = computeVolumeShadowWithoutCache(posVC, lightDirNormVC);
    cachedShadows[lightIdx].posVC = posVC;
    cachedShadows[lightIdx].shadow = shadow;
    return shadow;
  }

#endif

//=======================================================================
// surface light contribution
#if vtkNumberOfLights > 0
  vec3 applyLighting(vec3 tColor, vec4 normalVC) {
    vec3 diffuse = vec3(0.0, 0.0, 0.0);
    vec3 specular = vec3(0.0, 0.0, 0.0);
    for (int lightIdx = 0; lightIdx < vtkNumberOfLights; lightIdx++) {
      float df = dot(normalVC.xyz, lights[lightIdx].directionVC);
      if (df > 0.0) {
        diffuse += df * lights[lightIdx].color;
        float sf = dot(normalVC.xyz, -lights[lightIdx].halfAngleVC);
        if (sf > 0.0) {
          specular += pow(sf, volume.specularPower) * lights[lightIdx].color;
        }
      }
    }
    return tColor * (diffuse * volume.diffuse + volume.ambient) +
          specular * volume.specular;
  }

  vec3 applySurfaceShadowLighting(vec3 tColor, float alpha, vec3 posVC,
                                  vec4 normalVC) {
    // everything in VC
    vec3 diffuse = vec3(0.0);
    vec3 specular = vec3(0.0);
    for (int ligthIdx = 0; ligthIdx < vtkNumberOfLights; ligthIdx++) {
      vec3 vertLightDirection;
      float attenuation;
      if (lights[ligthIdx].isPositional == 1) {
        vertLightDirection = posVC - lights[ligthIdx].positionVC;
        float lightDistance = length(vertLightDirection);
        // Normalize with precomputed length
        vertLightDirection = vertLightDirection / lightDistance;
        // Base attenuation
        vec3 attenuationPolynom = lights[ligthIdx].attenuation;
        attenuation =
            1.0 / (attenuationPolynom[0] +
                  lightDistance * (attenuationPolynom[1] +
                                    lightDistance * attenuationPolynom[2]));
        // Cone attenuation
        float coneDot = dot(vertLightDirection, lights[ligthIdx].directionVC);
        // Per OpenGL standard cone angle is 90 or less for a spot light
        if (lights[ligthIdx].coneAngle <= 90.0) {
          if (coneDot >= cos(radians(lights[ligthIdx].coneAngle))) {
            // Inside the cone
            attenuation *= pow(coneDot, lights[ligthIdx].exponent);
          } else {
            // Outside the cone
            attenuation = 0.0;
          }
        }
      } else {
        vertLightDirection = lights[ligthIdx].directionVC;
        attenuation = 1.0;
      }

      float ndotL = dot(normalVC.xyz, vertLightDirection);
      if (ndotL < 0.0 && twoSidedLighting == 1) {
        ndotL = -ndotL;
      }
      if (ndotL > 0.0) {
        // Diffuse
        diffuse += ndotL * attenuation * lights[ligthIdx].color;
        // Specular
        float vdotR =
            dot(-rayDirVC, normalize(vertLightDirection - 2.0 * ndotL * normalVC.xyz));
        if (vdotR > 0.0) {
          specular += pow(vdotR, volume.specularPower) * attenuation *
                      lights[ligthIdx].color;
        }
      }
    }
    #if vtkMaxLaoKernelSize > 0
      float laoFactor = computeLAO(posVC, normalVC, alpha);
    #else
      const float laoFactor = 1.0;
    #endif
    return tColor * (diffuse * volume.diffuse +
                    volume.ambient * laoFactor) +
          specular * volume.specular;
  }

  vec3 applyVolumeShadowLighting(vec3 tColor, vec3 posVC) {
    // Here we have no effect of cones and no attenuation
    vec3 diffuse = vec3(0.0);
    for (int lightIdx = 0; lightIdx < vtkNumberOfLights; lightIdx++) {
      vec3 lightDirVC = lights[lightIdx].isPositional == 1
                            ? normalize(lights[lightIdx].positionVC - posVC)
                            : -lights[lightIdx].directionVC;
      float shadowCoeff = computeVolumeShadow(posVC, lightDirVC, lightIdx);
      float phaseAttenuation = phaseFunction(dot(rayDirVC, lightDirVC));
      diffuse += phaseAttenuation * shadowCoeff * lights[lightIdx].color;
    }
    return tColor * (diffuse * volume.diffuse + volume.ambient);
  }
#endif

// LAO of surface shadows and volume shadows only work with dependent components
vec3 applyAllLightning(vec3 tColor, float alpha, vec3 posVC,
                       vec4 surfaceNormalVC) {
  #if vtkNumberOfLights > 0
    // 0 <= volCoeff < EPSILON => only surface shadows
    // EPSILON <= volCoeff < 1 - EPSILON => mix of surface and volume shadows
    // 1 - EPSILON <= volCoeff => only volume shadows
    float volCoeff = volume.volumetricScatteringBlending *
                    (1.0 - alpha / 2.0) *
                    (1.0 - atan(surfaceNormalVC.w) * INV4PI);

    // Compute surface lighting if needed
    vec3 surfaceShadedColor = tColor;
    #ifdef EnableSurfaceLighting
      if (volCoeff < 1.0 - EPSILON) {
        surfaceShadedColor =
            applySurfaceShadowLighting(tColor, alpha, posVC, surfaceNormalVC);
      }
    #endif

    // Compute volume lighting if needed
    vec3 volumeShadedColor = tColor;
    #ifdef EnableVolumeLighting
      if (volCoeff >= EPSILON) {
        volumeShadedColor = applyVolumeShadowLighting(tColor, posVC);
      }
    #endif

    // Return the right mix
    if (volCoeff < EPSILON) {
      // Surface shadows
      return surfaceShadedColor;
    }
    if (volCoeff >= 1.0 - EPSILON) {
      // Volume shadows
      return volumeShadedColor;
    }
    // Mix of surface and volume shadows
    return mix(surfaceShadedColor, volumeShadedColor, volCoeff);
  #endif
  return tColor;
}

vec4 getColorForLabelOutline() {
  vec3 centerPosIS =
      fragCoordToIndexSpace(gl_FragCoord); // pos in texture space
  vec4 centerValue = getTextureValue(centerPosIS);
  bool pixelOnBorder = false;
  vec4 tColor = vec4(getColorFromTexture(centerValue.r, 0, 0.5),
                     getOpacityFromTexture(centerValue.r, 0, 0.5));

  int segmentIndex = int(centerValue.r * 255.0);

  // Use texture sampling for outlineThickness
  float textureCoordinate = float(segmentIndex - 1) / 1024.0;
  float textureValue =
      texture2D(labelOutlineThicknessTexture, vec2(textureCoordinate, 0.5)).r;
  int actualThickness = int(textureValue * 255.0);

  // If it is the background (segment index 0), we should quickly bail out.
  // Previously, this was determined by tColor.a, which was incorrect as it
  // prevented the outline from appearing when the fill is 0.
  if (segmentIndex == 0) {
    return vec4(0, 0, 0, 0);
  }

  // Only perform outline check on fragments rendering voxels that aren't
  // invisible. Saves a bunch of needless checks on the background.
  // TODO define epsilon when building shader?
  for (int i = -actualThickness; i <= actualThickness; i++) {
    for (int j = -actualThickness; j <= actualThickness; j++) {
      if (i == 0 && j == 0) {
        continue;
      }

      vec4 neighborPixelCoord =
          vec4(gl_FragCoord.x + float(i), gl_FragCoord.y + float(j),
               gl_FragCoord.z, gl_FragCoord.w);

      vec3 neighborPosIS = fragCoordToIndexSpace(neighborPixelCoord);
      vec4 value = getTextureValue(neighborPosIS);

      // If any of my neighbours are not the same value as I
      // am, this means I am on the border of the segment.
      // We can break the loops
      if (any(notEqual(value, centerValue))) {
        pixelOnBorder = true;
        break;
      }
    }

    if (pixelOnBorder == true) {
      break;
    }
  }

  // If I am on the border, I am displayed at full opacity
  if (pixelOnBorder == true) {
    tColor.a = volume.outlineOpacity;
  }

  return tColor;
}

vec4 getColorForAdditivePreset(vec4 tValue, vec3 posVC, vec3 posIS) {
  // compute normals
  mat4 normalMat = computeMat4Normal(posIS, tValue);
  vec4 normalLights[2];
  normalLights[0] = normalMat[0];
  normalLights[1] = normalMat[1];
  #if vtkNumberOfLights > 0
    if (volume.computeNormalFromOpacity == 1) {
      for (int component = 0; component < 2; ++component) {
        vec3 scalarInterp[2];
        float height = volume.transferFunctionsSampleHeight[component];
        computeNormalForDensity(posIS, scalarInterp, component);
        normalLights[component] =
            computeDensityNormal(scalarInterp, height, 1.0, component);
      }
    }
  #endif

  // compute opacities
  float opacities[2];
  opacities[0] = getOpacityFromTexture(
      tValue[0], 0, volume.transferFunctionsSampleHeight[0]);
  opacities[1] = getOpacityFromTexture(
      tValue[1], 1, volume.transferFunctionsSampleHeight[1]);
  #ifdef EnabledGradientOpacity
    for (int component = 0; component < 2; ++component) {
      opacities[component] *=
          computeGradientOpacityFactor(normalMat[component].a, component);
    }
  #endif
  float opacitySum = opacities[0] + opacities[1];
  if (opacitySum <= 0.0) {
    return vec4(0.0);
  }

  // mix the colors and opacities
  vec3 colors[2];
  for (int component = 0; component < 2; ++component) {
    float sampleHeight = volume.transferFunctionsSampleHeight[component];
    vec3 color = getColorFromTexture(tValue[component], component, sampleHeight);
    color = applyAllLightning(color, opacities[component], posVC,
                              normalLights[component]);
    colors[component] = color;
  }
  vec3 mixedColor =
      (opacities[0] * colors[0] + opacities[1] * colors[1]) / opacitySum;
  return vec4(mixedColor, min(1.0, opacitySum));
}

vec4 getColorForColorizePreset(vec4 tValue, vec3 posVC, vec3 posIS) {
  // compute normals
  mat4 normalMat = computeMat4Normal(posIS, tValue);
  vec4 normalLight = normalMat[0];
  #if vtkNumberOfLights > 0
    if (volume.computeNormalFromOpacity == 1) {
      vec3 scalarInterp[2];
      float height = volume.transferFunctionsSampleHeight[0];
      computeNormalForDensity(posIS, scalarInterp, 0);
      normalLight = computeDensityNormal(scalarInterp, height, 1.0, 0);
    }
  #endif

  // compute opacities
  float opacity = getOpacityFromTexture(
      tValue[0], 0, volume.transferFunctionsSampleHeight[0]);
  #ifdef EnabledGradientOpacity
    opacity *= computeGradientOpacityFactor(normalMat[0].a, 0);
  #endif

  // colorizing component
  vec3 colorizingColor = getColorFromTexture(
      tValue[0], 1, volume.transferFunctionsSampleHeight[1]);
  float colorizingOpacity = getOpacityFromTexture(
      tValue[1], 1, volume.transferFunctionsSampleHeight[1]);

  // mix the colors and opacities
  vec3 color =
      getColorFromTexture(tValue[0], 0,
                          volume.transferFunctionsSampleHeight[0]) *
      mix(vec3(1.0), colorizingColor, colorizingOpacity);
  color = applyAllLightning(color, opacity, posVC, normalLight);
  return vec4(color, opacity);
}

vec4 getColorForDefaultIndependentPreset(vec4 tValue, vec3 posIS) {

  // compute the normal vectors as needed
  #if defined(EnabledGradientOpacity) || vtkNumberOfLights > 0
    mat4 normalMat = computeMat4Normal(posIS, tValue);
  #endif

  // process color and opacity for each component
  // initial value of alpha is determined by wether the first component is
  // proportional or not
  #if defined(vtkComponent0Proportional)
    // when it is proportional, it starts at 1 (neutral for multiplications)
    float alpha = 1.0;
  #else
    // when it is not proportional, it starts at 0 (neutral for additions)
    float alpha = 0.0;
  #endif

  vec3 mixedColor = vec3(0.0);
  #if vtkNumberOfComponents > 0
    {
      const int component = 0;
      vec3 color = getColorFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      float opacity = getOpacityFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      #if !defined(vtkComponent0Proportional)
        float alphaContribution = volume.independentComponentMix[component] * opacity;
        #ifdef EnabledGradientOpacity
          alphaContribution *= computeGradientOpacityFactor(normalMat[component].a, component);
        #endif
        alpha += alphaContribution;
        #if vtkNumberOfLights > 0
          color = applyLighting(color, normalMat[component]);
        #endif
      #else
        color *= opacity;
        alpha *= mix(opacity, 1.0,
                    (1.0 - volume.independentComponentMix[component]));
      #endif
      mixedColor += volume.independentComponentMix[component] * color;
    }
  #endif
  #if vtkNumberOfComponents > 1
    {
      const int component = 1;
      vec3 color = getColorFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      float opacity = getOpacityFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      #if !defined(vtkComponent1Proportional)
        float alphaContribution = volume.independentComponentMix[component] * opacity;
        #ifdef EnabledGradientOpacity
          alphaContribution *= computeGradientOpacityFactor(normalMat[component].a, component);
        #endif
        alpha += alphaContribution;
        #if vtkNumberOfLights > 0
          color = applyLighting(color, normalMat[component]);
        #endif
      #else
        color *= opacity;
        alpha *= mix(opacity, 1.0,
                    (1.0 - volume.independentComponentMix[component]));
      #endif
      mixedColor += volume.independentComponentMix[component] * color;
    }
  #endif
  #if vtkNumberOfComponents > 2
    {
      const int component = 2;
      vec3 color = getColorFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      float opacity = getOpacityFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      #if !defined(vtkComponent2Proportional)
        float alphaContribution = volume.independentComponentMix[component] * opacity;
        #ifdef EnabledGradientOpacity
          alphaContribution *= computeGradientOpacityFactor(normalMat[component].a, component);
        #endif
        alpha += alphaContribution;
        #if vtkNumberOfLights > 0
          color = applyLighting(color, normalMat[component]);
        #endif
      #else
        color *= opacity;
        alpha *= mix(opacity, 1.0,
                    (1.0 - volume.independentComponentMix[component]));
      #endif
      mixedColor += volume.independentComponentMix[component] * color;
    }
  #endif
  #if vtkNumberOfComponents > 3
    {
      const int component = 3;
      vec3 color = getColorFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      float opacity = getOpacityFromTexture(
          tValue[component], component,
          volume.transferFunctionsSampleHeight[component]);
      #if !defined(vtkComponent3Proportional)
        float alphaContribution = volume.independentComponentMix[component] * opacity;
        #ifdef EnabledGradientOpacity
          alphaContribution *= computeGradientOpacityFactor(normalMat[component].a, component);
        #endif
        alpha += alphaContribution;
        #if vtkNumberOfLights > 0
          color = applyLighting(color, normalMat[component]);
        #endif
      #else
        color *= opacity;
        alpha *= mix(opacity, 1.0,
                    (1.0 - volume.independentComponentMix[component]));
      #endif
      mixedColor += volume.independentComponentMix[component] * color;
    }
  #endif

  return vec4(mixedColor, alpha);
}

vec4 getColorForDependentComponents(vec4 tValue, vec3 posVC, vec3 posIS) {
  #if defined(EnabledGradientOpacity) || vtkNumberOfLights > 0
    // use component 3 of the opacity texture as getTextureValue() sets alpha to
    // the opacity value
    vec3 scalarInterp[2];
    vec4 normal0 = computeNormalForDensity(posIS, scalarInterp, 3);
    float gradientOpacity = computeGradientOpacityFactor(normal0.a, 0);
  #endif

  // get color and opacity
  #if vtkNumberOfComponents == 1
    vec3 tColor = getColorFromTexture(tValue.r, 0, 0.5);
    float alpha = getOpacityFromTexture(tValue.r, 0, 0.5);
  #endif
  #if vtkNumberOfComponents == 2
    vec3 tColor = vec3(tValue.r * volume.colorTextureScale[0] +
                  volume.colorTextureShift[0]);
    float alpha = getOpacityFromTexture(tValue.a, 1, 0.5);
  #endif
  #if vtkNumberOfComponents == 3
      vec3 tColor = tValue.rgb * volume.colorTextureScale.rgb +
              volume.colorTextureShift.rgb;
      float alpha = getOpacityFromTexture(tValue.a, 0, 0.5);
  #endif
  #if vtkNumberOfComponents == 4
      vec3 tColor = tValue.rgb * volume.colorTextureScale.rgb +
              volume.colorTextureShift.rgb;
      float alpha = getOpacityFromTexture(tValue.a, 3, 0.5);
  #endif

  // Apply gradient opacity
  #if defined(EnabledGradientOpacity)
    alpha *= gradientOpacity;
  #endif

  #if vtkNumberOfComponents == 1
    if (alpha < EPSILON) {
      return vec4(0.0);
    }
  #endif

  // lighting
  #if vtkNumberOfLights > 0
    vec4 normalLight;
    if (volume.computeNormalFromOpacity == 1) {
      if (normal0[3] != 0.0) {
        normalLight =
            computeDensityNormal(scalarInterp, 0.5, gradientOpacity, 0);
        if (normalLight[3] == 0.0) {
          normalLight = normal0;
        }
      }
    } else {
      normalLight = normal0;
    }
    tColor = applyAllLightning(tColor, alpha, posVC, normalLight);
  #endif

  return vec4(tColor, alpha);
}

vec4 getColorForValue(vec4 tValue, vec3 posVC, vec3 posIS) {
  #ifdef EnableColorForValueFunctionId0
    return getColorForDependentComponents(tValue, posVC, posIS);
  #endif

  #ifdef EnableColorForValueFunctionId1
    return getColorForAdditivePreset(tValue, posVC, posIS);
  #endif

  #ifdef EnableColorForValueFunctionId2
    return getColorForColorizePreset(tValue, posVC, posIS);
  #endif

  #ifdef EnableColorForValueFunctionId3
    /*
      * Mix the color information from all the independent components to get a
      * single rgba output. See other shader functions like
      * \`getColorForAdditivePreset\` to learn how to create a custom color mix.
      * The custom color mix should return a value, but if it doesn't, it will
      * fallback on the default shading
      */
    //VTK::CustomColorMix
  #endif

  #if defined(EnableColorForValueFunctionId4) || defined(EnableColorForValueFunctionId3)
    return getColorForDefaultIndependentPreset(tValue, posIS);
  #endif

  #ifdef EnableColorForValueFunctionId5
    return getColorForLabelOutline();
  #endif
}

bool valueWithinScalarRange(vec4 val) {
  #if vtkNumberOfComponents > 1 && !defined(EnabledIndependentComponents)
    return false;
  #endif
  vec4 rangeMin = volume.ipScalarRangeMin;
  vec4 rangeMax = volume.ipScalarRangeMax;
  for (int component = 0; component < vtkNumberOfComponents; ++component) {
    if (val[component] < rangeMin[component] ||
        rangeMax[component] < val[component]) {
      return false;
    }
  }
  return true;
}

#if vtkBlendMode == LABELMAP_EDGE_PROJECTION_BLEND
  bool checkOnEdgeForNeighbor(int xFragmentOffset, int yFragmentOffset,
                              int segmentIndex, vec3 stepIS) {
    vec3 volumeDimensions = vec3(volume.dimensions);
    vec4 neighborPixelCoord = vec4(gl_FragCoord.x + float(xFragmentOffset),
                                  gl_FragCoord.y + float(yFragmentOffset),
                                  gl_FragCoord.z, gl_FragCoord.w);
    vec3 originalNeighborPosIS = fragCoordToIndexSpace(neighborPixelCoord);

    vec3 neighborPosIS = originalNeighborPosIS;
    for (int k = 0; k < vtkMaximumNumberOfSamples / 2; ++k) {
      ivec3 texCoord = ivec3(neighborPosIS * volumeDimensions);
      vec4 texValue = rawFetchTexture(texCoord);
      if (int(texValue.g) == segmentIndex) {
        // not on edge
        return false;
      }
      neighborPosIS += stepIS;
    }

    neighborPosIS = originalNeighborPosIS;
    for (int k = 0; k < vtkMaximumNumberOfSamples / 2; ++k) {
      ivec3 texCoord = ivec3(neighborPosIS * volumeDimensions);
      vec4 texValue = rawFetchTexture(texCoord);
      if (int(texValue.g) == segmentIndex) {
        // not on edge
        return false;
      }
      neighborPosIS -= stepIS;
    }

    // onedge
    float sampleHeight = volume.transferFunctionsSampleHeight[1];
    vec3 tColorSegment =
        getColorFromTexture(float(segmentIndex), 1, sampleHeight);
    float pwfValueSegment =
        getOpacityFromTexture(float(segmentIndex), 1, sampleHeight);
    gl_FragData[0] = vec4(tColorSegment, pwfValueSegment);
    return true;
  }
#endif

vec4 getColorAtPos(vec3 posVC) {
  vec3 posIS = posVCtoIS(posVC);
  vec4 texValue = getTextureValue(posIS);
  return getColorForValue(texValue, posVC, posIS);
}

//=======================================================================
// Apply the specified blend mode operation along the ray's path.
//
void applyBlend(vec3 rayOriginVC, vec3 rayDirVC, float minDistance,
                float maxDistance) {
  // start slightly inside and apply some jitter
  vec3 stepVC = rayDirVC * sampleDistance;
  float raySteps = (maxDistance - minDistance) / sampleDistance;

  // Avoid 0.0 jitter
  float jitter = 0.01 + 0.99 * fragmentSeed;

  #if vtkBlendMode == COMPOSITE_BLEND
    // now map through opacity and color
    vec3 firstPosVC = rayOriginVC + minDistance * rayDirVC;
    vec4 firstColor = getColorAtPos(firstPosVC);

    // handle very thin volumes
    if (raySteps <= 1.0) {
      firstColor.a = 1.0 - pow(1.0 - firstColor.a, raySteps);
      gl_FragData[0] = firstColor;
      return;
    }

    // first color only counts for \`jitter\` factor of the step
    firstColor.a = 1.0 - pow(1.0 - firstColor.a, jitter);
    vec4 color = vec4(firstColor.rgb * firstColor.a, firstColor.a);
    vec3 posVC = firstPosVC + jitter * stepVC;
    float stepsTraveled = jitter;

    for (int i = 0; i < vtkMaximumNumberOfSamples; ++i) {
      // If we have reached the last step, break
      if (stepsTraveled + 1.0 >= raySteps) {
        break;
      }
      vec4 tColor = getColorAtPos(posVC);

      color = color + vec4(tColor.rgb * tColor.a, tColor.a) * (1.0 - color.a);
      stepsTraveled++;
      posVC += stepVC;
      if (color.a > 0.99) {
        color.a = 1.0;
        break;
      }
    }

    if (color.a < 0.99 && (raySteps - stepsTraveled) > 0.0) {
      vec3 endPosVC = rayOriginVC + maxDistance * rayDirVC;
      vec4 tColor = getColorAtPos(endPosVC);
      tColor.a = 1.0 - pow(1.0 - tColor.a, raySteps - stepsTraveled);

      float mix = (1.0 - color.a);
      color = color + vec4(tColor.rgb * tColor.a, tColor.a) * mix;
    }

    gl_FragData[0] = vec4(color.rgb / color.a, color.a);
  #endif

  #if vtkBlendMode == MAXIMUM_INTENSITY_BLEND ||                                 \\
      vtkBlendMode == MINIMUM_INTENSITY_BLEND
    // Find maximum/minimum intensity along the ray.

    // Define the operation we will use (min or max)
    #if vtkBlendMode == MAXIMUM_INTENSITY_BLEND
      #define OP max
    #else
      #define OP min
    #endif

    vec3 posVC = rayOriginVC + minDistance * rayDirVC;
    float stepsTraveled = 0.0;

    // Find a value to initialize the selected variables
    vec4 selectedValue;
    vec3 selectedPosVC;
    vec3 selectedPosIS;
    {
      vec3 posIS = posVCtoIS(posVC);
      selectedValue = getTextureValue(posIS);
      selectedPosVC = posVC;
      selectedPosIS = posIS;
    }

    // If the clipping range is shorter than the sample distance
    // we can skip the sampling loop along the ray.
    if (raySteps <= 1.0) {
      gl_FragData[0] = getColorForValue(selectedValue, selectedPosVC, selectedPosIS);
      return;
    }

    posVC += jitter * stepVC;
    stepsTraveled += jitter;

    // Sample along the ray until vtkMaximumNumberOfSamples,
    // ending slightly inside the total distance
    for (int i = 0; i < vtkMaximumNumberOfSamples; ++i) {
      // If we have reached the last step, break
      if (stepsTraveled + 1.0 >= raySteps) {
        break;
      }

      // Get selected values
      vec3 posIS = posVCtoIS(posVC);
      vec4 previousSelectedValue = selectedValue;
      vec4 currentValue = getTextureValue(posIS);
      selectedValue = OP(selectedValue, currentValue);
      if (previousSelectedValue != selectedValue) {
        selectedPosVC = posVC;
        selectedPosIS = posIS;
      }

      // Otherwise, continue along the ray
      stepsTraveled++;
      posVC += stepVC;
    }

    // Perform the last step along the ray using the
    // residual distance
    posVC = rayOriginVC + maxDistance * rayDirVC;
    {
      vec3 posIS = posVCtoIS(posVC);
      vec4 previousSelectedValue = selectedValue;
      vec4 currentValue = getTextureValue(posIS);
      selectedValue = OP(selectedValue, currentValue);
      if (previousSelectedValue != selectedValue) {
        selectedPosVC = posVC;
        selectedPosIS = posIS;
      }
    }

    gl_FragData[0] = getColorForValue(selectedValue, selectedPosVC, selectedPosIS);
  #endif

  #if vtkBlendMode == ADDITIVE_INTENSITY_BLEND ||                                \\
      vtkBlendMode == AVERAGE_INTENSITY_BLEND
    vec4 sum = vec4(0.);
    #if vtkBlendMode == AVERAGE_INTENSITY_BLEND
      float totalWeight = 0.0;
    #endif
    vec3 posVC = rayOriginVC + minDistance * rayDirVC;
    float stepsTraveled = 0.0;

    vec3 posIS = posVCtoIS(posVC);
    vec4 value = getTextureValue(posIS);

    if (raySteps <= 1.0) {
      gl_FragData[0] = getColorForValue(value * raySteps, posVC, posIS);
      return;
    }

    if (valueWithinScalarRange(value)) {
      sum += value * jitter;
      #if vtkBlendMode == AVERAGE_INTENSITY_BLEND
        totalWeight += jitter;
      #endif
    }
    posVC += jitter * stepVC;
    stepsTraveled += jitter;

    // Sample along the ray until vtkMaximumNumberOfSamples,
    // ending slightly inside the total distance
    for (int i = 0; i < vtkMaximumNumberOfSamples; ++i) {
      // If we have reached the last step, break
      if (stepsTraveled + 1.0 >= raySteps) {
        break;
      }

      posIS = posVCtoIS(posVC);
      value = getTextureValue(posIS);
      // One can control the scalar range by setting the AverageIPScalarRange to
      // disregard scalar values, not in the range of interest, from the average
      // computation. Notes:
      // - We are comparing all values in the texture to see if any of them
      //   are outside of the scalar range. In the future we might want to allow
      //   scalar ranges for each component.
      if (valueWithinScalarRange(value)) {
        sum += value;
        #if vtkBlendMode == AVERAGE_INTENSITY_BLEND
          totalWeight++;
        #endif
      }

      stepsTraveled++;
      posVC += stepVC;
    }

    // Perform the last step along the ray using the
    // residual distance
    posVC = rayOriginVC + maxDistance * rayDirVC;
    posIS = posVCtoIS(posVC);
    value = getTextureValue(posIS);
    if (valueWithinScalarRange(value)) {
      sum += value;
      #if vtkBlendMode == AVERAGE_INTENSITY_BLEND
        totalWeight += raySteps - stepsTraveled;
      #endif
    }

    #if vtkBlendMode == AVERAGE_INTENSITY_BLEND
      sum /= vec4(totalWeight, totalWeight, totalWeight, 1.0);
    #endif

    gl_FragData[0] = getColorForValue(sum, posVC, posIS);
  #endif

  #if vtkBlendMode == RADON_TRANSFORM_BLEND
    float normalizedRayIntensity = 1.0;
    vec3 firstPosVC = rayOriginVC + minDistance * rayDirVC;
    vec3 posVC = firstPosVC;
    float stepsTraveled = 0.0;

    // handle very thin volumes
    if (raySteps <= 1.0) {
      vec3 posIS = posVCtoIS(posVC);
      vec4 tValue = getTextureValue(posIS);
      normalizedRayIntensity -= raySteps * sampleDistance *
                                getRadonOpacity(tValue);
      gl_FragData[0] =
          vec4(getRadonColor(normalizedRayIntensity), 1.0);
      return;
    }

    vec3 firstPosIS = posVCtoIS(firstPosVC);
    vec4 firstValue = getTextureValue(firstPosIS);
    normalizedRayIntensity -=
        jitter * sampleDistance * getRadonOpacity(firstValue);

    posVC += jitter * stepVC;
    stepsTraveled += jitter;

    for (int i = 0; i < vtkMaximumNumberOfSamples; ++i) {
      if (stepsTraveled + 1.0 >= raySteps) {
        break;
      }

      vec3 posIS = posVCtoIS(posVC);
      vec4 value = getTextureValue(posIS);
      // Convert scalar value to normalizedRayIntensity coefficient and
      // accumulate normalizedRayIntensity
      normalizedRayIntensity -=
          sampleDistance * getRadonOpacity(value);

      posVC += stepVC;
      stepsTraveled++;
    }

    if ((raySteps - stepsTraveled) > 0.0) {
      vec3 endPosIS = clamp(
        posVCtoIS(rayOriginVC + maxDistance * rayDirVC),
        vec3(0.0), vec3(1.0));
      vec4 endValue = getTextureValue(endPosIS);
      normalizedRayIntensity -=
          (raySteps - stepsTraveled) * sampleDistance * getRadonOpacity(endValue);
    }

    // map normalizedRayIntensity to color
    gl_FragData[0] =
        vec4(getRadonColor(normalizedRayIntensity), 1.0);
  #endif

  #if vtkBlendMode == LABELMAP_EDGE_PROJECTION_BLEND
    // Only works with a single volume
    vec3 posVC = rayOriginVC + minDistance * rayDirVC;
    float stepsTraveled = 0.0;
    vec3 posIS = posVCtoIS(posVC);
    vec4 tValue = getTextureValue(posIS);
    if (raySteps <= 1.0) {
      gl_FragData[0] = getColorForValue(tValue, posVC, posIS);
      return;
    }

    vec3 stepIS = vecVCToIS(stepVC);
    vec4 value = tValue;
    posIS += jitter * stepIS;
    stepsTraveled += jitter;
    vec3 maxPosIS = posIS; // Store the position of the max value
    int segmentIndex = int(value.g);
    bool originalPosHasSeenNonZero = false;

    if (segmentIndex != 0) {
      // Tried using the segment index in an boolean array but reading
      // from the array by dynamic indexing was horrondously slow
      // so use bit masking instead and assign 1 to the bit corresponding to the
      // segment index and later check if the bit is set via bit operations
      setLabelOutlineBit(segmentIndex);
    }

    // Sample along the ray until vtkMaximumNumberOfSamples,
    // ending slightly inside the total distance
    for (int i = 0; i < vtkMaximumNumberOfSamples; ++i) {
      // If we have reached the last step, break
      if (stepsTraveled + 1.0 >= raySteps) {
        break;
      }

      // compute the scalar
      tValue = getTextureValue(posIS);
      segmentIndex = int(tValue.g);

      if (segmentIndex != 0) {
        originalPosHasSeenNonZero = true;
        setLabelOutlineBit(segmentIndex);
      }

      if (tValue.r > value.r) {
        value = tValue;   // Update the max value
        maxPosIS = posIS; // Update the position where max occurred
      }

      // Otherwise, continue along the ray
      stepsTraveled++;
      posIS += stepIS;
    }

    // Perform the last step along the ray using the
    // residual distance
    posIS = posVCtoIS(rayOriginVC + maxDistance * rayDirVC);
    tValue = getTextureValue(posIS);

    if (tValue.r > value.r) {
      value = tValue;   // Update the max value
      maxPosIS = posIS; // Update the position where max occurred
    }

    // If we have not seen any non-zero segments, we can return early
    // and grab color from the actual center value first component (image)
    if (!originalPosHasSeenNonZero) {
      vec3 maxPosVC = posIStoVC(maxPosIS);
      gl_FragData[0] = getColorForValue(value, maxPosVC, maxPosIS);
      return;
    }

    vec3 neighborRayStepsIS = stepIS;
    float neighborRaySteps = raySteps;
    bool shouldLookInAllNeighbors = false;

    vec3 volumeSpacings = volume.spacing;
    float minVoxelSpacing =
        min(volumeSpacings[0], min(volumeSpacings[1], volumeSpacings[2]));
    vec4 base =
        vec4(gl_FragCoord.x, gl_FragCoord.y, gl_FragCoord.z, gl_FragCoord.w);

    vec4 baseXPlus = vec4(gl_FragCoord.x + 1.0, gl_FragCoord.y, gl_FragCoord.z,
                          gl_FragCoord.w);
    vec4 baseYPlus = vec4(gl_FragCoord.x, gl_FragCoord.y + 1.0, gl_FragCoord.z,
                          gl_FragCoord.w);

    vec3 baseWorld = fragCoordToWorld(base);
    vec3 baseXPlusWorld = fragCoordToWorld(baseXPlus);
    vec3 baseYPlusWorld = fragCoordToWorld(baseYPlus);

    float XPlusDiff = length(baseXPlusWorld - baseWorld);
    float YPlusDiff = length(baseYPlusWorld - baseWorld);

    float minFragSpacingWorld = min(XPlusDiff, YPlusDiff);

    for (int s = 1; s < MAX_SEGMENT_INDEX; s++) {
      // bail out quickly if the segment index has not
      // been seen by the center segment
      if (!isLabelOutlineBitSet(s)) {
        continue;
      }

      // Use texture sampling for outlineThickness so that we can have
      // per segment thickness
      float textureCoordinate = float(s - 1) / 1024.0;
      float textureValue =
          texture2D(labelOutlineThicknessTexture, vec2(textureCoordinate, 0.5)).r;

      int actualThickness = int(textureValue * 255.0);

      // check the extreme points in the neighborhood since there is a better
      // chance of finding the edge there, so that we can bail out
      // faster if we find the edge
      bool onEdge = checkOnEdgeForNeighbor(-actualThickness, -actualThickness, s,
                                          stepIS) ||
                    checkOnEdgeForNeighbor(actualThickness, actualThickness, s,
                                          stepIS) ||
                    checkOnEdgeForNeighbor(actualThickness, -actualThickness, s,
                                          stepIS) ||
                    checkOnEdgeForNeighbor(-actualThickness, +actualThickness, s,
                                          stepIS);

      if (onEdge) {
        return;
      }

      // since the next step is computationally expensive, we need to perform
      // some optimizations to avoid it if possible. One of the optimizations
      // is to check the whether the minimum of the voxel spacing is greater than
      // the 2 * the thickness of the outline segment. If that is the case
      // then we can safely skip the next step since we can be sure that the
      // the previous 4 checks on the extreme points would caught the entirety
      // of the all the fragments inside. i.e., this happens when we zoom out,
      if (minVoxelSpacing >
          (2.0 * float(actualThickness) - 1.0) * minFragSpacingWorld) {
        continue;
      }

      // Loop through the rest, skipping the processed extremes and the center
      for (int i = -actualThickness; i <= actualThickness; i++) {
        for (int j = -actualThickness; j <= actualThickness; j++) {
          if (i == 0 && j == 0)
            continue; // Skip the center
          if (abs(i) == actualThickness && abs(j) == actualThickness)
            continue; // Skip corners
          if (checkOnEdgeForNeighbor(i, j, s, stepIS)) {
            return;
          }
        }
      }
    }

    float sampleHeight = volume.transferFunctionsSampleHeight[0];
    vec3 tColor0 = getColorFromTexture(value.r, 0, sampleHeight);
    float pwfValue0 = getOpacityFromTexture(value.r, 0, sampleHeight);
    gl_FragData[0] = vec4(tColor0, pwfValue0);
  #endif
}

//=======================================================================
// given a
// - ray direction (rayDir)
// - starting point (vertexVCVSOutput)
// - bounding planes of the volume
// - optionally depth buffer values
// - far clipping plane
// compute the start/end distances of the ray we need to cast
vec2 computeRayDistances(vec3 rayOriginVC, vec3 rayDirVC) {
  vec2 dists = rayIntersectVolumeDistances(rayOriginVC, rayDirVC);

  //VTK::ClipPlane::Impl

  // do not go behind front clipping plane
  dists.x = max(0.0, dists.x);

  // do not go PAST far clipping plane
  float farDist = -camThick / rayDirVC.z;
  dists.y = min(farDist, dists.y);

  // Do not go past the zbuffer value if set
  // This is used for intermixing opaque geometry
  //VTK::ZBuffer::Impl

  return dists;
}

float getFragmentSeed() {
  // This first noise has a diagonal pattern
  float firstNoise =
      fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  // This second noise is made out of blocks of CPU generated noise
  float secondNoise = texture2D(jtexture, gl_FragCoord.xy / 32.0).r;
  // Combine the two sources of noise in a way that the distribution is uniform
  // in [0,1[
  float noiseSum = firstNoise + secondNoise;
  return noiseSum < 1.0 ? noiseSum : noiseSum - 1.0;
}

void main() {
  fragmentSeed = getFragmentSeed();

  if (cameraParallel == 1) {
    // Camera is parallel, so the rayDir is just the direction of the camera.
    rayDirVC = vec3(0.0, 0.0, -1.0);
  } else {
    // camera is at 0,0,0 so rayDir for perspective is just the vc coord
    rayDirVC = normalize(vertexVCVSOutput);
  }

  vec3 rayOriginVC = vertexVCVSOutput;
  vec2 rayStartEndDistancesVC = computeRayDistances(rayOriginVC, rayDirVC);
  if (rayStartEndDistancesVC[1] <= rayStartEndDistancesVC[0] ||
      rayStartEndDistancesVC[1] <= 0.0) {
    // Volume not hit or behind the ray
    discard;
  }

  // Perform the blending operation along the ray
  applyBlend(rayOriginVC, rayDirVC, rayStartEndDistancesVC[0], rayStartEndDistancesVC[1]);
}
`,Hn=e(ae(),1),{vtkWarningMacro:Un,vtkErrorMacro:Wn}=pt,Gn={idxToView:L(new Float64Array(16)),vecISToVCMatrix:tt(new Float64Array(9)),normalISToVCMatrix:tt(new Float64Array(9)),linearModelToViewMatrix:tt(new Float64Array(9)),modelToView:L(new Float64Array(16)),projectionToView:L(new Float64Array(16)),projectionToWorld:L(new Float64Array(16))};function Kn(e,n){n.classHierarchy.push(`vtkOpenGLVolumeMapper`);function r(e){return e.getUseLabelOutline()||n.renderable.getBlendMode()===re.LABELMAP_EDGE_PROJECTION_BLEND}let a=new Map;function o(t,n){if(!n)return;let r=(a.get(n)??0)-1;r<=0?(t.unregisterGraphicsResourceUser(n,e),a.delete(n)):a.set(n,r)}function s(t,n){if(!n)return;let r=a.get(n)??0,i=r+1;a.set(n,i),r<=0&&t.registerGraphicsResourceUser(n,e)}function c(e,t,n){t!==n&&(o(e,t),s(e,n))}function l(t){[...a.keys()].forEach(n=>t.unregisterGraphicsResourceUser(n,e))}e.buildPass=()=>{n.zBufferTexture=null},e.zBufferPass=(e,t)=>{if(e){let e=t.getZBufferTexture();e!==n.zBufferTexture&&(n.zBufferTexture=e)}},e.opaqueZBufferPass=(t,n)=>e.zBufferPass(t,n),e.volumePass=(t,r)=>{if(t){let t=n._openGLRenderWindow;n._openGLRenderWindow=e.getLastAncestorOfType(`vtkOpenGLRenderWindow`),t&&!t.isDeleted()&&t!==n._openGLRenderWindow&&l(t),n.context=n._openGLRenderWindow.getContext(),n.tris.setOpenGLRenderWindow(n._openGLRenderWindow),n.jitterTexture.setOpenGLRenderWindow(n._openGLRenderWindow),n.framebuffer.setOpenGLRenderWindow(n._openGLRenderWindow),n.openGLVolume=e.getFirstAncestorOfType(`vtkOpenGLVolume`);let r=n.openGLVolume.getRenderable();n._openGLRenderer=e.getFirstAncestorOfType(`vtkOpenGLRenderer`);let i=n._openGLRenderer.getRenderable();n.openGLCamera=n._openGLRenderer.getViewNodeFor(i.getActiveCamera(),n.openGLCamera),e.renderPiece(i,r)}},e.getShaderTemplate=(e,t,n)=>{e.Vertex=Bn,e.Fragment=Vn,e.Geometry=``},e.replaceShaderValues=(e,t,r)=>{let i=e.Fragment;i=I.substitute(i,`//VTK::EnabledColorFunctions`,`#define EnableColorForValueFunctionId${n.previousState.colorForValueFunctionId}`).result;let a=[];n.previousState.surfaceLightingEnabled&&a.push(`Surface`),n.previousState.volumeLightingEnabled&&a.push(`Volume`),i=I.substitute(i,`//VTK::EnabledLightings`,a.map(e=>`#define Enable${e}Lighting`)).result,n.previousState.multiTexturePerVolumeEnabled&&(i=I.substitute(i,`//VTK::EnabledMultiTexturePerVolume`,`#define EnabledMultiTexturePerVolume`).result),n.previousState.useIndependentComponents&&(i=I.substitute(i,`//VTK::EnabledIndependentComponents`,`#define EnabledIndependentComponents`).result),n.previousState.gradientOpacityEnabled&&(i=I.substitute(i,`//VTK::EnabledGradientOpacity`,`#define EnabledGradientOpacity`).result),i=I.substitute(i,`//VTK::vtkProportionalComponents`,n.previousState.proportionalComponents.map(e=>`#define vtkComponent${e}Proportional`).join(`
`)).result,i=I.substitute(i,`//VTK::vtkForceNearestComponents`,n.previousState.forceNearestComponents.map(e=>`#define vtkComponent${e}ForceNearest`).join(`
`)).result,n.previousState.hasZBufferTexture&&(i=I.substitute(i,`//VTK::ZBuffer::Dec`,[`uniform sampler2D zBufferTexture;`,`uniform float vpZWidth;`,`uniform float vpZHeight;`]).result,i=I.substitute(i,`//VTK::ZBuffer::Impl`,[`vec4 depthVec = texture2D(zBufferTexture, vec2(gl_FragCoord.x / vpZWidth, gl_FragCoord.y/vpZHeight));`,`float zdepth = (depthVec.r*256.0 + depthVec.g)/257.0;`,`zdepth = zdepth * 2.0 - 1.0;`,`if (cameraParallel == 0) {`,`zdepth = -2.0 * camFar * camNear / (zdepth*(camFar-camNear)-(camFar+camNear)) - camNear;}`,`else {`,`zdepth = (zdepth + 1.0) * 0.5 * (camFar - camNear);}
`,`zdepth = -zdepth/rayDirVC.z;`,`dists.y = min(zdepth,dists.y);`]).result),i=I.substitute(i,`//VTK::BlendMode`,`${n.previousState.blendMode}`).result,i=I.substitute(i,`//VTK::NumberOfLights`,`${n.previousState.numberOfLights}`).result,i=I.substitute(i,`//VTK::MaxLaoKernelSize`,`${n.previousState.maxLaoKernelSize}`).result,i=I.substitute(i,`//VTK::NumberOfComponents`,`${n.previousState.numberOfComponents}`).result,i=I.substitute(i,`//VTK::MaximumNumberOfSamples`,`${n.previousState.maximumNumberOfSamples}`).result,e.Fragment=i;let o=n.previousState.numberOfClippingPlanes;o>0&&(i=I.substitute(i,`//VTK::ClipPlane::Dec`,[`uniform vec3 vClipPlaneNormals[6];`,`uniform float vClipPlaneDistances[6];`,`uniform vec3 vClipPlaneOrigins[6];`,`uniform int clip_numPlanes;`,`//VTK::ClipPlane::Dec`,`#define vtkClippingPlanesOn`],!1).result,i=I.substitute(i,`//VTK::ClipPlane::Impl`,[`for(int i = 0; i < ${o}; i++) {`,`  float rayDirRatio = dot(rayDirVC, vClipPlaneNormals[i]);`,`  float equationResult = dot(vertexVCVSOutput, vClipPlaneNormals[i]) + vClipPlaneDistances[i];`,`  if (rayDirRatio == 0.0)`,`  {`,`    if (equationResult < 0.0) dists.x = dists.y;`,`    continue;`,`  }`,`  float result = -1.0 * equationResult / rayDirRatio;`,`  if (rayDirRatio < 0.0) dists.y = min(dists.y, result);`,`  else dists.x = max(dists.x, result);`,`}`,`//VTK::ClipPlane::Impl`],!1).result),e.Fragment=i},e.getNeedToRebuildShaders=(t,i,a)=>{let o=!!n.zBufferTexture,s=n.currentValidInputs.length,c=n.numberOfLights,l=n.numberOfComponents,d=n.useIndependentComponents,f=a.getProperties()[n.currentValidInputs[0].inputIndex],p=s>1,m=ht.getDiagonalLength(a.getBounds()),h=Math.ceil(m/e.getCurrentSampleDistance(i));h>n.renderable.getMaximumSamplesPerRay()&&Un(`The number of steps required ${h} is larger than the specified maximum number of steps ${n.renderable.getMaximumSamplesPerRay()}.\nPlease either change the volumeMapper sampleDistance or its maximum number of samples.`);let g=d?l:1,_=!1;for(let e=0;e<g;++e)if(f.getUseGradientOpacity(e)){_=!0;break}let v=0,y=f.getLAOKernelSize();y>v&&f.getLocalAmbientOcclusion()&&f.getAmbient()>0&&(v=y);let b=n.renderable.getClippingPlanes().length,x=n.renderable.getViewSpecificProperties().OpenGL?.ShaderReplacements,S=n.currentRenderPass?.getShaderReplacement(),C=n.renderable.getBlendMode(),w=(()=>{if(C!==re.LABELMAP_EDGE_PROJECTION_BLEND&&r(f))return 5;if(d)switch(f.getColorMixPreset()){case st.ADDITIVE:return 1;case st.COLORIZE:return 2;case st.CUSTOM:return 3;default:return 4}return 0})(),T=f.getVolumetricScatteringBlending()<1,E=f.getVolumetricScatteringBlending()>0,D=!1;for(let e=0;e<l;++e)if(f.getForceNearestInterpolation(e)){D=!0;break}let ee=[],O=[];for(let e=0;e<l;e++)f.getOpacityMode(e)===u.PROPORTIONAL&&ee.push(e),f.getForceNearestInterpolation(e)&&O.push(e);let te={numberOfComponents:l,useIndependentComponents:d,proportionalComponents:ee,forceNearestComponents:O,blendMode:C,numberOfLights:c,numberOfValidInputs:s,maximumNumberOfSamples:h,hasZBufferTexture:o,maxLaoKernelSize:v,numberOfClippingPlanes:b,mapperShaderReplacements:x,renderPassShaderReplacements:S,colorForValueFunctionId:w,surfaceLightingEnabled:T,volumeLightingEnabled:E,forceNearestInterpolationEnabled:D,multiTexturePerVolumeEnabled:p,gradientOpacityEnabled:_};return t.getProgram()?.getHandle()===0||!n.previousState||!(0,Hn.default)(n.previousState,te)?(n.previousState=te,!0):!1},e.updateShaders=(t,r,i)=>{if(e.getNeedToRebuildShaders(t,r,i)){let a={Vertex:null,Fragment:null,Geometry:null};e.buildShaders(a,r,i);let o=n._openGLRenderWindow.getShaderCache().readyShaderProgramArray(a.Vertex,a.Fragment,a.Geometry);if(!o)return Wn(`Error compiling volume mapper shader program.`),t.setProgram(null),!1;o!==t.getProgram()&&(t.setProgram(o),t.getVAO().releaseGraphicsResources()),t.getShaderSourceTime().modified()}else if(!n._openGLRenderWindow.getShaderCache().readyShaderProgram(t.getProgram()))return t.setProgram(null),!1;return t.getVAO().bind(),e.setMapperShaderParameters(t,r,i),e.setCameraShaderParameters(t,r,i),e.setPropertyShaderParameters(t,r,i),e.getClippingPlaneShaderParameters(t,r,i),!0},e.setMapperShaderParameters=(t,r,i)=>{let a=t.getProgram();if(!a)return;t.getCABO().getElementCount()&&(n.VBOBuildTime.getMTime()>t.getAttributeUpdateTime().getMTime()||t.getShaderSourceTime().getMTime()>t.getAttributeUpdateTime().getMTime())&&(a.isAttributeUsed(`vertexDC`)&&(t.getVAO().addAttributeArray(a,t.getCABO(),`vertexDC`,t.getCABO().getVertexOffset(),t.getCABO().getStride(),n.context.FLOAT,3,n.context.FALSE)||Wn(`Error setting vertexDC in shader VAO.`)),t.getAttributeUpdateTime().modified());let o=e.getCurrentSampleDistance(r);a.setUniformf(`sampleDistance`,o);let s=o*n.renderable.getVolumeShadowSamplingDistFactor();a.setUniformf(`volumeShadowSampleDistance`,s),n.scalarTextures.forEach((e,t)=>{a.setUniformi(`volumeTexture[${t}]`,e.getTextureUnit())});let c=i.getProperties()[n.currentValidInputs[0].inputIndex].getIpScalarRange(),l=new Float32Array(4),u=new Float32Array(4),d=(e,t,n)=>{t?.dataComputedScale?.length&&(l[e]=c[0]*t.dataComputedScale[n]+t.dataComputedOffset[n],u[e]=c[1]*t.dataComputedScale[n]+t.dataComputedOffset[n],l[e]=(l[e]-t.offset[n])/t.scale[n],u[e]=(u[e]-t.offset[n])/t.scale[n])};if(n.previousState.multiTexturePerVolumeEnabled)n.scalarTextures.forEach((e,t)=>{d(t,e.getVolumeInfo(),0)});else{let e=n.scalarTextures[0].getVolumeInfo();for(let t=0;t<4;++t)d(t,e,t)}let f=`volume`;if(a.setUniform4f(`${f}.ipScalarRangeMin`,l[0],l[1],l[2],l[3]),a.setUniform4f(`${f}.ipScalarRangeMax`,u[0],u[1],u[2],u[3]),n.zBufferTexture!==null){a.setUniformi(`zBufferTexture`,n.zBufferTexture.getTextureUnit());let e=n._useSmallViewport?[n._smallViewportWidth,n._smallViewportHeight]:n._openGLRenderWindow.getFramebufferSize();a.setUniformf(`vpZWidth`,e[0]),a.setUniformf(`vpZHeight`,e[1])}},e.setCameraShaderParameters=(t,a,o)=>{let{idxToView:s,vecISToVCMatrix:c,normalISToVCMatrix:l,linearModelToViewMatrix:u,modelToView:d,projectionToView:f,projectionToWorld:p}=Gn,m=n.openGLCamera.getKeyMatrices(a),h=n.openGLVolume.getKeyMatrices();M(d,m.wcvc,h.mcwc);let g=t.getProgram(),_=n.openGLCamera.getRenderable(),v=_.getParallelProjection(),y=_.getClippingRange();g.setUniformf(`camThick`,y[1]-y[0]),g.setUniformf(`camNear`,y[0]),g.setUniformf(`camFar`,y[1]),g.setUniformi(`cameraParallel`,v);let x=n.currentValidInputs[0],C=x.imageData.getBounds(),E=ht.getCorners(C,[]).map(e=>{if(ne(e,e,d),!v){let t=-y[0]/(e[2]*ze(e));ee(e,e,t)}return ne(e,e,m.vcpc),e}),D=ht.addPoints([...ht.INIT_BOUNDS],E);g.setUniformf(`dcxmin`,D[0]),g.setUniformf(`dcxmax`,D[1]),g.setUniformf(`dcymin`,D[2]),g.setUniformf(`dcymax`,D[3]);let O=e.getRenderTargetSize();g.setUniformf(`vpWidth`,O[0]),g.setUniformf(`vpHeight`,O[1]);let te=e.getRenderTargetOffset();g.setUniformf(`vpOffsetX`,te[0]/O[0]),g.setUniformf(`vpOffsetY`,te[1]/O[1]),b(f,m.vcpc),g.setUniformMatrix(`PCVCMatrix`,f),g.setUniformi(`twoSidedLighting`,a.getTwoSidedLighting());let re=Array(2*n.previousState.maxLaoKernelSize);for(let e=0;e<n.previousState.maxLaoKernelSize;e++)re[e*2]=Math.random(),re[e*2+1]=Math.random();if(g.setUniform2fv(`kernelSample`,re),n.numberOfLights>0){let e=0;a.getLights().forEach(t=>{if(t.getSwitch()>0){let n=`lights[${e}]`,r=t.getColor(),i=t.getIntensity(),a=ee([],r,i);g.setUniform3fv(`${n}.color`,a);let o=t.getTransformedPosition();ne(o,o,d),g.setUniform3fv(`${n}.positionVC`,o);let s=[...t.getDirection()];S(s,s,m.normalMatrix),T(s,s),g.setUniform3fv(`${n}.directionVC`,s);let c=[-.5*s[0],-.5*s[1],-.5*(s[2]-1)];g.setUniform3fv(`${n}.halfAngleVC`,c);let l=t.getAttenuationValues();g.setUniform3fv(`${n}.attenuation`,l);let u=t.getExponent();g.setUniformf(`${n}.exponent`,u);let f=t.getConeAngle();g.setUniformf(`${n}.coneAngle`,f);let p=t.getPositional();g.setUniformi(`${n}.isPositional`,p),e++}})}let k=`volume`,A=o.getProperties()[x.inputIndex],ie=x.imageData,ae=ie.getSpatialExtent(),oe=ie.getSpacing(),se=ie.getDimensions(),ce=ie.getIndexToWorld(),le=ie.getWorldToIndex(),ue=ie.getDirectionByReference();M(s,d,ce),g.setUniform3fv(`${k}.spacing`,oe);let de=i([],oe);g.setUniform3fv(`${k}.inverseSpacing`,de),g.setUniform3iv(`${k}.dimensions`,se),g.setUniform3fv(`${k}.inverseDimensions`,i([],se)),g.setUniformMatrix(`${k}.worldToIndex`,le),c.fill(0);let fe=w(new Float64Array(3),se,oe);c[0]=fe[0],c[4]=fe[1],c[8]=fe[2],Ue(c,ue,c),qe(u,d),Ue(c,u,c),g.setUniformMatrix3x3(`${k}.vecISToVCMatrix`,c),g.setUniformMatrix3x3(`${k}.vecVCToISMatrix`,Se(new Float32Array(9),c)),l.fill(0),l[0]=fe[0],l[4]=fe[1],l[8]=fe[2],Ue(l,ue,l),Ue(l,h.normalMatrix,l),Ue(l,m.normalMatrix,l),g.setUniformMatrix3x3(`${k}.normalISToVCMatrix`,l);let j=Ve(ae[0],ae[2],ae[4]),pe=ne(new Float64Array(3),j,s);g.setUniform3fv(`${k}.originVC`,pe);let me=ht.getDiagonalLength(o.getBounds());if(g.setUniformf(`${k}.diagonalLength`,me),r(A)){let e=_.getDistance();_.setClippingRange(e,e+.1);let t=n.openGLCamera.getKeyMatrices(a);b(p,t.wcpc),_.setClippingRange(y[0],y[1]),n.openGLCamera.getKeyMatrices(a),g.setUniformMatrix(`${k}.PCWCMatrix`,p)}if(A.getVolumetricScatteringBlending()>0&&(g.setUniformf(`${k}.globalIlluminationReach`,A.getGlobalIlluminationReach()),g.setUniformf(`${k}.volumetricScatteringBlending`,A.getVolumetricScatteringBlending()),g.setUniformf(`${k}.anisotropy`,A.getAnisotropy()),g.setUniformf(`${k}.anisotropySquared`,A.getAnisotropy()**2)),A.getLocalAmbientOcclusion()&&A.getAmbient()>0){let e=A.getLAOKernelSize();g.setUniformi(`${k}.kernelSize`,e);let t=A.getLAOKernelRadius();g.setUniformi(`${k}.kernelRadius`,t)}else g.setUniformi(`${k}.kernelSize`,0)},e.setPropertyShaderParameters=(e,t,r)=>{let i=e.getProgram();i.setUniformi(`jtexture`,n.jitterTexture.getTextureUnit());let a=r.getProperties();i.setUniformi(`labelOutlineThicknessTexture`,n.labelOutlineThicknessTexture.getTextureUnit()),i.setUniformi(`opacityTexture`,n.opacityTexture.getTextureUnit()),i.setUniformi(`colorTexture`,n.colorTexture.getTextureUnit());let o=`volume`,s=a[n.currentValidInputs[0].inputIndex],c=n.previousState.numberOfComponents,l=n.previousState.useIndependentComponents;if(l){let e=new Float32Array(4);for(let t=0;t<c;t++)e[t]=s.getComponentWeight(t);i.setUniform4fv(`${o}.independentComponentMix`,e);let t=new Float32Array(4),n=1/c;for(let e=0;e<c;++e)t[e]=(e+.5)*n;i.setUniform4fv(`${o}.transferFunctionsSampleHeight`,t)}let u=n.colorForValueFunctionId;i.setUniformi(`${o}.colorForValueFunctionId`,u);let d=s.getComputeNormalFromOpacity();i.setUniformi(`${o}.computeNormalFromOpacity`,d);let f=new Float32Array(4),p=new Float32Array(4),m=new Float32Array(4),h=new Float32Array(4);for(let e=0;e<c;e++){let t=n.previousState.multiTexturePerVolumeEnabled,r=t?e:0,i=t?0:e,a=n.scalarTextures[r].getVolumeInfo(),o=l?e:0,c=a.scale[i],u=s.getRGBTransferFunction(o).getRange();f[e]=c/(u[1]-u[0]),p[e]=(a.offset[i]-u[0])/(u[1]-u[0]);let d=s.getScalarOpacity(o).getRange();m[e]=c/(d[1]-d[0]),h[e]=(a.offset[i]-d[0])/(d[1]-d[0])}if(i.setUniform4fv(`${o}.colorTextureScale`,f),i.setUniform4fv(`${o}.colorTextureShift`,p),i.setUniform4fv(`${o}.opacityTextureScale`,m),i.setUniform4fv(`${o}.opacityTextureShift`,h),n.previousState.gradientOpacityEnabled){let e=[,,,,],t=[,,,,],r=[,,,,],a=[,,,,];if(l)for(let i=0;i<c;++i){let o=n.previousState.multiTexturePerVolumeEnabled,c=o?i:0,l=o?0:i,u=n.scalarTextures[c].getVolumeInfo().scale[l];if(s.getUseGradientOpacity(i)){let n=[s.getGradientOpacityMinimumOpacity(i),s.getGradientOpacityMaximumOpacity(i)],o=[s.getGradientOpacityMinimumValue(i),s.getGradientOpacityMaximumValue(i)];r[i]=n[0],a[i]=n[1],e[i]=u*(n[1]-n[0])/(o[1]-o[0]),t[i]=-o[0]*(n[1]-n[0])/(o[1]-o[0])+n[0]}else r[i]=1,a[i]=1,e[i]=0,t[i]=1}else{let i=c-1,o=n.previousState.multiTexturePerVolumeEnabled,l=o?i:0,u=o?0:i,d=n.scalarTextures[l].getVolumeInfo().scale[u],f=[s.getGradientOpacityMinimumOpacity(0),s.getGradientOpacityMaximumOpacity(0)],p=[s.getGradientOpacityMinimumValue(0),s.getGradientOpacityMaximumValue(0)];r[0]=f[0],a[0]=f[1],e[0]=d*(f[1]-f[0])/(p[1]-p[0]),t[0]=-p[0]*(f[1]-f[0])/(p[1]-p[0])+f[0]}i.setUniform4f(`${o}.gradientOpacityScale`,e),i.setUniform4f(`${o}.gradientOpacityShift`,t),i.setUniform4f(`${o}.gradientOpacityMin`,r),i.setUniform4f(`${o}.gradientOpacityMax`,a)}let g=s.getLabelOutlineOpacity();if(i.setUniformf(`${o}.outlineOpacity`,g),n.numberOfLights>0){i.setUniformf(`${o}.ambient`,s.getAmbient()),i.setUniformf(`${o}.diffuse`,s.getDiffuse()),i.setUniformf(`${o}.specular`,s.getSpecular());let e=s.getSpecularPower();i.setUniformf(`${o}.specularPower`,e===0?1:e)}},e.getClippingPlaneShaderParameters=(e,t,r)=>{if(n.renderable.getClippingPlanes().length>0){let r=n.openGLCamera.getKeyMatrices(t),i=[],a=[],o=[],s=n.renderable.getClippingPlanes(),c=s.length;for(let e=0;e<c;++e){let t=s[e].getNormal(),n=s[e].getOrigin();S(t,t,r.normalMatrix),ne(n,n,r.wcvc);let c=-1*D(n,t);i.push(t[0]),i.push(t[1]),i.push(t[2]),a.push(c),o.push(n[0]),o.push(n[1]),o.push(n[2])}let l=e.getProgram();l.setUniform3fv(`vClipPlaneNormals`,i),l.setUniformfv(`vClipPlaneDistances`,a),l.setUniform3fv(`vClipPlaneOrigins`,o),l.setUniformi(`clip_numPlanes`,c)}},e.delete=Ne(()=>{n._animationRateSubscription&&=(n._animationRateSubscription.unsubscribe(),null)},()=>{n._openGLRenderWindow&&l(n._openGLRenderWindow)},e.delete),e.getRenderTargetSize=()=>{if(n._useSmallViewport)return[n._smallViewportWidth,n._smallViewportHeight];let{usize:e,vsize:t}=n._openGLRenderer.getTiledSizeAndOrigin();return[e,t]},e.getRenderTargetOffset=()=>{let{lowerLeftU:e,lowerLeftV:t}=n._openGLRenderer.getTiledSizeAndOrigin();return[e,t]},e.getCurrentSampleDistance=e=>{let t=e.getVTKWindow().getInteractor(),r=n.renderable.getSampleDistance();return t.isAnimating()?r*n.renderable.getInteractionSampleDistanceFactor():r},e.renderPieceStart=(t,r)=>{let i=t.getVTKWindow().getInteractor();if(n._lastScale||=n.renderable.getInitialInteractionScale(),n._useSmallViewport=!1,i.isAnimating()&&n._lastScale>1.5&&(n._useSmallViewport=!0),n._animationRateSubscription||=i.onAnimationFrameRateUpdate(()=>{if(n.renderable.getAutoAdjustSampleDistances()){let e=i.getRecentAnimationFrameRate(),t=i.getDesiredUpdateRate()/e;(t>1.15||t<.85)&&(n._lastScale*=t),n._lastScale>400&&(n._lastScale=400),n._lastScale<1.5&&(n._lastScale=1.5)}else n._lastScale=n.renderable.getImageSampleDistance()*n.renderable.getImageSampleDistance()}),n._useSmallViewport){let e=n._openGLRenderWindow.getFramebufferSize(),t=1/Math.sqrt(n._lastScale);if(n._smallViewportWidth=Math.ceil(t*e[0]),n._smallViewportHeight=Math.ceil(t*e[1]),n._smallViewportHeight>e[1]&&(n._smallViewportHeight=e[1]),n._smallViewportWidth>e[0]&&(n._smallViewportWidth=e[0]),n.framebuffer.saveCurrentBindingsAndBuffers(),n.framebuffer.getGLFramebuffer()===null)n.framebuffer.create(e[0],e[1]),n.framebuffer.populateFramebuffer();else{let t=n.framebuffer.getSize();(!t||t[0]!==e[0]||t[1]!==e[1])&&(n.framebuffer.create(e[0],e[1]),n.framebuffer.populateFramebuffer())}n.framebuffer.bind();let r=n.context;r.clearColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clear(r.COLOR_BUFFER_BIT),r.viewport(0,0,n._smallViewportWidth,n._smallViewportHeight),n.fvp=[n._smallViewportWidth/e[0],n._smallViewportHeight/e[1]]}n.context.disable(n.context.DEPTH_TEST),e.updateBufferObjects(t,r);let a=r.getProperties();n.currentValidInputs.forEach(({inputIndex:e})=>{let t=a[e].getInterpolationType(),r=n.scalarTextures[e];t===f.NEAREST?(r.setMinificationFilter(j.NEAREST),r.setMagnificationFilter(j.NEAREST)):(r.setMinificationFilter(j.LINEAR),r.setMagnificationFilter(j.LINEAR))}),n.zBufferTexture!==null&&n.zBufferTexture.activate()},e.renderPieceDraw=(t,r)=>{let i=n.context,a=[...n.scalarTextures,n.colorTexture,n.opacityTexture,n.labelOutlineThicknessTexture,n.jitterTexture];if(a.forEach(e=>e.activate()),!e.updateShaders(n.tris,t,r)){a.forEach(e=>e.deactivate());return}i.drawArrays(i.TRIANGLES,0,n.tris.getCABO().getElementCount()),n.tris.getVAO().release(),a.forEach(e=>e.deactivate())},e.renderPieceFinish=(e,t)=>{if(n.zBufferTexture!==null&&n.zBufferTexture.deactivate(),n._useSmallViewport){if(n.framebuffer.restorePreviousBindingsAndBuffers(),n.copyShader===null){n.copyShader=n._openGLRenderWindow.getShaderCache().readyShaderProgramArray([`//VTK::System::Dec`,`attribute vec4 vertexDC;`,`uniform vec2 tfactor;`,`varying vec2 tcoord;`,`void main() { tcoord = vec2(vertexDC.x*0.5 + 0.5, vertexDC.y*0.5 + 0.5) * tfactor; gl_Position = vertexDC; }`].join(`
`),[`//VTK::System::Dec`,`//VTK::Output::Dec`,`uniform sampler2D texture1;`,`varying vec2 tcoord;`,`void main() { gl_FragData[0] = texture2D(texture1,tcoord); }`].join(`
`),``);let e=n.copyShader;n.copyVAO=x.newInstance(),n.copyVAO.setOpenGLRenderWindow(n._openGLRenderWindow),n.tris.getCABO().bind(),n.copyVAO.addAttributeArray(e,n.tris.getCABO(),`vertexDC`,n.tris.getCABO().getVertexOffset(),n.tris.getCABO().getStride(),n.context.FLOAT,3,n.context.FALSE)||Wn(`Error setting vertexDC in copy shader VAO.`)}else n._openGLRenderWindow.getShaderCache().readyShaderProgram(n.copyShader);let e=n._openGLRenderWindow.getFramebufferSize();n.context.viewport(0,0,e[0],e[1]);let t=n.framebuffer.getColorTexture();t.activate(),n.copyShader.setUniformi(`texture`,t.getTextureUnit()),n.copyShader.setUniform2f(`tfactor`,n.fvp[0],n.fvp[1]);let r=n.context;r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA),n.context.drawArrays(n.context.TRIANGLES,0,n.tris.getCABO().getElementCount()),t.deactivate(),r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA)}},e.renderPiece=(t,r)=>{e.invokeEvent({type:`StartEvent`}),n.renderable.update();let i=n.renderable.getNumberOfInputPorts();n.currentValidInputs=[];for(let e=0;e<i;++e){let t=n.renderable.getInputData(e);t&&!t.isDeleted()&&n.currentValidInputs.push({imageData:t,inputIndex:e})}let a=0;if(n.currentValidInputs.length>0){let e=r.getProperties(),i=n.currentValidInputs[0],o=i.imageData.getPointData().getScalars(),s=e[i.inputIndex];s.getShade()&&n.renderable.getBlendMode()===re.COMPOSITE_BLEND&&t.getLights().forEach(e=>{e.getSwitch()>0&&a++});let c=n.currentValidInputs.length;n.numberOfComponents=c>1?c:o.getNumberOfComponents(),n.useIndependentComponents=s.getUseIndependentComponents(n.numberOfComponents)}a!==n.numberOfLights&&(n.numberOfLights=a,e.modified()),e.invokeEvent({type:`EndEvent`}),n.currentValidInputs.length!==0&&(e.renderPieceStart(t,r),e.renderPieceDraw(t,r),e.renderPieceFinish(t,r))},e.updateBufferObjects=(t,n)=>{e.getNeedToRebuildBufferObjects(t,n)&&e.buildBufferObjects(t,n)},e.getNeedToRebuildBufferObjects=(t,r)=>n.VBOBuildTime.getMTime()<e.getMTime()||n.VBOBuildTime.getMTime()<r.getMTime()||n.VBOBuildTime.getMTime()<r.getProperty(n.currentValidInputs[0].inputIndex)?.getMTime()||n.VBOBuildTime.getMTime()<n.renderable.getMTime()||n.currentValidInputs.some(({imageData:e})=>n.VBOBuildTime.getMTime()<e.getMTime())||n.scalarTextures.length!==n.currentValidInputs.length||!n.scalarTextures.every(e=>!!e?.getHandle())||!n.colorTexture?.getHandle()||!n.opacityTexture?.getHandle()||!n.labelOutlineThicknessTexture?.getHandle()||!n.jitterTexture?.getHandle(),e.buildBufferObjects=(r,i)=>{if(!n.jitterTexture.getHandle()){let e=new Float32Array(1024);for(let t=0;t<1024;++t)e[t]=Math.random();n.jitterTexture.setMinificationFilter(j.NEAREST),n.jitterTexture.setMagnificationFilter(j.NEAREST),n.jitterTexture.create2DFromRaw({width:32,height:32,numComps:1,dataType:N.FLOAT,data:e})}let a=i.getProperties(),o=a[n.currentValidInputs[0].inputIndex],s=n.numberOfComponents,l=n.useIndependentComponents,u=l?s:1,d=[];for(let e=0;e<u;++e)d.push(o.getScalarOpacity(e));let f=yt(d,l,u),p=o.getScalarOpacity(),m=n._openGLRenderWindow.getGraphicsResourceForObject(p);if(!m?.oglObject?.getHandle()||m.hash!==f){let t=y.newInstance();t.setOpenGLRenderWindow(n._openGLRenderWindow);let i=n.renderable.getOpacityTextureWidth();i<=0&&(i=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let a=i*2*u,s=new Float32Array(a),c=new Float32Array(i);for(let t=0;t<u;++t){let n=o.getScalarOpacity(t),a=e.getCurrentSampleDistance(r)/o.getScalarOpacityUnitDistance(t),l=n.getRange();n.getTable(l[0],l[1],i,c,1);for(let e=0;e<i;++e)s[t*i*2+e]=1-(1-c[e])**a,s[t*i*2+e+i]=s[t*i*2+e]}if(t.resetFormatAndType(),t.setMinificationFilter(j.LINEAR),t.setMagnificationFilter(j.LINEAR),n.context.getExtension(`OES_texture_float_linear`))t.create2DFromRaw({width:i,height:2*u,numComps:1,dataType:N.FLOAT,data:s});else{let e=new Uint8ClampedArray(a);for(let t=0;t<a;++t)e[t]=255*s[t];t.create2DFromRaw({width:i,height:2*u,numComps:1,dataType:N.UNSIGNED_CHAR,data:e})}p&&n._openGLRenderWindow.setGraphicsResourceForObject(p,t,f),n.opacityTexture=t}else n.opacityTexture=m.oglObject;c(n._openGLRenderWindow,n._opacityTextureCore,p),n._opacityTextureCore=p;let h=[];for(let e=0;e<u;++e)h.push(o.getRGBTransferFunction(e));let g=yt(h,l,u),_=o.getRGBTransferFunction(),v=n._openGLRenderWindow.getGraphicsResourceForObject(_);if(!v?.oglObject?.getHandle()||v?.hash!==g){let e=y.newInstance();e.setOpenGLRenderWindow(n._openGLRenderWindow);let t=n.renderable.getColorTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let r=t*2*u*3,i=new Uint8ClampedArray(r),a=new Float32Array(t*3);for(let e=0;e<u;++e){let n=o.getRGBTransferFunction(e),r=n.getRange();n.getTable(r[0],r[1],t,a,1);for(let n=0;n<t*3;++n)i[e*t*6+n]=255*a[n],i[e*t*6+n+t*3]=255*a[n]}e.resetFormatAndType(),e.setMinificationFilter(j.LINEAR),e.setMagnificationFilter(j.LINEAR),e.create2DFromRaw({width:t,height:2*u,numComps:3,dataType:N.UNSIGNED_CHAR,data:i}),n._openGLRenderWindow.setGraphicsResourceForObject(_,e,g),n.colorTexture=e}else n.colorTexture=v.oglObject;c(n._openGLRenderWindow,n._colorTextureCore,_),n._colorTextureCore=_,n.currentValidInputs.forEach(({imageData:e,inputIndex:t},r)=>{let i=a[t],o=e.getPointData().getScalars(),s=n._openGLRenderWindow.getGraphicsResourceForObject(o),l=bt(e,o),u=!s?.oglObject?.getHandle()||s?.hash!==l,d=i.getUpdatedExtents(),f=!!d.length;if(u&&!f){let t=y.newInstance();t.setOpenGLRenderWindow(n._openGLRenderWindow);let a=e.getDimensions();t.setOglNorm16Ext(n.context.getExtension(`EXT_texture_norm16`)),t.resetFormatAndType(),t.create3DFilterableFromDataArray({width:a[0],height:a[1],depth:a[2],dataArray:o,preferSizeOverAccuracy:i.getPreferSizeOverAccuracy()}),n._openGLRenderWindow.setGraphicsResourceForObject(o,t,l),n.scalarTextures[r]=t}else n.scalarTextures[r]=s.oglObject;if(f){i.setUpdatedExtents([]);let t=e.getDimensions();n.scalarTextures[r].create3DFilterableFromDataArray({width:t[0],height:t[1],depth:t[2],dataArray:o,updatedExtents:d})}c(n._openGLRenderWindow,n._scalarTexturesCore[r],o),n._scalarTexturesCore[r]=o});let b=o.getLabelOutlineThickness(),x=n._openGLRenderWindow.getGraphicsResourceForObject(b),S=b.join(`-`);if(!x?.oglObject?.getHandle()||x?.hash!==S){let e=y.newInstance();e.setOpenGLRenderWindow(n._openGLRenderWindow);let t=n.renderable.getLabelOutlineTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let r=t*1,i=new Uint8Array(r);for(let e=0;e<t;++e)i[e]=b[e]===void 0?b[0]:b[e];e.resetFormatAndType(),e.setMinificationFilter(j.NEAREST),e.setMagnificationFilter(j.NEAREST),e.create2DFromRaw({width:t,height:1,numComps:1,dataType:N.UNSIGNED_CHAR,data:i}),b&&n._openGLRenderWindow.setGraphicsResourceForObject(b,e,S),n.labelOutlineThicknessTexture=e}else n.labelOutlineThicknessTexture=x.oglObject;if(c(n._openGLRenderWindow,n._labelOutlineThicknessTextureCore,b),n._labelOutlineThicknessTextureCore=b,!n.tris.getCABO().getElementCount()){let e=new Float32Array(12);for(let t=0;t<4;t++)e[t*3]=t%2*2-1,e[t*3+1]=t>1?1:-1,e[t*3+2]=-1;let r=new Uint16Array(8);r[0]=3,r[1]=0,r[2]=1,r[3]=3,r[4]=3,r[5]=0,r[6]=3,r[7]=2;let i=R.newInstance({numberOfComponents:3,values:e});i.setName(`points`);let a=Oe.newInstance({values:r});n.tris.getCABO().createVBO(a,`polys`,t.SURFACE,{points:i,cellOffset:0,forceFlatten:!0})}n.VBOBuildTime.modified()}}var qn={context:null,VBOBuildTime:null,scalarTextures:[],_scalarTexturesCore:[],opacityTexture:null,_opacityTextureCore:null,colorTexture:null,_colorTextureCore:null,labelOutlineThicknessTexture:null,_labelOutlineThicknessTextureCore:null,jitterTexture:null,tris:null,framebuffer:null,copyShader:null,copyVAO:null,lastXYF:1,targetXYF:1,zBufferTexture:null,lastZBufferTexture:null,fullViewportTime:1,idxToView:null,vecISToVCMatrix:null,modelToView:null,projectionToView:null,avgWindowArea:0,avgFrameTime:0};function Jn(e,t,n={}){Object.assign(t,qn,n),Ge.extend(e,t,n),_.implementBuildShadersWithReplacements(e,t,n),t.VBOBuildTime={},k(t.VBOBuildTime,{mtime:0}),t.tris=h.newInstance(),t.jitterTexture=y.newInstance(),t.jitterTexture.setWrapS(de.REPEAT),t.jitterTexture.setWrapT(de.REPEAT),t.framebuffer=ut.newInstance(),c(e,t,[`context`]),Kn(e,t)}var Yn=be(Jn,`vtkOpenGLVolumeMapper`);Ye(`vtkVolumeMapper`,Yn);var G={MAX:0,MIN:1,AVERAGE:2},{vtkErrorMacro:Xn}=z;function Zn(e,n){n.classHierarchy.push(`vtkOpenGLImageCPRMapper`);function r(t){[n._scalars,n._colorTransferFunc,n._pwFunc].forEach(n=>t.unregisterGraphicsResourceUser(n,e))}e.buildPass=t=>{if(t){n.currentRenderPass=null,n.openGLImageSlice=e.getFirstAncestorOfType(`vtkOpenGLImageSlice`),n._openGLRenderer=e.getFirstAncestorOfType(`vtkOpenGLRenderer`);let t=n._openGLRenderWindow;n._openGLRenderWindow=n._openGLRenderer.getLastAncestorOfType(`vtkOpenGLRenderWindow`),t&&!t.isDeleted()&&t!==n._openGLRenderWindow&&r(t),n.context=n._openGLRenderWindow.getContext(),n.openGLCamera=n._openGLRenderer.getViewNodeFor(n._openGLRenderer.getRenderable().getActiveCamera(),n.openGLCamera),n.tris.setOpenGLRenderWindow(n._openGLRenderWindow)}},e.opaquePass=(t,r)=>{t&&(n.currentRenderPass=r,e.render())},e.opaqueZBufferPass=t=>{t&&(n.haveSeenDepthRequest=!0,n.renderDepth=!0,e.render(),n.renderDepth=!1)},e.getCoincidentParameters=(e,t)=>n.renderable.getResolveCoincidentTopology()===O.PolygonOffset?n.renderable.getCoincidentTopologyPolygonOffsetParameters():null,e.render=()=>{let t=n.openGLImageSlice.getRenderable(),r=n._openGLRenderer.getRenderable();e.renderPiece(r,t)},e.renderPiece=(t,r)=>{e.invokeEvent({type:`StartEvent`}),n.renderable.update(),e.invokeEvent({type:`EndEvent`}),n.renderable.preRenderCheck()&&(n.currentImageDataInput=n.renderable.getInputData(0),n.currentCenterlineInput=n.renderable.getOrientedCenterline(),e.renderPieceStart(t,r),e.renderPieceDraw(t,r),e.renderPieceFinish(t,r))},e.renderPieceStart=(t,n)=>{e.updateBufferObjects(t,n)},e.renderPieceDraw=(t,r)=>{let i=n.context;n.volumeTexture.activate(),n.colorTexture.activate(),n.pwfTexture.activate(),n.tris.getCABO().getElementCount()&&(e.updateShaders(n.tris,t,r),i.drawArrays(i.TRIANGLES,0,n.tris.getCABO().getElementCount()),n.tris.getVAO().release()),n.volumeTexture.deactivate(),n.colorTexture.deactivate(),n.pwfTexture.deactivate()},e.renderPieceFinish=(e,t)=>{},e.updateBufferObjects=(t,r)=>{e.getNeedToRebuildBufferObjects(t,r)&&e.buildBufferObjects(t,r),r.getProperty().getInterpolationType()===V.NEAREST?(n.volumeTexture.setMinificationFilter(j.NEAREST),n.volumeTexture.setMagnificationFilter(j.NEAREST),n.colorTexture.setMinificationFilter(j.NEAREST),n.colorTexture.setMagnificationFilter(j.NEAREST),n.pwfTexture.setMinificationFilter(j.NEAREST),n.pwfTexture.setMagnificationFilter(j.NEAREST)):(n.volumeTexture.setMinificationFilter(j.LINEAR),n.volumeTexture.setMagnificationFilter(j.LINEAR),n.colorTexture.setMinificationFilter(j.LINEAR),n.colorTexture.setMagnificationFilter(j.LINEAR),n.pwfTexture.setMinificationFilter(j.LINEAR),n.pwfTexture.setMagnificationFilter(j.LINEAR))},e.getNeedToRebuildBufferObjects=(t,r)=>{let i=n.VBOBuildTime.getMTime();return i<e.getMTime()||i<n.renderable.getMTime()||i<r.getMTime()||i<n.currentImageDataInput.getMTime()||i<n.currentCenterlineInput.getMTime()||!n.volumeTexture?.getHandle()},e.buildBufferObjects=(r,i)=>{let a=n.currentImageDataInput,o=n.currentCenterlineInput,s=i.getProperty(),c=a?.getPointData()?.getScalars();if(!c)return;let l=n._openGLRenderWindow.getGraphicsResourceForObject(c),u=bt(a,c),d=!l?.oglObject?.getHandle()||l?.hash!==u,f=s.getUpdatedExtents(),p=!!f.length;if(d){n.volumeTexture=y.newInstance(),n.volumeTexture.setOpenGLRenderWindow(n._openGLRenderWindow);let t=a.getDimensions();n.volumeTexture.setOglNorm16Ext(n.context.getExtension(`EXT_texture_norm16`)),n.volumeTexture.resetFormatAndType(),n.volumeTexture.create3DFilterableFromDataArray({width:t[0],height:t[1],depth:t[2],dataArray:c,preferSizeOverAccuracy:n.renderable.getPreferSizeOverAccuracy()}),n._openGLRenderWindow.setGraphicsResourceForObject(c,n.volumeTexture,u),c!==n._scalars&&(n._openGLRenderWindow.registerGraphicsResourceUser(c,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._scalars,e)),n._scalars=c}else n.volumeTexture=l.oglObject;if(p){s.setUpdatedExtents([]);let e=a.getDimensions();n.volumeTexture.create3DFilterableFromDataArray({width:e[0],height:e[1],depth:e[2],dataArray:c,updatedExtents:f})}let m=c.getNumberOfComponents(),h=i.getProperty(),g=h.getIndependentComponents(),_=g?m:1,v=g?2*_:1,b=[];for(let e=0;e<_;++e)b.push(h.getRGBTransferFunction(e));let x=yt(b,g,_),S=h.getRGBTransferFunction(),C=n._openGLRenderWindow.getGraphicsResourceForObject(S);if(!C?.oglObject?.getHandle()||C?.hash!==x){let t=n.renderable.getColorTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let r=t*v*3,i=new Uint8ClampedArray(r);if(n.colorTexture=y.newInstance(),n.colorTexture.setOpenGLRenderWindow(n._openGLRenderWindow),S){let e=new Float32Array(t*3);for(let n=0;n<_;n++){let r=h.getRGBTransferFunction(n),a=r.getRange();if(r.getTable(a[0],a[1],t,e,1),g)for(let r=0;r<t*3;r++)i[n*t*6+r]=255*e[r],i[n*t*6+r+t*3]=255*e[r];else for(let r=0;r<t*3;r++)i[n*t*6+r]=255*e[r]}n.colorTexture.resetFormatAndType(),n.colorTexture.create2DFromRaw({width:t,height:v,numComps:3,dataType:N.UNSIGNED_CHAR,data:i})}else{for(let e=0;e<t*3;++e)i[e]=255*e/((t-1)*3),i[e+1]=255*e/((t-1)*3),i[e+2]=255*e/((t-1)*3);n.colorTexture.resetFormatAndType(),n.colorTexture.create2DFromRaw({width:t,height:1,numComps:3,dataType:N.UNSIGNED_CHAR,data:i})}S&&(n._openGLRenderWindow.setGraphicsResourceForObject(S,n.colorTexture,x),S!==n._colorTransferFunc&&(n._openGLRenderWindow.registerGraphicsResourceUser(S,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._colorTransferFunc,e)),n._colorTransferFunc=S)}else n.colorTexture=C.oglObject;let w=[];for(let e=0;e<_;++e)w.push(h.getPiecewiseFunction(e));let T=yt(w,g,_),E=h.getPiecewiseFunction(),D=n._openGLRenderWindow.getGraphicsResourceForObject(E);if(!D?.oglObject?.getHandle()||D?.hash!==T){let t=n.renderable.getOpacityTextureWidth();t<=0&&(t=n.context.getParameter(n.context.MAX_TEXTURE_SIZE));let r=t*v,i=new Uint8ClampedArray(r);if(n.pwfTexture=y.newInstance(),n.pwfTexture.setOpenGLRenderWindow(n._openGLRenderWindow),E){let e=new Float32Array(r),i=new Float32Array(t);for(let n=0;n<_;++n){let r=h.getPiecewiseFunction(n);if(r===null)e.fill(1);else{let a=r.getRange();if(r.getTable(a[0],a[1],t,i,1),g)for(let r=0;r<t;r++)e[n*t*2+r]=i[r],e[n*t*2+r+t]=i[r];else for(let r=0;r<t;r++)e[n*t*2+r]=i[r]}}n.pwfTexture.resetFormatAndType(),n.pwfTexture.create2DFromRaw({width:t,height:v,numComps:1,dataType:N.FLOAT,data:e})}else i.fill(255),n.pwfTexture.resetFormatAndType(),n.pwfTexture.create2DFromRaw({width:t,height:1,numComps:1,dataType:N.UNSIGNED_CHAR,data:i});E&&(n._openGLRenderWindow.setGraphicsResourceForObject(E,n.pwfTexture,T),E!==n._pwFunc&&(n._openGLRenderWindow.registerGraphicsResourceUser(E,e),n._openGLRenderWindow.unregisterGraphicsResourceUser(n._pwFunc,e)),n._pwFunc=E)}else n.pwfTexture=D.oglObject;if(n.VBOBuildTime.getMTime()<n.renderable.getMTime()||n.VBOBuildTime.getMTime()<o.getMTime()){let e=o.getNumberOfPoints(),r=e<=1?0:e-1,i=o.getDistancesToFirstPoint(),a=n.renderable.getHeight(),s=4*r,c=new Float32Array(3*s),l=n.renderable.getWidth();for(let e=0,t=0;e<r;++e)c.set([0,a-i[e],0],t),t+=3,c.set([l,a-i[e],0],t),t+=3,c.set([l,a-i[e+1],0],t),t+=3,c.set([0,a-i[e+1],0],t),t+=3;let u=R.newInstance({numberOfComponents:3,values:c});u.setName(`points`);let d=new Uint16Array(5*r);for(let e=0,t=0,n=0;e<r;++e)d.set([4,n+3,n+2,n+1,n],t),t+=5,n+=4;let f=Oe.newInstance({values:d}),p=o.getPoints(),m=new Float32Array(3*s),h=[,,,],g=[,,,];for(let e=0,t=0;e<r;++e)p.getPoint(e,h),p.getPoint(e+1,g),m.set(h,t),t+=3,m.set(h,t),t+=3,m.set(g,t),t+=3,m.set(g,t),t+=3;let _=R.newInstance({numberOfComponents:3,values:m,name:`centerlinePosition`}),v=new Float32Array(s);for(let e=0,t=0;e<r;++e)v.set([0,1,3,2],t),t+=4;let y=[_,R.newInstance({numberOfComponents:1,values:v,name:`quadIndex`})];if(!n.renderable.getUseUniformOrientation()){let e=n.renderable.getOrientedCenterline().getOrientations()??[],t=new Float32Array(4*s),i=new Float32Array(4*s);for(let n=0;n<r;++n){let r=e[n],a=e[n+1];for(let e=0;e<4;++e){let o=4*(e+4*n);t.set(r,o),i.set(a,o)}}let a=R.newInstance({numberOfComponents:4,values:t,name:`centerlineTopOrientation`}),o=R.newInstance({numberOfComponents:4,values:i,name:`centerlineBotOrientation`});y.push(a,o)}n.tris.getCABO().createVBO(f,`polys`,t.SURFACE,{points:u,customAttributes:y,forceFlatten:!0}),n.VBOBuildTime.modified()}},e.getNeedToRebuildShaders=(e,t,r)=>{let i=n.volumeTexture.getComponents(),a=r.getProperty().getIndependentComponents(),o=!!n.renderable.getCenterPoint(),s=n.renderable.getUseUniformOrientation(),c=n.renderable.isProjectionEnabled()&&n.renderable.getProjectionMode();return e.getProgram()===0||n.lastUseCenterPoint!==o||n.lastUseUniformOrientation!==s||n.lastProjectionMode!==c||n.lastHaveSeenDepthRequest!==n.haveSeenDepthRequest||n.lastTextureComponents!==i||n.lastIndependentComponents!==a?(n.lastUseCenterPoint=o,n.lastUseUniformOrientation=s,n.lastProjectionMode=c,n.lastHaveSeenDepthRequest=n.haveSeenDepthRequest,n.lastTextureComponents=i,n.lastIndependentComponents=a,!0):!1},e.buildShaders=(t,n,r)=>{e.getShaderTemplate(t,n,r),e.replaceShaderValues(t,n,r)},e.replaceShaderValues=(t,r,i)=>{let a=t.Vertex,o=t.Fragment,s=[`vec3 applyQuaternionToVec(vec4 q, vec3 v) {`,`  float uvx = q.y * v.z - q.z * v.y;`,`  float uvy = q.z * v.x - q.x * v.z;`,`  float uvz = q.x * v.y - q.y * v.x;`,`  float uuvx = q.y * uvz - q.z * uvy;`,`  float uuvy = q.z * uvx - q.x * uvz;`,`  float uuvz = q.x * uvy - q.y * uvx;`,`  float w2 = q.w * 2.0;`,`  uvx *= w2;`,`  uvy *= w2;`,`  uvz *= w2;`,`  uuvx *= 2.0;`,`  uuvy *= 2.0;`,`  uuvz *= 2.0;`,`  return vec3(v.x + uvx + uuvx, v.y + uvy + uuvy, v.z + uvz + uuvz);`,`}`];a=I.substitute(a,`//VTK::Camera::Dec`,[`uniform mat4 MCPCMatrix;`]).result,a=I.substitute(a,`//VTK::PositionVC::Impl`,[`  gl_Position = MCPCMatrix * vertexMC;`]).result;let c=[`attribute vec3 centerlinePosition;`,`attribute float quadIndex;`,`uniform float width;`,`out vec2 quadOffsetVSOutput;`,`out vec3 centerlinePosVSOutput;`],l=n.renderable.isProjectionEnabled(),u=n.renderable.getUseUniformOrientation();u?(c.push(`out vec3 samplingDirVSOutput;`,`uniform vec4 centerlineOrientation;`,`uniform vec3 tangentDirection;`,...s),l&&c.push(`out vec3 projectionDirVSOutput;`,`uniform vec3 bitangentDirection;`)):c.push(`out vec4 centerlineTopOrientationVSOutput;`,`out vec4 centerlineBotOrientationVSOutput;`,`attribute vec4 centerlineTopOrientation;`,`attribute vec4 centerlineBotOrientation;`),a=I.substitute(a,`//VTK::Color::Dec`,c).result;let d=[`quadOffsetVSOutput = vec2(width * (mod(quadIndex, 2.0) == 0.0 ? -0.5 : 0.5), quadIndex > 1.0 ? 0.0 : 1.0);`,`centerlinePosVSOutput = centerlinePosition;`];u?(d.push(`samplingDirVSOutput = applyQuaternionToVec(centerlineOrientation, tangentDirection);`),l&&d.push(`projectionDirVSOutput = applyQuaternionToVec(centerlineOrientation, bitangentDirection);`)):d.push(`centerlineTopOrientationVSOutput = centerlineTopOrientation;`,`centerlineBotOrientationVSOutput = centerlineBotOrientation;`),a=I.substitute(a,`//VTK::Color::Impl`,d).result;let f=n.volumeTexture.getComponents(),p=i.getProperty().getIndependentComponents(),m=[`uniform mat4 MCTCMatrix; // Model coordinates to texture coordinates`,`in vec2 quadOffsetVSOutput;`,`in vec3 centerlinePosVSOutput;`,`uniform highp sampler3D volumeTexture;`,`uniform sampler2D colorTexture1;`,`uniform sampler2D pwfTexture1;`,`uniform float opacity;`,`uniform vec4 backgroundColor;`,`uniform float cshift0;`,`uniform float cscale0;`,`uniform float pwfshift0;`,`uniform float pwfscale0;`];l&&m.push(`uniform int projectionSlabNumberOfSamples;`,`uniform float projectionConstantOffset;`,`uniform float projectionStepLength;`),u?(m.push(`in vec3 samplingDirVSOutput;`),l&&m.push(`in vec3 projectionDirVSOutput;`)):(m.push(`uniform vec3 tangentDirection;`,`in vec4 centerlineTopOrientationVSOutput;`,`in vec4 centerlineBotOrientationVSOutput;`,...s),l&&m.push(`uniform vec3 bitangentDirection;`));let h=n.renderable.getCenterPoint();if(h&&m.push(`uniform vec3 globalCenterPoint;`),p){for(let e=1;e<f;e++)m=m.concat([`uniform float cshift${e};`,`uniform float cscale${e};`,`uniform float pwfshift${e};`,`uniform float pwfscale${e};`]);switch(f){case 1:m=m.concat([`uniform float mix0;`,`#define height0 0.5`]);break;case 2:m=m.concat([`uniform float mix0;`,`uniform float mix1;`,`#define height0 0.25`,`#define height1 0.75`]);break;case 3:m=m.concat([`uniform float mix0;`,`uniform float mix1;`,`uniform float mix2;`,`#define height0 0.17`,`#define height1 0.5`,`#define height2 0.83`]);break;case 4:m=m.concat([`uniform float mix0;`,`uniform float mix1;`,`uniform float mix2;`,`uniform float mix3;`,`#define height0 0.125`,`#define height1 0.375`,`#define height2 0.625`,`#define height3 0.875`]);break;default:Xn(`Unsupported number of independent coordinates.`)}}o=I.substitute(o,`//VTK::TCoord::Dec`,m).result;let g=[];if(u?(g.push(`vec3 samplingDirection = samplingDirVSOutput;`),l&&g.push(`vec3 projectionDirection = projectionDirVSOutput;`)):(g.push(`vec4 q0 = centerlineBotOrientationVSOutput;`,`vec4 q1 = centerlineTopOrientationVSOutput;`,`float qCosAngle = dot(q0, q1);`,`vec4 interpolatedOrientation;`,`if (qCosAngle > 0.999 || qCosAngle < -0.999) {`,`  // Use LERP instead of SLERP when the two quaternions are close or opposite`,`  interpolatedOrientation = normalize(mix(q0, q1, quadOffsetVSOutput.y));`,`} else {`,`  float omega = acos(qCosAngle);`,`  interpolatedOrientation = normalize(sin((1.0 - quadOffsetVSOutput.y) * omega) * q0 + sin(quadOffsetVSOutput.y * omega) * q1);`,`}`,`vec3 samplingDirection = applyQuaternionToVec(interpolatedOrientation, tangentDirection);`),l&&g.push(`vec3 projectionDirection = applyQuaternionToVec(interpolatedOrientation, bitangentDirection);`)),h?g.push(`float baseOffset = dot(samplingDirection, globalCenterPoint - centerlinePosVSOutput);`,`float horizontalOffset = quadOffsetVSOutput.x + baseOffset;`):g.push(`float horizontalOffset = quadOffsetVSOutput.x;`),g.push(`vec3 volumePosMC = centerlinePosVSOutput + horizontalOffset * samplingDirection;`,`vec3 volumePosTC = (MCTCMatrix * vec4(volumePosMC, 1.0)).xyz;`,`if (any(lessThan(volumePosTC, vec3(0.0))) || any(greaterThan(volumePosTC, vec3(1.0))))`,`{`,`  // set the background color and exit`,`  gl_FragData[0] = backgroundColor;`,`  return;`,`}`),l){let e=n.renderable.getProjectionMode();switch(e){case G.MIN:g.push(`const vec4 initialProjectionTextureValue = vec4(1.0);`);break;case G.MAX:case G.AVERAGE:default:g.push(`const vec4 initialProjectionTextureValue = vec4(0.0);`)}switch(g.push(`vec3 projectionScaledDirection = (MCTCMatrix * vec4(projectionDirection, 0.0)).xyz;`,`vec3 projectionStep = projectionStepLength * projectionScaledDirection;`,`vec3 projectionStartPosition = volumePosTC + projectionConstantOffset * projectionScaledDirection;`,`vec4 tvalue = initialProjectionTextureValue;`,`for (int projectionSampleIdx = 0; projectionSampleIdx < projectionSlabNumberOfSamples; ++projectionSampleIdx) {`,`  vec3 projectionSamplePosition = projectionStartPosition + float(projectionSampleIdx) * projectionStep;`,`  vec4 sampledTextureValue = texture(volumeTexture, projectionSamplePosition);`),e){case G.MAX:g.push(`  tvalue = max(tvalue, sampledTextureValue);`);break;case G.MIN:g.push(`  tvalue = min(tvalue, sampledTextureValue);`);break;case G.AVERAGE:default:g.push(`  tvalue = tvalue + sampledTextureValue;`)}g.push(`}`),e===G.AVERAGE&&g.push(`tvalue = tvalue / float(projectionSlabNumberOfSamples);`)}else g.push(`vec4 tvalue = texture(volumeTexture, volumePosTC);`);if(p){let e=[`r`,`g`,`b`,`a`];for(let t=0;t<f;++t)g=g.concat([`vec3 tcolor${t} = mix${t} * texture2D(colorTexture1, vec2(tvalue.${e[t]} * cscale${t} + cshift${t}, height${t})).rgb;`,`float compWeight${t} = mix${t} * texture2D(pwfTexture1, vec2(tvalue.${e[t]} * pwfscale${t} + pwfshift${t}, height${t})).r;`]);switch(f){case 1:g=g.concat([`gl_FragData[0] = vec4(tcolor0.rgb, compWeight0 * opacity);`]);break;case 2:g=g.concat([`float weightSum = compWeight0 + compWeight1;`,`gl_FragData[0] = vec4(vec3((tcolor0.rgb * (compWeight0 / weightSum)) + (tcolor1.rgb * (compWeight1 / weightSum))), opacity);`]);break;case 3:g=g.concat([`float weightSum = compWeight0 + compWeight1 + compWeight2;`,`gl_FragData[0] = vec4(vec3((tcolor0.rgb * (compWeight0 / weightSum)) + (tcolor1.rgb * (compWeight1 / weightSum)) + (tcolor2.rgb * (compWeight2 / weightSum))), opacity);`]);break;case 4:g=g.concat([`float weightSum = compWeight0 + compWeight1 + compWeight2 + compWeight3;`,`gl_FragData[0] = vec4(vec3((tcolor0.rgb * (compWeight0 / weightSum)) + (tcolor1.rgb * (compWeight1 / weightSum)) + (tcolor2.rgb * (compWeight2 / weightSum)) + (tcolor3.rgb * (compWeight3 / weightSum))), opacity);`]);break;default:Xn(`Unsupported number of independent coordinates.`)}}else switch(f){case 1:g=g.concat([`// Dependent components`,`float intensity = tvalue.r;`,`vec3 tcolor = texture2D(colorTexture1, vec2(intensity * cscale0 + cshift0, 0.5)).rgb;`,`float scalarOpacity = texture2D(pwfTexture1, vec2(intensity * pwfscale0 + pwfshift0, 0.5)).r;`,`gl_FragData[0] = vec4(tcolor, scalarOpacity * opacity);`]);break;case 2:g=g.concat([`float intensity = tvalue.r*cscale0 + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(intensity, 0.5)).rgb, pwfscale0*tvalue.g + pwfshift0);`]);break;case 3:g=g.concat([`vec4 tcolor = cscale0*tvalue + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(tcolor.r,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.g,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.b,0.5)).r, opacity);`]);break;default:g=g.concat([`vec4 tcolor = cscale0*tvalue + cshift0;`,`gl_FragData[0] = vec4(texture2D(colorTexture1, vec2(tcolor.r,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.g,0.5)).r,`,`  texture2D(colorTexture1, vec2(tcolor.b,0.5)).r, tcolor.a);`])}o=I.substitute(o,`//VTK::TCoord::Impl`,g).result,n.haveSeenDepthRequest&&(o=I.substitute(o,`//VTK::ZBuffer::Dec`,`uniform int depthRequest;`).result,o=I.substitute(o,`//VTK::ZBuffer::Impl`,[`if (depthRequest == 1) {`,`float iz = floor(gl_FragCoord.z*65535.0 + 0.1);`,`float rf = floor(iz/256.0)/255.0;`,`float gf = mod(iz,256.0)/255.0;`,`gl_FragData[0] = vec4(rf, gf, 0.0, 1.0); }`]).result),t.Vertex=a,t.Fragment=o,e.replaceShaderClip(t,r,i),e.replaceShaderCoincidentOffset(t,r,i)},e.replaceShaderClip=(e,t,r)=>{let i=e.Vertex,a=e.Fragment;if(n.renderable.getNumberOfClippingPlanes()){let e=n.renderable.getNumberOfClippingPlanes();e>6&&(z.vtkErrorMacro(`OpenGL has a limit of 6 clipping planes`),e=6),i=I.substitute(i,`//VTK::Clip::Dec`,[`uniform int numClipPlanes;`,`uniform vec4 clipPlanes[6];`,`varying float clipDistancesVSOutput[6];`]).result,i=I.substitute(i,`//VTK::Clip::Impl`,[`for (int planeNum = 0; planeNum < 6; planeNum++)`,`    {`,`    if (planeNum >= numClipPlanes)`,`        {`,`        break;`,`        }`,`    clipDistancesVSOutput[planeNum] = dot(clipPlanes[planeNum], vertexMC);`,`    }`]).result,a=I.substitute(a,`//VTK::Clip::Dec`,[`uniform int numClipPlanes;`,`varying float clipDistancesVSOutput[6];`]).result,a=I.substitute(a,`//VTK::Clip::Impl`,[`for (int planeNum = 0; planeNum < 6; planeNum++)`,`    {`,`    if (planeNum >= numClipPlanes)`,`        {`,`        break;`,`        }`,`    if (clipDistancesVSOutput[planeNum] < 0.0) discard;`,`    }`]).result}e.Vertex=i,e.Fragment=a},e.getShaderTemplate=(e,t,n)=>{e.Vertex=le,e.Fragment=oe,e.Geometry=``},e.setMapperShaderParameters=(t,r,a)=>{let s=t.getProgram(),c=t.getCABO();c.getElementCount()&&(n.VBOBuildTime.getMTime()>t.getAttributeUpdateTime().getMTime()||t.getShaderSourceTime().getMTime()>t.getAttributeUpdateTime().getMTime())&&(s.isAttributeUsed(`vertexMC`)&&(t.getVAO().addAttributeArray(s,c,`vertexMC`,c.getVertexOffset(),c.getStride(),n.context.FLOAT,3,n.context.FALSE)||Xn(`Error setting vertexMC in shader VAO.`)),t.getCABO().getCustomData().forEach(e=>{e&&s.isAttributeUsed(e.name)&&!t.getVAO().addAttributeArray(s,c,e.name,e.offset,c.getStride(),n.context.FLOAT,e.components,n.context.FALSE)&&Xn(`Error setting ${e.name} in shader VAO.`)}),t.getAttributeUpdateTime().modified());let l=n.volumeTexture.getTextureUnit();if(s.setUniformi(`volumeTexture`,l),s.setUniformf(`width`,n.renderable.getWidth()),t.getProgram().setUniform4fv(`backgroundColor`,n.renderable.getBackgroundColor()),s.isUniformUsed(`tangentDirection`)){let e=n.renderable.getTangentDirection();t.getProgram().setUniform3fArray(`tangentDirection`,e)}if(s.isUniformUsed(`bitangentDirection`)){let e=n.renderable.getBitangentDirection();t.getProgram().setUniform3fArray(`bitangentDirection`,e)}if(s.isUniformUsed(`centerlineOrientation`)){let e=n.renderable.getUniformOrientation();t.getProgram().setUniform4fv(`centerlineOrientation`,e)}if(s.isUniformUsed(`globalCenterPoint`)){let e=n.renderable.getCenterPoint();s.setUniform3fArray(`globalCenterPoint`,e)}if(n.renderable.isProjectionEnabled()){let e=n.renderable.getProjectionSlabThickness(),t=n.renderable.getProjectionSlabNumberOfSamples();s.setUniformi(`projectionSlabNumberOfSamples`,t);let r=-.5*e;s.setUniformf(`projectionConstantOffset`,r);let i=e/(t-1);s.setUniformf(`projectionStepLength`,i)}let u=n.currentImageDataInput,d=u.getWorldToIndex(),f=ue(new Float32Array(16),i([],u.getDimensions())),p=fe(f,f,d);if(s.setUniformMatrix(`MCTCMatrix`,p),n.haveSeenDepthRequest&&t.getProgram().setUniformi(`depthRequest`,+!!n.renderDepth),n.renderable.getNumberOfClippingPlanes()){let e=n.renderable.getNumberOfClippingPlanes();e>6&&(z.vtkErrorMacro(`OpenGL has a limit of 6 clipping planes`),e=6);let t=c.getCoordShiftAndScaleEnabled()?c.getInverseShiftAndScaleMatrix():null,r=t?o(n.imagematinv,a.getMatrix()):a.getMatrix();t&&(P(r,r),M(r,r,t),P(r,r)),P(n.imagemat,n.currentImageDataInput.getIndexToWorld()),M(n.imagematinv,r,n.imagemat);let i=[];for(let t=0;t<e;t++){let e=[];n.renderable.getClippingPlaneInDataCoords(n.imagematinv,t,e);for(let t=0;t<4;t++)i.push(e[t])}s.setUniformi(`numClipPlanes`,e),s.setUniform4fv(`clipPlanes`,i)}if(s.isUniformUsed(`coffset`)){let t=e.getCoincidentParameters(r,a);s.setUniformf(`coffset`,t.offset),s.isUniformUsed(`cfactor`)&&s.setUniformf(`cfactor`,t.factor)}},e.setCameraShaderParameters=(e,t,r)=>{let i=n.openGLImageSlice.getKeyMatrices().mcwc,a=n.openGLCamera.getKeyMatrices(t).wcpc;if(M(n.imagemat,a,i),e.getCABO().getCoordShiftAndScaleEnabled()){let t=e.getCABO().getInverseShiftAndScaleMatrix();M(n.imagemat,n.imagemat,t)}e.getProgram().setUniformMatrix(`MCPCMatrix`,n.imagemat)},e.setPropertyShaderParameters=(e,t,r)=>{let i=e.getProgram(),a=r.getProperty(),o=a.getOpacity();i.setUniformf(`opacity`,o);let s=n.volumeTexture.getComponents(),c=a.getIndependentComponents();if(c)for(let e=0;e<s;++e)i.setUniformf(`mix${e}`,a.getComponentWeight(e));let l=n.volumeTexture.getVolumeInfo();for(let e=0;e<s;e++){let t=a.getColorWindow(),n=a.getColorLevel(),r=c?e:0,o=a.getRGBTransferFunction(r);if(o&&a.getUseLookupTableScalarRange()){let e=o.getRange();t=e[1]-e[0],n=.5*(e[1]+e[0])}let s=l.scale[e]/t,u=(l.offset[e]-n)/t+.5;i.setUniformf(`cshift${e}`,u),i.setUniformf(`cscale${e}`,s)}let u=n.colorTexture.getTextureUnit();i.setUniformi(`colorTexture1`,u);for(let e=0;e<s;e++){let t=1,n=0,r=c?e:0,o=a.getPiecewiseFunction(r);if(o){let r=o.getRange(),i=r[1]-r[0],a=.5*(r[0]+r[1]);t=l.scale[e]/i,n=(l.offset[e]-a)/i+.5}i.setUniformf(`pwfshift${e}`,n),i.setUniformf(`pwfscale${e}`,t)}let d=n.pwfTexture.getTextureUnit();i.setUniformi(`pwfTexture1`,d)},e.updateShaders=(t,r,i)=>{if(e.getNeedToRebuildShaders(t,r,i)){let a={Vertex:null,Fragment:null,Geometry:null};e.buildShaders(a,r,i);let o=n._openGLRenderWindow.getShaderCache().readyShaderProgramArray(a.Vertex,a.Fragment,a.Geometry);o!==t.getProgram()&&(t.setProgram(o),t.getVAO().releaseGraphicsResources()),t.getShaderSourceTime().modified()}else n._openGLRenderWindow.getShaderCache().readyShaderProgram(t.getProgram());t.getVAO().bind(),e.setMapperShaderParameters(t,r,i),e.setCameraShaderParameters(t,r,i),e.setPropertyShaderParameters(t,r,i)},e.delete=z.chain(()=>{n._openGLRenderWindow&&r(n._openGLRenderWindow)},e.delete)}var Qn={currentRenderPass:null,volumeTexture:null,colorTexture:null,pwfTexture:null,tris:null,lastHaveSeenDepthRequest:!1,haveSeenDepthRequest:!1,lastTextureComponents:0,lastIndependentComponents:0,imagemat:null,imagematinv:null};function $n(e,t,n={}){Object.assign(t,Qn,n),Ge.extend(e,t,n),_.implementReplaceShaderCoincidentOffset(e,t,n),z.algo(e,t,2,0),t.tris=h.newInstance(),t.volumeTexture=null,t.colorTexture=null,t.pwfTexture=null,t.imagemat=L(new Float64Array(16)),t.imagematinv=L(new Float64Array(16)),t.VBOBuildTime={},z.obj(t.VBOBuildTime,{mtime:0}),Zn(e,t)}var er=z.newInstance($n,`vtkOpenGLImageCPRMapper`);Ye(`vtkImageCPRMapper`,er);var K={SINGLE:`single`,DEPENDENT_LA:`dependent-la`,DEPENDENT_RGB:`dependent-rgb`,DEPENDENT_RGBA:`dependent-rgba`,INDEPENDENT_1:`independent-1`,INDEPENDENT_2:`independent-2`,INDEPENDENT_3:`independent-3`,INDEPENDENT_4:`independent-4`},q={IMAGE:0,COLOR_LUT:1,OPACITY_LUT:2,LABEL_OUTLINE_THICKNESS:3,LABEL_OUTLINE_OPACITY:4};function tr(e,t){let n=e?.getSampler?.();if(!n)return!1;let r=n.getOptions();return r.minFilter===t.minFilter&&r.magFilter===t.magFilter&&r.mipmapFilter===(t.mipmapFilter??`nearest`)&&r.addressModeU===(t.addressModeU??`clamp-to-edge`)&&r.addressModeV===(t.addressModeV??`clamp-to-edge`)&&r.addressModeW===(t.addressModeW??`clamp-to-edge`)}function nr(e,t){if(e)switch(t){case 1:return K.INDEPENDENT_1;case 2:return K.INDEPENDENT_2;case 3:return K.INDEPENDENT_3;default:return K.INDEPENDENT_4}switch(t){case 1:return K.SINGLE;case 2:return K.DEPENDENT_LA;case 3:return K.DEPENDENT_RGB;default:return K.DEPENDENT_RGBA}}function J(e,t=`tfunRows`){return`${2*e+.5} / ${t}`}function rr(e,t,n){return e.getUseLabelOutline()&&!t&&n===1}function ir(e,t,n,r={}){let i=[r.label??`tfun`,r.rowLength??0,n];for(let r=0;r<n;r++){let n=t.call(e,r);n?i.push(`${n.getMTime()}:${n.getRange().join(`,`)}`):i.push(`none`)}return i.join(`-`)}var{vtkErrorMacro:ar}=pt,{VtkDataTypes:or}=R,{SlicingMode:sr}=_t,cr=`
//VTK::Renderer::Dec

//VTK::Mapper::Dec

//VTK::TCoord::Dec

//VTK::Image::Dec

//VTK::Clip::Dec

//VTK::RenderEncoder::Dec

//VTK::IOStructs::Dec

@fragment
fn main(
//VTK::IOStructs::Input
)
//VTK::IOStructs::Output
{
  var output: fragmentOutput;

  //VTK::Clip::Impl

  //VTK::Select::Impl

  //VTK::Image::Sample

  // var computedColor: vec4<f32> = vec4<f32>(1.0,0.7, 0.5, 1.0);

  //VTK::Position::Impl

//VTK::RenderEncoder::Impl

  return output;
}
`,Y=new Float64Array(16),X=new Float64Array(16),lr=new Float64Array(16),ur=new Float64Array(3),dr=new Float64Array(3),fr=new Float64Array(4),Z=new Float64Array(4);function pr(e,t){t.classHierarchy.push(`vtkWebGPUImageMapper`),e.ensureTextureSampler=(e,n)=>{e&&!tr(e,n)&&e.addSampler(t.device,n)},e.computeImageState=()=>{let n=t.WebGPUImageSlice.getRenderable().getProperty(),r=e.getTextureViews()[q.IMAGE]?.getTexture().getNumberOfComponents()??1,i=n.getIndependentComponents();return{actorProperty:n,numberOfComponents:r,independentComponents:i,numberOfIComponents:i?r:1,useLabelOutline:rr(n,i,r),textureChannelMode:nr(i,r)}},e.getImageState=()=>t.imageState??e.computeImageState(),e.useImageMipmaps=()=>{let e=t.currentInput?.getPointData?.()?.getScalars?.();if(!e)return!1;let n=t.WebGPUImageSlice.getRenderable().getProperty();return t.currentInput.getDimensions()[2]===1&&e.getNumberOfComponents()===4&&e.getDataType()===or.UNSIGNED_CHAR&&!n.getIndependentComponents()&&n.getInterpolationType()!==V.NEAREST},e.buildPass=n=>{if(n){let{parent:n,renderer:r,renderWindow:i,device:a}=He(e,`vtkWebGPUImageSlice`);t.WebGPUImageSlice=n,t.WebGPURenderer=r,t.WebGPURenderWindow=i,t.device=a;let o=t.WebGPURenderer.getRenderable();t.renderable.isA(`vtkImageMapper`)&&t.renderable.getSliceAtFocalPoint()&&t.renderable.setSliceFromCamera(o.getActiveCamera())}},e.translucentPass=t=>{t&&e.render()},e.zBufferPass=t=>{t&&e.render()},e.opaqueZBufferPass=t=>e.zBufferPass(t),e.opaquePass=t=>{t&&e.render()},e.render=()=>{if(t.renderable.update(),t.currentInput=t.renderable.getCurrentImage(),!t.currentInput){ar(`No input!`);return}e.prepareToDraw(t.WebGPURenderer.getRenderEncoder()),t.renderEncoder.registerDrawCallback(t.pipeline,e.draw)},e.getCoincidentParameters=()=>t.renderable.getResolveCoincidentTopology()==O.PolygonOffset?t.renderable.getCoincidentTopologyPolygonOffsetParameters():{factor:0,offset:0},e.computePipelineHash=()=>{let n=t.currentInput.getExtent(),r=e.getImageState();n[0]===n[1]||n[2]===n[3]||n[4]===n[5]?(t.dimensions=2,t.pipelineHash=`img2`):(t.dimensions=3,t.pipelineHash=`img3`),t.pipelineHash+=r.textureChannelMode,r.useLabelOutline&&(t.pipelineHash+=`outline`),e.useImageMipmaps()&&(t.pipelineHash+=`mip`),t.pipelineHash+=t.renderEncoder.getPipelineHash()},e.updateUBO=()=>{let n=t.UBO.getSendTime(),r=t.WebGPUImageSlice.getRenderable(),i=r.getMapper(),a=t.WebGPUImageSlice.getPropID(),o=t.WebGPURenderer.getSelector(),s=a;o?.getPropIDForSelection&&(s=o.getPropIDForSelection(a,r)+1),t.UBO.setValue(`PropID`,s);let c=t.renderable.getClippingPlanesMTime();if(e.getMTime()>n||t.renderable.getMTime()>n||r.getProperty().getMTime()>n||c>n){let n=i.getCurrentImage(),a=t.WebGPURenderer.getStabilizedCenterByReference();L(Y),Qe(Y,Y,a);let o=r.getMatrix();P(X,o),b(X,X),M(Y,X,Y);let s=n.getWorldToIndex();M(Y,s,Y),b(lr,Y),ur[0]=.5,ur[1]=.5,ur[2]=.5,g(X,ur),M(Y,X,Y);let c=n.getDimensions();L(X),dr[0]=1/c[0],dr[1]=1/c[1],dr[2]=1/c[2],Ke(X,X,dr),M(Y,X,Y),t.UBO.setArray(`SCTCMatrix`,Y);let u=t.currentInput.getExtent(),{ijkMode:d}=t.renderable.getClosestIJKAxis(),f;t.renderable.isA(`vtkImageArrayMapper`)?f=t.renderable.getSubSlice()??0:(f=t.renderable.getSlice(),d!==t.renderable.getSlicingMode()&&(f=t.renderable.getSliceAtPosition(f)));let p=2,m=0,h=1;d===sr.I?(p=0,m=1,h=2):d===sr.J&&(p=1,m=2,h=0),fr[p]=f,fr[m]=u[m*2]-.5,fr[h]=u[h*2]-.5,fr[3]=1,lt(fr,fr,lr),t.UBO.setArray(`Origin`,fr),Z[p]=f,Z[m]=u[m*2+1]+.5,Z[h]=u[h*2]-.5,Z[3]=1,lt(Z,Z,lr),l(Z,Z,fr),Z[3]=1,t.UBO.setArray(`Axis1`,Z),Z[p]=f,Z[m]=u[m*2]-.5,Z[h]=u[h*2+1]+.5,Z[3]=1,lt(Z,Z,lr),l(Z,Z,fr),Z[3]=1,t.UBO.setArray(`Axis2`,Z);let{cScale:_,cShift:v,oScale:y,oShift:x,componentWeight:S}=t;_[0]=1,_[1]=1,_[2]=1,_[3]=1,v[0]=0,v[1]=0,v[2]=0,v[3]=0,y[0]=1,y[1]=1,y[2]=1,y[3]=1,x[0]=0,x[1]=0,x[2]=0,x[3]=0,S[0]=1,S[1]=1,S[2]=1,S[3]=1;let C=t.textureViews[0].getTexture().getScale(),{numberOfComponents:w,independentComponents:T}=e.getImageState(),E=r.getProperty();for(let e=0;e<w;e++){let t=E.getColorWindow(),n=E.getColorLevel(),r=T?e:0,i=E.getRGBTransferFunction(r);if(i&&E.getUseLookupTableScalarRange()){let e=i.getRange();t=e[1]-e[0],n=.5*(e[1]+e[0])}_[e]=C/t,v[e]=-n/t+.5;let a=1,o=0,s=E.getPiecewiseFunction(r);if(s){let e=s.getRange(),t=e[1]-e[0],n=.5*(e[0]+e[1]);a=C/t,o=-n/t+.5}y[e]=a,x[e]=o,S[e]=E.getComponentWeight(e)}t.UBO.setArray(`cScale`,_),t.UBO.setArray(`cShift`,v),t.UBO.setArray(`oScale`,y),t.UBO.setArray(`oShift`,x),t.UBO.setArray(`componentWeight`,S),t.UBO.setValue(`Opacity`,E.getOpacity());let D=e.getCoincidentParameters();t.UBO.setValue(`CoincidentFactor`,D.factor),t.UBO.setValue(`CoincidentOffset`,D.offset),t.UBO.setValue(`NumClipPlanes`,0);let ee=t.renderable.getClippingPlanes().length;if(t.UBO.setValue(`NumClipPlanes`,ee),ee>0){g(X,[-a[0],-a[1],-a[2]]),ke(t.renderable,X,t.clipPlanes);for(let e=0;e<ee;e++)t.UBO.setArray(`ClipPlane${e}`,t.clipPlanes[e])}}t.UBO.sendIfNeeded(t.device)},e.updateLUTImage=()=>{let n=e.getImageState(),{actorProperty:r}=n,i=n.numberOfIComponents,a=ir(r,r.getRGBTransferFunction,i,{label:`imageColorLUT`,rowLength:t.rowLength});if(t.colorTextureString!==a){t.numRows=i;let n=t.numRows*2*t.rowLength*4;(!t.colorLUTArray||t.colorLUTArray.length!==n)&&(t.colorLUTArray=new Uint8ClampedArray(n));let o=t.colorLUTArray,s=r.getRGBTransferFunction();if(s){let e=t.colorTmpTable;for(let n=0;n<i;n++){s=r.getRGBTransferFunction(n);let i=s.getRange();s.getTable(i[0],i[1],t.rowLength,e,1);for(let r=0;r<t.rowLength;r++){let i=n*t.rowLength*8+r*4;o[i]=255*e[r*3],o[i+1]=255*e[r*3+1],o[i+2]=255*e[r*3+2],o[i+3]=255;for(let e=0;e<4;e++)o[i+t.rowLength*4+e]=o[i+e]}}}else for(let e=0;e<i;e++){let n=e*t.rowLength*8;for(let e=0;e<t.rowLength;++e){let r=255*e/(t.rowLength-1),i=n+e*4;o[i]=r,o[i+1]=r,o[i+2]=r,o[i+3]=255;for(let e=0;e<4;e++)o[i+t.rowLength*4+e]=o[i+e]}}{let n={hash:a,nativeArray:o,width:t.rowLength,height:t.numRows*2,depth:1,format:`rgba8unorm`},r=t.device.getTextureManager().getTexture(n).createView(`tfunTexture`);e.ensureTextureSampler(r,{minFilter:`linear`,magFilter:`linear`}),t.textureViews[q.COLOR_LUT]=r}t.colorTextureString=a}},e.updateOpacityLUTImage=()=>{let n=e.getImageState(),{actorProperty:r}=n,i=n.numberOfIComponents;t.numRows=i;let a=ir(r,r.getPiecewiseFunction,i,{label:`imageOpacityLUT`,rowLength:t.rowLength});if(t.opacityTextureString!==a){let n=t.numRows*2*t.rowLength;(!t.opacityLUTArray||t.opacityLUTArray.length!==n)&&(t.opacityLUTArray=new Float32Array(n));let o=t.opacityLUTArray,s=t.opacityTmpTable;for(let e=0;e<i;e++){let n=r.getPiecewiseFunction(e);if(!n){let n=e*t.rowLength*2;o.fill(1,n,n+t.rowLength*2);continue}let i=n.getRange();n.getTable(i[0],i[1],t.rowLength,s,1);let a=e*t.rowLength*2;for(let e=0;e<t.rowLength;e++)o[a+e]=s[e],o[a+t.rowLength+e]=s[e]}let c={hash:a,nativeArray:o,width:t.rowLength,height:t.numRows*2,depth:1,format:`r16float`},l=t.device.getTextureManager().getTexture(c).createView(`ofunTexture`);e.ensureTextureSampler(l,{minFilter:`linear`,magFilter:`linear`}),t.textureViews[q.OPACITY_LUT]=l,t.opacityTextureString=a}},e.updateLabelOutlineThicknessTexture=()=>{let n=t.WebGPUImageSlice.getRenderable().getProperty().getLabelOutlineThicknessByReference(),r=Math.max(1,t.renderable.getLabelOutlineTextureWidth()),i=`${n.join(`-`)}-${r}`;if(t.labelOutlineThicknessString!==i){let a=new Uint8Array(r);for(let e=0;e<r;++e)a[e]=n[e]===void 0?n[0]:n[e];let o={hash:`imageOutlineThickness-${i}`,nativeArray:a,width:r,height:1,depth:1,format:`r8unorm`},s=t.device.getTextureManager().getTexture(o).createView(`labelOutlineTexture`);e.ensureTextureSampler(s,{minFilter:`nearest`,magFilter:`nearest`}),t.textureViews[q.LABEL_OUTLINE_THICKNESS]=s,t.labelOutlineThicknessString=i}},e.updateLabelOutlineOpacityTexture=()=>{let n=t.WebGPUImageSlice.getRenderable().getProperty().getLabelOutlineOpacity(),r=Array.isArray(n)?n:[n],i=Math.max(1,t.renderable.getLabelOutlineTextureWidth()),a=`${r.join(`-`)}-${i}`;if(t.labelOutlineOpacityString!==a){let n=new Float32Array(i);for(let e=0;e<i;++e)n[e]=r[e]??r[0];let o={hash:`imageOutlineOpacity-${a}`,nativeArray:n,width:i,height:1,depth:1,format:`r16float`},s=t.device.getTextureManager().getTexture(o).createView(`labelOutlineOpacityTexture`);e.ensureTextureSampler(s,{minFilter:`nearest`,magFilter:`nearest`}),t.textureViews[q.LABEL_OUTLINE_OPACITY]=s,t.labelOutlineOpacityString=a}};let n=e.updateBuffers;e.updateBuffers=()=>{n();let r=t.textureViews,i=t.WebGPUImageSlice.getRenderable().getProperty(),a=i?.getUpdatedExtents?.()??[],o=r[q.IMAGE]?.getTexture(),s=!!t.renderable.getPreferSizeOverAccuracy?.(),c=t.device.getTextureManager().getTextureForImageData(t.currentInput,{updatedExtents:a,existingTexture:o,preferSizeOverAccuracy:s,generateMipmaps:e.useImageMipmaps()});if(a.length&&i.setUpdatedExtents([]),!r[q.IMAGE]||r[q.IMAGE].getTexture()!==c){let t=c.createView(`imgTexture`);e.ensureTextureSampler(t,{minFilter:`linear`,magFilter:`linear`}),r[q.IMAGE]=t}t.imageState=e.computeImageState(),e.updateLUTImage(),e.updateOpacityLUTImage(),t.imageState.useLabelOutline?(e.updateLabelOutlineThicknessTexture(),e.updateLabelOutlineOpacityTexture()):t.textureViews.length=Math.min(t.textureViews.length,q.OPACITY_LUT+1),e.updateUBO();let l=t.WebGPUImageSlice.getRenderable().getProperty().getInterpolationType()===V.NEAREST?`nearest`:`linear`;e.ensureTextureSampler(r[q.IMAGE],{minFilter:l,magFilter:l,mipmapFilter:e.useImageMipmaps()?`linear`:`nearest`})};let r=e.getShaderReplacements();e.replaceShaderPosition=(e,n,r)=>{let i=n.getShaderDescription(`vertex`);i.addBuiltinOutput(`vec4<f32>`,`@builtin(position) Position`),i.addOutput(`vec4<f32>`,`vertexSC`);let a=i.getCode(),o=[`var pos: vec4<f32> = mapperUBO.Origin +`,`   (vertexBC.x * 0.5 + 0.5) * mapperUBO.Axis1 + (vertexBC.y * 0.5 + 0.5) * mapperUBO.Axis2;`,`pos.w = 1.0;`];t.dimensions===2?o.push(`var tcoord : vec2<f32> = (mapperUBO.SCTCMatrix * pos).xy;`):o.push(`var tcoord : vec3<f32> = (mapperUBO.SCTCMatrix * pos).xyz;`),o.push(`output.vertexSC = pos;`,`pos = rendererUBO.SCPCMatrix * pos;`,`pos.z = clamp(pos.z - 0.000016 * mapperUBO.CoincidentOffset * pos.w, 0.0, pos.w);`,`output.tcoordVS = tcoord;`,`output.Position = pos;`),a=B.substitute(a,`//VTK::Position::Impl`,o).result,i.setCode(a)},r.set(`replaceShaderPosition`,e.replaceShaderPosition),e.replaceShaderTCoord=(e,n,r)=>{let i=n.getShaderDescription(`vertex`),a=t.dimensions===2?`vec2<f32>`:`vec3<f32>`;i.addOutput(a,`tcoordVS`)},r.set(`replaceShaderTCoord`,e.replaceShaderTCoord),e.replaceShaderImage=(n,r,i)=>{let a=r.getShaderDescription(`fragment`),o=a.getCode(),s=e.getImageState(),c=e.useImageMipmaps()?`textureSample(imgTexture, imgTextureSampler, input.tcoordVS)`:`textureSampleLevel(imgTexture, imgTextureSampler, input.tcoordVS, 0.0)`;switch(o=B.substitute(o,`//VTK::Image::Sample`,[`    var computedColor: vec4<f32> =`,`      ${c};`,`//VTK::Image::Sample`]).result,s.textureChannelMode){case K.SINGLE:if(s.useLabelOutline){let e=t.dimensions===3?`vec3<f32>`:`vec2<f32>`,n=[`    let centerCoord: ${e} = input.tcoordVS;`,`    let stepX: ${e} = dpdx(input.tcoordVS);`,`    let stepY: ${e} = dpdy(input.tcoordVS);`,`    let clampMin: ${e} = ${e}(0.0);`,`    let clampMax: ${e} = ${e}(1.0);`];o=B.substitute(o,`//VTK::Image::Sample`,[...n,`    let centerValue: f32 = textureSampleLevel(`,`      imgTexture,`,`      imgTextureSampler,`,`      centerCoord,`,`      0.0).r;`,`    let segmentIndex: i32 = i32(round(centerValue * 255.0));`,`    if (segmentIndex == 0) {`,`      computedColor = vec4<f32>(0.0);`,`    } else {`,`      let colorCoord: vec2<f32> = vec2<f32>(`,`        centerValue * mapperUBO.cScale.r + mapperUBO.cShift.r,`,`        0.5);`,`      let tColor: vec4<f32> =`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`,`      let opacityCoord: vec2<f32> = vec2<f32>(`,`        centerValue * mapperUBO.oScale.r + mapperUBO.oShift.r,`,`        0.5);`,`      let scalarOpacity: f32 =`,`        textureSampleLevel(ofunTexture, ofunTextureSampler, opacityCoord, 0.0).r;`,`      let outlineWidth: i32 = i32(textureDimensions(labelOutlineTexture).x);`,`      let outlineIndex: i32 = clamp(segmentIndex - 1, 0, outlineWidth - 1);`,`      let outlineCoord: vec2<f32> = vec2<f32>(`,`        (f32(outlineIndex) + 0.5) / f32(outlineWidth),`,`        0.5);`,`      let thicknessValue: f32 = textureSampleLevel(`,`        labelOutlineTexture,`,`        labelOutlineTextureSampler,`,`        outlineCoord,`,`        0.0).r;`,`      let outlineOpacity: f32 = textureSampleLevel(`,`        labelOutlineOpacityTexture,`,`        labelOutlineOpacityTextureSampler,`,`        outlineCoord,`,`        0.0).r;`,`      let actualThickness: i32 = i32(round(thicknessValue * 255.0));`,`      var pixelOnBorder: bool = false;`,`      if (actualThickness > 0) {`,`        for (var i: i32 = -actualThickness; i <= actualThickness; i++) {`,`          for (var j: i32 = -actualThickness; j <= actualThickness; j++) {`,`            if (i == 0 && j == 0) {`,`              continue;`,`            }`,`            let neighborCoord = clamp(`,`              centerCoord + f32(i) * stepX + f32(j) * stepY,`,`              clampMin,`,`              clampMax);`,`            let neighborValue: f32 = textureSampleLevel(`,`              imgTexture,`,`              imgTextureSampler,`,`              neighborCoord,`,`              0.0).r;`,`            if (neighborValue != centerValue) {`,`              pixelOnBorder = true;`,`              break;`,`            }`,`          }`,`          if (pixelOnBorder) {`,`            break;`,`          }`,`        }`,`      }`,`      if (pixelOnBorder) {`,`        computedColor = vec4<f32>(tColor.rgb, outlineOpacity);`,`      } else {`,`        computedColor = vec4<f32>(`,`          tColor.rgb,`,`          scalarOpacity * mapperUBO.Opacity);`,`      }`,`    }`]).result}else o=B.substitute(o,`//VTK::Image::Sample`,[`    let scalar: f32 = computedColor.r;`,`    var colorCoord: vec2<f32> =`,`      vec2<f32>(scalar * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5);`,`    let tColor: vec4<f32> =`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`,`    var opacityCoord: vec2<f32> =`,`      vec2<f32>(scalar * mapperUBO.oScale.r + mapperUBO.oShift.r, 0.5);`,`    let scalarOpacity: f32 =`,`      textureSampleLevel(ofunTexture, ofunTextureSampler, opacityCoord, 0.0).r;`,`    computedColor = vec4<f32>(tColor.rgb, scalarOpacity * mapperUBO.Opacity);`]).result;break;case K.INDEPENDENT_1:o=B.substitute(o,`//VTK::Image::Sample`,[`    let tfunRows: f32 = f32(textureDimensions(tfunTexture).y);`,`    let scalar: f32 = computedColor.r;`,`    let rowCoord: f32 = ${J(0)};`,`    let colorCoord: vec2<f32> =`,`      vec2<f32>(scalar * mapperUBO.cScale.r + mapperUBO.cShift.r, rowCoord);`,`    let tColor: vec4<f32> =`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`,`    computedColor = vec4<f32>(`,`      tColor.rgb * mapperUBO.componentWeight.r,`,`      mapperUBO.Opacity);`]).result;break;case K.INDEPENDENT_2:o=B.substitute(o,`//VTK::Image::Sample`,[`    let tfunRows: f32 = f32(textureDimensions(tfunTexture).y);`,`    // Independent component LUT rows are duplicated, so sample the`,`    // center of row 2 * componentIndex for each component.`,`    let rawColor: vec4<f32> = computedColor;`,`    let rowCoord0: f32 = ${J(0)};`,`    let rowCoord1: f32 = ${J(1)};`,`    let scalar0: f32 = rawColor.r;`,`    let scalar1: f32 = rawColor.g;`,`    let color0: vec3<f32> = mapperUBO.componentWeight.r *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar0 * mapperUBO.cScale.r + mapperUBO.cShift.r, rowCoord0),`,`        0.0).rgb;`,`    let color1: vec3<f32> = mapperUBO.componentWeight.g *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar1 * mapperUBO.cScale.g + mapperUBO.cShift.g, rowCoord1),`,`        0.0).rgb;`,`    let weight0: f32 = mapperUBO.componentWeight.r *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar0 * mapperUBO.oScale.r + mapperUBO.oShift.r, rowCoord0),`,`        0.0).r;`,`    let weight1: f32 = mapperUBO.componentWeight.g *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar1 * mapperUBO.oScale.g + mapperUBO.oShift.g, rowCoord1),`,`        0.0).r;`,`    let weightSum: f32 = max(weight0 + weight1, 1.0e-6);`,`    computedColor = vec4<f32>(`,`      color0 * (weight0 / weightSum) + color1 * (weight1 / weightSum),`,`      mapperUBO.Opacity);`]).result;break;case K.INDEPENDENT_3:o=B.substitute(o,`//VTK::Image::Sample`,[`    let tfunRows: f32 = f32(textureDimensions(tfunTexture).y);`,`    let rawColor: vec4<f32> = computedColor;`,`    let rowCoord0: f32 = ${J(0)};`,`    let rowCoord1: f32 = ${J(1)};`,`    let rowCoord2: f32 = ${J(2)};`,`    let scalar0: f32 = rawColor.r;`,`    let scalar1: f32 = rawColor.g;`,`    let scalar2: f32 = rawColor.b;`,`    let color0: vec3<f32> = mapperUBO.componentWeight.r *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar0 * mapperUBO.cScale.r + mapperUBO.cShift.r, rowCoord0),`,`        0.0).rgb;`,`    let color1: vec3<f32> = mapperUBO.componentWeight.g *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar1 * mapperUBO.cScale.g + mapperUBO.cShift.g, rowCoord1),`,`        0.0).rgb;`,`    let color2: vec3<f32> = mapperUBO.componentWeight.b *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar2 * mapperUBO.cScale.b + mapperUBO.cShift.b, rowCoord2),`,`        0.0).rgb;`,`    let weight0: f32 = mapperUBO.componentWeight.r *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar0 * mapperUBO.oScale.r + mapperUBO.oShift.r, rowCoord0),`,`        0.0).r;`,`    let weight1: f32 = mapperUBO.componentWeight.g *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar1 * mapperUBO.oScale.g + mapperUBO.oShift.g, rowCoord1),`,`        0.0).r;`,`    let weight2: f32 = mapperUBO.componentWeight.b *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar2 * mapperUBO.oScale.b + mapperUBO.oShift.b, rowCoord2),`,`        0.0).r;`,`    let weightSum: f32 = max(weight0 + weight1 + weight2, 1.0e-6);`,`    computedColor = vec4<f32>(`,`      color0 * (weight0 / weightSum) + color1 * (weight1 / weightSum) + color2 * (weight2 / weightSum),`,`      mapperUBO.Opacity);`]).result;break;case K.INDEPENDENT_4:o=B.substitute(o,`//VTK::Image::Sample`,[`    let tfunRows: f32 = f32(textureDimensions(tfunTexture).y);`,`    let rawColor: vec4<f32> = computedColor;`,`    let rowCoord0: f32 = ${J(0)};`,`    let rowCoord1: f32 = ${J(1)};`,`    let rowCoord2: f32 = ${J(2)};`,`    let rowCoord3: f32 = ${J(3)};`,`    let scalar0: f32 = rawColor.r;`,`    let scalar1: f32 = rawColor.g;`,`    let scalar2: f32 = rawColor.b;`,`    let scalar3: f32 = rawColor.a;`,`    let color0: vec3<f32> = mapperUBO.componentWeight.r *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar0 * mapperUBO.cScale.r + mapperUBO.cShift.r, rowCoord0),`,`        0.0).rgb;`,`    let color1: vec3<f32> = mapperUBO.componentWeight.g *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar1 * mapperUBO.cScale.g + mapperUBO.cShift.g, rowCoord1),`,`        0.0).rgb;`,`    let color2: vec3<f32> = mapperUBO.componentWeight.b *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar2 * mapperUBO.cScale.b + mapperUBO.cShift.b, rowCoord2),`,`        0.0).rgb;`,`    let color3: vec3<f32> = mapperUBO.componentWeight.a *`,`      textureSampleLevel(`,`        tfunTexture,`,`        tfunTextureSampler,`,`        vec2<f32>(scalar3 * mapperUBO.cScale.a + mapperUBO.cShift.a, rowCoord3),`,`        0.0).rgb;`,`    let weight0: f32 = mapperUBO.componentWeight.r *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar0 * mapperUBO.oScale.r + mapperUBO.oShift.r, rowCoord0),`,`        0.0).r;`,`    let weight1: f32 = mapperUBO.componentWeight.g *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar1 * mapperUBO.oScale.g + mapperUBO.oShift.g, rowCoord1),`,`        0.0).r;`,`    let weight2: f32 = mapperUBO.componentWeight.b *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar2 * mapperUBO.oScale.b + mapperUBO.oShift.b, rowCoord2),`,`        0.0).r;`,`    let weight3: f32 = mapperUBO.componentWeight.a *`,`      textureSampleLevel(`,`        ofunTexture,`,`        ofunTextureSampler,`,`        vec2<f32>(scalar3 * mapperUBO.oScale.a + mapperUBO.oShift.a, rowCoord3),`,`        0.0).r;`,`    let weightSum: f32 = max(weight0 + weight1 + weight2 + weight3, 1.0e-6);`,`    computedColor = vec4<f32>(`,`      color0 * (weight0 / weightSum) + color1 * (weight1 / weightSum) + color2 * (weight2 / weightSum) + color3 * (weight3 / weightSum),`,`      mapperUBO.Opacity);`]).result;break;case K.DEPENDENT_LA:o=B.substitute(o,`//VTK::Image::Sample`,[`    let rawColor: vec4<f32> = computedColor;`,`    let intensity: f32 = rawColor.r * mapperUBO.cScale.r + mapperUBO.cShift.r;`,`    let tColor: vec4<f32> =`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(intensity, 0.5), 0.0);`,`    computedColor = vec4<f32>(`,`      tColor.rgb,`,`      rawColor.g * mapperUBO.oScale.r + mapperUBO.oShift.r);`]).result;break;case K.DEPENDENT_RGB:o=B.substitute(o,`//VTK::Image::Sample`,[`    let rawColor: vec4<f32> =`,`      computedColor * vec4<f32>(mapperUBO.cScale.x) + vec4<f32>(mapperUBO.cShift.x);`,`    computedColor = vec4<f32>(`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.r, 0.5), 0.0).r,`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.g, 0.5), 0.0).r,`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.b, 0.5), 0.0).r,`,`      mapperUBO.Opacity);`]).result;break;case K.DEPENDENT_RGBA:o=B.substitute(o,`//VTK::Image::Sample`,[`    let rawColor: vec4<f32> =`,`      computedColor * vec4<f32>(mapperUBO.cScale.x) + vec4<f32>(mapperUBO.cShift.x);`,`    computedColor = vec4<f32>(`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.r, 0.5), 0.0).r,`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.g, 0.5), 0.0).r,`,`      textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.b, 0.5), 0.0).r,`,`      rawColor.a);`]).result;break;default:o=B.substitute(o,`//VTK::Image::Sample`,[`    let scalar: f32 = computedColor.r;`,`    var colorCoord: vec2<f32> =`,`      vec2<f32>(scalar * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5);`,`    computedColor = textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`]).result}a.setCode(o)},r.set(`replaceShaderImage`,e.replaceShaderImage),e.replaceShaderClip=(e,t,n)=>{let r=t.getShaderDescription(`fragment`),i=r.getCode(),a=we({countName:`mapperUBO.NumClipPlanes`,planePrefix:`mapperUBO.ClipPlane`,positionName:`input.vertexSC`});i=B.substitute(i,`//VTK::Clip::Impl`,[...a,`//VTK::Clip::Impl`]).result,r.setCode(i)},r.set(`replaceShaderClip`,e.replaceShaderClip),e.replaceShaderCoincidentOffset=(e,t,n)=>{let r=t.getShaderDescription(`fragment`);if(!r)return;r.addBuiltinInput(`vec4<f32>`,`@builtin(position) fragPos`),r.addBuiltinOutput(`f32`,`@builtin(frag_depth) fragDepth`);let i=r.getCode();i=B.substitute(i,`//VTK::Position::Impl`,[`  var coincidentDepth: f32 = input.fragPos.z;`,`  if (mapperUBO.CoincidentFactor != 0.0) {`,`    let cscale = length(vec2<f32>(dpdx(input.fragPos.z), dpdy(input.fragPos.z)));`,`    coincidentDepth = coincidentDepth - mapperUBO.CoincidentFactor * cscale;`,`  }`,`  output.fragDepth = clamp(coincidentDepth, 0.0, 1.0);`]).result,r.setCode(i)},r.set(`replaceShaderCoincidentOffset`,e.replaceShaderCoincidentOffset),e.replaceShaderSelect=(e,t,n)=>{let r=t.getShaderDescription(`fragment`);if(!r)return;let i=r.getCode();i=B.substitute(i,`//VTK::Select::Impl`,[`  var compositeID: u32 = 0u;`,`  var attributeID: u32 = 0u;`]).result,r.setCode(i)},r.set(`replaceShaderSelect`,e.replaceShaderSelect)}var mr={imageState:null,rowLength:1024};function hr(e,t,n={}){Object.assign(t,mr,n),me.extend(e,t,n),e.setFragmentShaderTemplate(cr),t.UBO=Je.newInstance({label:`mapperUBO`}),t.UBO.addEntry(`SCTCMatrix`,`mat4x4<f32>`),t.UBO.addEntry(`Origin`,`vec4<f32>`),t.UBO.addEntry(`Axis2`,`vec4<f32>`),t.UBO.addEntry(`Axis1`,`vec4<f32>`),t.UBO.addEntry(`cScale`,`vec4<f32>`),t.UBO.addEntry(`cShift`,`vec4<f32>`),t.UBO.addEntry(`oScale`,`vec4<f32>`),t.UBO.addEntry(`oShift`,`vec4<f32>`),t.UBO.addEntry(`componentWeight`,`vec4<f32>`),t.UBO.addEntry(`Opacity`,`f32`),t.UBO.addEntry(`CoincidentFactor`,`f32`),t.UBO.addEntry(`CoincidentOffset`,`f32`),t.UBO.addEntry(`PropID`,`u32`),rt(t.UBO,`ClipPlane`),t.UBO.addEntry(`NumClipPlanes`,`u32`),t.lutBuildTime={},k(t.lutBuildTime,{mtime:0}),t.imagemat=L(new Float64Array(16)),t.imagematinv=L(new Float64Array(16)),t.cScale=new Float32Array(4),t.cShift=new Float32Array(4),t.oScale=new Float32Array(4),t.oShift=new Float32Array(4),t.componentWeight=new Float32Array(4),t.colorTmpTable=new Float32Array(t.rowLength*3),t.opacityTmpTable=new Float32Array(t.rowLength),t.colorLUTArray=null,t.opacityLUTArray=null,t.clipPlanes=Array.from({length:6},()=>[0,0,0,0]),t.VBOBuildTime={},k(t.VBOBuildTime),pr(e,t)}var gr=be(hr,`vtkWebGPUImageMapper`),_r={newInstance:gr,extend:hr};ye(`vtkAbstractImageMapper`,gr);function vr(e,t){t.classHierarchy.push(`vtkWebGPUImageSlice`),e.buildPass=n=>{if(t.renderable&&t.renderable.getVisibility()&&n){if(!t.renderable)return;let{renderer:n,renderWindow:r}=He(e);t.WebGPURenderer=n,t.WebGPURenderWindow=r,t.propID===void 0&&(t.propID=t.WebGPURenderWindow.getUniquePropID()),e.prepareNodes(),e.addMissingNode(t.renderable.getMapper()),e.removeUnusedNodes()}},e.traverseZBufferPass=n=>{t.renderable&&t.renderable.getNestedVisibility()&&(!t.WebGPURenderer.getSelector()||t.renderable.getNestedPickable())&&(e.apply(n,!0),t.children.forEach(e=>{e.traverse(n)}),e.apply(n,!1))},e.traverseOpaqueZBufferPass=t=>e.traverseOpaquePass(t),e.traverseOpaquePass=n=>{t.renderable&&t.renderable.getNestedVisibility()&&t.renderable.getIsOpaque()&&(!t.WebGPURenderer.getSelector()||t.renderable.getNestedPickable())&&(e.apply(n,!0),t.children.forEach(e=>{e.traverse(n)}),e.apply(n,!1))},e.traverseTranslucentPass=n=>{!t.renderable||!t.renderable.getNestedVisibility()||t.renderable.getIsOpaque()||t.WebGPURenderer.getSelector()&&!t.renderable.getNestedPickable()||(e.apply(n,!0),t.children.forEach(e=>{e.traverse(n)}),e.apply(n,!1))},e.queryPass=(e,n)=>{if(e){if(!t.renderable||!t.renderable.getVisibility())return;t.renderable.getIsOpaque()?n.incrementOpaqueActorCount():n.incrementTranslucentActorCount()}},e.getBufferShift=n=>(e.getKeyMatrices(n),t.bufferShift),e.getKeyMatrices=e=>{if(Math.max(t.renderable.getMTime(),e.getStabilizedTime())>t.keyMatricesTime.getMTime()){t.renderable.computeMatrix();let n=t.renderable.getMatrix(),r=e.getStabilizedCenterByReference();t.bufferShift[0]=n[3]-r[0],t.bufferShift[1]=n[7]-r[1],t.bufferShift[2]=n[11]-r[2],P(t.keyMatrices.bcwc,n),t.renderable.getIsIdentity()?L(t.keyMatrices.normalMatrix):(o(t.keyMatrices.normalMatrix,t.keyMatrices.bcwc),t.keyMatrices.normalMatrix[3]=0,t.keyMatrices.normalMatrix[7]=0,t.keyMatrices.normalMatrix[11]=0,b(t.keyMatrices.normalMatrix,t.keyMatrices.normalMatrix),P(t.keyMatrices.normalMatrix,t.keyMatrices.normalMatrix)),Qe(t.keyMatrices.bcwc,t.keyMatrices.bcwc,[-t.bufferShift[0],-t.bufferShift[1],-t.bufferShift[2]]),Qe(t.keyMatrices.bcsc,t.keyMatrices.bcwc,[-r[0],-r[1],-r[2]]),t.keyMatricesTime.modified()}return t.keyMatrices}}var yr={bufferShift:void 0,keyMatrixTime:null,keyMatrices:null,propID:void 0};function br(e,t,n={}){Object.assign(t,yr,n),Ge.extend(e,t,n),t.keyMatricesTime={},k(t.keyMatricesTime,{mtime:0}),t.keyMatrices={normalMatrix:new Float64Array(16),bcwc:new Float64Array(16),bcsc:new Float64Array(16)},t.keyMatrixTime={},k(t.keyMatrixTime,{mtime:0}),t.keyMatrices={mcwc:L(new Float64Array(16))},t.bufferShift=[0,0,0,0],he(e,t,[`propID`,`keyMatricesTime`]),vr(e,t)}var xr=be(br,`vtkWebGPUImageSlice`);ye(`vtkImageSlice`,xr);function Sr(e,t){t.classHierarchy.push(`vtkWebGPUVolume`),e.buildPass=n=>{if(t.renderable&&t.renderable.getVisibility()&&n){let{renderer:n,renderWindow:r}=He(e);t.WebGPURenderer=n,t.WebGPURenderWindow=r,t.propID===void 0&&(t.propID=t.WebGPURenderWindow.getUniquePropID()),t.renderable.getMapper().update()}},e.queryPass=(n,r)=>{if(n){if(!t.renderable||!t.renderable.getVisibility())return;let n=t.renderable.getMapper().getBounds();if(!n||n.length!==6||n[0]>n[1])return;r.addVolume(e)}};let n=new Float64Array(3),r=new Float64Array(3);e.getBoundingCubePoints=(e,i)=>{let a=t.renderable.getMapper().getInputData();if(!a)return;let o=a.getSpatialExtent(),s=t.renderable.getMatrix(),c=0;for(let t=4;t<6;t++){n[2]=o[t];for(let t=2;t<4;t++){n[1]=o[t];for(let t=0;t<2;t++){n[0]=o[t],a.indexToWorld(n,r);let l=i+c*3;e[l++]=s[0]*r[0]+s[1]*r[1]+s[2]*r[2]+s[3],e[l++]=s[4]*r[0]+s[5]*r[1]+s[6]*r[2]+s[7],e[l++]=s[8]*r[0]+s[9]*r[1]+s[10]*r[2]+s[11],c++}}}},e.getKeyMatrices=e=>{if(Math.max(t.renderable.getMTime(),e.getStabilizedTime())>t.keyMatricesTime.getMTime()){t.renderable.computeMatrix();let n=t.renderable.getMatrix(),r=e.getStabilizedCenterByReference();P(t.keyMatrices.bcwc,n),Qe(t.keyMatrices.bcsc,t.keyMatrices.bcwc,[-r[0],-r[1],-r[2]]),t.keyMatricesTime.modified()}return t.keyMatrices}}var Cr={propID:void 0,keyMatricesTime:null};function wr(e,t,n={}){Object.assign(t,Cr,n),Ge.extend(e,t,n),t.keyMatricesTime={},z.obj(t.keyMatricesTime,{mtime:0}),t.keyMatrices={bcwc:new Float64Array(16),bcsc:new Float64Array(16)},z.get(e,t,[`propID`,`keyMatricesTime`]),Sr(e,t)}var Tr=z.newInstance(wr,`vtkWebGPUVolume`);ye(`vtkVolume`,Tr);var{BufferUsage:Er}=We,Dr=`
//VTK::Renderer::Dec

//VTK::Mapper::Dec

//VTK::IOStructs::Dec

@vertex
fn main(
//VTK::IOStructs::Input
)
//VTK::IOStructs::Output
{
  var output : vertexOutput;

  //VTK::ImageCPR::Impl

  return output;
}
`,Or=`
//VTK::Renderer::Dec

//VTK::Mapper::Dec

//VTK::Clip::Dec

//VTK::Coincident::Dec

//VTK::RenderEncoder::Dec

//VTK::IOStructs::Dec

fn applyQuaternionToVec(q: vec4<f32>, v: vec3<f32>) -> vec3<f32>
{
  let uv = cross(q.xyz, v);
  let uuv = cross(q.xyz, uv);
  return v + (2.0 * q.w) * uv + 2.0 * uuv;
}

fn quaternionLerpOrSlerp(q0In: vec4<f32>, q1In: vec4<f32>, t: f32) -> vec4<f32>
{
  var q0 = normalize(q0In);
  var q1 = normalize(q1In);
  var cosAngle = dot(q0, q1);
  if (cosAngle < 0.0)
  {
    q1 = -q1;
    cosAngle = -cosAngle;
  }
  if (cosAngle > 0.999)
  {
    return normalize((1.0 - t) * q0 + t * q1);
  }
  let omega = acos(cosAngle);
  let sinOmega = max(sin(omega), 0.000001);
  let w0 = sin((1.0 - t) * omega) / sinOmega;
  let w1 = sin(t * omega) / sinOmega;
  return normalize(w0 * q0 + w1 * q1);
}

fn getComponent(v: vec4<f32>, idx: u32) -> f32
{
  if (idx == 0u) { return v.x; }
  if (idx == 1u) { return v.y; }
  if (idx == 2u) { return v.z; }
  return v.w;
}

fn sampleColorTF(value: f32) -> vec4<f32>
{
  return textureSampleLevel(colorTexture, cprSampler, vec2<f32>(value, 0.5), 0.0);
}

fn sampleScalarColor(value: f32) -> vec3<f32>
{
  return sampleColorTF(value).rgb;
}

fn sampleColorRow(value: f32, row: f32) -> vec4<f32>
{
  return textureSampleLevel(colorTexture, cprSampler, vec2<f32>(value, row), 0.0);
}

fn sampleOpacityRow(value: f32, row: f32) -> f32
{
  return textureSampleLevel(pwfTexture, cprSampler, vec2<f32>(value, row), 0.0).r;
}

fn getProjectedValue(volumePosTC: vec3<f32>, projectionDirection: vec3<f32>) -> vec4<f32>
{
  let scaledDirection =
    (mapperUBO.MCTCMatrix * vec4<f32>(projectionDirection, 0.0)).xyz;
  let projectionStep = mapperUBO.ProjectionParams.z * scaledDirection;
  let projectionStart = volumePosTC + mapperUBO.ProjectionParams.y * scaledDirection;

  var tvalue = vec4<f32>(0.0);
  if (mapperUBO.ProjectionMode == ${G.MIN}u)
  {
    tvalue = vec4<f32>(1.0);
  }

  for (var projectionSampleIdx: u32 = 0u;
    projectionSampleIdx < mapperUBO.ProjectionSamples;
    projectionSampleIdx = projectionSampleIdx + 1u)
  {
    let projectionSamplePosition =
      projectionStart + f32(projectionSampleIdx) * projectionStep;
    let sampledTextureValue =
      textureSampleLevel(volumeTexture, cprSampler, projectionSamplePosition, 0.0);

    if (mapperUBO.ProjectionMode == ${G.MAX}u)
    {
      tvalue = max(tvalue, sampledTextureValue);
    }
    else if (mapperUBO.ProjectionMode == ${G.MIN}u)
    {
      tvalue = min(tvalue, sampledTextureValue);
    }
    else
    {
      tvalue = tvalue + sampledTextureValue;
    }
  }

  if (mapperUBO.ProjectionMode == ${G.AVERAGE}u)
  {
    tvalue = tvalue / max(f32(mapperUBO.ProjectionSamples), 1.0);
  }
  return tvalue;
}

@fragment
fn main(
//VTK::IOStructs::Input
)
//VTK::IOStructs::Output
{
  var output : fragmentOutput;

  var interpolatedOrientation = mapperUBO.UniformOrientation;
  if (mapperUBO.UseUniformOrientation == 0u)
  {
    interpolatedOrientation = quaternionLerpOrSlerp(
      input.centerlineBottomOrientationVS,
      input.centerlineTopOrientationVS,
      input.quadOffsetVS.y
    );
  }
  let samplingDirection = applyQuaternionToVec(
    interpolatedOrientation,
    mapperUBO.TangentDirection.xyz
  );
  let projectionDirection = applyQuaternionToVec(
    interpolatedOrientation,
    mapperUBO.BitangentDirection.xyz
  );

  var horizontalOffset = input.quadOffsetVS.x;
  if (mapperUBO.UseCenterPoint != 0u)
  {
    let baseOffset = dot(
      samplingDirection,
      mapperUBO.GlobalCenterPoint.xyz - input.centerlinePosVS
    );
    horizontalOffset = horizontalOffset + baseOffset;
  }

  let volumePosMC = input.centerlinePosVS + horizontalOffset * samplingDirection;
  //VTK::Clip::Impl
  let volumePosTC =
    (mapperUBO.MCTCMatrix * vec4<f32>(volumePosMC, 1.0)).xyz;

  if (any(volumePosTC < vec3<f32>(0.0)) || any(volumePosTC > vec3<f32>(1.0)))
  {
    var computedColor = mapperUBO.BackgroundColor;
    //VTK::RenderEncoder::Impl
    return output;
  }

  var tvalue = textureSampleLevel(volumeTexture, cprSampler, volumePosTC, 0.0);
  if (mapperUBO.ProjectionSamples > 1u)
  {
    tvalue = getProjectedValue(volumePosTC, projectionDirection);
  }

  var computedColor = vec4<f32>(0.0);
  if (mapperUBO.IndependentComponents != 0u)
  {
    var sumColor = vec3<f32>(0.0);
    var sumWeight = 0.0;
    for (var c: u32 = 0u; c < mapperUBO.NumComponents; c = c + 1u)
    {
      let row = (f32(c) + 0.5) / max(f32(mapperUBO.NumComponents), 1.0);
      let componentValue = getComponent(tvalue, c);
      let lutValue = componentValue * getComponent(mapperUBO.CScale, c) +
        getComponent(mapperUBO.CShift, c);
      let opacityValue = componentValue * getComponent(mapperUBO.PWFScale, c) +
        getComponent(mapperUBO.PWFShift, c);
      let componentMix = getComponent(mapperUBO.ComponentMix, c);
      let color = sampleColorRow(lutValue, row).rgb;
      let weight = componentMix * sampleOpacityRow(opacityValue, row);
      sumColor = sumColor + weight * color;
      sumWeight = sumWeight + weight;
    }

    let finalColor = select(sumColor, sumColor / max(sumWeight, 0.000001), sumWeight > 0.0);
    if (mapperUBO.NumComponents == 1u)
    {
      computedColor = vec4<f32>(finalColor, sumWeight * mapperUBO.Opacity);
    }
    else
    {
      computedColor = vec4<f32>(finalColor, mapperUBO.Opacity);
    }
  }
  else if (mapperUBO.NumComponents == 1u)
  {
    let intensity = tvalue.r;
    let lutValue = intensity * mapperUBO.CScale.x + mapperUBO.CShift.x;
    let opacityValue = intensity * mapperUBO.PWFScale.x + mapperUBO.PWFShift.x;
    computedColor = vec4<f32>(
      sampleScalarColor(lutValue),
      sampleOpacityRow(opacityValue, 0.5) * mapperUBO.Opacity
    );
  }
  else if (mapperUBO.NumComponents == 2u)
  {
    let intensity = tvalue.r * mapperUBO.CScale.x + mapperUBO.CShift.x;
    computedColor = vec4<f32>(
      sampleScalarColor(intensity),
      mapperUBO.PWFScale.x * tvalue.g + mapperUBO.PWFShift.x
    );
  }
  else if (mapperUBO.NumComponents == 3u)
  {
    let tcolor = mapperUBO.CScale * tvalue + mapperUBO.CShift;
    computedColor = vec4<f32>(
      sampleColorTF(tcolor.r).r,
      sampleColorTF(tcolor.g).r,
      sampleColorTF(tcolor.b).r,
      mapperUBO.Opacity
    );
  }
  else
  {
    let tcolor = mapperUBO.CScale * tvalue + mapperUBO.CShift;
    computedColor = vec4<f32>(
      sampleColorTF(tcolor.r).r,
      sampleColorTF(tcolor.g).r,
      sampleColorTF(tcolor.b).r,
      tcolor.a
    );
  }

  //VTK::Select::Impl
  //VTK::Coincident::Impl
  //VTK::RenderEncoder::Impl
  return output;
}
`,kr=new Float64Array(16),Ar=new Float64Array(16),jr=[0,0,0,1],Mr=[0,1,3,0,3,2];function Nr(e,t){t.classHierarchy.push(`vtkWebGPUImageCPRMapper`),e.getCoincidentParameters=()=>t.renderable.getResolveCoincidentTopology()===O.PolygonOffset?t.renderable.getCoincidentTopologyPolygonOffsetParameters():null,e.buildPass=n=>{if(n){let{parent:n,renderer:r,renderWindow:i,device:a}=He(e,`vtkWebGPUImageSlice`);t.WebGPUImageSlice=n,t.WebGPURenderer=r,t.WebGPURenderWindow=i,t.device=a,e.setWebGPURenderer(t.WebGPURenderer)}},e.opaquePass=t=>{t&&e.render()},e.translucentPass=t=>{t&&e.render()},e.zBufferPass=t=>{t&&e.render()},e.opaqueZBufferPass=t=>e.zBufferPass(t),e.render=()=>{if(t.renderable.update(),!t.renderable.preRenderCheck())return;t.currentImageDataInput=t.renderable.getInputData(0),t.currentCenterlineInput=t.renderable.getOrientedCenterline();let n=t.WebGPURenderer.getRenderEncoder();t.selectionPass=n?.getPipelineHash?.()===`sel`,e.prepareToDraw(n),t.renderEncoder.registerDrawCallback(t.pipeline,e.draw)},e.computePipelineHash=()=>{let n=Math.min(t.renderable.getNumberOfClippingPlanes(),6),r=e.getCoincidentParameters();t.pipelineHash=`cprcp${n}co${r?.factor||r?.offset?1:0}${t.renderEncoder.getPipelineHash()}`},e.updateGeometry=()=>{let n=t.currentCenterlineInput,r=n?.getNumberOfPoints?.()??0,i=r<=1?0:r-1;if(!i){e.setNumberOfVertices(0);return}let a=t.renderable.getHeight(),o=t.renderable.getWidth(),s=n.getDistancesToFirstPoint(),c=n.getPoints(),l=n.getOrientations()??[],u=6*i,d=new Float32Array(u*3),f=new Float32Array(u*3),p=new Uint32Array(u),m=new Float32Array(u*4),h=new Float32Array(u*4),g=[0,0,0],_=[0,0,0];for(let e=0;e<i;++e){c.getPoint(e,g),c.getPoint(e+1,_);let t=a-s[e],n=a-s[e+1],r=l[e]??jr,i=l[e+1]??r;for(let a=0;a<6;++a){let s=Mr[a],c=e*6+a,l=c*3,u=c*4;d[l]=s===1||s===3?o:0,d[l+1]=s>1?n:t,d[l+2]=0;let v=s>1?_:g;f[l]=v[0],f[l+1]=v[1],f[l+2]=v[2],p[c]=s,m[u]=r[0],m[u+1]=r[1],m[u+2]=r[2],m[u+3]=r[3],h[u]=i[0],h[u+1]=i[1],h[u+2]=i[2],h[u+3]=i[3]}}let v=t.device.getBufferManager(),y=Math.max(t.renderable.getMTime(),n.getMTime(),n.getPoints().getMTime()),b=`cpr-vertex-${y}`,x=`cpr-centerline-${y}`,S=`cpr-quad-${y}`,C=`cpr-top-${y}`,w=`cpr-bottom-${y}`;[[b,d,`float32x3`,[`vertexMC`]],[x,f,`float32x3`,[`centerlinePosition`]],[S,p,`uint32`,[`quadIndex`]],[C,m,`float32x4`,[`centerlineTopOrientation`]],[w,h,`float32x4`,[`centerlineBottomOrientation`]]].forEach(([e,n,r,i])=>{let a=v.getBuffer({hash:e,nativeArray:n,usage:Er.RawVertex,format:r});t.vertexInput.addBuffer(a,i)}),e.setNumberOfVertices(u)},e.updateVolumeTexture=()=>{let e=t.WebGPUImageSlice.getRenderable().getProperty(),n=e?.getUpdatedExtents?.()??[],r=t.textureViews[0]?.getTexture(),i=!!t.renderable.getPreferSizeOverAccuracy?.(),a=t.device.getTextureManager().getTextureForImageData(t.currentImageDataInput,{updatedExtents:n,existingTexture:r,preferSizeOverAccuracy:i});n.length&&e.setUpdatedExtents([]),(!t.textureViews[0]||t.textureViews[0].getTexture()!==a)&&(t.textureViews[0]=a.createView(`volumeTexture`))},e.updateColorTexture=()=>{let e=t.WebGPUImageSlice.getRenderable().getProperty(),n=t.currentImageDataInput?.getPointData()?.getScalars();if(!n)return;let r=n.getNumberOfComponents(),i=e.getIndependentComponents()?r:1,a=ir(e,e.getRGBTransferFunction,i,{label:`cprColorLUT`,rowLength:t.rowLength});if(t.colorTextureString===a)return;let o=new Uint8ClampedArray(t.rowLength*i*4),s=new Float32Array(t.rowLength*3);if(e.getRGBTransferFunction())for(let n=0;n<i;++n){let r=e.getRGBTransferFunction(n),i=r.getRange();r.getTable(i[0],i[1],t.rowLength,s,1);for(let e=0;e<t.rowLength;++e){let r=n*t.rowLength*4+e*4;o[r]=255*s[e*3],o[r+1]=255*s[e*3+1],o[r+2]=255*s[e*3+2],o[r+3]=255}}else{let e=Math.max(t.rowLength-1,1);for(let n=0;n<t.rowLength;++n){let t=n*4,r=255*n/e;o[t]=r,o[t+1]=r,o[t+2]=r,o[t+3]=255}}let c=t.device.getTextureManager().getTexture({hash:a,nativeArray:o,width:t.rowLength,height:i,depth:1,format:`rgba8unorm`});t.textureViews[1]=c.createView(`colorTexture`),t.colorTextureString=a},e.updateOpacityTexture=()=>{let e=t.WebGPUImageSlice.getRenderable().getProperty(),n=t.currentImageDataInput?.getPointData()?.getScalars();if(!n)return;let r=n.getNumberOfComponents(),i=e.getIndependentComponents()?r:1,a=ir(e,e.getPiecewiseFunction,i,{label:`cprOpacityLUT`,rowLength:t.rowLength});if(t.pwfTextureString===a)return;let o=new Float32Array(t.rowLength*i),s=new Float32Array(t.rowLength);if(e.getPiecewiseFunction())for(let n=0;n<i;++n){let r=e.getPiecewiseFunction(n);if(r){let e=r.getRange();r.getTable(e[0],e[1],t.rowLength,s,1),o.set(s,n*t.rowLength)}else o.fill(1,n*t.rowLength,(n+1)*t.rowLength)}else o.fill(1);let c=t.device.getTextureManager().getTexture({hash:a,nativeArray:o,width:t.rowLength,height:i,depth:1,format:`r16float`});t.textureViews[2]=c.createView(`pwfTexture`),t.pwfTextureString=a},e.updateUBO=()=>{let n=t.UBO.getSendTime(),r=t.WebGPUImageSlice.getRenderable(),i=r.getProperty(),a=t.currentImageDataInput,o=t.WebGPUImageSlice.getPropID(),s=t.WebGPURenderer.getSelector(),c=o;if(s?.getPropIDForSelection&&(c=s.getPropIDForSelection(o,r)+1),t.UBO.setValue(`PropID`,c),e.getMTime()<=n&&t.renderable.getMTime()<=n&&r.getMTime()<=n&&i.getMTime()<=n&&a.getMTime()<=n&&t.WebGPURenderer.getStabilizedTime()<=n){t.UBO.sendIfNeeded(t.device);return}let l=t.WebGPURenderer.getStabilizedCenterByReference();P(kr,r.getMatrix()),Qe(kr,kr,[-l[0],-l[1],-l[2]]),t.UBO.setArray(`BCSCMatrix`,kr);let u=a.getWorldToIndex(),d=a.getDimensions();L(Ar),Ke(Ar,Ar,[1/Math.max(d[0],1),1/Math.max(d[1],1),1/Math.max(d[2],1)]),M(kr,Ar,u),t.UBO.setArray(`MCTCMatrix`,kr);let f=t.renderable.getCenterPoint();t.UBO.setArray(`GlobalCenterPoint`,[...f??[0,0,0],1]),t.UBO.setValue(`UseCenterPoint`,+!!f),t.UBO.setArray(`BackgroundColor`,t.renderable.getBackgroundColor()),t.UBO.setArray(`TangentDirection`,[...t.renderable.getTangentDirection(),0]),t.UBO.setArray(`BitangentDirection`,[...t.renderable.getBitangentDirection(),0]),t.UBO.setArray(`UniformOrientation`,t.renderable.getUniformOrientation()),t.UBO.setValue(`UseUniformOrientation`,+!!t.renderable.getUseUniformOrientation()),t.UBO.setValue(`Width`,t.renderable.getWidth()),t.UBO.setValue(`Opacity`,i.getOpacity());let p=Math.min(t.renderable.getNumberOfClippingPlanes(),6);t.UBO.setValue(`NumClipPlanes`,p);let m=[0,0,0,0];for(let e=0;e<6;++e)m.fill(0),e<p&&t.renderable.getClippingPlaneInDataCoords(r.getMatrix(),e,m),t.UBO.setArray(`ClipPlane${e}`,m);let h=e.getCoincidentParameters();t.UBO.setValue(`CoincidentFactor`,h?.factor??0),t.UBO.setValue(`CoincidentOffset`,16e-6*(h?.offset??0));let g=t.renderable.getProjectionSlabNumberOfSamples(),_=t.renderable.getProjectionSlabThickness(),v=g>1?_/(g-1):0;t.UBO.setValue(`ProjectionSamples`,g),t.UBO.setValue(`ProjectionMode`,t.renderable.getProjectionMode()),t.UBO.setArray(`ProjectionParams`,[_,-.5*_,v,0]);let y=a.getPointData().getScalars().getNumberOfComponents(),b=i.getIndependentComponents(),x=[0,0,0,0],S=[1,1,1,1],C=[0,0,0,0],w=[1,1,1,1],T=[0,0,0,0],E=t.textureViews[0].getTexture().getScale();for(let e=0;e<Math.min(y,4);++e){let t=b?e:0;x[e]=i.getComponentWeight?.(e)??1;let n=i.getColorWindow(),r=i.getColorLevel(),a=i.getRGBTransferFunction(t);if(a&&i.getUseLookupTableScalarRange()){let e=a.getRange();n=e[1]-e[0],r=.5*(e[1]+e[0])}let o=Math.abs(n)>0?n:1;S[e]=E/o,C[e]=-r/o+.5;let s=i.getPiecewiseFunction(t);if(s){let t=s.getRange(),n=t[1]-t[0],r=.5*(t[1]+t[0]),i=Math.abs(n)>0?n:1;w[e]=E/i,T[e]=-r/i+.5}}t.UBO.setValue(`NumComponents`,y),t.UBO.setValue(`IndependentComponents`,+!!b),t.UBO.setArray(`ComponentMix`,x),t.UBO.setArray(`CScale`,S),t.UBO.setArray(`CShift`,C),t.UBO.setArray(`PWFScale`,w),t.UBO.setArray(`PWFShift`,T),t.UBO.sendIfNeeded(t.device)};let n=e.updateBuffers;e.updateBuffers=()=>{n(),e.updateGeometry(),e.updateVolumeTexture(),e.updateColorTexture(),e.updateOpacityTexture(),e.updateUBO();let r=t.WebGPUImageSlice.getRenderable().getProperty().getInterpolationType()===V.NEAREST?`nearest`:`linear`;(!t.cprSampler||t.cprSampler.getOptions().minFilter!==r)&&(t.cprSampler=xe.newInstance({label:`cprSampler`}),t.cprSampler.create(t.device,{minFilter:r,magFilter:r}),t.additionalBindables=[t.cprSampler])},e.replaceShaderImageCPR=(e,t)=>{let n=t.getShaderDescription(`vertex`);n.addBuiltinOutput(`vec4<f32>`,`@builtin(position) Position`),n.addOutput(`vec2<f32>`,`quadOffsetVS`),n.addOutput(`vec3<f32>`,`centerlinePosVS`),n.addOutput(`vec4<f32>`,`centerlineTopOrientationVS`),n.addOutput(`vec4<f32>`,`centerlineBottomOrientationVS`);let r=n.getCode();r=B.substitute(r,`//VTK::ImageCPR::Impl`,[`let isLeft = quadIndex == 0u || quadIndex == 2u;`,`let isTop = quadIndex == 0u || quadIndex == 1u;`,`output.quadOffsetVS = vec2<f32>(`,`  mapperUBO.Width * select(0.5, -0.5, isLeft),`,`  select(0.0, 1.0, isTop)`,`);`,`output.centerlinePosVS = centerlinePosition;`,`output.centerlineTopOrientationVS = centerlineTopOrientation;`,`output.centerlineBottomOrientationVS = centerlineBottomOrientation;`,`let posSC = mapperUBO.BCSCMatrix * vec4<f32>(vertexMC, 1.0);`,`output.Position = rendererUBO.SCPCMatrix * posSC;`]).result,n.setCode(r)},t.shaderReplacements.set(`replaceShaderImageCPR`,e.replaceShaderImageCPR),e.replaceShaderClip=(e,n)=>{let r=n.getShaderDescription(`fragment`),i=r.getCode();if(!t.renderable.getNumberOfClippingPlanes()){i=B.substitute(i,`//VTK::Clip::Impl`,[]).result,r.setCode(i);return}let a=we({countName:`mapperUBO.NumClipPlanes`,planePrefix:`mapperUBO.ClipPlane`,positionName:`vec4<f32>(volumePosMC, 1.0)`});i=B.substitute(i,`//VTK::Clip::Impl`,[...a]).result,r.setCode(i)},t.shaderReplacements.set(`replaceShaderClip`,e.replaceShaderClip),e.replaceShaderCoincident=(t,n)=>{let r=n.getShaderDescription(`fragment`),i=r.getCode(),a=e.getCoincidentParameters();if(!a||a.factor===0&&a.offset===0){i=B.substitute(i,`//VTK::Coincident::Dec`,[]).result,i=B.substitute(i,`//VTK::Coincident::Impl`,[]).result,r.setCode(i);return}r.addBuiltinInput(`vec4<f32>`,`@builtin(position) fragPos`),r.addBuiltinOutput(`f32`,`@builtin(frag_depth) fragDepth`),i=B.substitute(i,`//VTK::Coincident::Dec`,[]).result,i=B.substitute(i,`var output : fragmentOutput;`,[`var output : fragmentOutput;`,`var coincidentDepth = input.fragPos.z + mapperUBO.CoincidentOffset;`,`if (mapperUBO.CoincidentFactor != 0.0) {`,`  let cscale = length(vec2<f32>(dpdx(input.fragPos.z), dpdy(input.fragPos.z)));`,`  coincidentDepth = coincidentDepth + mapperUBO.CoincidentFactor * cscale;`,`}`,`output.fragDepth = clamp(coincidentDepth, 0.0, 1.0);`]).result,i=B.substitute(i,`//VTK::Coincident::Impl`,[``]).result,r.setCode(i)},t.shaderReplacements.set(`replaceShaderCoincident`,e.replaceShaderCoincident),e.replaceShaderRenderEncoder=(e,n)=>{if(t.selectionPass){let e=n.getShaderDescription(`fragment`);e.addOutput(`vec4<u32>`,`outColor`);let t=e.getCode();t=B.substitute(t,`//VTK::RenderEncoder::Impl`,[`output.outColor = vec4<u32>(mapperUBO.PropID, 0u, 0u, 0u);`]).result,e.setCode(t);return}t.renderEncoder.replaceShaderCode(n)},t.shaderReplacements.set(`replaceShaderRenderEncoder`,e.replaceShaderRenderEncoder)}var Pr={rowLength:1024,currentImageDataInput:null,currentCenterlineInput:null,colorTextureString:null,pwfTextureString:null,cprSampler:null};function Fr(e,t,n={}){Object.assign(t,Pr,n),ot.extend(e,t,n),e.setVertexShaderTemplate(Dr),e.setFragmentShaderTemplate(Or),t.UBO=Je.newInstance({label:`mapperUBO`}),t.UBO.addEntry(`BCSCMatrix`,`mat4x4<f32>`),t.UBO.addEntry(`MCTCMatrix`,`mat4x4<f32>`),t.UBO.addEntry(`BackgroundColor`,`vec4<f32>`),t.UBO.addEntry(`GlobalCenterPoint`,`vec4<f32>`),t.UBO.addEntry(`UniformOrientation`,`vec4<f32>`),t.UBO.addEntry(`TangentDirection`,`vec4<f32>`),t.UBO.addEntry(`BitangentDirection`,`vec4<f32>`),t.UBO.addEntry(`ComponentMix`,`vec4<f32>`),t.UBO.addEntry(`CScale`,`vec4<f32>`),t.UBO.addEntry(`CShift`,`vec4<f32>`),t.UBO.addEntry(`PWFScale`,`vec4<f32>`),t.UBO.addEntry(`PWFShift`,`vec4<f32>`),t.UBO.addEntry(`ProjectionParams`,`vec4<f32>`),rt(t.UBO,`ClipPlane`),t.UBO.addEntry(`Width`,`f32`),t.UBO.addEntry(`Opacity`,`f32`),t.UBO.addEntry(`CoincidentFactor`,`f32`),t.UBO.addEntry(`CoincidentOffset`,`f32`),t.UBO.addEntry(`PropID`,`u32`),t.UBO.addEntry(`NumClipPlanes`,`u32`),t.UBO.addEntry(`ProjectionSamples`,`u32`),t.UBO.addEntry(`ProjectionMode`,`u32`),t.UBO.addEntry(`NumComponents`,`u32`),t.UBO.addEntry(`IndependentComponents`,`u32`),t.UBO.addEntry(`UseUniformOrientation`,`u32`),t.UBO.addEntry(`UseCenterPoint`,`u32`),Nr(e,t)}var Ir=z.newInstance(Fr,`vtkWebGPUImageCPRMapper`);ye(`vtkImageCPRMapper`,Ir);var{vtkErrorMacro:Lr}=z,Q=new Float64Array(16),Rr=new Float32Array(4),zr=new Float32Array(4),Br=new Float32Array(4),Vr=new Float32Array(4),Hr=new Float32Array(4),Ur=[0,0,1],Wr=[0,0,0],Gr=new Float32Array(4),Kr=new Float32Array(4),qr=new Float32Array(4),Jr=[`r`,`g`,`b`,`a`],Yr=4;function Xr(e){return`OutlineTangent1_${e}`}function Zr(e){return`OutlineTangent2_${e}`}function Qr(e){return`OutlineTexelSize_${e}`}function $r(e){return e}function ei(e,t){let n=[],i=[],a=t.getNumberOfInputPorts();for(let o=0;o<a;++o){let a=t.getInputData(o);if(a&&!a.isDeleted()){let t=n.length;n.push({imageData:a,inputIndex:o});let s=r(e,o);s?.getUseLabelOutline()&&i.push({property:s,arrayIndex:t})}}return{currentValidInputs:n,labelOutlineProperties:i}}function ti(e){return e===0?`imgTexture`:`imgTexture${e+1}`}function ni(e){return e===0?`SCTCMatrix`:`WCTCMatrix${e}`}function ri(e){return e.multiTexturePerVolumeEnabled?e.currentValidInputs.length:q.COLOR_LUT}function ii(e){return ri(e)+1}function ai(e){return ii(e)+1}function oi(e){return ai(e)+1}function si(e,t){return t.map(({inputIndex:t})=>r(e,t)?.getUseLabelOutline()?`1`:`0`).join(``)}function ci(e,t,n,r,i=0){return e[0]=t,e[1]=n,e[2]=r,e[3]=i,e}function li(e,t){t.vertexInput.setIndexBuffer(null),t.vertexInput.removeBufferIfPresent(`vertexBC`),t.vertexInput.removeBufferIfPresent(`vertexNormal`),e.setNumberOfVertices(0)}function ui(e,t,n,r){let i=t.getPointData().getScalars().getMTime(),a=e.scalarTextures[n],o=r?.getUpdatedExtents?.()??[];if(a&&a.mtime===i&&!o.length)return a.texture;let s=a?.texture,c=!!e.renderable.getPreferSizeOverAccuracy?.(),l=e.device.getTextureManager().getTextureForImageData(t,{updatedExtents:o,existingTexture:s,preferSizeOverAccuracy:c});return o.length&&r.setUpdatedExtents([]),e.scalarTextures[n]={texture:l,mtime:i},l}function di(e){return e?.getInterpolationType()===V.NEAREST?`nearest`:`linear`}function fi(e,t,n,i,a,o){let s=$r(o),c=ti(o),l=r(n,a),u=ui(t,i,o,l);(!t.textureViews[s]||t.textureViews[s].getTexture()!==u)&&(t.textureViews[s]=u.createView(c));let d=di(l);e.ensureTextureSampler(t.textureViews[s],{minFilter:d,magFilter:d})}function pi(e,t){let n=e.renderable.getLabelOutlineTextureWidth();return Math.max(1,t,n>0?n:0)}function mi(){return GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}function hi(e){return e===2?`xy`:`xyz`}function gi(e){return e===2?{sampleCoordType:`vec2<f32>`,coordFromWorldNeg:`(mapperUBO.SCTCMatrix * vec4<f32>(worldNeg, 1.0)).xy`,coordFromWorldPos:`(mapperUBO.SCTCMatrix * vec4<f32>(worldPos, 1.0)).xy`,coordBounds:`all(sampleCoord >= vec2<f32>(0.0)) && all(sampleCoord <= vec2<f32>(1.0))`,negBounds:`all(coordNeg >= vec2<f32>(0.0)) && all(coordNeg <= vec2<f32>(1.0))`,posBounds:`all(coordPos >= vec2<f32>(0.0)) && all(coordPos <= vec2<f32>(1.0))`}:{sampleCoordType:`vec3<f32>`,coordFromWorldNeg:`(mapperUBO.SCTCMatrix * vec4<f32>(worldNeg, 1.0)).xyz`,coordFromWorldPos:`(mapperUBO.SCTCMatrix * vec4<f32>(worldPos, 1.0)).xyz`,coordBounds:`all(sampleCoord >= vec3<f32>(0.0)) && all(sampleCoord <= vec3<f32>(1.0))`,negBounds:`all(coordNeg >= vec3<f32>(0.0)) && all(coordNeg <= vec3<f32>(1.0))`,posBounds:`all(coordPos >= vec3<f32>(0.0)) && all(coordPos <= vec3<f32>(1.0))`}}function _i(e,t,n){let r=[],i=hi(e.dimensions);for(let e=0;e<Yr;e++)if(e<t){let t=ti(e),a=`(mapperUBO.${ni(e)} * vec4<f32>(${n}, 1.0)).${i}`;r.push(`textureSampleLevel(${t}, ${t}Sampler, ${a}, 0.0).r`)}else r.push(`0.0`);return`vec4<f32>(${r.join(`, `)})`}function vi(){return[`fn vtkCompositeSlab(currVal: vec4<f32>, valToComp: vec4<f32>, slabType: i32, trapezoid: i32) -> vec4<f32> {`,`  if (slabType == 0) { return min(currVal, valToComp); }`,`  if (slabType == 1) { return max(currVal, valToComp); }`,`  if (trapezoid > 0) { return currVal + 0.5 * valToComp; }`,`  return currVal + valToComp;`,`}`]}function yi(e){return e.renderable.getSlabThickness()>0&&e.dimensions===3}function bi(){return[`fn labelSlabMask(startTC: vec3<f32>, stepTC: vec3<f32>, halfSlab: f32, stepLen: f32) -> u32 {`,`  var mask: u32 = 0u;`,`  var tc: vec3<f32> = startTC;`,`  var dist: f32 = 0.0;`,`  for (var i: i32 = 0; i < 4096; i = i + 1) {`,`    if (dist > halfSlab) { break; }`,`    if (any(tc > vec3<f32>(1.0)) || any(tc < vec3<f32>(0.0))) { break; }`,`    let label: i32 = i32(textureSampleLevel(imgTexture, imgTextureSampler, tc, 0.0).r * 255.0 + 0.5);`,`    if (label > 0 && label < 32) { mask = mask | (1u << u32(label)); }`,`    tc = tc + stepTC;`,`    dist = dist + stepLen;`,`  }`,`  tc = startTC - stepTC;`,`  dist = stepLen;`,`  for (var i: i32 = 0; i < 4096; i = i + 1) {`,`    if (dist > halfSlab) { break; }`,`    if (any(tc > vec3<f32>(1.0)) || any(tc < vec3<f32>(0.0))) { break; }`,`    let label: i32 = i32(textureSampleLevel(imgTexture, imgTextureSampler, tc, 0.0).r * 255.0 + 0.5);`,`    if (label > 0 && label < 32) { mask = mask | (1u << u32(label)); }`,`    tc = tc - stepTC;`,`    dist = dist + stepLen;`,`  }`,`  return mask;`,`}`,``,`fn labelSlabBoxSteps(p: vec3<f32>, stepTC: vec3<f32>) -> f32 {`,`  var limit: vec3<f32> = vec3<f32>(65536.0);`,`  if (stepTC.x > 1e-8) { limit.x = (1.0 - p.x) / stepTC.x; }`,`  else if (stepTC.x < -1e-8) { limit.x = -p.x / stepTC.x; }`,`  if (stepTC.y > 1e-8) { limit.y = (1.0 - p.y) / stepTC.y; }`,`  else if (stepTC.y < -1e-8) { limit.y = -p.y / stepTC.y; }`,`  if (stepTC.z > 1e-8) { limit.z = (1.0 - p.z) / stepTC.z; }`,`  else if (stepTC.z < -1e-8) { limit.z = -p.z / stepTC.z; }`,`  return min(limit.x, min(limit.y, limit.z));`,`}`,``,`fn labelSlabFrontLabel(startTC: vec3<f32>, towardCameraTC: vec3<f32>, halfSlab: f32, stepLen: f32, labelMask: u32) -> i32 {`,`  let slabSteps: f32 = halfSlab / stepLen;`,`  let nFront: f32 = min(slabSteps, labelSlabBoxSteps(startTC, towardCameraTC));`,`  let nBack: f32 = min(slabSteps, labelSlabBoxSteps(startTC, -towardCameraTC));`,`  var tc: vec3<f32> = startTC + towardCameraTC * nFront;`,`  let totalSteps: i32 = i32(nFront + nBack) + 1;`,`  for (var i: i32 = 0; i < 8192; i = i + 1) {`,`    if (i >= totalSteps) { break; }`,`    let label: i32 = i32(textureSampleLevel(imgTexture, imgTextureSampler, tc, 0.0).r * 255.0 + 0.5);`,`    if (label > 0 && label < 32 && (labelMask & (1u << u32(label))) != 0u) { return label; }`,`    tc = tc - towardCameraTC;`,`  }`,`  return 0;`,`}`]}function xi(){return[`      var slabOutline: vec4<f32> = vec4<f32>(0.0);`,`      if (i32(mapperUBO.SlabType) != 1 || computedColor.r >= 0.5 / 255.0) {`,`        let slabNormal: vec3<f32> = normalize(input.normalWC);`,`        let outlineStepTC: vec3<f32> = (mapperUBO.SCTCMatrix * vec4<f32>(slabNormal * mapperUBO.SlabSampleStep, 0.0)).xyz;`,`        let halfSlab: f32 = mapperUBO.SlabThickness * 0.5;`,`        let centerMask: u32 = labelSlabMask(sampleCoord, outlineStepTC, halfSlab, mapperUBO.SlabSampleStep);`,`        if (centerMask != 0u) {`,`          let outlineDims: vec2<i32> = vec2<i32>(textureDimensions(labelOutlineThickness, 0));`,`          let labelmapRow: f32 = 0.5 / f32(outlineDims.y);`,`          var edgeLabels: u32 = 0u;`,`          var prevThickness: i32 = -1;`,`          var neighborMask: u32 = 0u;`,`          for (var s: i32 = 1; s < 32; s = s + 1) {`,`            if ((centerMask & (1u << u32(s))) == 0u) { continue; }`,`            let thicknessCoord: vec2<f32> = vec2<f32>((f32(s) - 0.5) / f32(outlineDims.x), labelmapRow);`,`            let segmentThickness: i32 = max(1, i32(textureSampleLevel(labelOutlineThickness, labelOutlineThicknessSampler, thicknessCoord, 0.0).r * 255.0));`,`            if (segmentThickness != prevThickness) {`,`              let outlineOffset1: vec3<f32> = mapperUBO.OutlineTangent1_0.xyz * mapperUBO.OutlineTexelSize_0.xyz * f32(segmentThickness);`,`              let outlineOffset2: vec3<f32> = mapperUBO.OutlineTangent2_0.xyz * mapperUBO.OutlineTexelSize_0.xyz * f32(segmentThickness);`,`              neighborMask =`,`                labelSlabMask(sampleCoord + outlineOffset1, outlineStepTC, halfSlab, mapperUBO.SlabSampleStep) &`,`                labelSlabMask(sampleCoord - outlineOffset1, outlineStepTC, halfSlab, mapperUBO.SlabSampleStep) &`,`                labelSlabMask(sampleCoord + outlineOffset2, outlineStepTC, halfSlab, mapperUBO.SlabSampleStep) &`,`                labelSlabMask(sampleCoord - outlineOffset2, outlineStepTC, halfSlab, mapperUBO.SlabSampleStep);`,`              prevThickness = segmentThickness;`,`            }`,`            if ((neighborMask & (1u << u32(s))) == 0u) { edgeLabels = edgeLabels | (1u << u32(s)); }`,`          }`,`          let slabNormalTowardCamera: f32 = (rendererUBO.SCVCMatrix * vec4<f32>(slabNormal, 0.0)).z;`,`          let towardCameraTC: vec3<f32> = select(-outlineStepTC, outlineStepTC, slabNormalTowardCamera > 0.0);`,`          if (edgeLabels != 0u) {`,`            var edgeLabel: i32 = labelSlabFrontLabel(sampleCoord, towardCameraTC, halfSlab, mapperUBO.SlabSampleStep, edgeLabels);`,`            if (edgeLabel == 0) {`,`              for (var s: i32 = 1; s < 32; s = s + 1) {`,`                if ((edgeLabels & (1u << u32(s))) != 0u) { edgeLabel = s; break; }`,`              }`,`            }`,`            let labelValue: f32 = f32(edgeLabel) / 255.0;`,`            let edgeColor: vec3<f32> = textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(labelValue * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5), 0.0).rgb;`,`            let opacityCoord: vec2<f32> = vec2<f32>((f32(edgeLabel) - 0.5) / f32(outlineDims.x), labelmapRow);`,`            let edgeOpacity: f32 = textureSampleLevel(labelOutlineOpacity, labelOutlineOpacitySampler, opacityCoord, 0.0).r;`,`            slabOutline = vec4<f32>(edgeColor, edgeOpacity);`,`          } else {`,`            let fillLabel: i32 = labelSlabFrontLabel(sampleCoord, towardCameraTC, halfSlab, mapperUBO.SlabSampleStep, centerMask);`,`            let fillValue: f32 = select(computedColor.r, f32(fillLabel) / 255.0, fillLabel != 0);`,`            let fillColor: vec3<f32> = textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(fillValue * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5), 0.0).rgb;`,`            let fillOpacity: f32 = textureSampleLevel(ofunTexture, ofunTextureSampler, vec2<f32>(fillValue * mapperUBO.oScale.r + mapperUBO.oShift.r, 0.5), 0.0).r;`,`            slabOutline = vec4<f32>(fillColor, fillOpacity * mapperUBO.Opacity);`,`          }`,`        }`,`      }`,`      computedColor = slabOutline;`]}function Si(e,t,n){let r=e.renderable.getSlabThickness()>0,i=e.multiTexturePerVolumeEnabled?`      var rawValue: vec4<f32> = ${n(`input.worldPosVS`)};`:`      var rawValue: vec4<f32> = textureSampleLevel(imgTexture, imgTextureSampler, sampleCoord, 0.0);`,a=[`    let sampleCoord: ${t.sampleCoordType} = input.tcoordVS;`,`    var computedColor: vec4<f32>;`,`    if (!(${t.coordBounds})) {`,`      computedColor = mapperUBO.BackgroundColor;`,`    } else {`,i];if(r){let r=`textureSampleLevel(imgTexture, imgTextureSampler, coordNeg, 0.0)`,i=`textureSampleLevel(imgTexture, imgTextureSampler, coordPos, 0.0)`;e.multiTexturePerVolumeEnabled&&(r=n(`worldNeg`),i=n(`worldPos`)),a.push(`      if (mapperUBO.SlabThickness > 0.0) {`,`        var numSlices: i32 = 1;`,`        var distTraveled: f32 = mapperUBO.SlabSampleStep;`,`        var trapezoid: i32 = 0;`,`        let slabNormal: vec3<f32> = normalize(input.normalWC);`,`        while (distTraveled < mapperUBO.SlabThickness * 0.5) {`,`          distTraveled = distTraveled + mapperUBO.SlabSampleStep;`,`          let fnumSlices: f32 = f32(numSlices);`,`          var localStep: f32 = fnumSlices * mapperUBO.SlabSampleStep;`,`          if (distTraveled > mapperUBO.SlabThickness * 0.5) {`,`            localStep = mapperUBO.SlabThickness * 0.5;`,`            trapezoid = i32(mapperUBO.SlabTrapezoid);`,`          }`,`          let worldNeg: vec3<f32> = input.worldPosVS - localStep * slabNormal;`,`          let coordNeg: ${t.sampleCoordType} = ${t.coordFromWorldNeg};`,`          if (${t.negBounds}) {`,`            rawValue = vtkCompositeSlab(rawValue, ${r}, i32(mapperUBO.SlabType), trapezoid);`,`            numSlices += 1;`,`          }`,`          let worldPos: vec3<f32> = input.worldPosVS + localStep * slabNormal;`,`          let coordPos: ${t.sampleCoordType} = ${t.coordFromWorldPos};`,`          if (${t.posBounds}) {`,`            rawValue = vtkCompositeSlab(rawValue, ${i}, i32(mapperUBO.SlabType), trapezoid);`,`            numSlices += 1;`,`          }`,`        }`,`        if (i32(mapperUBO.SlabType) == 2) {`,`          rawValue = rawValue / f32(numSlices);`,`        }`,`      }`)}return a.push(`      computedColor = rawValue;`,`      //VTK::Image::Sample`,`    }`),a}function Ci(e,t){let n=[];for(let r=0;r<e;r++)t.has(r)||n.push(r);for(let r=0;r<e;r++)t.has(r)&&n.push(r);return n}function wi(e){return new Map(e.map(({arrayIndex:e},t)=>[e,t]))}function Ti(e,t,n){let r=hi(e.dimensions);return n?yi(e)?xi():[`      let centerValue: f32 = computedColor.r;`,`      let segmentIndex: u32 = u32(centerValue * 255.0);`,`      if (segmentIndex == 0u) {`,`        computedColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);`,`      } else {`,`        let outlineDims: vec2<i32> = vec2<i32>(textureDimensions(labelOutlineThickness, 0));`,`        let textureCoordinate: f32 = (f32(segmentIndex) - 0.5) / f32(outlineDims.x);`,`        let labelmapRow: f32 = 0.5 / f32(outlineDims.y);`,`        let thicknessValue: f32 = textureSampleLevel(labelOutlineThickness, labelOutlineThicknessSampler, vec2<f32>(textureCoordinate, labelmapRow), 0.0).r;`,`        let outlineOpacity: f32 = textureSampleLevel(labelOutlineOpacity, labelOutlineOpacitySampler, vec2<f32>(textureCoordinate, labelmapRow), 0.0).r;`,`        let actualThickness: i32 = i32(thicknessValue * 255.0);`,`        let scalar: f32 = centerValue;`,`        let colorCoord: vec2<f32> = vec2<f32>(scalar * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5);`,`        let tColor: vec4<f32> = textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`,`        let opacityCoord: vec2<f32> = vec2<f32>(scalar * mapperUBO.oScale.r + mapperUBO.oShift.r, 0.5);`,`        let scalarOpacity: f32 = textureSampleLevel(ofunTexture, ofunTextureSampler, opacityCoord, 0.0).r;`,`        var pixelOnBorder: bool = false;`,`        for (var i: i32 = -actualThickness; i <= actualThickness; i++) {`,`          for (var j: i32 = -actualThickness; j <= actualThickness; j++) {`,`            if (i == 0 && j == 0) { continue; }`,`            let neighborCoord: ${t.sampleCoordType} = sampleCoord + f32(i) * mapperUBO.OutlineTangent1_0.${r} * mapperUBO.OutlineTexelSize_0.${r} + f32(j) * mapperUBO.OutlineTangent2_0.${r} * mapperUBO.OutlineTexelSize_0.${r};`,`            if (!(${t.coordBounds.replace(/sampleCoord/g,`neighborCoord`)})) {`,`              pixelOnBorder = true;`,`              break;`,`            }`,`            let neighborValue: f32 = textureSampleLevel(imgTexture, imgTextureSampler, neighborCoord, 0.0).r;`,`            if (neighborValue != centerValue) {`,`              pixelOnBorder = true;`,`              break;`,`            }`,`          }`,`          if (pixelOnBorder) { break; }`,`        }`,`        if (pixelOnBorder) {`,`          computedColor = vec4<f32>(tColor.rgb, outlineOpacity);`,`        } else {`,`          computedColor = vec4<f32>(tColor.rgb, scalarOpacity * mapperUBO.Opacity);`,`        }`,`      }`]:[`      let scalar: f32 = computedColor.r;`,`      let colorCoord: vec2<f32> = vec2<f32>(scalar * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5);`,`      let tColor: vec4<f32> = textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`,`      let opacityCoord: vec2<f32> = vec2<f32>(scalar * mapperUBO.oScale.r + mapperUBO.oShift.r, 0.5);`,`      let scalarOpacity: f32 = textureSampleLevel(ofunTexture, ofunTextureSampler, opacityCoord, 0.0).r;`,`      computedColor = vec4<f32>(tColor.rgb, scalarOpacity * mapperUBO.Opacity);`]}function Ei(e,t){let n=wi(e.labelOutlineProperties),r=Ci(e.numberOfComponents,n),i=hi(e.dimensions),a=[`      var convergentColor: vec4<f32> = vec4<f32>(0.0);`];for(let t=0;t<e.numberOfComponents;t++){let e=`${2*t}.0 / f32(textureDimensions(tfunTexture, 0).y) + 0.5 / f32(textureDimensions(tfunTexture, 0).y)`;a.push(`      let scalar${t}: f32 = computedColor.${Jr[t]};`,`      let colorCoord${t}: vec2<f32> = vec2<f32>(scalar${t} * mapperUBO.cScale[${t}] + mapperUBO.cShift[${t}], ${e});`,`      let tColor${t}: vec4<f32> = textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord${t}, 0.0);`,`      let opacityCoord${t}: vec2<f32> = vec2<f32>(scalar${t} * mapperUBO.oScale[${t}] + mapperUBO.oShift[${t}], ${e});`,`      let alpha${t}: f32 = textureSampleLevel(ofunTexture, ofunTextureSampler, opacityCoord${t}, 0.0).r * mapperUBO.componentWeight[${t}] * mapperUBO.Opacity;`)}for(let e=0;e<r.length;e++){let o=r[e];if(n.has(o)){let e=ti(o),r=n.get(o);a.push(`      let segmentIndex${o}: u32 = u32(scalar${o} * 255.0);`,`      if (segmentIndex${o} > 0u) {`,`        let sampleCoord${o}: ${t.sampleCoordType} = (mapperUBO.${ni(o)} * vec4<f32>(input.worldPosVS, 1.0)).${i};`,`        let outlineDims${o}: vec2<i32> = vec2<i32>(textureDimensions(labelOutlineThickness, 0));`,`        let textureCoordinate${o}: f32 = (f32(segmentIndex${o}) - 0.5) / f32(outlineDims${o}.x);`,`        let labelmapRow${o}: f32 = (${r}.0 + 0.5) / f32(outlineDims${o}.y);`,`        let thickness${o}: i32 = i32(textureSampleLevel(labelOutlineThickness, labelOutlineThicknessSampler, vec2<f32>(textureCoordinate${o}, labelmapRow${o}), 0.0).r * 255.0);`,`        let outlineOpacity${o}: f32 = textureSampleLevel(labelOutlineOpacity, labelOutlineOpacitySampler, vec2<f32>(textureCoordinate${o}, labelmapRow${o}), 0.0).r;`,`        var pixelOnBorder${o}: bool = false;`,`        for (var ii${o}: i32 = -thickness${o}; ii${o} <= thickness${o}; ii${o}++) {`,`          for (var jj${o}: i32 = -thickness${o}; jj${o} <= thickness${o}; jj${o}++) {`,`            if (ii${o} == 0 && jj${o} == 0) { continue; }`,`            let neighborCoord${o}: ${t.sampleCoordType} = sampleCoord${o} + f32(ii${o}) * mapperUBO.${Xr(o)}.${i} * mapperUBO.${Qr(o)}.${i} + f32(jj${o}) * mapperUBO.${Zr(o)}.${i} * mapperUBO.${Qr(o)}.${i};`,`            if (!(${t.coordBounds.replace(/sampleCoord/g,`neighborCoord${o}`)})) { pixelOnBorder${o} = true; break; }`,`            let neighborValue${o}: f32 = textureSampleLevel(${e}, ${e}Sampler, neighborCoord${o}, 0.0).r;`,`            if (neighborValue${o} != scalar${o}) { pixelOnBorder${o} = true; break; }`,`          }`,`          if (pixelOnBorder${o}) { break; }`,`        }`,`        let finalAlpha${o}: f32 = select(alpha${o}, outlineOpacity${o}, pixelOnBorder${o});`,`        convergentColor = vec4<f32>(mix(convergentColor.rgb, tColor${o}.rgb, finalAlpha${o}), max(convergentColor.a, finalAlpha${o}));`,`      }`)}else a.push(`      convergentColor = vec4<f32>(mix(convergentColor.rgb, tColor${o}.rgb, alpha${o}), max(convergentColor.a, alpha${o}));`)}return a.push(`      computedColor = convergentColor;`),a}function Di(e){switch(e){case K.DEPENDENT_LA:return[`      let rawColor: vec4<f32> = computedColor;`,`      let intensity: f32 = rawColor.r * mapperUBO.cScale.r + mapperUBO.cShift.r;`,`      let tColor: vec4<f32> =`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(intensity, 0.5), 0.0);`,`      computedColor = vec4<f32>(`,`        tColor.rgb,`,`        rawColor.g * mapperUBO.oScale.r + mapperUBO.oShift.r);`];case K.DEPENDENT_RGB:return[`      let rawColor: vec4<f32> =`,`        computedColor * vec4<f32>(mapperUBO.cScale.x) + vec4<f32>(mapperUBO.cShift.x);`,`      computedColor = vec4<f32>(`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.r, 0.5), 0.0).r,`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.g, 0.5), 0.0).r,`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.b, 0.5), 0.0).r,`,`        mapperUBO.Opacity);`];case K.DEPENDENT_RGBA:return[`      let rawColor: vec4<f32> =`,`        computedColor * vec4<f32>(mapperUBO.cScale.x) + vec4<f32>(mapperUBO.cShift.x);`,`      computedColor = vec4<f32>(`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.r, 0.5), 0.0).r,`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.g, 0.5), 0.0).r,`,`        textureSampleLevel(tfunTexture, tfunTextureSampler, vec2<f32>(rawColor.b, 0.5), 0.0).r,`,`        rawColor.a);`];default:return[`      let scalar: f32 = computedColor.r;`,`      let colorCoord: vec2<f32> = vec2<f32>(scalar * mapperUBO.cScale.r + mapperUBO.cShift.r, 0.5);`,`      computedColor = textureSampleLevel(tfunTexture, tfunTextureSampler, colorCoord, 0.0);`]}}function Oi(e){let t=e.currentInput;o(Q,t.getIndexToWorld()),Qe(Q,Q,[-.5,-.5,-.5]),Ke(Q,Q,t.getDimensions()),b(Q,Q),e.UBO.setArray(`SCTCMatrix`,Q);for(let t=1;t<Yr;t++){let n=e.currentValidInputs[t]?.imageData;n?(o(Q,n.getIndexToWorld()),Qe(Q,Q,[-.5,-.5,-.5]),Ke(Q,Q,n.getDimensions()),b(Q,Q),e.UBO.setArray(ni(t),Q)):e.UBO.setArray(ni(t),L(Q))}}function ki(e,t){let{planeNormal:n,tangent1:r,tangent2:i}=yn(t,Ur);e.UBO.setArray(`PlaneNormalWC`,ci(Kr,n[0],n[1],n[2]));for(let t=0;t<Yr;t++){let n=e.currentValidInputs[t]?.imageData;if(n){let{tangent1:a,tangent2:o,texelSize:s}=bn(n,r,i,Wr);e.UBO.setArray(Xr(t),ci(Gr,a[0],a[1],a[2])),e.UBO.setArray(Zr(t),ci(Gr,o[0],o[1],o[2])),e.UBO.setArray(Qr(t),ci(Gr,s[0],s[1],s[2]))}else e.UBO.setArray(Xr(t),qr),e.UBO.setArray(Zr(t),qr),e.UBO.setArray(Qr(t),qr)}}function Ai(e,t,n,i){Rr.fill(1),zr.fill(0),Br.fill(1),Vr.fill(0),Hr.fill(1);let{numberOfComponents:a,independentComponents:o}=i;for(let i=0;i<a;i++){let a=e.multiTexturePerVolumeEnabled?$r(i):q.IMAGE,s=e.textureViews[a].getTexture().getScale(),c=n;e.multiTexturePerVolumeEnabled&&e.currentValidInputs[i]&&(c=r(t,e.currentValidInputs[i].inputIndex));let l=c.getColorWindow(),u=c.getColorLevel(),d=0;!e.multiTexturePerVolumeEnabled&&o&&(d=i);let f=c.getRGBTransferFunction(d),p=pn({colorWindow:l,colorLevel:u,useLookupTableScalarRange:c.getUseLookupTableScalarRange(),colorRange:f?.getRange?.(),volumeScale:s,volumeOffset:0}),m=mn({pwfRange:c.getPiecewiseFunction(d)?.getRange?.(),volumeScale:s,volumeOffset:0});Rr[i]=p.colorScale,zr[i]=p.colorShift,Br[i]=m.opacityScale,Vr[i]=m.opacityShift,Hr[i]=c.getComponentWeight(d)}e.UBO.setArray(`cScale`,Rr),e.UBO.setArray(`cShift`,zr),e.UBO.setArray(`oScale`,Br),e.UBO.setArray(`oShift`,Vr),e.UBO.setArray(`componentWeight`,Hr),e.UBO.setValue(`Opacity`,n.getOpacity())}function ji(e,n){n.classHierarchy.push(`vtkWebGPUImageResliceMapper`),e.buildPass=t=>{if(!t)return;let{parent:r,renderer:i,renderWindow:a,device:o}=He(e,`vtkWebGPUImageSlice`);n.WebGPUImageSlice=r,n.WebGPURenderer=i,n.WebGPURenderWindow=a,n.device=o},e.render=()=>{n.renderable.update();let{currentValidInputs:t,labelOutlineProperties:r}=ei(n.WebGPUImageSlice.getRenderable(),n.renderable);if(n.currentValidInputs=t,!n.currentValidInputs.length){Lr(`No input!`);return}n.labelOutlineProperties=r;let i=n.currentValidInputs.length,a=n.currentValidInputs[0].imageData,o=a.getPointData().getScalars();n.multiTexturePerVolumeEnabled=i>1,n.numberOfComponents=n.multiTexturePerVolumeEnabled?i:o.getNumberOfComponents(),n.currentInput=a,e.updateResliceGeometry(),e.prepareToDraw(n.WebGPURenderer.getRenderEncoder()),n.numberOfVertices&&n.renderEncoder.registerDrawCallback(n.pipeline,e.draw)},e.computePipelineHash=()=>{let t=n.currentInput.getExtent(),r=e.getImageState(),i=n.WebGPUImageSlice.getRenderable();t[0]===t[1]||t[2]===t[3]||t[4]===t[5]?(n.dimensions=2,n.pipelineHash=`reslice2`):(n.dimensions=3,n.pipelineHash=`reslice3`),n.pipelineHash+=r.textureChannelMode,r.useLabelOutline&&(n.pipelineHash+=`outline`),n.pipelineHash+=`ind${+!!r.independentComponents}`,n.pipelineHash+=`slab${+(n.renderable.getSlabThickness()>0)}`,n.pipelineHash+=`norm${+!!n.vertexInput.hasAttribute(`vertexNormal`)}`,n.multiTexturePerVolumeEnabled&&(n.pipelineHash+=`multi${n.numberOfComponents}`),n.pipelineHash+=`in${n.currentValidInputs.length}`,n.pipelineHash+=`lbl${si(i,n.currentValidInputs)}`,n.pipelineHash+=`comp${n.numberOfComponents}`,n.pipelineHash+=n.renderEncoder.getPipelineHash()},e.updateResliceGeometry=()=>{let e=n.currentInput,{resGeomString:t,slicePD:r,slicePlane:i,orthoSlicing:a,orthoAxis:o}=wn(n.renderable,e);if(!(n.resliceGeom&&n.resliceGeomUpdateString===t)){if(r)n.resliceGeom||=C.newInstance(),n.resliceGeom.getPoints().setData(r.getPoints().getData(),3),n.resliceGeom.getPolys().setData(r.getPolys().getData(),1),n.resliceGeom.getPointData().setNormals(r.getPointData().getNormals());else if(i&&e){if(n.resliceGeom||=C.newInstance(),a){let{points:t,polys:r,normalsData:a}=En(e,i,o,n.transform);n.resliceGeom.getPoints().setData(t,3),n.resliceGeom.getPolys().setData(r,1),n.resliceGeom.getPointData().setNormals(R.newInstance({numberOfComponents:3,values:a,name:`Normals`}))}else{let{points:t,polys:r,normalsData:a}=Tn(e,i,n.outlineFilter,n.cutter,n.lineToSurfaceFilter);n.resliceGeom.getPoints().setData(t,3),n.resliceGeom.getPolys().setData(r,1);let o=R.newInstance({numberOfComponents:3,values:a,name:`Normals`});n.resliceGeom.getPointData().setNormals(o)}}else{Lr(`Unable to build reslice geometry.`);return}n.resliceGeomUpdateString=t,n.resliceGeom.modified()}},e.updateGeometryBuffers=()=>{let r=n.resliceGeom,i=r?.getPoints(),a=r?.getPolys();if(!i||!a||!a.getNumberOfValues()){li(e,n);return}let o=n.device,s=o.getBufferManager().getBuffer({hash:`ResliceIdx${a.getMTime()}${i.getNumberOfPoints()}`,usage:Fe.Index,cells:a,numberOfPoints:i.getNumberOfPoints(),primitiveType:Me.Triangles,representation:t.SURFACE});if(!s||!s.getFlatSize()||!s.getIndexCount()){li(e,n);return}n.vertexInput.setIndexBuffer(s),n.vertexInput.addBuffer(o.getBufferManager().getBuffer({hash:`ReslicePts${i.getMTime()}I${s.getMTime()}float32x4`,usage:Fe.PointArray,format:`float32x4`,dataArray:i,indexBuffer:s,shift:0,packExtra:!0}),[`vertexBC`]);let c=n.renderable.getSlabThickness()>0,l=c?r.getPointData().getNormals():null;c&&l?n.vertexInput.addBuffer(o.getBufferManager().getBuffer({hash:`ResliceNorm${l.getMTime()}I${s.getMTime()}float32x3`,usage:Fe.PointArray,format:`float32x3`,dataArray:l,indexBuffer:s}),[`vertexNormal`]):n.vertexInput.removeBufferIfPresent(`vertexNormal`),e.setTopology(`triangle-list`),e.setNumberOfVertices(s.getIndexCount())},e.updateUBO=()=>{let t=n.WebGPUImageSlice.getRenderable(),i=r(t,n.currentValidInputs[0].inputIndex),a=t.getMapper(),o=a.getSlicePlane(),s=n.WebGPURenderer.getStabilizedCenterByReference(),c=e.getImageState();Oi(n),n.UBO.setArray(`StabilizedCenter`,ci(Kr,s[0],s[1],s[2])),n.UBO.setArray(`BackgroundColor`,n.renderable.getBackgroundColorByReference());let l=n.currentInput.getSpacing(),u=.5*Math.min(l[0],l[1],l[2]);n.UBO.setValue(`SlabThickness`,a.getSlabThickness()),n.UBO.setValue(`SlabType`,a.getSlabType()),n.UBO.setValue(`SlabTrapezoid`,a.getSlabTrapezoidIntegration()),n.UBO.setValue(`SlabSampleStep`,u),ki(n,o),Ai(n,t,i,c);let d=n.WebGPUImageSlice.getPropID(),f=n.WebGPURenderer.getSelector(),p=d;f?.getPropIDForSelection&&(p=f.getPropIDForSelection(d,t)+1),n.UBO.setValue(`PropID`,p);let m=e.getCoincidentParameters();n.UBO.setValue(`CoincidentFactor`,m.factor),n.UBO.setValue(`CoincidentOffset`,m.offset),n.UBO.sendIfNeeded(n.device)},e.updateBuffers=()=>{if(e.updateGeometryBuffers(),!n.currentInput||!n.numberOfVertices)return;let t=n.WebGPUImageSlice.getRenderable(),r=n.currentValidInputs.length;if(n.multiTexturePerVolumeEnabled)for(let i=0;i<r;i++){let{imageData:r,inputIndex:a}=n.currentValidInputs[i];fi(e,n,t,r,a,i)}else{let{imageData:r,inputIndex:i}=n.currentValidInputs[0];fi(e,n,t,r,i,0)}for(let e=r;e<n.scalarTextures.length;e++)n.scalarTextures[e]=null;n.imageState=e.computeImageState(),e.updateLUTImage(),e.updateOpacityLUTImage(),n.imageState.useLabelOutline?(e.updateLabelOutlineThicknessTexture(),e.updateLabelOutlineOpacityTexture()):(n._labelOutlineThicknessHash=null,n._labelOutlineOpacityHash=null);let i=n.imageState.useLabelOutline?oi(n):ii(n);n.textureViews.length=Math.min(n.textureViews.length,i+1),e.updateUBO()},e.replaceShaderPosition=(e,t,r)=>{let i=t.getShaderDescription(`vertex`);i.addBuiltinOutput(`vec4<f32>`,`@builtin(position) Position`),i.addOutput(`vec4<f32>`,`vertexSC`);let a=n.renderable.getSlabThickness()>0,o=i.getCode(),s=[`var vertexWC: vec4<f32> = vec4<f32>(vertexBC.xyz, 1.0);`,`var vertexSC: vec4<f32> = vertexWC - mapperUBO.StabilizedCenter;`,`vertexSC.w = 1.0;`];n.dimensions===2?s.push(`output.tcoordVS = (mapperUBO.SCTCMatrix * vertexWC).xy;`):s.push(`output.tcoordVS = (mapperUBO.SCTCMatrix * vertexWC).xyz;`),s.push(`output.worldPosVS = vertexWC.xyz;`),a&&s.push(r.hasAttribute(`vertexNormal`)?`output.normalWC = normalize(vertexNormal);`:`output.normalWC = mapperUBO.PlaneNormalWC.xyz;`),s.push(`output.vertexSC = vertexSC;`,`var pos: vec4<f32> = rendererUBO.SCPCMatrix * vertexSC;`,`pos.z = clamp(pos.z - 0.000016 * mapperUBO.CoincidentOffset * pos.w, 0.0, pos.w);`,`output.Position = pos;`),o=B.substitute(o,`//VTK::Position::Impl`,s).result,i.setCode(o)},e.getShaderReplacements().set(`replaceShaderPosition`,e.replaceShaderPosition),e.replaceShaderTCoord=(e,t,r)=>{let i=t.getShaderDescription(`vertex`);n.dimensions===2?i.addOutput(`vec2<f32>`,`tcoordVS`):i.addOutput(`vec3<f32>`,`tcoordVS`),i.addOutput(`vec3<f32>`,`worldPosVS`),n.renderable.getSlabThickness()>0&&i.addOutput(`vec3<f32>`,`normalWC`)},e.getShaderReplacements().set(`replaceShaderTCoord`,e.replaceShaderTCoord),e.replaceShaderImage=(t,r,i)=>{let a=r.getShaderDescription(`fragment`),o=a.getCode(),s=e.getImageState(),c=n.currentValidInputs.length,l=gi(n.dimensions),u=e=>_i(n,c,e),d=vi();switch(s.useLabelOutline&&yi(n)&&d.push(...bi()),o=B.substitute(o,`//VTK::Image::Dec`,d).result,o=B.substitute(o,`//VTK::Image::Sample`,Si(n,l,u)).result,s.textureChannelMode){case K.SINGLE:case K.INDEPENDENT_1:o=B.substitute(o,`//VTK::Image::Sample`,Ti(n,l,s.useLabelOutline)).result;break;case K.INDEPENDENT_2:case K.INDEPENDENT_3:case K.INDEPENDENT_4:o=B.substitute(o,`//VTK::Image::Sample`,Ei(n,l)).result;break;default:o=B.substitute(o,`//VTK::Image::Sample`,Di(s.textureChannelMode)).result}a.setCode(o)},e.getShaderReplacements().set(`replaceShaderImage`,e.replaceShaderImage),e.updateLabelOutlineThicknessTexture=()=>{if(!n.labelOutlineProperties.length)return;let{dataArrays:t,hash:r,width:i,height:a}=Re(n.labelOutlineProperties,e=>e.getLabelOutlineThicknessByReference()),o=pi(n,i),s=`${r}-${o}`;if(s===n._labelOutlineThicknessHash)return;n._labelOutlineThicknessHash=s;let c=new Uint8Array(o*a);E(c,t,o);let l=n.device.getTextureManager().getTexture({hash:`irm-outline-thickness-${s}`,nativeArray:c,width:o,height:a,depth:1,format:`r8unorm`,usage:mi()}).createView(`labelOutlineThickness`);e.ensureTextureSampler(l,{minFilter:`nearest`,magFilter:`nearest`}),n.textureViews[ai(n)]=l},e.updateLabelOutlineOpacityTexture=()=>{if(!n.labelOutlineProperties.length)return;let{dataArrays:t,hash:r,width:i,height:a}=Re(n.labelOutlineProperties,e=>{let t=e.getLabelOutlineOpacity();return typeof t==`number`?[t]:t}),o=pi(n,i),s=`${r}-${o}`;if(s===n._labelOutlineOpacityHash)return;n._labelOutlineOpacityHash=s;let c=new Float32Array(o*a);E(c,t,o);let l=n.device.getTextureManager().getTexture({hash:`irm-outline-opacity-${s}`,nativeArray:c,width:o,height:a,depth:1,format:`r16float`,usage:mi()}).createView(`labelOutlineOpacity`);e.ensureTextureSampler(l,{minFilter:`nearest`,magFilter:`nearest`}),n.textureViews[oi(n)]=l}}var Mi={currentValidInputs:null,resliceGeom:null,resliceGeomUpdateString:null,multiTexturePerVolumeEnabled:!1,numberOfComponents:0,labelOutlineProperties:[],_labelOutlineThicknessHash:null,_labelOutlineOpacityHash:null,scalarTextures:[]};function Ni(e,t,n={}){Object.assign(t,Mi,n),_r.extend(e,t,n),z.get(e,t,[`scalarTextures`]);let i=e.computeImageState;e.computeImageState=()=>{if(t.multiTexturePerVolumeEnabled&&t.currentValidInputs?.length)return{actorProperty:r(t.WebGPUImageSlice.getRenderable(),t.currentValidInputs[0].inputIndex),numberOfComponents:t.numberOfComponents,independentComponents:!0,numberOfIComponents:t.numberOfComponents,useLabelOutline:t.labelOutlineProperties.length>0,textureChannelMode:nr(!0,t.numberOfComponents)};let e=i();return e.useLabelOutline=t.labelOutlineProperties.length>0,e};let a=e.updateLUTImage;e.updateLUTImage=()=>{if(!t.multiTexturePerVolumeEnabled){a();return}let n=e.getImageState(),i=t.WebGPUImageSlice.getRenderable(),o=n.numberOfIComponents,s=hn({currentValidInputs:t.currentValidInputs,independentComponents:!0,numberOfRows:o,kind:`color`,getInputProperty:e=>r(i,e)});if(t.colorTextureString===s)return;t.numRows=o;let c=t.numRows*2*t.rowLength*4;(!t.colorLUTArray||t.colorLUTArray.length!==c)&&(t.colorLUTArray=new Uint8ClampedArray(c));let l=t.colorLUTArray,u=t.colorTmpTable,d=t.rowLength*4;l.fill(0);for(let e=0;e<o;e++){let n=r(i,t.currentValidInputs[e].inputIndex)?.getRGBTransferFunction(0);if(n){let r=n.getRange();n.getTable(r[0],r[1],t.rowLength,u,1);let i=e*d*2;for(let e=0;e<t.rowLength;e++){let t=i+e*4,n=t+d;l[t]=255*u[e*3],l[t+1]=255*u[e*3+1],l[t+2]=255*u[e*3+2],l[t+3]=255,l[n]=l[t],l[n+1]=l[t+1],l[n+2]=l[t+2],l[n+3]=l[t+3]}}}let f=t.device.getTextureManager().getTexture({hash:`irm-color-${t.rowLength}-${s}`,nativeArray:l,width:t.rowLength,height:t.numRows*2,depth:1,format:`rgba8unorm`}).createView(`tfunTexture`);e.ensureTextureSampler(f,{minFilter:`linear`,magFilter:`linear`}),t.textureViews[ri(t)]=f,t.colorTextureString=s};let o=e.updateOpacityLUTImage;e.updateOpacityLUTImage=()=>{if(!t.multiTexturePerVolumeEnabled){o();return}let n=e.getImageState(),i=t.WebGPUImageSlice.getRenderable(),a=n.numberOfIComponents,s=hn({currentValidInputs:t.currentValidInputs,independentComponents:!0,numberOfRows:a,kind:`opacity`,getInputProperty:e=>r(i,e)});if(t.opacityTextureString===s)return;t.numRows=a;let c=t.numRows*2*t.rowLength;(!t.opacityLUTArray||t.opacityLUTArray.length!==c)&&(t.opacityLUTArray=new Float32Array(c));let l=t.opacityLUTArray,u=t.opacityTmpTable;l.fill(1);for(let e=0;e<a;e++){let n=r(i,t.currentValidInputs[e].inputIndex)?.getPiecewiseFunction(0);if(n){let r=n.getRange();n.getTable(r[0],r[1],t.rowLength,u,1);let i=e*t.rowLength*2,a=i+t.rowLength;for(let e=0;e<t.rowLength;e++)l[i+e]=u[e],l[a+e]=u[e]}}let d=t.device.getTextureManager().getTexture({hash:`irm-opacity-${t.rowLength}-${s}`,nativeArray:l,width:t.rowLength,height:t.numRows*2,depth:1,format:`r16float`}).createView(`ofunTexture`);e.ensureTextureSampler(d,{minFilter:`linear`,magFilter:`linear`}),t.textureViews[ii(t)]=d,t.opacityTextureString=s},e.setScalarTextures=(n=[])=>{t.scalarTextures=[...n],e.modified()},e.releaseGraphicsResources=()=>{t.vertexInput.releaseGraphicsResources(),t.textureViews.length=0,t.imageState=null,t.pipelineHash=null,t._labelOutlineThicknessHash=null,t._labelOutlineOpacityHash=null,t.colorTextureString=null,t.opacityTextureString=null},t.UBO.addEntry(`StabilizedCenter`,`vec4<f32>`),t.UBO.addEntry(`BackgroundColor`,`vec4<f32>`),t.UBO.addEntry(`PlaneNormalWC`,`vec4<f32>`);for(let e=0;e<4;e++)e>0&&t.UBO.addEntry(ni(e),`mat4x4<f32>`),t.UBO.addEntry(Xr(e),`vec4<f32>`),t.UBO.addEntry(Zr(e),`vec4<f32>`),t.UBO.addEntry(Qr(e),`vec4<f32>`);t.UBO.addEntry(`SlabThickness`,`f32`),t.UBO.addEntry(`SlabType`,`f32`),t.UBO.addEntry(`SlabTrapezoid`,`f32`),t.UBO.addEntry(`SlabSampleStep`,`f32`),t.UBO.addEntry(`PropID`,`u32`),t.outlineFilter=fn.newInstance(),t.cutter=Ht.newInstance(),t.lineToSurfaceFilter=Jt.newInstance(),t.transform=It.newInstance(),ji(e,t),e.delete=z.chain(()=>{e.releaseGraphicsResources(),t.outlineFilter?.delete?.(),t.cutter?.delete?.(),t.lineToSurfaceFilter?.delete?.(),t.transform?.delete?.()},e.delete)}var Pi=z.newInstance(Ni,`vtkWebGPUImageResliceMapper`);ye(`vtkImageResliceMapper`,Pi);var{vtkErrorMacro:Fi}=z;function Ii(e,t){t.classHierarchy.push(`vtkPiecewiseFunction`),e.getSize=()=>t.nodes.length,e.getType=()=>{let e,n=0,r=0;t.nodes.length>0&&(n=t.nodes[0].y);for(let i=1;i<t.nodes.length;i++){if(e=t.nodes[i].y,e!==n){if(e>n)switch(r){case 0:case 1:r=1;break;default:r=3}else switch(r){case 0:case 2:r=2;break;default:r=3}}if(n=e,r===3)break}switch(r){case 0:return`Constant`;case 1:return`NonDecreasing`;case 2:return`NonIncreasing`;default:return`Varied`}},e.getDataPointer=()=>{let e=t.nodes.length;if(t.function=null,e>0){t.function=[];for(let n=0;n<e;n++)t.function[2*n]=t.nodes[n].x,t.function[2*n+1]=t.nodes[n].y}return t.function},e.getFirstNonZeroValue=()=>{if(t.nodes.length===0)return 0;let e=1,n=0,r=0;for(;r<t.nodes.length;r++)if(t.nodes[r].y!==0){e=0;break}return n=e?Number.MAX_VALUE:r>0?t.nodes[r-1].x:t.clamping?-Number.MAX_VALUE:t.nodes[0].x,n},e.getNodeValue=(e,n)=>{let r=t.nodes.length;return e<0||e>=r?(Fi(`Index out of range!`),-1):(n[0]=t.nodes[e].x,n[1]=t.nodes[e].y,n[2]=t.nodes[e].midpoint,n[3]=t.nodes[e].sharpness,1)},e.setNodeValue=(n,r)=>{let i=t.nodes.length;if(n<0||n>=i)return Fi(`Index out of range!`),-1;let a=t.nodes[n].x;return t.nodes[n].x=r[0],t.nodes[n].y=r[1],t.nodes[n].midpoint=r[2],t.nodes[n].sharpness=r[3],a===r[0]?e.modified():e.sortAndUpdateRange(),1},e.addPoint=(t,n)=>e.addPointLong(t,n,.5,0),e.addPointLong=(n,r,i,a)=>{if(i<0||i>1)return Fi(`Midpoint outside range [0.0, 1.0]`),-1;if(a<0||a>1)return Fi(`Sharpness outside range [0.0, 1.0]`),-1;t.allowDuplicateScalars||e.removePoint(n);let o={x:n,y:r,midpoint:i,sharpness:a};t.nodes.push(o),e.sortAndUpdateRange();let s=0;for(;s<t.nodes.length&&t.nodes[s].x!==n;s++);return s<t.nodes.length?s:-1},e.setNodes=n=>{t.nodes!==n&&(t.nodes=n,e.sortAndUpdateRange())},e.sortAndUpdateRange=()=>{t.nodes.sort((e,t)=>e.x-t.x),e.updateRange()||e.modified()},e.updateRange=()=>{let n=t.range.slice(),r=t.nodes.length;return r?(t.range[0]=t.nodes[0].x,t.range[1]=t.nodes[r-1].x):(t.range[0]=0,t.range[1]=0),n[0]===t.range[0]&&n[1]===t.range[1]?!1:(e.modified(),!0)},e.removePoint=n=>{let r=0;for(;r<t.nodes.length&&t.nodes[r].x!==n;r++);if(r>=t.nodes.length)return-1;let i=r,a=!1;return t.nodes.splice(r,1),(r===0||r===t.nodes.length)&&(a=e.updateRange()),a||e.modified(),i},e.removeAllPoints=()=>{t.nodes=[],e.sortAndUpdateRange()},e.addSegment=(n,r,i,a)=>{e.sortAndUpdateRange();for(let e=0;e<t.nodes.length;)t.nodes[e].x>=n&&t.nodes[e].x<=i?t.nodes.splice(e,1):e++;e.addPoint(n,r,.5,0),e.addPoint(i,a,.5,0)},e.getValue=t=>{let n=[];return e.getTable(t,t,1,n),n[0]},e.findX=n=>{let{nodes:r}=t;for(let t=0;t<r.length-1;t++){let{x:i,y:a,sharpness:o}=r[t],{x:s,y:c}=r[t+1];if(n===a)return i;if(n===c&&o<=.99)return s;if(n>=Math.min(a,c)&&n<=Math.max(a,c)){let t=c>=a,r=i,o=s,l=.5*(r+o);for(;r<l&&l<o;){let i=e.getValue(l);(t?i<n:i>n)?r=l:o=l,l=.5*(r+o)}return o}}if(t.clamping&&r.length>0){let e=1/0,t=-1/0;r.forEach(n=>{e=Math.min(e,n.y),t=Math.max(t,n.y)});let i=r[0],a=r[r.length-1];if(n>=t)return i.y===t?i.x:a.y===t?a.x:null;if(n<=e)return i.y===e?i.x:a.y===e?a.x:null}return null},e.adjustRange=n=>{if(n.length<2)return 0;let r=e.getRange();r[0]<n[0]?e.addPoint(n[0],e.getValue(n[0])):e.addPoint(n[0],e.getValue(r[0])),r[1]>n[1]?e.addPoint(n[1],e.getValue(n[1])):e.addPoint(n[1],e.getValue(r[1])),e.sortAndUpdateRange();for(let e=0;e<t.nodes.length;)t.nodes[e].x>=n[0]&&t.nodes[e].x<=n[1]?t.nodes.splice(e,1):++e;return e.sortAndUpdateRange(),1},e.estimateMinNumberOfSamples=(t,n)=>{let r=e.findMinimumXDistance();return Math.ceil((n-t)/r)},e.findMinimumXDistance=()=>{let e=t.nodes.length;if(e<2)return-1;let n=t.nodes[1].x-t.nodes[0].x;for(let r=0;r<e-1;r++){let e=t.nodes[r+1].x-t.nodes[r].x;e<n&&(n=e)}return n},e.getTable=(e,n,r,i,a=1)=>{let o,s=0,c=t.nodes.length,l=0;c!==0&&(l=t.nodes[c-1].y);let u=0,d=0,f=0,p=0,m=0,h=0,g=0;for(o=0;o<r;o++){let _=a*o;for(u=r>1?e+o/(r-1)*(n-e):.5*(e+n);s<c&&u>t.nodes[s].x;)s++,s<c&&(d=t.nodes[s-1].x,f=t.nodes[s].x,p=t.nodes[s-1].y,m=t.nodes[s].y,h=t.nodes[s-1].midpoint,g=t.nodes[s-1].sharpness,h<1e-5&&(h=1e-5),h>.99999&&(h=.99999));if(s>=c)i[_]=t.clamping?l:0;else if(s===0)i[_]=t.clamping?t.nodes[0].y:0;else{let e=(u-d)/(f-d);if(e=e<h?.5*e/h:.5+.5*(e-h)/(1-h),g>.99){if(e<.5){i[_]=p;continue}i[_]=m;continue}if(g<.01){i[_]=(1-e)*p+e*m;continue}e<.5?e=.5*(e*2)**(1+10*g):e>.5&&(e=1-.5*((1-e)*2)**(1+10*g));let t=e*e,n=t*e,r=2*n-3*t+1,a=-2*n+3*t,o=n-2*t+e,s=n-t,c=m-p,l=(1-g)*c;i[_]=r*p+a*m+o*l+s*l;let v=p<m?p:m,y=p>m?p:m;i[_]=i[_]<v?v:i[_],i[_]=i[_]>y?y:i[_]}}}}var Li={range:[0,0],clamping:!0,allowDuplicateScalars:!1};function Ri(e,t,n={}){Object.assign(t,Li,n),z.obj(e,t),t.nodes=[],z.setGet(e,t,[`allowDuplicateScalars`,`clamping`]),z.setArray(e,t,[`range`],2),z.getArray(e,t,[`range`]),Ii(e,t)}var zi={newInstance:z.newInstance(Ri,`vtkPiecewiseFunction`),extend:Ri},Bi={ColorSpace:{RGB:0,HSV:1,LAB:2,DIVERGING:3},Scale:{LINEAR:0,LOG10:1}},{ColorSpace:$,Scale:Vi}=Bi,{ScalarMappingTarget:Hi}=Ze,{vtkDebugMacro:Ui,vtkErrorMacro:Wi,vtkWarningMacro:Gi}=z;function Ki(e,t){let n=e[0],r=e[1],i=e[2],a=Math.sqrt(n*n+r*r+i*i),o=a>.001?Math.acos(n/a):0,s=o>.001?Math.atan2(i,r):0;t[0]=a,t[1]=o,t[2]=s}function qi(e,t){let n=e[0],r=e[1],i=e[2];t[0]=n*Math.cos(r),t[1]=n*Math.sin(r)*Math.cos(i),t[2]=n*Math.sin(r)*Math.sin(i)}function Ji(e,t){if(e[0]>=t-.1)return e[2];let n=e[1]*Math.sqrt(t*t-e[0]*e[0])/(e[0]*Math.sin(e[1]));return e[2]>-.3*Math.PI?e[2]+n:e[2]-n}function Yi(e,t){let n=e-t;for(n<0&&(n=-n);n>=2*Math.PI;)n-=2*Math.PI;return n>Math.PI&&(n=2*Math.PI-n),n}function Xi(e,t,n,r){let i=[],a=[];ge(t,i),ge(n,a);let o=[],s=[];Ki(i,o),Ki(a,s);let c=e;if(o[1]>.05&&s[1]>.05&&Yi(o[2],s[2])>.33*Math.PI){let t=Math.max(o[0],s[0]);t=Math.max(88,t),e<.5?(s[0]=t,s[1]=0,s[2]=0,c*=2):(o[0]=t,o[1]=0,o[2]=0,c=2*c-1)}o[1]<.05&&s[1]>.05?o[2]=Ji(s,o[0]):s[1]<.05&&o[1]>.05&&(s[2]=Ji(o,s[0]));let l=[];l[0]=(1-c)*o[0]+c*s[0],l[1]=(1-c)*o[1]+c*s[1],l[2]=(1-c)*o[2]+c*s[2];let u=[];qi(l,u),Xe(u,r)}function Zi(e,t){t.classHierarchy.push(`vtkColorTransferFunction`),e.getSize=()=>t.nodes.length,e.addRGBPoint=(t,n,r,i)=>e.addRGBPointLong(t,n,r,i,.5,0),e.addRGBPointLong=(n,r,i,a,o=.5,s=0)=>{if(o<0||o>1)return Wi(`Midpoint outside range [0.0, 1.0]`),-1;if(s<0||s>1)return Wi(`Sharpness outside range [0.0, 1.0]`),-1;t.allowDuplicateScalars||e.removePoint(n);let c={x:n,r,g:i,b:a,midpoint:o,sharpness:s};t.nodes.push(c),e.sortAndUpdateRange();let l=0;for(;l<t.nodes.length&&t.nodes[l].x!==n;l++);return l<t.nodes.length?l:-1},e.addHSVPoint=(t,n,r,i)=>e.addHSVPointLong(t,n,r,i,.5,0),e.addHSVPointLong=(t,n,r,i,a=.5,o=0)=>{let s=[];return at([n,r,i],s),e.addRGBPoint(t,s[0],s[1],s[2],a,o)},e.setNodes=n=>{if(t.nodes!==n){let r=JSON.stringify(t.nodes);t.nodes=n;let i=JSON.stringify(t.nodes);if(e.sortAndUpdateRange()||r!==i)return e.modified(),!0}return!1},e.sortAndUpdateRange=()=>{let n=JSON.stringify(t.nodes);t.nodes.sort((e,t)=>e.x-t.x);let r=JSON.stringify(t.nodes),i=e.updateRange();return!i&&n!==r?(e.modified(),!0):i},e.updateRange=()=>{let n=[2];n[0]=t.mappingRange[0],n[1]=t.mappingRange[1];let r=t.nodes.length;return r?(t.mappingRange[0]=t.nodes[0].x,t.mappingRange[1]=t.nodes[r-1].x):(t.mappingRange[0]=0,t.mappingRange[1]=0),n[0]===t.mappingRange[0]&&n[1]===t.mappingRange[1]?!1:(e.modified(),!0)},e.removePoint=n=>{let r=0;for(;r<t.nodes.length&&t.nodes[r].x!==n;r++);let i=r;if(r>=t.nodes.length)return-1;let a=!1;return t.nodes.splice(r,1),(r===0||r===t.nodes.length)&&(a=e.updateRange()),a||e.modified(),i},e.movePoint=(n,r)=>{if(n!==r){e.removePoint(r);for(let i=0;i<t.nodes.length;i++)if(t.nodes[i].x===n){t.nodes[i].x=r,e.sortAndUpdateRange();break}}},e.removeAllPoints=()=>{t.nodes=[],e.sortAndUpdateRange()},e.addRGBSegment=(n,r,i,a,o,s,c,l)=>{e.sortAndUpdateRange();for(let e=0;e<t.nodes.length;)t.nodes[e].x>=n&&t.nodes[e].x<=o?t.nodes.splice(e,1):e++;e.addRGBPointLong(n,r,i,a,.5,0),e.addRGBPointLong(o,s,c,l,.5,0),e.modified()},e.addHSVSegment=(t,n,r,i,a,o,s,c)=>{let l=[n,r,i],u=[o,s,c],d=[],f=[];at(l,d),at(u,f),e.addRGBSegment(t,d[0],d[1],d[2],a,f[0],f[1],f[2])},e.mapValue=t=>{let n=[];return e.getColor(t,n),[Math.floor(255*n[0]+.5),Math.floor(255*n[1]+.5),Math.floor(255*n[2]+.5),255]},e.getColor=(n,r)=>{if(t.indexedLookup){let t=e.getSize(),i=e.getAnnotatedValueIndexInternal(n);if(i<0||t===0){let t=e.getNanColorByReference();r[0]=t[0],r[1]=t[1],r[2]=t[2]}else{let n=[];e.getNodeValue(i%t,n),r[0]=n[1],r[1]=n[2],r[2]=n[3]}return}e.getTable(n,n,1,r)},e.getRedValue=t=>{let n=[];return e.getColor(t,n),n[0]},e.getGreenValue=t=>{let n=[];return e.getColor(t,n),n[1]},e.getBlueValue=t=>{let n=[];return e.getColor(t,n),n[2]},e.logScaleEnabled=()=>t.scale===Vi.LOG10,e.usingLogScale=()=>e.logScaleEnabled()&&t.mappingRange[0]>0,e.getTable=(n,r,i,a)=>{let o=e.usingLogScale(),s=o?Math.log10(Number(n)):Number(n),c=o?Math.log10(Number(r)):Number(r);if(je(s)||je(c)){for(let e=0;e<i;e++)a[e*3+0]=t.nanColor[0],a[e*3+1]=t.nanColor[1],a[e*3+2]=t.nanColor[2];return}let l=0,u=t.nodes.length,d=0,f=0,p=0;u!==0&&(d=t.nodes[u-1].r,f=t.nodes[u-1].g,p=t.nodes[u-1].b);let m=0,h=0,g=0,_=[0,0,0],v=[0,0,0],y=0,b=0,x=[],S=t.mappingRange;o&&(S=[Math.log10(t.mappingRange[0]),Math.log10(t.mappingRange[1])]);for(let n=0;n<i;n++){let r=3*n;if(m=i>1?s+n/(i-1)*(c-s):.5*(s+c),t.discretize){let e=S;if(m>=e[0]&&m<=e[1]){let n=t.numberOfValues,r=e[1]-e[0];if(n<=1)m=e[0]+r/2;else{let t=Ce(n*((m-e[0])/r));m=e[0]+t/(n-1)*r}}}for(;l<u&&m>t.nodes[l].x;)l++,l<u&&(h=t.nodes[l-1].x,g=t.nodes[l].x,_[0]=t.nodes[l-1].r,v[0]=t.nodes[l].r,_[1]=t.nodes[l-1].g,v[1]=t.nodes[l].g,_[2]=t.nodes[l-1].b,v[2]=t.nodes[l].b,y=t.nodes[l-1].midpoint,b=t.nodes[l-1].sharpness,y<1e-5&&(y=1e-5),y>.99999&&(y=.99999));if(m>S[1])a[r]=0,a[r+1]=0,a[r+2]=0,t.clamping&&(e.getUseAboveRangeColor()?(a[r]=t.aboveRangeColor[0],a[r+1]=t.aboveRangeColor[1],a[r+2]=t.aboveRangeColor[2]):(a[r]=d,a[r+1]=f,a[r+2]=p));else if(m<S[0]||Ee(m)&&m<0)a[r]=0,a[r+1]=0,a[r+2]=0,t.clamping&&(e.getUseBelowRangeColor()?(a[r]=t.belowRangeColor[0],a[r+1]=t.belowRangeColor[1],a[r+2]=t.belowRangeColor[2]):u>0&&(a[r]=t.nodes[0].r,a[r+1]=t.nodes[0].g,a[r+2]=t.nodes[0].b));else if(l===0&&(Math.abs(m-s)<1e-6||t.discretize))u>0?(a[r]=t.nodes[0].r,a[r+1]=t.nodes[0].g,a[r+2]=t.nodes[0].b):(a[r]=0,a[r+1]=0,a[r+2]=0);else{let e=0;if(e=(m-h)/(g-h),e=e<y?.5*e/y:.5+.5*(e-y)/(1-y),b>.99){if(e<.5){a[r]=_[0],a[r+1]=_[1],a[r+2]=_[2];continue}a[r]=v[0],a[r+1]=v[1],a[r+2]=v[2];continue}if(b<.01){if(t.colorSpace===$.RGB)a[r]=(1-e)*_[0]+e*v[0],a[r+1]=(1-e)*_[1]+e*v[1],a[r+2]=(1-e)*_[2]+e*v[2];else if(t.colorSpace===$.HSV){let n=[],i=[];Pe(_,n),Pe(v,i),t.hSVWrap&&(n[0]-i[0]>.5||i[0]-n[0]>.5)&&(n[0]>i[0]?--n[0]:--i[0]);let o=[];o[0]=(1-e)*n[0]+e*i[0],o[0]<0&&(o[0]+=1),o[1]=(1-e)*n[1]+e*i[1],o[2]=(1-e)*n[2]+e*i[2],at(o,x),a[r]=x[0],a[r+1]=x[1],a[r+2]=x[2]}else if(t.colorSpace===$.LAB){let t=[],n=[];ge(_,t),ge(v,n);let i=[];i[0]=(1-e)*t[0]+e*n[0],i[1]=(1-e)*t[1]+e*n[1],i[2]=(1-e)*t[2]+e*n[2],Xe(i,x),a[r]=x[0],a[r+1]=x[1],a[r+2]=x[2]}else t.colorSpace===$.DIVERGING?(Xi(e,_,v,x),a[r]=x[0],a[r+1]=x[1],a[r+2]=x[2]):Wi(`ColorSpace set to invalid value.`,t.colorSpace);continue}e<.5?e=.5*(e*2)**(1+10*b):e>.5&&(e=1-.5*((1-e)*2)**(1+10*b));let n=e*e,i=n*e,o=2*i-3*n+1,s=-2*i+3*n,c=i-2*n+e,l=i-n,u,d;if(t.colorSpace===$.RGB)for(let e=0;e<3;e++)u=v[e]-_[e],d=(1-b)*u,a[r+e]=o*_[e]+s*v[e]+c*d+l*d;else if(t.colorSpace===$.HSV){let e=[],n=[];Pe(_,e),Pe(v,n),t.hSVWrap&&(e[0]-n[0]>.5||n[0]-e[0]>.5)&&(e[0]>n[0]?--e[0]:--n[0]);let i=[];for(let t=0;t<3;t++)u=n[t]-e[t],d=(1-b)*u,i[t]=o*e[t]+s*n[t]+c*d+l*d,t===0&&i[t]<0&&(i[t]+=1);at(i,x),a[r]=x[0],a[r+1]=x[1],a[r+2]=x[2]}else if(t.colorSpace===$.LAB){let e=[],t=[];ge(_,e),ge(v,t);let n=[];for(let r=0;r<3;r++)u=t[r]-e[r],d=(1-b)*u,n[r]=o*e[r]+s*t[r]+c*d+l*d;Xe(n,x),a[r]=x[0],a[r+1]=x[1],a[r+2]=x[2]}else t.colorSpace===$.DIVERGING?(Xi(e,_,v,x),a[r]=x[0],a[r+1]=x[1],a[r+2]=x[2]):Wi(`ColorSpace set to invalid value.`);for(let e=0;e<3;e++)a[r+e]=a[r+e]<0?0:a[r+e],a[r+e]=a[r+e]>1?1:a[r+e]}}},e.getUint8Table=(n,r,i,a=!1)=>{if(e.getMTime()<=t.buildTime&&t.tableSize===i&&t.tableWithAlpha!==a)return t.table;if(t.nodes.length===0)return Wi(`Attempting to lookup a value with no points in the function`),t.table;let o=a?4:3;(t.tableSize!==i||t.tableWithAlpha!==a)&&(t.table=new Uint8Array(i*o),t.tableSize=i,t.tableWithAlpha=a);let s=[];e.getTable(n,r,i,s);for(let e=0;e<i;e++)t.table[e*o+0]=Math.floor(s[e*3+0]*255+.5),t.table[e*o+1]=Math.floor(s[e*3+1]*255+.5),t.table[e*o+2]=Math.floor(s[e*3+2]*255+.5),a&&(t.table[e*o+3]=255);return t.buildTime.modified(),t.table},e.buildFunctionFromArray=n=>{e.removeAllPoints();let r=n.getNumberOfComponents();for(let e=0;e<n.getNumberOfTuples();e++)switch(r){case 3:t.nodes.push({x:e,r:n.getComponent(e,0),g:n.getComponent(e,1),b:n.getComponent(e,2),midpoint:.5,sharpness:0});break;case 4:t.nodes.push({x:n.getComponent(e,0),r:n.getComponent(e,1),g:n.getComponent(e,2),b:n.getComponent(e,3),midpoint:.5,sharpness:0});break;case 5:t.nodes.push({x:e,r:n.getComponent(e,0),g:n.getComponent(e,1),b:n.getComponent(e,2),midpoint:n.getComponent(e,4),sharpness:n.getComponent(e,5)});break;case 6:t.nodes.push({x:n.getComponent(e,0),r:n.getComponent(e,1),g:n.getComponent(e,2),b:n.getComponent(e,3),midpoint:n.getComponent(e,4),sharpness:n.getComponent(e,5)})}e.sortAndUpdateRange()},e.buildFunctionFromTable=(n,r,i,a)=>{let o=0;e.removeAllPoints(),i>1&&(o=(r-n)/(i-1));for(let e=0;e<i;e++){let r={x:n+o*e,r:a[e*3],g:a[e*3+1],b:a[e*3+2],sharpness:0,midpoint:.5};t.nodes.push(r)}e.sortAndUpdateRange()},e.getNodeValue=(e,n)=>e<0||e>=t.nodes.length?(Wi(`Index out of range!`),-1):(n[0]=t.nodes[e].x,n[1]=t.nodes[e].r,n[2]=t.nodes[e].g,n[3]=t.nodes[e].b,n[4]=t.nodes[e].midpoint,n[5]=t.nodes[e].sharpness,1),e.setNodeValue=(n,r)=>{if(n<0||n>=t.nodes.length)return Wi(`Index out of range!`),-1;let i=t.nodes[n].x;return t.nodes[n].x=r[0],t.nodes[n].r=r[1],t.nodes[n].g=r[2],t.nodes[n].b=r[3],t.nodes[n].midpoint=r[4],t.nodes[n].sharpness=r[5],i===r[0]?e.modified():e.sortAndUpdateRange(),1},e.getNumberOfAvailableColors=()=>{if(t.indexedLookup&&e.getSize())return e.getSize();if(t.tableSize)return t.tableSize;let n=t.nodes?.length??0;return Math.max(4094,n)},e.getIndexedColor=(t,n)=>{let r=e.getSize();if(r>0&&t>=0){let i=[];e.getNodeValue(t%r,i);for(let e=0;e<3;++e)n[e]=i[e+1];n[3]=1;return}let i=e.getNanColorByReference();n[0]=i[0],n[1]=i[1],n[2]=i[2],n[3]=1},e.fillFromDataPointer=(t,n)=>{if(!(t<=0||!n)){e.removeAllPoints();for(let r=0;r<t;r++)e.addRGBPoint(n[r*4],n[r*4+1],n[r*4+2],n[r*4+3])}},e.setMappingRange=(n,r)=>{let i=[n,r],a=[n,r],o=e.getRange(),s=e.logScaleEnabled();if(o[1]===i[1]&&o[0]===i[0])return;if(i[1]===i[0]){Wi(`attempt to set zero width color range`);return}s&&(i[0]<=0?console.warn(`attempt to set log scale color range with non-positive minimum`):(a[0]=Math.log10(i[0]),a[1]=Math.log10(i[1])));let c=(a[1]-a[0])/(o[1]-o[0]),l=a[0]-o[0]*c;for(let e=0;e<t.nodes.length;++e)t.nodes[e].x=t.nodes[e].x*c+l;t.mappingRange[0]=i[0],t.mappingRange[1]=i[1],e.modified()},e.adjustRange=n=>{let r=e.getRange(),i=[];r[0]<n[0]?(e.getColor(n[0],i),e.addRGBPoint(n[0],i[0],i[1],i[2])):(e.getColor(r[0],i),e.addRGBPoint(n[0],i[0],i[1],i[2])),r[1]>n[1]?(e.getColor(n[1],i),e.addRGBPoint(n[1],i[0],i[1],i[2])):(e.getColor(r[1],i),e.addRGBPoint(n[1],i[0],i[1],i[2])),e.sortAndUpdateRange();for(let e=0;e<t.nodes.length;)t.nodes[e].x>=n[0]&&t.nodes[e].x<=n[1]?t.nodes.splice(e,1):++e;return 1},e.estimateMinNumberOfSamples=(t,n)=>{let r=e.findMinimumXDistance();return Math.ceil((n-t)/r)},e.findMinimumXDistance=()=>{if(t.nodes.length<2)return-1;let e=Number.MAX_VALUE;for(let n=0;n<t.nodes.length-1;n++){let r=t.nodes[n+1].x-t.nodes[n].x;r<e&&(e=r)}return e},e.mapScalarsThroughTable=(n,r,i,a)=>{if(e.getSize()===0){Ui(`Transfer Function Has No Points!`);return}t.indexedLookup?e.mapDataIndexed(n,r,i,a):e.mapData(n,r,i,a)},e.mapData=(t,n,r,i)=>{if(e.getSize()===0){Gi(`Transfer Function Has No Points!`);return}let a=Math.floor(e.getAlpha()*255+.5),o=t.getNumberOfTuples(),s=t.getNumberOfComponents(),c=n.getData(),l=t.getData(),u=[];if(r===Hi.RGBA)for(let t=0;t<o;t++){let n=l[t*s+i];e.getColor(n,u),c[t*4]=Math.floor(u[0]*255+.5),c[t*4+1]=Math.floor(u[1]*255+.5),c[t*4+2]=Math.floor(u[2]*255+.5),c[t*4+3]=a}if(r===Hi.RGB)for(let t=0;t<o;t++){let n=l[t*s+i];e.getColor(n,u),c[t*3]=Math.floor(u[0]*255+.5),c[t*3+1]=Math.floor(u[1]*255+.5),c[t*3+2]=Math.floor(u[2]*255+.5)}if(r===Hi.LUMINANCE)for(let t=0;t<o;t++){let n=l[t*s+i];e.getColor(n,u),c[t]=Math.floor(u[0]*76.5+u[1]*150.45+u[2]*28.05+.5)}if(r===Hi.LUMINANCE_ALPHA)for(let t=0;t<o;t++){let n=l[t*s+i];e.getColor(n,u),c[t*2]=Math.floor(u[0]*76.5+u[1]*150.45+u[2]*28.05+.5),c[t*2+1]=a}},e.applyColorMap=n=>{let r=JSON.stringify(t.colorSpace);n.ColorSpace&&(t.colorSpace=$[n.ColorSpace.toUpperCase()],t.colorSpace===void 0&&(Wi(`ColorSpace ${n.ColorSpace} not supported, using RGB instead`),t.colorSpace=$.RGB));let i=r!==JSON.stringify(t.colorSpace),a=i||JSON.stringify(t.nanColor);if(n.NanColor)for(t.nanColor=[].concat(n.NanColor);t.nanColor.length<4;)t.nanColor.push(1);i||=a!==JSON.stringify(t.nanColor);let o=i||JSON.stringify(t.nodes);if(n.RGBPoints){let e=n.RGBPoints.length;t.nodes=[];for(let r=0;r<e;r+=4)t.nodes.push({x:n.RGBPoints[r],r:n.RGBPoints[r+1],g:n.RGBPoints[r+2],b:n.RGBPoints[r+3],midpoint:.5,sharpness:0})}let s=e.sortAndUpdateRange(),c=!s&&(i||o!==JSON.stringify(t.nodes));return c&&e.modified(),s||c},e.getDataPointer=()=>t.nodes}var Qi={clamping:!0,colorSpace:$.RGB,hSVWrap:!0,scale:Vi.LINEAR,nanColor:null,belowRangeColor:null,aboveRangeColor:null,useAboveRangeColor:!1,useBelowRangeColor:!1,allowDuplicateScalars:!1,table:null,tableSize:0,buildTime:null,nodes:null,discretize:!1,numberOfValues:256};function $i(e,t,n={}){Object.assign(t,Qi,n),Ze.extend(e,t,n),t.table=[],t.nodes=[],t.nanColor=[.5,0,0,1],t.belowRangeColor=[0,0,0,1],t.aboveRangeColor=[1,1,1,1],t.buildTime={},z.obj(t.buildTime),z.get(e,t,[`buildTime`,`mappingRange`]),z.setGet(e,t,[`useAboveRangeColor`,`useBelowRangeColor`,`discretize`,`numberOfValues`,{type:`enum`,name:`colorSpace`,enum:$},{type:`enum`,name:`scale`,enum:Vi}]),z.setArray(e,t,[`nanColor`,`belowRangeColor`,`aboveRangeColor`],4),z.getArray(e,t,[`nanColor`,`belowRangeColor`,`aboveRangeColor`]),Zi(e,t)}var ea={newInstance:z.newInstance($i,`vtkColorTransferFunction`),extend:$i,...Bi},{InterpolationType:ta,OpacityMode:na,FilterMode:ra,ColorMixPreset:ia}=ie,{vtkErrorMacro:aa}=z,oa=4;function sa(e,t){t.classHierarchy.push(`vtkVolumeProperty`);let n={...e};e.getMTime=()=>{let e=t.mtime,n;for(let r=0;r<oa;r++)t.componentData[r].colorChannels===1?t.componentData[r].grayTransferFunction&&(n=t.componentData[r].grayTransferFunction.getMTime(),e=e>n?e:n):t.componentData[r].colorChannels===3&&t.componentData[r].rGBTransferFunction&&(n=t.componentData[r].rGBTransferFunction.getMTime(),e=e>n?e:n),t.componentData[r].scalarOpacity&&(n=t.componentData[r].scalarOpacity.getMTime(),e=e>n?e:n),t.componentData[r].gradientOpacity&&(t.componentData[r].disableGradientOpacity||(n=t.componentData[r].gradientOpacity.getMTime(),e=e>n?e:n));return e},e.getColorChannels=e=>e<0||e>3?(aa(`Bad index - must be between 0 and 3`),0):t.componentData[e].colorChannels,e.getUseIndependentComponents=e=>t.independentComponents&&e>=2||!!t.colorMixPreset,e.setGrayTransferFunction=(n=0,r=null)=>{let i=!1;return t.componentData[n].grayTransferFunction!==r&&(t.componentData[n].grayTransferFunction=r,i=!0),t.componentData[n].colorChannels!==1&&(t.componentData[n].colorChannels=1,i=!0),i&&e.modified(),i},e.getGrayTransferFunction=(n=0)=>(t.componentData[n].grayTransferFunction===null&&(t.componentData[n].grayTransferFunction=zi.newInstance(),t.componentData[n].grayTransferFunction.addPoint(0,0),t.componentData[n].grayTransferFunction.addPoint(1024,1),t.componentData[n].colorChannels!==1&&(t.componentData[n].colorChannels=1),e.modified()),t.componentData[n].grayTransferFunction),e.setRGBTransferFunction=(n=0,r=null)=>{let i=!1;return t.componentData[n].rGBTransferFunction!==r&&(t.componentData[n].rGBTransferFunction=r,i=!0),t.componentData[n].colorChannels!==3&&(t.componentData[n].colorChannels=3,i=!0),i&&e.modified(),i},e.getRGBTransferFunction=(n=0)=>(t.componentData[n].rGBTransferFunction===null&&(t.componentData[n].rGBTransferFunction=ea.newInstance(),t.componentData[n].rGBTransferFunction.addRGBPoint(0,0,0,0),t.componentData[n].rGBTransferFunction.addRGBPoint(1024,1,1,1),t.componentData[n].colorChannels!==3&&(t.componentData[n].colorChannels=3),e.modified()),t.componentData[n].rGBTransferFunction),e.setScalarOpacity=(n=0,r=null)=>t.componentData[n].scalarOpacity!==r&&(t.componentData[n].scalarOpacity=r,e.modified(),!0),e.getScalarOpacity=(n=0)=>(t.componentData[n].scalarOpacity===null&&(t.componentData[n].scalarOpacity=zi.newInstance(),t.componentData[n].scalarOpacity.addPoint(0,1),t.componentData[n].scalarOpacity.addPoint(1024,1),e.modified()),t.componentData[n].scalarOpacity),e.setComponentWeight=(n=0,r=1)=>{if(n<0||n>=oa)return aa(`Invalid index`),!1;let i=Math.min(1,Math.max(0,r));return t.componentData[n].componentWeight!==i&&(t.componentData[n].componentWeight=i,e.modified(),!0)},e.getComponentWeight=(e=0)=>e<0||e>=oa?(aa(`Invalid index`),0):t.componentData[e].componentWeight,e.setInterpolationTypeToNearest=()=>e.setInterpolationType(ta.NEAREST),e.setInterpolationTypeToLinear=()=>e.setInterpolationType(ta.LINEAR),e.setInterpolationTypeToFastLinear=()=>e.setInterpolationType(ta.FAST_LINEAR),e.getInterpolationTypeAsString=()=>z.enumToString(ta,t.interpolationType),[`useGradientOpacity`,`scalarOpacityUnitDistance`,`gradientOpacityMinimumValue`,`gradientOpacityMinimumOpacity`,`gradientOpacityMaximumValue`,`gradientOpacityMaximumOpacity`,`opacityMode`,`forceNearestInterpolation`].forEach(n=>{let r=z.capitalize(n);e[`set${r}`]=(r,i)=>t.componentData[r][`${n}`]!==i&&(t.componentData[r][`${n}`]=i,e.modified(),!0)}),[`useGradientOpacity`,`scalarOpacityUnitDistance`,`gradientOpacityMinimumValue`,`gradientOpacityMinimumOpacity`,`gradientOpacityMaximumValue`,`gradientOpacityMaximumOpacity`,`opacityMode`,`forceNearestInterpolation`].forEach(n=>{let r=z.capitalize(n);e[`get${r}`]=e=>t.componentData[e][`${n}`]}),e.setAverageIPScalarRange=(t,n)=>{console.warn(`setAverageIPScalarRange is deprecated use setIpScalarRange`),e.setIpScalarRange(t,n)},e.getFilterModeAsString=()=>z.enumToString(ra,t.filterMode),e.setFilterModeToOff=()=>{e.setFilterMode(ra.OFF)},e.setFilterModeToNormalized=()=>{e.setFilterMode(ra.NORMALIZED)},e.setFilterModeToRaw=()=>{e.setFilterMode(ra.RAW)},e.setGlobalIlluminationReach=e=>n.setGlobalIlluminationReach(Le(e,0,1)),e.setVolumetricScatteringBlending=e=>n.setVolumetricScatteringBlending(Le(e,0,1)),e.setAnisotropy=e=>n.setAnisotropy(Le(e,-.99,.99)),e.setLAOKernelSize=e=>n.setLAOKernelSize(Ce(Le(e,1,32))),e.setLAOKernelRadius=e=>n.setLAOKernelRadius(e>=1?e:1)}var ca=e=>({colorMixPreset:ia.DEFAULT,independentComponents:!0,interpolationType:ta.FAST_LINEAR,shade:!1,ambient:.1,diffuse:.7,specular:.2,specularPower:10,useLabelOutline:!1,labelOutlineThickness:[1],labelOutlineOpacity:1,ipScalarRange:[-1e6,1e6],filterMode:ra.OFF,preferSizeOverAccuracy:!1,computeNormalFromOpacity:!1,volumetricScatteringBlending:0,globalIlluminationReach:0,anisotropy:0,localAmbientOcclusion:!1,LAOKernelSize:15,LAOKernelRadius:7,updatedExtents:[],...e});function la(e,t,n={}){if(Object.assign(t,ca(n)),z.obj(e,t),!t.componentData){t.componentData=[];for(let e=0;e<oa;++e)t.componentData.push({colorChannels:1,grayTransferFunction:null,rGBTransferFunction:null,scalarOpacity:null,scalarOpacityUnitDistance:1,opacityMode:na.FRACTIONAL,gradientOpacityMinimumValue:0,gradientOpacityMinimumOpacity:0,gradientOpacityMaximumValue:1,gradientOpacityMaximumOpacity:1,useGradientOpacity:!1,componentWeight:1,forceNearestInterpolation:!1})}z.setGet(e,t,[`colorMixPreset`,`independentComponents`,`interpolationType`,`shade`,`ambient`,`diffuse`,`specular`,`specularPower`,`useLabelOutline`,`labelOutlineOpacity`,`filterMode`,`preferSizeOverAccuracy`,`computeNormalFromOpacity`,`volumetricScatteringBlending`,`globalIlluminationReach`,`anisotropy`,`localAmbientOcclusion`,`LAOKernelSize`,`LAOKernelRadius`,`updatedExtents`]),z.setGetArray(e,t,[`ipScalarRange`],2),z.setGetArray(e,t,[`labelOutlineThickness`]),sa(e,t)}var ua={newInstance:z.newInstance(la,`vtkVolumeProperty`),extend:la,...ie};function da(e,t){t.classHierarchy.push(`vtkVolume`),e.getVolumes=()=>[e],e.makeProperty=ua.newInstance,e.getRedrawMTime=()=>{let e=t.mtime;if(t.mapper!==null){let n=t.mapper.getMTime();e=n>e?n:e,t.mapper.getInput()!==null&&(t.mapper.getInputAlgorithm().update(),n=t.mapper.getInput().getMTime(),e=n>e?n:e)}return e}}var fa={mapper:null};function pa(e,t,n={}){Object.assign(t,fa,n),et.extend(e,t,n),t.boundsMTime={},z.obj(t.boundsMTime),z.setGet(e,t,[`mapper`]),da(e,t)}var ma={newInstance:z.newInstance(pa,`vtkVolume`),extend:pa},{BlendMode:ha}=s;function ga(e,t,n,r,i){let a=null;return i?(a=i,a.removeAllPoints()):a=zi.newInstance(),a.addPointLong(-1024,0,1,1),a.addPoint(e,t),a.addPoint(n,r),a}var _a=`getAnisotropy.getComputeNormalFromOpacity.getFilterMode.getFilterModeAsString.getGlobalIlluminationReach.getIpScalarRange.getIpScalarRangeByReference.getLAOKernelRadius.getLAOKernelSize.getLocalAmbientOcclusion.getPreferSizeOverAccuracy.getVolumetricScatteringBlending.setAnisotropy.setAverageIPScalarRange.setComputeNormalFromOpacity.setFilterMode.setFilterModeToNormalized.setFilterModeToOff.setFilterModeToRaw.setGlobalIlluminationReach.setIpScalarRange.setIpScalarRangeFrom.setLAOKernelRadius.setLAOKernelSize.setLocalAmbientOcclusion.setPreferSizeOverAccuracy.setVolumetricScatteringBlending`.split(`.`),va={createRadonTransferFunction:ga};function ya(e,t){t.classHierarchy.push(`vtkVolumeMapper`);let n={...e};e.computeBounds=()=>{let n=e.getInputData();if(!n){ht.reset(t.bounds);return}t.static||e.update(),ht.setBounds(t.bounds,n.getBounds())},e.setBlendModeToComposite=()=>{e.setBlendMode(ha.COMPOSITE_BLEND)},e.setBlendModeToMaximumIntensity=()=>{e.setBlendMode(ha.MAXIMUM_INTENSITY_BLEND)},e.setBlendModeToMinimumIntensity=()=>{e.setBlendMode(ha.MINIMUM_INTENSITY_BLEND)},e.setBlendModeToAverageIntensity=()=>{e.setBlendMode(ha.AVERAGE_INTENSITY_BLEND)},e.setBlendModeToAdditiveIntensity=()=>{e.setBlendMode(ha.ADDITIVE_INTENSITY_BLEND)},e.setBlendModeToRadonTransform=()=>{e.setBlendMode(ha.RADON_TRANSFORM_BLEND)},e.getBlendModeAsString=()=>z.enumToString(ha,t.blendMode),e.setVolumeShadowSamplingDistFactor=e=>n.setVolumeShadowSamplingDistFactor(e>=1?e:1),_a.forEach(t=>{e[t]=()=>{throw Error(`The method "volumeMapper.${t}()" doesn't exist anymore. It is a rendering property that has been moved to the volume property. Replace your code with:\nvolumeActor.getProperty().${t}()\n`)}})}var ba=e=>({bounds:[...ht.INIT_BOUNDS],sampleDistance:1,imageSampleDistance:1,maximumSamplesPerRay:1e3,autoAdjustSampleDistances:!0,initialInteractionScale:1,interactionSampleDistanceFactor:1,blendMode:ha.COMPOSITE_BLEND,volumeShadowSamplingDistFactor:5,colorTextureWidth:1024,opacityTextureWidth:1024,labelOutlineTextureWidth:1024,...e});function xa(e,t,n={}){Object.assign(t,ba(n)),_e.extend(e,t,n),z.setGet(e,t,[`sampleDistance`,`imageSampleDistance`,`maximumSamplesPerRay`,`autoAdjustSampleDistances`,`initialInteractionScale`,`interactionSampleDistanceFactor`,`blendMode`,`volumeShadowSamplingDistFactor`,`colorTextureWidth`,`opacityTextureWidth`,`labelOutlineTextureWidth`]),z.event(e,t,`lightingActivated`),ya(e,t)}var Sa={newInstance:z.newInstance(xa,`vtkVolumeMapper`),extend:xa,...va};export{vt as a,zi as i,ma as n,_t as o,ea as r,Sa as t};