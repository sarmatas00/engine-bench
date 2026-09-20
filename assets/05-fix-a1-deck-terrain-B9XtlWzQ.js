import{i as e,t}from"./rolldown-runtime-Dd_uD5pT.js";import{i as n,s as r}from"./dataset-5whEyHbd.js";import{r as i,t as a}from"./chrome-BDM6kZSm.js";import{$ as o,A as s,B as c,D as l,E as u,G as d,H as f,I as p,K as m,N as h,P as g,Q as _,T as v,U as y,X as b,Y as x,Z as S,_ as C,_t as w,a as T,gt as ee,h as E,i as te,j as ne,n as re,o as D,p as O,q as k,r as ie,u as A,vt as ae,w as oe,yt as se,z as ce}from"./deck-map-DlPjarle.js";import{u as le}from"./shader-type-decoder-C6G-bVH3.js";import{a as ue,d as j,f as M,h as de,i as fe,m as pe,p as N,r as P,s as F}from"./matrix-Cqu2dLLX.js";import{a as me,i as he,n as ge,r as _e,t as ve}from"./simple-mesh-layer-BUMTkYz2.js";var ye=`Queued Requests`,be=`Active Requests`,xe=`Cancelled Requests`,Se=`Queued Requests Ever`,Ce=`Active Requests Ever`,we={id:`request-scheduler`,throttleRequests:!0,maxRequests:6,debounceTime:0},Te=class{props;stats;activeRequestCount=0;requestQueue=[];requestMap=new Map;updateTimer=null;constructor(e={}){this.props={...we,...e},this.stats=new se({id:this.props.id}),this.stats.get(ye),this.stats.get(be),this.stats.get(xe),this.stats.get(Se),this.stats.get(Ce)}setProps(e){e.throttleRequests!==void 0&&(this.props.throttleRequests=e.throttleRequests),e.maxRequests!==void 0&&(this.props.maxRequests=e.maxRequests),e.debounceTime!==void 0&&(this.props.debounceTime=e.debounceTime)}scheduleRequest(e,t=()=>0){if(!this.props.throttleRequests)return Promise.resolve({done:()=>{}});if(this.requestMap.has(e))return this.requestMap.get(e);let n={handle:e,priority:0,getPriority:t},r=new Promise(e=>(n.resolve=e,n));return this.requestQueue.push(n),this.requestMap.set(e,r),this._issueNewRequests(),r}_issueRequest(e){let{handle:t,resolve:n}=e,r=!1,i=()=>{r||(r=!0,this.requestMap.delete(t),this.activeRequestCount--,this._issueNewRequests())};return this.activeRequestCount++,n?n({done:i}):Promise.resolve({done:i})}_issueNewRequests(){this.updateTimer!==null&&clearTimeout(this.updateTimer),this.updateTimer=setTimeout(()=>this._issueNewRequestsAsync(),this.props.debounceTime)}_issueNewRequestsAsync(){this.updateTimer!==null&&clearTimeout(this.updateTimer),this.updateTimer=null;let e=Math.max(this.props.maxRequests-this.activeRequestCount,0);if(e!==0){this._updateAllRequests();for(let t=0;t<e;++t){let e=this.requestQueue.shift();e&&this._issueRequest(e)}}}_updateAllRequests(){let e=this.requestQueue;for(let t=0;t<e.length;++t){let n=e[t];this._updateRequest(n)||(e.splice(t,1),this.requestMap.delete(n.handle),t--)}e.sort((e,t)=>e.priority-t.priority)}_updateRequest(e){return e.priority=e.getPriority(e.handle),e.priority<0?(e.resolve(null),!1):!0}},Ee=1e-15,De=1e-20;Math.PI/2,Math.PI/4,Math.PI/6,Math.PI*2;var Oe={props:{},name:`gouraudMaterial`,bindingLayout:[{name:`gouraudMaterial`,group:3}],vs:_e.replace(`phongMaterial`,`gouraudMaterial`),fs:he.replace(`phongMaterial`,`gouraudMaterial`),source:ge.replaceAll(`phongMaterial`,`gouraudMaterial`),defines:{LIGHTING_VERTEX:!0},dependencies:[de,me],uniformTypes:{unlit:`i32`,ambient:`f32`,diffuse:`f32`,shininess:`f32`,specularColor:`vec3<f32>`},defaultUniforms:{unlit:!1,ambient:.35,diffuse:.6,shininess:32,specularColor:[38.25,38.25,38.25]},getUniforms(e){return{...Oe.defaultUniforms,...e}}},ke=`compositeLayer.renderLayers`,I=class extends P{get isComposite(){return!0}get isDrawable(){return!1}get isLoaded(){return super.isLoaded&&this.getSubLayers().every(e=>e.isLoaded)}getSubLayers(){return this.internalState&&this.internalState.subLayers||[]}initializeState(e){}setState(e){super.setState(e),this.setNeedsUpdate()}getPickingInfo({info:e}){let{object:t}=e;return t&&t.__source&&t.__source.parent&&t.__source.parent.id===this.id?(e.object=t.__source.object,e.index=t.__source.index,e):e}filterSubLayer(e){return!0}shouldRenderSubLayer(e,t){return t&&t.length}getSubLayerClass(e,t){let{_subLayerProps:n}=this.props;return n&&n[e]&&n[e].type||t}getSubLayerRow(e,t,n){return e.__source={parent:this,object:t,index:n},e}getSubLayerAccessor(e){if(typeof e==`function`){let t={index:-1,data:this.props.data,target:[]};return(n,r)=>n&&n.__source?(t.index=n.__source.index,e(n.__source.object,t)):e(n,r)}return e}getSubLayerProps(e={}){let{opacity:t,pickable:n,visible:r,parameters:i,getPolygonOffset:a,highlightedObjectIndex:o,autoHighlight:s,highlightColor:c,coordinateSystem:l,coordinateOrigin:u,wrapLongitude:d,positionFormat:f,modelMatrix:p,extensions:m,fetch:h,operation:g,_subLayerProps:_}=this.props,v={id:``,updateTriggers:{},opacity:t,pickable:n,visible:r,parameters:i,getPolygonOffset:a,highlightedObjectIndex:o,autoHighlight:s,highlightColor:c,coordinateSystem:l,coordinateOrigin:u,wrapLongitude:d,positionFormat:f,modelMatrix:p,extensions:m,fetch:h,operation:g},y=_&&e.id&&_[e.id],b=y&&y.updateTriggers,x=e.id||`sublayer`;if(y){let t=this.props[oe],n=e.type?e.type._propTypes:{};for(let e in y){let r=n[e]||t[e];r&&r.type===`accessor`&&(y[e]=this.getSubLayerAccessor(y[e]))}}Object.assign(v,e,y),v.id=`${this.props.id}-${x}`,v.updateTriggers={all:this.props.updateTriggers?.all,...e.updateTriggers,...b};for(let e of m){let t=e.getSubLayerProps.call(this,e);t&&Object.assign(v,t,{updateTriggers:Object.assign(v.updateTriggers,t.updateTriggers)})}return v}_updateAutoHighlight(e){for(let t of this.getSubLayers())t.updateAutoHighlight(e)}_getAttributeManager(){return null}_postUpdate(e,t){let n=this.internalState.subLayers,r=!n||this.needsUpdate();if(r){let e=this.renderLayers();n=C(e,Boolean),this.internalState.subLayers=n}ee(ke,this,r,n);for(let e of n)e.parent=this}};I.layerName=`CompositeLayer`;var Ae=new y().lookAt({eye:[0,0,1]});function je({width:e,height:t,near:n,far:r,padding:i}){let a=-e/2,o=e/2,s=-t/2,c=t/2;if(i){let{left:n=0,right:r=0,top:l=0,bottom:u=0}=i,d=_((n+e-r)/2,0,e)-e/2,f=_((l+t-u)/2,0,t)-t/2;a-=d,o-=d,s+=f,c+=f}return new y().ortho({left:a,right:o,bottom:s,top:c,near:n,far:r})}var Me=class extends l{constructor(e){let{width:t,height:n,near:r=.1,far:i=1e3,zoom:a=0,target:o=[0,0,0],padding:s=null,flipY:c=!0}=e,l=e.zoomX??(Array.isArray(a)?a[0]:a),u=e.zoomY??(Array.isArray(a)?a[1]:a),d=Number.isFinite(e.zoom)?e.zoom:Math.min(l,u),f=2**d,p;if(l!==d||u!==d){let e=2**l,t=2**u;p={unitsPerMeter:[e/f,t/f,1],metersPerUnit:[f/e,f/t,1]}}super({...e,longitude:void 0,position:o,viewMatrix:Ae.clone().scale([f,f*(c?-1:1),f]),projectionMatrix:je({width:t||1,height:n||1,padding:s,near:r,far:i}),zoom:d,distanceScales:p}),this.target=o,this.zoomX=l,this.zoomY=u,this.flipY=c}projectFlat([e,t]){let{unitsPerMeter:n}=this.distanceScales;return[e*n[0],t*n[1]]}unprojectFlat([e,t]){let{metersPerUnit:n}=this.distanceScales;return[e*n[0],t*n[1]]}panByPosition(e,t,n){let r=g(t,this.pixelUnprojectionMatrix),i=this.projectFlat(e),a=x([],i,b([],r)),o=x([],this.center,a);return{target:this.unprojectFlat(o)}}};Me.displayName=`OrthographicViewport`;var Ne=class{static get componentName(){return Object.prototype.hasOwnProperty.call(this,`extensionName`)?this.extensionName:``}constructor(e){e&&(this.opts=e)}equals(e){return this===e||this.constructor===e.constructor&&E(this.opts,e.opts,1)}getShaders(e){return null}getSubLayerProps(e){let{defaultProps:t}=e.constructor,n={updateTriggers:{}};for(let e in t)if(e in this.props){let r=t[e],i=this.props[e];n[e]=i,r&&r.type===`accessor`&&(n.updateTriggers[e]=this.props.updateTriggers[e],typeof i==`function`&&(n[e]=this.getSubLayerAccessor(i)))}return n}initializeState(e,t){}updateState(e,t){}onNeedsRedraw(e){}getNeedsPickingBuffer(e){return!1}draw(e,t){}finalizeState(e,t){}};Ne.defaultProps={},Ne.extensionName=`LayerExtension`;var Pe=class{constructor(e){this.indexStarts=[0],this.vertexStarts=[0],this.vertexCount=0,this.instanceCount=0;let{attributes:t={}}=e;this.typedArrayManager=s,this.attributes={},this._attributeDefs=t,this.opts=e,this.updateGeometry(e)}updateGeometry(e){Object.assign(this.opts,e);let{data:t,buffers:n={},getGeometry:r,geometryBuffer:i,positionFormat:a,dataChanged:o,normalize:s=!0}=this.opts;if(this.data=t,this.getGeometry=r,this.positionSize=i&&i.size||(a===`XY`?2:3),this.buffers=n,this.normalize=s,i&&(O(t.startIndices),this.getGeometry=this.getGeometryFromBuffer(i),s||(n.vertexPositions=i)),this.geometryBuffer=n.vertexPositions,Array.isArray(o))for(let e of o)this._rebuildGeometry(e);else this._rebuildGeometry()}updatePartialGeometry({startRow:e,endRow:t}){this._rebuildGeometry({startRow:e,endRow:t})}getGeometryFromBuffer(e){let t=e.value||e;return ArrayBuffer.isView(t)?ue(t,{size:this.positionSize,offset:e.offset,stride:e.stride,startIndices:this.data.startIndices}):null}_allocate(e,t){let{attributes:n,buffers:r,_attributeDefs:i,typedArrayManager:a}=this;for(let o in i)if(o in r)a.release(n[o]),n[o]=null;else{let r=i[o];r.copy=t,n[o]=a.allocate(n[o],e,r)}}_forEachGeometry(e,t,n){let{data:r,getGeometry:i}=this,{iterable:a,objectInfo:o}=fe(r,t,n);for(let t of a)o.index++,e(i?i(t,o):null,o.index)}_rebuildGeometry(e){if(!this.data)return;let{indexStarts:t,vertexStarts:n,instanceCount:r}=this,{data:i,geometryBuffer:a}=this,{startRow:o=0,endRow:s=1/0}=e||{},c={};if(e||(t=[0],n=[0]),this.normalize||!a)this._forEachGeometry((e,t)=>{let r=e&&this.normalizeGeometry(e);c[t]=r,n[t+1]=n[t]+(r?this.getGeometrySize(r):0)},o,s),r=n[n.length-1];else if(n=i.startIndices,r=n[i.length]||0,ArrayBuffer.isView(a))r||=a.length/this.positionSize;else if(a instanceof le){let e=this.positionSize*4;r||=a.byteLength/e}else if(a.buffer){let e=a.stride||this.positionSize*4;r||=a.buffer.byteLength/e}else if(a.value){let e=a.value,t=a.stride/e.BYTES_PER_ELEMENT||this.positionSize;r||=e.length/t}this._allocate(r,!!e),this.indexStarts=t,this.vertexStarts=n,this.instanceCount=r;let l={};this._forEachGeometry((e,i)=>{let a=c[i]||e;l.vertexStart=n[i],l.indexStart=t[i];let o=i<n.length-1?n[i+1]:r;l.geometrySize=o-n[i],l.geometryIndex=i,this.updateGeometryAttributes(a,l)},o,s),this.vertexCount=t[t.length-1]}},Fe=`layout(std140) uniform iconUniforms {
  float sizeScale;
  vec2 iconsTextureDim;
  float sizeBasis;
  float sizeMinPixels;
  float sizeMaxPixels;
  bool billboard;
  highp int sizeUnits;
  float alphaCutoff;
} icon;
`,Ie={name:`icon`,vs:Fe,fs:Fe,uniformTypes:{sizeScale:`f32`,iconsTextureDim:`vec2<f32>`,sizeBasis:`f32`,sizeMinPixels:`f32`,sizeMaxPixels:`f32`,billboard:`f32`,sizeUnits:`i32`,alphaCutoff:`f32`}},Le=`#version 300 es
#define SHADER_NAME icon-layer-vertex-shader
in vec2 positions;
in vec3 instancePositions;
in vec3 instancePositions64Low;
in float instanceSizes;
in float instanceAngles;
in vec4 instanceColors;
#ifdef USE_ROW_INDEXES
in float rowIndexes;
#endif
in vec4 instanceIconFrames;
in float instanceColorModes;
in vec2 instanceOffsets;
in vec2 instancePixelOffset;
out float vColorMode;
out vec4 vColor;
out vec2 vTextureCoords;
out vec2 uv;
vec2 rotate_by_angle(vec2 vertex, float angle) {
float angle_radian = angle * PI / 180.0;
float cos_angle = cos(angle_radian);
float sin_angle = sin(angle_radian);
mat2 rotationMatrix = mat2(cos_angle, -sin_angle, sin_angle, cos_angle);
return rotationMatrix * vertex;
}
void main(void) {
geometry.worldPosition = instancePositions;
geometry.uv = positions;
#ifdef USE_ROW_INDEXES
geometry.pickingColor = picking_getPickingColorFromIndex(rowIndexes);
#else
geometry.pickingColor = picking_getPickingColorFromInstanceID();
#endif
uv = positions;
vec2 iconSize = instanceIconFrames.zw;
float sizePixels = clamp(
project_size_to_pixel(instanceSizes * icon.sizeScale, icon.sizeUnits),
icon.sizeMinPixels, icon.sizeMaxPixels
);
float iconConstraint = icon.sizeBasis == 0.0 ? iconSize.x : iconSize.y;
float instanceScale = iconConstraint == 0.0 ? 0.0 : sizePixels / iconConstraint;
vec2 pixelOffset = positions / 2.0 * iconSize + instanceOffsets;
pixelOffset = rotate_by_angle(pixelOffset, instanceAngles) * instanceScale;
pixelOffset += instancePixelOffset;
pixelOffset.y *= -1.0;
if (icon.billboard)  {
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
vec3 offset = vec3(pixelOffset, 0.0);
DECKGL_FILTER_SIZE(offset, geometry);
gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);
} else {
vec3 offset_common = vec3(project_pixel_size(pixelOffset), 0.0);
DECKGL_FILTER_SIZE(offset_common, geometry);
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset_common, geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
}
vTextureCoords = mix(
instanceIconFrames.xy,
instanceIconFrames.xy + iconSize,
(positions.xy + 1.0) / 2.0
) / icon.iconsTextureDim;
vColor = instanceColors;
DECKGL_FILTER_COLOR(vColor, geometry);
vColorMode = instanceColorModes;
}
`,Re=`#version 300 es
#define SHADER_NAME icon-layer-fragment-shader
precision highp float;
uniform sampler2D iconsTexture;
in float vColorMode;
in vec4 vColor;
in vec2 vTextureCoords;
in vec2 uv;
out vec4 fragColor;
void main(void) {
geometry.uv = uv;
vec4 texColor = texture(iconsTexture, vTextureCoords);
vec3 color = mix(texColor.rgb, vColor.rgb, vColorMode);
float a = texColor.a * layer.opacity * vColor.a;
if (a < icon.alphaCutoff) {
discard;
}
fragColor = vec4(color, a);
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`,ze=`struct IconUniforms {
  sizeScale: f32,
  iconsTextureDim: vec2<f32>,
  sizeBasis: f32,
  sizeMinPixels: f32,
  sizeMaxPixels: f32,
  billboard: i32,
  sizeUnits: i32,
  alphaCutoff: f32
};

@group(0) @binding(auto) var<uniform> icon: IconUniforms;
@group(0) @binding(auto) var iconsTexture : texture_2d<f32>;
@group(0) @binding(auto) var iconsTextureSampler : sampler;

fn rotate_by_angle(vertex: vec2<f32>, angle_deg: f32) -> vec2<f32> {
  let angle_radian = angle_deg * PI / 180.0;
  let c = cos(angle_radian);
  let s = sin(angle_radian);
  let rotation = mat2x2<f32>(vec2<f32>(c, s), vec2<f32>(-s, c));
  return rotation * vertex;
}

struct Attributes {
  @builtin(instance_index) instanceIndex : u32,
  @location(0) positions: vec2<f32>,

  @location(1) instancePositions: vec3<f32>,
  @location(2) instancePositions64Low: vec3<f32>,
  @location(3) instanceSizes: f32,
  @location(4) instanceAngles: f32,
  @location(5) instanceColors: vec4<f32>,
  @location(6) instanceIconFrames: vec4<f32>,
  @location(7) instanceColorModes: f32,
  @location(8) instanceOffsets: vec2<f32>,
  @location(9) instancePixelOffset: vec2<f32>,
  PICKING_COLOR_ATTRIBUTE
};

struct Varyings {
  @builtin(position) position: vec4<f32>,

  @location(0) vColorMode: f32,
  @location(1) vColor: vec4<f32>,
  @location(2) vTextureCoords: vec2<f32>,
  @location(3) uv: vec2<f32>,
  @location(4) pickingColor: vec3<f32>,
};

@vertex
fn vertexMain(inp: Attributes) -> Varyings {
  // write geometry fields used by filters + FS
  geometry.worldPosition = inp.instancePositions;
  geometry.uv = inp.positions;
  geometry.pickingColor = PICKING_COLOR_VALUE;

  var outp: Varyings;
  outp.uv = inp.positions;

  let iconSize = inp.instanceIconFrames.zw;

  // convert size in meters to pixels, then clamp
  let sizePixels = clamp(
    project_unit_size_to_pixel(inp.instanceSizes * icon.sizeScale, icon.sizeUnits),
    icon.sizeMinPixels, icon.sizeMaxPixels
  );

  // scale icon height to match instanceSize
  let iconConstraint = select(iconSize.y, iconSize.x, icon.sizeBasis == 0.0);
  let instanceScale = select(sizePixels / iconConstraint, 0.0, iconConstraint == 0.0);

  // scale and rotate vertex in "pixel" units; then add per-instance pixel offset
  var pixelOffset = inp.positions / 2.0 * iconSize + inp.instanceOffsets;
  pixelOffset = rotate_by_angle(pixelOffset, inp.instanceAngles) * instanceScale;
  pixelOffset = pixelOffset + inp.instancePixelOffset;
  pixelOffset.y = pixelOffset.y * -1.0;

  if (icon.billboard != 0) {
    var pos = project_position_to_clipspace(inp.instancePositions, inp.instancePositions64Low, vec3<f32>(0.0)); // TODO, &geometry.position);
    // DECKGL_FILTER_GL_POSITION(pos, geometry);

    var offset = vec3<f32>(pixelOffset, 0.0);
    // DECKGL_FILTER_SIZE(offset, geometry);
    let clipOffset = project_pixel_size_to_clipspace(offset.xy);
    pos = vec4<f32>(pos.x + clipOffset.x, pos.y + clipOffset.y, pos.z, pos.w);
    outp.position = pos;
  } else {
    var offset_common = vec3<f32>(project_pixel_size_vec2(pixelOffset), 0.0);
    // DECKGL_FILTER_SIZE(offset_common, geometry);
    var pos = project_position_to_clipspace(inp.instancePositions, inp.instancePositions64Low, offset_common); // TODO, &geometry.position);
    // DECKGL_FILTER_GL_POSITION(pos, geometry);
    outp.position = pos;
  }

  let uvMix = (inp.positions.xy + vec2<f32>(1.0, 1.0)) * 0.5;
  outp.vTextureCoords = mix(inp.instanceIconFrames.xy, inp.instanceIconFrames.xy + iconSize, uvMix) / icon.iconsTextureDim;

  outp.vColor = inp.instanceColors;
  // DECKGL_FILTER_COLOR(outp.vColor, geometry);

  outp.vColorMode = inp.instanceColorModes;
  outp.pickingColor = geometry.pickingColor;

  return outp;
}

@fragment
fn fragmentMain(inp: Varyings) -> @location(0) vec4<f32> {
  // expose to deck.gl filter hooks
  geometry.uv = inp.uv;

  let texColor = textureSample(iconsTexture, iconsTextureSampler, inp.vTextureCoords);

  // if colorMode == 0, use pixel color from the texture
  // if colorMode == 1 (or picking), use texture as transparency mask
  let rgb = mix(texColor.rgb, inp.vColor.rgb, inp.vColorMode);
  let a = texColor.a * layer.opacity * inp.vColor.a;

  if (a < icon.alphaCutoff) {
    discard;
  }

  if (picking.isActive > 0.5) {
    if (!picking_isColorValid(inp.pickingColor)) {
      discard;
    }
    return vec4<f32>(inp.pickingColor, 1.0);
  }

  var fragColor = deckgl_premultiplied_alpha(vec4<f32>(rgb, a));

  if (picking.isHighlightActive > 0.5) {
    let highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
    if (picking_isColorZero(abs(inp.pickingColor - highlightedObjectColor))) {
      let highLightAlpha = picking.highlightColor.a;
      let blendedAlpha = highLightAlpha + fragColor.a * (1.0 - highLightAlpha);
      if (blendedAlpha > 0.0) {
        let highLightRatio = highLightAlpha / blendedAlpha;
        fragColor = vec4<f32>(
          mix(fragColor.rgb, picking.highlightColor.rgb, highLightRatio),
          blendedAlpha
        );
      } else {
        fragColor = vec4<f32>(fragColor.rgb, 0.0);
      }
    }
  }

  return fragColor;
}
`;function Be(e){return ze.replace(`PICKING_COLOR_ATTRIBUTE`,e?`@location(10) rowIndexes: u32,`:``).replace(`PICKING_COLOR_VALUE`,e?`picking_getPickingColorFromIndex(inp.rowIndexes)`:`picking_getPickingColorFromIndex(inp.instanceIndex)`)}var Ve=1024,He=4,Ue=()=>{},We={minFilter:`linear`,mipmapFilter:`linear`,magFilter:`linear`,addressModeU:`clamp-to-edge`,addressModeV:`clamp-to-edge`},Ge={x:0,y:0,width:0,height:0};function Ke(e){return 2**Math.ceil(Math.log2(e))}function qe(e,t,n,r){let i=Math.min(n/t.width,r/t.height),a=Math.floor(t.width*i),o=Math.floor(t.height*i);return i===1?{image:t,width:a,height:o}:(e.canvas.height=o,e.canvas.width=a,e.clearRect(0,0,a,o),e.drawImage(t,0,0,t.width,t.height,0,0,a,o),{image:e.canvas,width:a,height:o})}function L(e){return e&&(e.id||e.url)}function Je(e){let{device:t}=e;t.type===`webgl`?e.generateMipmapsWebGL():t.type===`webgpu`&&t.generateMipmapsWebGPU(e)}function Ye(e,t,n,r){let{width:i,height:a,device:o}=e,s=o.createTexture({format:`rgba8unorm`,width:t,height:n,sampler:r,mipLevels:o.getMipLevelCount(t,n)}),c=o.createCommandEncoder();c.copyTextureToTexture({sourceTexture:e,destinationTexture:s,width:i,height:a});let l=c.finish();return o.submit(l),Je(s),e.destroy(),s}function Xe(e,t,n){for(let r=0;r<t.length;r++){let{icon:i,xOffset:a}=t[r],o=L(i);e[o]={...i,x:a,y:n}}}function Ze({icons:e,buffer:t,mapping:n={},xOffset:r=0,yOffset:i=0,rowHeight:a=0,canvasWidth:o}){let s=[];for(let c=0;c<e.length;c++){let l=e[c];if(!n[L(l)]){let{height:e,width:c}=l;r+c+t>o&&(Xe(n,s,i),r=0,i=a+i+t,a=0,s=[]),s.push({icon:l,xOffset:r}),r=r+c+t,a=Math.max(a,e)}}return s.length>0&&Xe(n,s,i),{mapping:n,rowHeight:a,xOffset:r,yOffset:i,canvasWidth:o,canvasHeight:Ke(a+i+t)}}function Qe(e,t,n){if(!e||!t)return null;n||={};let r={},{iterable:i,objectInfo:a}=fe(e);for(let e of i){a.index++;let i=t(e,a),o=L(i);if(!i)throw Error(`Icon is missing.`);if(!i.url)throw Error(`Icon url is missing.`);!r[o]&&(!n[o]||i.url!==n[o].url)&&(r[o]={...i,source:e,sourceIndex:a.index})}return r}var $e=class{constructor(e,{onUpdate:t=Ue,onError:n=Ue}){this._loadOptions=null,this._texture=null,this._externalTexture=null,this._mapping={},this._samplerParameters=null,this._pendingCount=0,this._autoPacking=!1,this._xOffset=0,this._yOffset=0,this._rowHeight=0,this._buffer=He,this._canvasWidth=Ve,this._canvasHeight=0,this._canvas=null,this.device=e,this.onUpdate=t,this.onError=n}finalize(){this._texture?.delete()}getTexture(){return this._texture||this._externalTexture}getIconMapping(e){let t=this._autoPacking?L(e):e;return this._mapping[t]||Ge}setProps({loadOptions:e,autoPacking:t,iconAtlas:n,iconMapping:r,textureParameters:i}){e&&(this._loadOptions=e),t!==void 0&&(this._autoPacking=t),r&&(this._mapping=r),n&&(this._texture?.delete(),this._texture=null,this._externalTexture=n),i&&(this._samplerParameters=i)}get isLoaded(){return this._pendingCount===0}packIcons(e,t){if(!this._autoPacking||typeof document>`u`)return;let n=Object.values(Qe(e,t,this._mapping)||{});if(n.length>0){let{mapping:e,xOffset:t,yOffset:r,rowHeight:i,canvasHeight:a}=Ze({icons:n,buffer:this._buffer,canvasWidth:this._canvasWidth,mapping:this._mapping,rowHeight:this._rowHeight,xOffset:this._xOffset,yOffset:this._yOffset});this._rowHeight=i,this._mapping=e,this._xOffset=t,this._yOffset=r,this._canvasHeight=a,this._texture||=this.device.createTexture({format:`rgba8unorm`,data:null,width:this._canvasWidth,height:this._canvasHeight,sampler:this._samplerParameters||We,mipLevels:this.device.getMipLevelCount(this._canvasWidth,this._canvasHeight)}),this._texture.height!==this._canvasHeight&&(this._texture=Ye(this._texture,this._canvasWidth,this._canvasHeight,this._samplerParameters||We)),this.onUpdate(!0),this._canvas=this._canvas||document.createElement(`canvas`),this._loadIcons(n)}}_loadIcons(e){let t=this._canvas.getContext(`2d`,{willReadFrequently:!0});for(let n of e)this._pendingCount++,ae(n.url,this._loadOptions).then(e=>{let r=L(n),i=this._mapping[r],{x:a,y:o,width:s,height:c}=i,{image:l,width:u,height:d}=qe(t,e,s,c),f=a+(s-u)/2,p=o+(c-d)/2;this._texture?.copyExternalImage({image:l,x:f,y:p,width:u,height:d}),i.x=f,i.y=p,i.width=u,i.height=d,this._texture&&Je(this._texture),this.onUpdate(u!==s||d!==c)}).catch(e=>{this.onError({url:n.url,source:n.source,sourceIndex:n.sourceIndex,loadOptions:this._loadOptions,error:e})}).finally(()=>{this._pendingCount--})}},et=[0,0,0,255],tt={iconAtlas:{type:`image`,value:null,async:!0},iconMapping:{type:`object`,value:{},async:!0},sizeScale:{type:`number`,value:1,min:0},billboard:!0,sizeUnits:`pixels`,sizeBasis:`height`,sizeMinPixels:{type:`number`,min:0,value:0},sizeMaxPixels:{type:`number`,min:0,value:2**53-1},alphaCutoff:{type:`number`,value:.05,min:0,max:1},getPosition:{type:`accessor`,value:e=>e.position},getIcon:{type:`accessor`,value:e=>e.icon},getColor:{type:`accessor`,value:et},getSize:{type:`accessor`,value:1},getAngle:{type:`accessor`,value:0},getPixelOffset:{type:`accessor`,value:[0,0]},onIconError:{type:`function`,value:null,optional:!0},textureParameters:{type:`object`,ignore:!0,value:null}},nt=class extends P{getShaders(){let e=!!this.props.data?.attributes?.rowIndexes;return super.getShaders({vs:Le,fs:Re,source:Be(e),defines:e?{USE_ROW_INDEXES:!0}:{},modules:[N,pe,M,Ie]})}initializeState(){this.state={iconManager:new $e(this.context.device,{onUpdate:this._onUpdate.bind(this),onError:this._onError.bind(this)})},this.getAttributeManager().addInstanced({instancePositions:{size:3,type:`float64`,fp64:this.use64bitPositions(),transition:!0,accessor:`getPosition`},instanceSizes:{size:1,transition:!0,bufferGroup:`icon-instance-data`,accessor:`getSize`,defaultValue:1},instanceIconDefs:{size:7,bufferGroup:`icon-instance-data`,accessor:`getIcon`,transform:this.getInstanceIconDef,shaderAttributes:{instanceOffsets:{size:2,elementOffset:0},instanceIconFrames:{size:4,elementOffset:2},instanceColorModes:{size:1,elementOffset:6}}},instanceColors:{size:this.props.colorFormat.length,type:`unorm8`,transition:!0,bufferGroup:`icon-instance-data`,accessor:`getColor`,defaultValue:et},instanceAngles:{size:1,transition:!0,bufferGroup:`icon-instance-data`,accessor:`getAngle`},instancePixelOffset:{size:2,transition:!0,bufferGroup:`icon-instance-data`,accessor:`getPixelOffset`},...this.props.data?.attributes?.rowIndexes?{rowIndexes:{size:1,type:`uint32`,noAlloc:!0}}:{}})}updateState(e){super.updateState(e);let{props:t,oldProps:n,changeFlags:r}=e,i=this.getAttributeManager(),{iconAtlas:a,iconMapping:o,data:s,getIcon:c,textureParameters:l}=t,{iconManager:u}=this.state;if(typeof a==`string`)return;let d=a||this.internalState.isAsyncPropLoading(`iconAtlas`);u.setProps({loadOptions:t.loadOptions,autoPacking:!d,iconAtlas:a,iconMapping:d?o:null,textureParameters:l}),d?n.iconMapping!==t.iconMapping&&i.invalidate(`getIcon`):(r.dataChanged||r.updateTriggersChanged&&(r.updateTriggersChanged.all||r.updateTriggersChanged.getIcon))&&u.packIcons(s,c),r.extensionsChanged&&(this.state.model?.destroy(),this.state.model=this._getModel(),i.invalidateAll())}get isLoaded(){return super.isLoaded&&this.state.iconManager.isLoaded}finalizeState(e){super.finalizeState(e),this.state.iconManager.finalize()}draw({uniforms:e}){this._drawModel(this.state.model)}_drawModel(e){let{sizeScale:t,sizeBasis:n,sizeMinPixels:r,sizeMaxPixels:i,sizeUnits:a,billboard:o,alphaCutoff:s}=this.props,{iconManager:l}=this.state,u=l.getTexture();if(u){let l={iconsTexture:u,iconsTextureDim:[u.width,u.height],sizeUnits:c[a],sizeScale:t,sizeBasis:+(n===`height`),sizeMinPixels:r,sizeMaxPixels:i,billboard:o,alphaCutoff:s};e.shaderInputs.setProps({icon:l}),e.draw(this.context.renderPass)}}_getModel(e=this.props.id){let t=[-1,-1,1,-1,-1,1,1,1];return new F(this.context.device,{...this.getShaders(),id:e,bufferLayout:this.getAttributeManager().getBufferLayouts(),geometry:new j({topology:`triangle-strip`,attributes:{positions:{size:2,value:new Float32Array(t)}}}),isInstanced:!0})}_onUpdate(e){e?(this.getAttributeManager()?.invalidate(`getIcon`),this.setNeedsUpdate()):this.setNeedsRedraw()}_onError(e){let t=this.getCurrentLayer()?.props.onIconError;t?t(e):w.error(e.error.message)()}getInstanceIconDef(e){let{x:t,y:n,width:r,height:i,mask:a,anchorX:o=r/2,anchorY:s=i/2}=this.state.iconManager.getIconMapping(e);return[r/2-o,i/2-s,t,n,r,i,+!!a]}};nt.defaultProps=tt,nt.layerName=`IconLayer`;var rt=`layout(std140) uniform scatterplotUniforms {
  float radiusScale;
  float radiusMinPixels;
  float radiusMaxPixels;
  float lineWidthScale;
  float lineWidthMinPixels;
  float lineWidthMaxPixels;
  float stroked;
  float filled;
  bool antialiasing;
  bool billboard;
  highp int radiusUnits;
  highp int lineWidthUnits;
} scatterplot;
`,it={name:`scatterplot`,vs:rt,fs:rt,source:``,uniformTypes:{radiusScale:`f32`,radiusMinPixels:`f32`,radiusMaxPixels:`f32`,lineWidthScale:`f32`,lineWidthMinPixels:`f32`,lineWidthMaxPixels:`f32`,stroked:`f32`,filled:`f32`,antialiasing:`f32`,billboard:`f32`,radiusUnits:`i32`,lineWidthUnits:`i32`}},at=`#version 300 es
#define SHADER_NAME scatterplot-layer-vertex-shader
in vec3 positions;
in vec3 instancePositions;
in vec3 instancePositions64Low;
in float instanceRadius;
in float instanceLineWidths;
in vec4 instanceFillColors;
in vec4 instanceLineColors;
#ifdef USE_ROW_INDEXES
in float rowIndexes;
#endif
in vec2 instancePixelOffset;
out vec4 vFillColor;
out vec4 vLineColor;
out vec2 unitPosition;
out float innerUnitRadius;
out float outerRadiusPixels;
void main(void) {
geometry.worldPosition = instancePositions;
outerRadiusPixels = clamp(
project_size_to_pixel(scatterplot.radiusScale * instanceRadius, scatterplot.radiusUnits),
scatterplot.radiusMinPixels, scatterplot.radiusMaxPixels
);
float lineWidthPixels = clamp(
project_size_to_pixel(scatterplot.lineWidthScale * instanceLineWidths, scatterplot.lineWidthUnits),
scatterplot.lineWidthMinPixels, scatterplot.lineWidthMaxPixels
);
outerRadiusPixels += scatterplot.stroked * lineWidthPixels / 2.0;
float edgePadding = scatterplot.antialiasing ? (outerRadiusPixels + SMOOTH_EDGE_RADIUS) / outerRadiusPixels : 1.0;
unitPosition = edgePadding * positions.xy;
geometry.uv = unitPosition;
#ifdef USE_ROW_INDEXES
geometry.pickingColor = picking_getPickingColorFromIndex(rowIndexes);
#else
geometry.pickingColor = picking_getPickingColorFromInstanceID();
#endif
innerUnitRadius = 1.0 - scatterplot.stroked * lineWidthPixels / outerRadiusPixels;
if (scatterplot.billboard) {
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
vec3 offset = edgePadding * positions * outerRadiusPixels;
offset.xy += instancePixelOffset;
DECKGL_FILTER_SIZE(offset, geometry);
gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);
} else {
vec3 offset = edgePadding * positions * project_pixel_size(outerRadiusPixels);
offset.xy += project_pixel_size(instancePixelOffset);
DECKGL_FILTER_SIZE(offset, geometry);
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset, geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
}
vFillColor = vec4(instanceFillColors.rgb, instanceFillColors.a * layer.opacity);
DECKGL_FILTER_COLOR(vFillColor, geometry);
vLineColor = vec4(instanceLineColors.rgb, instanceLineColors.a * layer.opacity);
DECKGL_FILTER_COLOR(vLineColor, geometry);
}
`,ot=`#version 300 es
#define SHADER_NAME scatterplot-layer-fragment-shader
precision highp float;
in vec4 vFillColor;
in vec4 vLineColor;
in vec2 unitPosition;
in float innerUnitRadius;
in float outerRadiusPixels;
out vec4 fragColor;
void main(void) {
geometry.uv = unitPosition;
float distToCenter = length(unitPosition) * outerRadiusPixels;
float inCircle = scatterplot.antialiasing ?
smoothedge(distToCenter, outerRadiusPixels) :
step(distToCenter, outerRadiusPixels);
if (inCircle == 0.0) {
discard;
}
if (scatterplot.stroked > 0.5) {
float isLine = scatterplot.antialiasing ?
smoothedge(innerUnitRadius * outerRadiusPixels, distToCenter) :
step(innerUnitRadius * outerRadiusPixels, distToCenter);
if (scatterplot.filled > 0.5) {
fragColor = mix(vFillColor, vLineColor, isLine);
} else {
if (isLine == 0.0) {
discard;
}
fragColor = vec4(vLineColor.rgb, vLineColor.a * isLine);
}
} else if (scatterplot.filled < 0.5) {
discard;
} else {
fragColor = vFillColor;
}
fragColor.a *= inCircle;
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`,st=`// Main shaders

struct ScatterplotUniforms {
  radiusScale: f32,
  radiusMinPixels: f32,
  radiusMaxPixels: f32,
  lineWidthScale: f32,
  lineWidthMinPixels: f32,
  lineWidthMaxPixels: f32,
  stroked: f32,
  filled: i32,
  antialiasing: i32,
  billboard: i32,
  radiusUnits: i32,
  lineWidthUnits: i32,
};

@group(0) @binding(0) var<uniform> scatterplot: ScatterplotUniforms;

struct Attributes {
  @builtin(instance_index) instanceIndex : u32,
  @builtin(vertex_index) vertexIndex : u32,
  @location(0) positions: vec3<f32>,
  @location(1) instancePositions: vec3<f32>,
  @location(2) instancePositions64Low: vec3<f32>,
  @location(3) instanceRadius: f32,
  @location(4) instanceLineWidths: f32,
  @location(5) instanceFillColors: vec4<f32>,
  @location(6) instanceLineColors: vec4<f32>,
  @location(7) instancePixelOffset: vec2<f32>,
  PICKING_COLOR_ATTRIBUTE
};

struct Varyings {
  @builtin(position) position: vec4<f32>,
  @location(0) vFillColor: vec4<f32>,
  @location(1) vLineColor: vec4<f32>,
  @location(2) unitPosition: vec2<f32>,
  @location(3) innerUnitRadius: f32,
  @location(4) outerRadiusPixels: f32,
  @location(5) pickingColor: vec3<f32>,
  @location(6) clipCoordinates: vec2<f32>,
};

@vertex
fn vertexMain(attributes: Attributes) -> Varyings {
  var varyings: Varyings;

  // Draw an inline geometry constant array clip space triangle to verify that rendering works.
  // var positions = array<vec2<f32>, 3>(vec2(0.0, 0.5), vec2(-0.5, -0.5), vec2(0.5, -0.5));
  // if (attributes.instanceIndex == 0) {
  //   varyings.position = vec4<f32>(positions[attributes.vertexIndex], 0.0, 1.0);
  //   return varyings;
  // }

  geometry.worldPosition = attributes.instancePositions;

  // Multiply out radius and clamp to limits
  varyings.outerRadiusPixels = clamp(
    project_unit_size_to_pixel(scatterplot.radiusScale * attributes.instanceRadius, scatterplot.radiusUnits),
    scatterplot.radiusMinPixels, scatterplot.radiusMaxPixels
  );

  // Multiply out line width and clamp to limits
  let lineWidthPixels = clamp(
    project_unit_size_to_pixel(scatterplot.lineWidthScale * attributes.instanceLineWidths, scatterplot.lineWidthUnits),
    scatterplot.lineWidthMinPixels, scatterplot.lineWidthMaxPixels
  );

  // outer radius needs to offset by half stroke width
  varyings.outerRadiusPixels += scatterplot.stroked * lineWidthPixels / 2.0;
  // Expand geometry to accommodate edge smoothing
  // WGSL selects the second value when the condition is true, so keep the antialiased path second.
  let edgePadding = select(
    1.0,
    (varyings.outerRadiusPixels + SMOOTH_EDGE_RADIUS) / varyings.outerRadiusPixels,
    scatterplot.antialiasing != 0
  );

  // position on the containing square in [-1, 1] space
  varyings.unitPosition = edgePadding * attributes.positions.xy;
  geometry.uv = varyings.unitPosition;
  geometry.pickingColor = PICKING_COLOR_VALUE;

  varyings.innerUnitRadius = 1.0 - scatterplot.stroked * lineWidthPixels / varyings.outerRadiusPixels;

  if (scatterplot.billboard != 0) {
    let projectedPosition = project_position_to_clipspace_and_commonspace(
      attributes.instancePositions,
      attributes.instancePositions64Low,
      vec3<f32>(0.0)
    );
    geometry.position = projectedPosition.commonPosition;
    varyings.position = projectedPosition.clipPosition;
    // DECKGL_FILTER_GL_POSITION(varyings.position, geometry);
    var offset = edgePadding * attributes.positions * varyings.outerRadiusPixels;
    offset = vec3<f32>(offset.xy + attributes.instancePixelOffset, offset.z);
    // DECKGL_FILTER_SIZE(offset, geometry);
    let clipPixels = project_pixel_size_to_clipspace(offset.xy);
    varyings.position = vec4<f32>(varyings.position.x + clipPixels.x, varyings.position.y + clipPixels.y, varyings.position.z, varyings.position.w);
    geometry.position = vec4<f32>(
      geometry.position.xy + project_pixel_size_vec2(offset.xy),
      geometry.position.zw
    );
  } else {
    var offset = edgePadding * attributes.positions * project_pixel_size_float(varyings.outerRadiusPixels);
    offset = vec3<f32>(offset.xy + project_pixel_size_vec2(attributes.instancePixelOffset), offset.z);
    // DECKGL_FILTER_SIZE(offset, geometry);
    let projectedPosition = project_position_to_clipspace_and_commonspace(
      attributes.instancePositions,
      attributes.instancePositions64Low,
      offset
    );
    geometry.position = projectedPosition.commonPosition;
    varyings.position = projectedPosition.clipPosition;
    // DECKGL_FILTER_GL_POSITION(varyings.position, geometry);
  }

  varyings.clipCoordinates = geometry.position.xy;
  clip_filterPosition(&varyings.position, geometry.worldPosition.xy);

  // Apply opacity to instance color, or return instance picking color
  varyings.vFillColor = vec4<f32>(attributes.instanceFillColors.rgb, attributes.instanceFillColors.a * layer.opacity);
  // DECKGL_FILTER_COLOR(varyings.vFillColor, geometry);
  varyings.vLineColor = vec4<f32>(attributes.instanceLineColors.rgb, attributes.instanceLineColors.a * layer.opacity);
  // DECKGL_FILTER_COLOR(varyings.vLineColor, geometry);
  varyings.pickingColor = geometry.pickingColor;

  return varyings;
}

@fragment
fn fragmentMain(varyings: Varyings) -> @location(0) vec4<f32> {
  // var geometry: Geometry;
  // geometry.uv = unitPosition;

  let distToCenter = length(varyings.unitPosition) * varyings.outerRadiusPixels;
  let inCircle = select(
    step(distToCenter, varyings.outerRadiusPixels),
    smoothedge(distToCenter, varyings.outerRadiusPixels),
    scatterplot.antialiasing != 0
  );

  if (inCircle == 0.0) {
    discard;
  }

  var fragColor: vec4<f32>;

  if (scatterplot.stroked != 0) {
    let isLine = select(
      step(varyings.innerUnitRadius * varyings.outerRadiusPixels, distToCenter),
      smoothedge(varyings.innerUnitRadius * varyings.outerRadiusPixels, distToCenter),
      scatterplot.antialiasing != 0
    );

    if (scatterplot.filled != 0) {
      fragColor = mix(varyings.vFillColor, varyings.vLineColor, isLine);
    } else {
      if (isLine == 0.0) {
        discard;
      }
      fragColor = vec4<f32>(varyings.vLineColor.rgb, varyings.vLineColor.a * isLine);
    }
  } else if (scatterplot.filled == 0) {
    discard;
  } else {
    fragColor = varyings.vFillColor;
  }

  fragColor.a *= inCircle;

  clip_filterColor(varyings.clipCoordinates);

  if (picking.isActive > 0.5) {
    if (!picking_isColorValid(varyings.pickingColor)) {
      discard;
    }
    return vec4<f32>(varyings.pickingColor, 1.0);
  }

  if (picking.isHighlightActive > 0.5) {
    let highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
    if (picking_isColorZero(abs(varyings.pickingColor - highlightedObjectColor))) {
      let highLightAlpha = picking.highlightColor.a;
      let blendedAlpha = highLightAlpha + fragColor.a * (1.0 - highLightAlpha);
      if (blendedAlpha > 0.0) {
        let highLightRatio = highLightAlpha / blendedAlpha;
        fragColor = vec4<f32>(
          mix(fragColor.rgb, picking.highlightColor.rgb, highLightRatio),
          blendedAlpha
        );
      } else {
        fragColor = vec4<f32>(fragColor.rgb, 0.0);
      }
    }
  }

  // Apply premultiplied alpha as required by transparent canvas
  fragColor = deckgl_premultiplied_alpha(fragColor);

  return fragColor;
  // return vec4<f32>(0, 0, 1, 1);
}
`;function ct(e){return st.replace(`PICKING_COLOR_ATTRIBUTE`,e?`@location(8) rowIndexes: u32,`:``).replace(`PICKING_COLOR_VALUE`,e?`picking_getPickingColorFromIndex(attributes.rowIndexes)`:`picking_getPickingColorFromIndex(attributes.instanceIndex)`)}var lt=0,ut=1,dt={name:`clip`,source:`\
struct ClipUniforms {
  enabled: i32,
  mode: i32,
  bounds: vec4<f32>,
};

@group(2) @binding(auto) var<uniform> clipUniforms: ClipUniforms;

fn clip_isInBounds(coordinates: vec2<f32>) -> bool {
  return coordinates.x >= clipUniforms.bounds.x &&
    coordinates.y >= clipUniforms.bounds.y &&
    coordinates.x < clipUniforms.bounds.z &&
    coordinates.y < clipUniforms.bounds.w;
}

fn clip_filterPosition(position: ptr<function, vec4<f32>>, instanceCoordinates: vec2<f32>) {
  if (
    clipUniforms.enabled != 0 &&
    clipUniforms.mode == ${ut} &&
    !clip_isInBounds(instanceCoordinates)
  ) {
    *position = vec4<f32>(2.0, 2.0, 2.0, 1.0);
  }
}

fn clip_filterColor(geometryCoordinates: vec2<f32>) {
  if (
    clipUniforms.enabled != 0 &&
    clipUniforms.mode == ${lt} &&
    !clip_isInBounds(geometryCoordinates)
  ) {
    discard;
  }
}
`,props:{},uniforms:{},bindingLayout:[{name:`clip`,group:2}],uniformTypes:{enabled:`i32`,mode:`i32`,bounds:`vec4<f32>`},defaultUniforms:{enabled:0,mode:lt,bounds:[0,0,1,1]},getUniforms(e={}){let t={};return e.enabled!==void 0&&(t.enabled=+!!e.enabled),e.mode!==void 0&&(t.mode=e.mode===`instance`?ut:lt),e.bounds!==void 0&&(t.bounds=e.bounds),t}},ft=[0,0,0,255],pt={radiusUnits:`meters`,radiusScale:{type:`number`,min:0,value:1},radiusMinPixels:{type:`number`,min:0,value:0},radiusMaxPixels:{type:`number`,min:0,value:2**53-1},lineWidthUnits:`meters`,lineWidthScale:{type:`number`,min:0,value:1},lineWidthMinPixels:{type:`number`,min:0,value:0},lineWidthMaxPixels:{type:`number`,min:0,value:2**53-1},stroked:!1,filled:!0,billboard:!1,antialiasing:!0,getPosition:{type:`accessor`,value:e=>e.position},getRadius:{type:`accessor`,value:1},getFillColor:{type:`accessor`,value:ft},getLineColor:{type:`accessor`,value:ft},getLineWidth:{type:`accessor`,value:1},getPixelOffset:{type:`accessor`,value:[0,0]},strokeWidth:{deprecatedFor:`getLineWidth`},outline:{deprecatedFor:`stroked`},getColor:{deprecatedFor:[`getFillColor`,`getLineColor`]}},mt=class extends P{getShaders(){let e=!!this.props.data?.attributes?.rowIndexes;return super.getShaders({vs:at,fs:ot,source:ct(e),defines:e?{USE_ROW_INDEXES:!0}:{},modules:[N,pe,M,it,...this.context.device.type===`webgpu`?[dt]:[]]})}initializeState(){let e=this.props.data?.attributes?.rowIndexes?{rowIndexes:{size:1,type:`uint32`,noAlloc:!0}}:{};this.getAttributeManager().addInstanced({instancePositions:{size:3,type:`float64`,fp64:this.use64bitPositions(),transition:!0,accessor:`getPosition`},instanceRadius:{size:1,transition:!0,accessor:`getRadius`,defaultValue:1,bufferGroup:`scatterplot-instance-data`},instanceFillColors:{size:this.props.colorFormat.length,transition:!0,type:`unorm8`,accessor:`getFillColor`,defaultValue:[0,0,0,255],bufferGroup:`scatterplot-instance-data`},instanceLineColors:{size:this.props.colorFormat.length,transition:!0,type:`unorm8`,accessor:`getLineColor`,defaultValue:[0,0,0,255],bufferGroup:`scatterplot-instance-data`},instanceLineWidths:{size:1,transition:!0,accessor:`getLineWidth`,defaultValue:1,bufferGroup:`scatterplot-instance-data`},instancePixelOffset:{size:2,transition:!0,accessor:`getPixelOffset`,bufferGroup:`scatterplot-instance-data`},...e})}updateState(e){super.updateState(e),e.changeFlags.extensionsChanged&&(this.state.model?.destroy(),this.state.model=this._getModel(),this.getAttributeManager().invalidateAll())}draw({uniforms:e}){let{radiusUnits:t,radiusScale:n,radiusMinPixels:r,radiusMaxPixels:i,stroked:a,filled:o,billboard:s,antialiasing:l,lineWidthUnits:u,lineWidthScale:d,lineWidthMinPixels:f,lineWidthMaxPixels:p}=this.props,m={stroked:a,filled:o,billboard:s,antialiasing:l,radiusUnits:c[t],radiusScale:n,radiusMinPixels:r,radiusMaxPixels:i,lineWidthUnits:c[u],lineWidthScale:d,lineWidthMinPixels:f,lineWidthMaxPixels:p},h=this.state.model;h.shaderInputs.setProps({scatterplot:m}),h.draw(this.context.renderPass)}_getModel(){let e=[-1,-1,0,1,-1,0,-1,1,0,1,1,0];return new F(this.context.device,{...this.getShaders(),id:this.props.id,bufferLayout:this.getAttributeManager().getBufferLayouts(),geometry:new j({topology:`triangle-strip`,attributes:{positions:{size:3,value:new Float32Array(e)}}}),isInstanced:!0})}};mt.defaultProps=pt,mt.layerName=`ScatterplotLayer`;var ht={CLOCKWISE:1,COUNTER_CLOCKWISE:-1};function gt(e,t,n={}){return _t(e,n)!==t&&(bt(e,n),!0)}function _t(e,t={}){return Math.sign(yt(e,t))}var vt={x:0,y:1,z:2};function yt(e,t={}){let{start:n=0,end:r=e.length,plane:i=`xy`}=t,a=t.size||2,o=0,s=vt[i[0]],c=vt[i[1]];for(let t=n,i=r-a;t<r;t+=a)o+=(e[t+s]-e[i+s])*(e[t+c]+e[i+c]),i=t;return o/2}function bt(e,t){let{start:n=0,end:r=e.length,size:i=2}=t,a=(r-n)/i,o=Math.floor(a/2);for(let t=0;t<o;++t){let r=n+t*i,o=n+(a-1-t)*i;for(let t=0;t<i;++t){let n=e[r+t];e[r+t]=e[o+t],e[o+t]=n}}}function R(e,t){let n=t.length,r=e.length;if(r>0){let i=!0;for(let a=0;a<n;a++)if(e[r-n+a]!==t[a]){i=!1;break}if(i)return!1}for(let i=0;i<n;i++)e[r+i]=t[i];return!0}function xt(e,t){let n=t.length;for(let r=0;r<n;r++)e[r]=t[r]}function z(e,t,n,r,i=[]){let a=r+t*n;for(let t=0;t<n;t++)i[t]=e[a+t];return i}function St(e,t,n,r,i=[]){let a,o;if(n&8)a=(r[3]-e[1])/(t[1]-e[1]),o=3;else if(n&4)a=(r[1]-e[1])/(t[1]-e[1]),o=1;else if(n&2)a=(r[2]-e[0])/(t[0]-e[0]),o=2;else if(n&1)a=(r[0]-e[0])/(t[0]-e[0]),o=0;else return null;for(let n=0;n<e.length;n++)i[n]=(o&1)===n?r[o]:a*(t[n]-e[n])+e[n];return i}function Ct(e,t){let n=0;return e[0]<t[0]?n|=1:e[0]>t[2]&&(n|=2),e[1]<t[1]?n|=4:e[1]>t[3]&&(n|=8),n}function wt(e,t){let{size:n=2,broken:r=!1,gridResolution:i=10,gridOffset:a=[0,0],startIndex:o=0,endIndex:s=e.length}=t||{},c=(s-o)/n,l=[],u=[l],d=z(e,0,n,o),f,p,m=kt(d,i,a,[]),h=[];R(l,d);for(let t=1;t<c;t++){for(f=z(e,t,n,o,f),p=Ct(f,m);p;){St(d,f,p,m,h);let e=Ct(h,m);e&&(St(d,h,e,m,h),p=e),R(l,h),xt(d,h),At(m,i,p),r&&l.length>n&&(l=[],u.push(l),R(l,d)),p=Ct(f,m)}R(l,f),xt(d,f)}return r?u:u[0]}var Tt=0,Et=1;function Dt(e,t=null,n){if(!e.length)return[];let{size:r=2,gridResolution:i=10,gridOffset:a=[0,0],edgeTypes:o=!1}=n||{},s=[],c=[{pos:e,types:o?Array(e.length/r).fill(Et):null,holes:t||[]}],l=[[],[]],u=[];for(;c.length;){let{pos:e,types:t,holes:n}=c.shift();jt(e,r,n[0]||e.length,l),u=kt(l[0],i,a,u);let d=Ct(l[1],u);if(d){let i=Ot(e,t,r,0,n[0]||e.length,u,d),a={pos:i[0].pos,types:i[0].types,holes:[]},s={pos:i[1].pos,types:i[1].types,holes:[]};c.push(a,s);for(let c=0;c<n.length;c++)i=Ot(e,t,r,n[c],n[c+1]||e.length,u,d),i[0]&&(a.holes.push(a.pos.length),a.pos=Mt(a.pos,i[0].pos),o&&(a.types=Mt(a.types,i[0].types))),i[1]&&(s.holes.push(s.pos.length),s.pos=Mt(s.pos,i[1].pos),o&&(s.types=Mt(s.types,i[1].types)))}else{let r={positions:e};o&&(r.edgeTypes=t),n.length&&(r.holeIndices=n),s.push(r)}}return s}function Ot(e,t,n,r,i,a,o){let s=(i-r)/n,c=[],l=[],u=[],d=[],f=[],p,m,h,g=z(e,s-1,n,r),_=Math.sign(o&8?g[1]-a[3]:g[0]-a[2]),v=t&&t[s-1],y=0,b=0;for(let i=0;i<s;i++)p=z(e,i,n,r,p),m=Math.sign(o&8?p[1]-a[3]:p[0]-a[2]),h=t&&t[r/n+i],m&&_&&_!==m&&(St(g,p,o,a,f),R(c,f)&&u.push(v),R(l,f)&&d.push(v)),m<=0?(R(c,p)&&u.push(h),y-=m):u.length&&(u[u.length-1]=Tt),m>=0?(R(l,p)&&d.push(h),b+=m):d.length&&(d[d.length-1]=Tt),xt(g,p),_=m,v=h;return[y?{pos:c,types:t&&u}:null,b?{pos:l,types:t&&d}:null]}function kt(e,t,n,r){let i=Math.floor((e[0]-n[0])/t)*t+n[0],a=Math.floor((e[1]-n[1])/t)*t+n[1];return r[0]=i,r[1]=a,r[2]=i+t,r[3]=a+t,r}function At(e,t,n){n&8?(e[1]+=t,e[3]+=t):n&4?(e[1]-=t,e[3]-=t):n&2?(e[0]+=t,e[2]+=t):n&1&&(e[0]-=t,e[2]-=t)}function jt(e,t,n,r){let i=1/0,a=-1/0,o=1/0,s=-1/0;for(let r=0;r<n;r+=t){let t=e[r],n=e[r+1];i=t<i?t:i,a=t>a?t:a,o=n<o?n:o,s=n>s?n:s}return r[0][0]=i,r[0][1]=o,r[1][0]=a,r[1][1]=s,r}function Mt(e,t){for(let n=0;n<t.length;n++)e.push(t[n]);return e}var Nt=85.051129;function Pt(e,t){let{size:n=2,startIndex:r=0,endIndex:i=e.length,normalize:a=!0}=t||{},o=e.slice(r,i);Rt(o,n,0,i-r);let s=wt(o,{size:n,broken:!0,gridResolution:360,gridOffset:[-180,-180]});if(a)for(let e of s)zt(e,n);return s}function Ft(e,t=null,n){let{size:r=2,normalize:i=!0,edgeTypes:a=!1}=n||{};t||=[];let o=[],s=[],c=0,l=0;for(let i=0;i<=t.length;i++){let a=t[i]||e.length,u=l,d=It(e,r,c,a);for(let t=d;t<a;t++)o[l++]=e[t];for(let t=c;t<d;t++)o[l++]=e[t];Rt(o,r,u,l),Lt(o,r,u,l,n?.maxLatitude),c=a,s[i]=l}s.pop();let u=Dt(o,s,{size:r,gridResolution:360,gridOffset:[-180,-180],edgeTypes:a});if(i)for(let e of u)zt(e.positions,r);return u}function It(e,t,n,r){let i=-1,a=-1;for(let o=n+1;o<r;o+=t){let t=Math.abs(e[o]);t>i&&(i=t,a=o-1)}return a}function Lt(e,t,n,r,i=Nt){let a=e[n],o=e[r-t];if(Math.abs(a-o)>180){let r=z(e,0,t,n);r[0]+=Math.round((o-a)/360)*360,R(e,r),r[1]=Math.sign(r[1])*i,R(e,r),r[0]=a,R(e,r)}}function Rt(e,t,n,r){let i=e[0],a;for(let o=n;o<r;o+=t){a=e[o];let t=a-i;(t>180||t<-180)&&(a-=Math.round(t/360)*360),e[o]=i=a}}function zt(e,t){let n,r=e.length/t;for(let i=0;i<r&&(n=e[i*t],(n+180)%360==0);i++);let i=-Math.round(n/360)*360;if(i!==0)for(let n=0;n<r;n++)e[n*t]+=i}function Bt(e,t,n,r){let i;if(Array.isArray(e[0])){let n=e.length*t;i=Array(n);for(let n=0;n<e.length;n++)for(let r=0;r<t;r++)i[n*t+r]=e[n][r]||0}else i=e;return n?wt(i,{size:t,gridResolution:n}):r?Pt(i,{size:t}):i}var Vt=1,Ht=2,B=4,Ut=class extends Pe{constructor(e){super({...e,attributes:{positions:{size:3,padding:18,initialize:!0,type:e.fp64?Float64Array:Float32Array},segmentTypes:{size:1,type:e.isWebGPU?Float32Array:Uint8ClampedArray}}})}get(e){return this.attributes[e]}getPathSegmentIndices(e){let t=this.attributes.segmentTypes,n=this.vertexStarts[e],r=Math.min(this.vertexStarts[e+1]??this.instanceCount,this.instanceCount),i=[];for(let e=n;e<r-1;e++)(t[e]&B)===0&&i.push(e);return i.length&&(t[n]&B)!==0&&i.unshift(i.pop()),i}getGeometryFromBuffer(e){return this.normalize||this.opts.isWebGPU?super.getGeometryFromBuffer(e):null}normalizeGeometry(e){return this.normalize?Bt(e,this.positionSize,this.opts.resolution,this.opts.wrapLongitude):e}getGeometrySize(e){if(Wt(e)){let t=0;for(let n of e)t+=this.getGeometrySize(n);return t}let t=this.getPathLength(e);return t<2?0:this.isClosed(e)?t<3?0:t+2:t}updateGeometryAttributes(e,t){if(t.geometrySize!==0){if(e&&Wt(e))for(let n of e){let e=this.getGeometrySize(n);t.geometrySize=e,this.updateGeometryAttributes(n,t),t.vertexStart+=e}else this._updateSegmentTypes(e,t),this._updatePositions(e,t)}}_updateSegmentTypes(e,t){let n=this.attributes.segmentTypes,r=e?this.isClosed(e):!1,{vertexStart:i,geometrySize:a}=t;n.fill(0,i,i+a),r?(n[i]=B,n[i+a-2]=B):(n[i]+=Vt,n[i+a-2]+=Ht),n[i+a-1]=B}_updatePositions(e,t){let{positions:n}=this.attributes;if(!n||!e)return;let{vertexStart:r,geometrySize:i}=t,a=[,,,];for(let t=r,o=0;o<i;t++,o++)this.getPointOnPath(e,o,a),n[t*3]=a[0],n[t*3+1]=a[1],n[t*3+2]=a[2]}getPathLength(e){return e.length/this.positionSize}getPointOnPath(e,t,n=[]){let{positionSize:r}=this;t*r>=e.length&&(t+=1-e.length/r);let i=t*r;return n[0]=e[i],n[1]=e[i+1],n[2]=r===3&&e[i+2]||0,n}isClosed(e){if(!this.normalize)return!!this.opts.loop;let{positionSize:t}=this,n=e.length-t;return e[0]===e[n]&&e[1]===e[n+1]&&(t===2||e[2]===e[n+2])}};function Wt(e){return Array.isArray(e[0])}var Gt=`struct PathUniforms {
  widthScale: f32,
  widthMinPixels: f32,
  widthMaxPixels: f32,
  jointType: f32,
  capType: f32,
  miterLimit: f32,
  billboard: f32,
  widthUnits: i32,
};

@group(0) @binding(auto)
var<uniform> path: PathUniforms;
`,Kt=`layout(std140) uniform pathUniforms {
  float widthScale;
  float widthMinPixels;
  float widthMaxPixels;
  float jointType;
  float capType;
  float miterLimit;
  bool billboard;
  highp int widthUnits;
} path;
`,qt={name:`path`,source:Gt,vs:Kt,fs:Kt,uniformTypes:{widthScale:`f32`,widthMinPixels:`f32`,widthMaxPixels:`f32`,jointType:`f32`,capType:`f32`,miterLimit:`f32`,billboard:`f32`,widthUnits:`i32`}},Jt=`const EPSILON: f32 = 0.001;
const ZERO_OFFSET: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

struct JoinResult {
  offset: vec3<f32>,
  cornerOffset: vec2<f32>,
  miterLength: f32,
  pathPosition: vec2<f32>,
  pathLength: f32,
  jointType: f32,
};

struct Attributes {
  @location(0) positions: vec2<f32>,
  @location(1) instanceTypes: f32,
  @location(2) instanceLeftPositions: vec3<f32>,
  @location(3) instanceStartPositions: vec3<f32>,
  @location(4) instanceEndPositions: vec3<f32>,
  @location(5) instanceRightPositions: vec3<f32>,
  @location(6) instanceLeftPositions64Low: vec3<f32>,
  @location(7) instanceStartPositions64Low: vec3<f32>,
  @location(8) instanceEndPositions64Low: vec3<f32>,
  @location(9) instanceRightPositions64Low: vec3<f32>,
  @location(10) instanceStrokeWidths: f32,
  @location(11) instanceColors: vec4<f32>,
  @location(12) rowIndexes: u32,
};

struct Varyings {
  @builtin(position) position: vec4<f32>,
  @location(0) vColor: vec4<f32>,
  @location(1) vCornerOffset: vec2<f32>,
  @location(2) vMiterLength: f32,
  @location(3) vPathPosition: vec2<f32>,
  @location(4) vPathLength: f32,
  @location(5) vJointType: f32,
  // Location 6 is reserved for TripsLayer's injected vTime varying.
  @location(7) clipCoordinates: vec2<f32>,
#ifdef DASH_ENABLED
  @location(8) vPathBounds: vec2<f32>,
#endif
};

fn flipIfTrue(flag: bool) -> f32 {
  return select(1.0, -1.0, flag);
}

fn clipLine(position: vec4<f32>, refPosition: vec4<f32>) -> vec4<f32> {
  if (position.w < EPSILON) {
    let r = (EPSILON - refPosition.w) / (position.w - refPosition.w);
    return refPosition + (position - refPosition) * r;
  }
  return position;
}

#ifdef DASH_ENABLED
// Return the visible interval of the original segment before clipLine moves either endpoint.
fn getClippedPathRange(startW: f32, endW: f32) -> vec2<f32> {
  let startClipped = startW < EPSILON;
  let endClipped = endW < EPSILON;
  if (startClipped && endClipped) {
    return vec2<f32>(0.0, 0.0);
  }
  if (startClipped || endClipped) {
    let intersection = clamp((EPSILON - startW) / (endW - startW), 0.0, 1.0);
    if (startClipped) {
      return vec2<f32>(intersection, 1.0);
    }
    return vec2<f32>(0.0, intersection);
  }
  return vec2<f32>(0.0, 1.0);
}
#endif

fn getLineJoinOffset(
  prevPoint: vec3<f32>,
  currPoint: vec3<f32>,
  nextPoint: vec3<f32>,
  width: vec2<f32>,
#ifdef DASH_ENABLED
  sourcePathLength: f32,
  sourcePathRange: vec2<f32>,
#endif
#ifdef ANTIALIASING
  coverageScale: f32,
#endif
  positions: vec2<f32>,
  instanceTypes: f32
) -> JoinResult {
  let isEnd = positions.x > 0.0;
  let sideOfPath = positions.y;
  let isJoint = select(0.0, 1.0, sideOfPath == 0.0);

  var deltaA3 = currPoint - prevPoint;
  var deltaB3 = nextPoint - currPoint;

  let rotationResult = project_needs_rotation(currPoint);
  if (path.billboard == 0.0 && rotationResult.needsRotation) {
    deltaA3 = rotationResult.transform * deltaA3;
    deltaB3 = rotationResult.transform * deltaB3;
  }

  let deltaA = deltaA3.xy / width;
  let deltaB = deltaB3.xy / width;

  let lenA = length(deltaA);
  let lenB = length(deltaB);

  let dirA = select(vec2<f32>(0.0, 0.0), normalize(deltaA), lenA > 0.0);
  let dirB = select(vec2<f32>(0.0, 0.0), normalize(deltaB), lenB > 0.0);

  let perpA = vec2<f32>(-dirA.y, dirA.x);
  let perpB = vec2<f32>(-dirB.y, dirB.x);

  var tangent = dirA + dirB;
  tangent = select(perpA, normalize(tangent), length(tangent) > 0.0);
  let miterVec = vec2<f32>(-tangent.y, tangent.x);
  let dir = select(dirB, dirA, isEnd);
  let perp = select(perpB, perpA, isEnd);
#ifdef DASH_ENABLED
  let segmentLength2D = select(lenB, lenA, isEnd);

  // Extrusion happens in the XY plane, so segmentLength2D is a 2D length and pathPosition.y
  // below measures 2D distance along the segment. For a path that also moves in Z the true
  // arc length is longer by this ratio. Scaling pathLength and pathPosition.y by it makes
  // the coordinate measure real 3D distance while leaving the joint tests unchanged, since
  // they compare the two against each other and both are scaled alike. Billboard mode
  // extrudes in clip space, where the perspective divide has already reduced the segment to
  // its screen projection, so its complete common-space length is supplied by the caller.
  // Mirrors path-layer-vertex.glsl.ts.
  let currDelta3 = select(deltaB3, deltaA3, isEnd);
  let currLength2D = length(currDelta3.xy);
  // Do not clamp a valid denominator to EPSILON: high-zoom Web Mercator deltas are often
  // smaller than that in common space, and changing their scale corrupts even flat paths.
  let safeLength2D = select(1.0, currLength2D, currLength2D > 0.0);
  var arcLengthRatio = 1.0;
  var pathPositionOffset = 0.0;
  var pathLength = segmentLength2D;
  if (path.billboard != 0.0) {
    // clipLine may shorten the visible screen-space segment. Preserve the corresponding interval
    // of the complete common-space arclength instead of compressing the full dash period into the
    // visible span. Keep pathLength complete so justification is stable as the camera clips it.
    let visiblePathLength = sourcePathLength * (sourcePathRange.y - sourcePathRange.x);
    arcLengthRatio = 0.0;
    if (segmentLength2D > 0.0) {
      arcLengthRatio = visiblePathLength / segmentLength2D;
    }
    pathPositionOffset = sourcePathLength * sourcePathRange.x;
    pathLength = sourcePathLength;
  } else if (currLength2D > 0.0) {
    arcLengthRatio = length(currDelta3) / safeLength2D;
    pathLength = segmentLength2D * arcLengthRatio;
  }
#else
  let pathLength = select(lenB, lenA, isEnd);
#endif

  let sinHalfA = abs(dot(miterVec, perp));
  let cosHalfA = abs(dot(dirA, miterVec));
  let turnDirection = flipIfTrue(dirA.x * dirB.y >= dirA.y * dirB.x);
  let cornerPosition = sideOfPath * turnDirection;

  var miterSize = 1.0 / max(sinHalfA, EPSILON);
  miterSize = mix(
    min(miterSize, max(lenA, lenB) / max(cosHalfA, EPSILON)),
    miterSize,
    step(0.0, cornerPosition)
  );

  var offsetVec =
    mix(miterVec * miterSize, perp, step(0.5, cornerPosition)) *
    (sideOfPath + isJoint * turnDirection);

  let isStartCap = lenA == 0.0 || (!isEnd && (instanceTypes == 1.0 || instanceTypes == 3.0));
  let isEndCap = lenB == 0.0 || (isEnd && (instanceTypes == 2.0 || instanceTypes == 3.0));
  let isCap = isStartCap || isEndCap;

  var jointType = path.jointType;
  if (isCap) {
    offsetVec = mix(
      perp * sideOfPath,
      dir * path.capType * 4.0 * flipIfTrue(isStartCap),
      isJoint
    );
    jointType = path.capType;
  }

#ifdef ANTIALIASING
  let coverageOffsetVec = offsetVec * coverageScale;
  var miterLength = dot(coverageOffsetVec, miterVec * turnDirection);
#else
  var miterLength = dot(offsetVec, miterVec * turnDirection);
#endif
  miterLength = select(miterLength, isJoint, isCap);

#ifdef ANTIALIASING
  let offsetFromStartOfPath = coverageOffsetVec + deltaA * select(0.0, 1.0, isEnd);
#else
  let offsetFromStartOfPath = offsetVec + deltaA * select(0.0, 1.0, isEnd);
#endif
  let pathPosition = vec2<f32>(
    dot(offsetFromStartOfPath, perp),
#ifdef DASH_ENABLED
    pathPositionOffset + dot(offsetFromStartOfPath, dir) * arcLengthRatio
#else
    dot(offsetFromStartOfPath, dir)
#endif
  );
  let isValid = step(f32(instanceTypes), 3.5);
#ifdef ANTIALIASING
  var offset = vec3<f32>(coverageOffsetVec * width * isValid, 0.0);
#else
  var offset = vec3<f32>(offsetVec * width * isValid, 0.0);
#endif

  if (path.billboard == 0.0 && rotationResult.needsRotation) {
    offset = rotationResult.transform * offset;
  }

#ifdef ANTIALIASING
  return JoinResult(
    offset, coverageOffsetVec, miterLength, pathPosition, pathLength, jointType
  );
#else
  return JoinResult(offset, offsetVec, miterLength, pathPosition, pathLength, jointType);
#endif
}

@vertex
fn vertexMain(attributes: Attributes) -> Varyings {
  var varyings: Varyings;

  geometry.pickingColor = picking_getPickingColorFromIndex(attributes.rowIndexes);

  let isEnd = attributes.positions.x;

  let prevPosition = mix(attributes.instanceLeftPositions, attributes.instanceStartPositions, isEnd);
  let prevPosition64Low = mix(
    attributes.instanceLeftPositions64Low,
    attributes.instanceStartPositions64Low,
    isEnd
  );
  let currPosition = mix(attributes.instanceStartPositions, attributes.instanceEndPositions, isEnd);
  let currPosition64Low = mix(
    attributes.instanceStartPositions64Low,
    attributes.instanceEndPositions64Low,
    isEnd
  );
  let nextPosition = mix(attributes.instanceEndPositions, attributes.instanceRightPositions, isEnd);
  let nextPosition64Low = mix(
    attributes.instanceEndPositions64Low,
    attributes.instanceRightPositions64Low,
    isEnd
  );

  geometry.worldPosition = currPosition;

  let widthPixels =
    clamp(
      project_unit_size_to_pixel(attributes.instanceStrokeWidths * path.widthScale, path.widthUnits),
      path.widthMinPixels,
      path.widthMaxPixels
    ) / 2.0;

  if (path.billboard != 0.0) {
#ifdef DASH_ENABLED
    let prevProjection = project_position_to_clipspace_and_commonspace(
      prevPosition, prevPosition64Low, ZERO_OFFSET
    );
    let nextProjection = project_position_to_clipspace_and_commonspace(
      nextPosition, nextPosition64Low, ZERO_OFFSET
    );
    let prevPositionCommon = prevProjection.commonPosition.xyz;
    let nextPositionCommon = nextProjection.commonPosition.xyz;
    var prevPositionScreen = prevProjection.clipPosition;
    var nextPositionScreen = nextProjection.clipPosition;
#else
    var prevPositionScreen = project_position_to_clipspace(
      prevPosition, prevPosition64Low, ZERO_OFFSET
    );
    var nextPositionScreen = project_position_to_clipspace(
      nextPosition, nextPosition64Low, ZERO_OFFSET
    );
#endif
    let currProjection = project_position_to_clipspace_and_commonspace(
      currPosition, currPosition64Low, ZERO_OFFSET
    );
    geometry.position = currProjection.commonPosition;
    var currPositionScreen = currProjection.clipPosition;
#ifdef DASH_ENABLED
    let currPositionCommon = currProjection.commonPosition.xyz;
    let sourcePathStartScreen = mix(currPositionScreen, prevPositionScreen, isEnd);
    let sourcePathEndScreen = mix(nextPositionScreen, currPositionScreen, isEnd);
    let billboardPathRange = getClippedPathRange(
      sourcePathStartScreen.w, sourcePathEndScreen.w
    );
#endif

    prevPositionScreen = clipLine(prevPositionScreen, currPositionScreen);
    nextPositionScreen = clipLine(nextPositionScreen, currPositionScreen);
    currPositionScreen = clipLine(currPositionScreen, mix(nextPositionScreen, prevPositionScreen, isEnd));

#ifdef ANTIALIASING
    let coverageScale = select(
      1.0,
      (widthPixels + 0.5 / project.devicePixelRatio) / max(widthPixels, 1e-6),
      widthPixels > 0.0
    );
#endif
#ifdef DASH_ENABLED
    let currentDeltaCommon = select(
      nextPositionCommon - currPositionCommon,
      currPositionCommon - prevPositionCommon,
      isEnd > 0.0
    );
    let billboardPathLength = select(
      0.0,
      length(currentDeltaCommon) * project.scale / (widthPixels * project.focalDistance),
      widthPixels > 0.0
    );
#endif
    let join = getLineJoinOffset(
      prevPositionScreen.xyz / prevPositionScreen.w,
      currPositionScreen.xyz / currPositionScreen.w,
      nextPositionScreen.xyz / nextPositionScreen.w,
      project_pixel_size_to_clipspace(vec2<f32>(widthPixels, widthPixels)),
#ifdef DASH_ENABLED
      billboardPathLength,
      billboardPathRange,
#endif
#ifdef ANTIALIASING
      coverageScale,
#endif
      attributes.positions,
      attributes.instanceTypes
    );
#ifdef DASH_ENABLED
    // Phase and justification use the complete source segment, while cap and joint coverage
    // must still recognize the endpoints moved by clipLine.
    varyings.vPathBounds = billboardPathLength * billboardPathRange;
#endif

    geometry.uv = join.pathPosition;
    varyings.position = vec4<f32>(
      currPositionScreen.xyz + join.offset * currPositionScreen.w,
      currPositionScreen.w
    );
    varyings.vCornerOffset = join.cornerOffset;
    varyings.vMiterLength = join.miterLength;
    varyings.vPathPosition = join.pathPosition;
    varyings.vPathLength = join.pathLength;
    varyings.vJointType = join.jointType;
  } else {
    let prevPositionCommon = project_position_vec3_f64(prevPosition, prevPosition64Low);
    let currPositionCommon = project_position_vec3_f64(currPosition, currPosition64Low);
    let nextPositionCommon = project_position_vec3_f64(nextPosition, nextPosition64Low);

    let width = vec2<f32>(
      project_pixel_size_float(widthPixels),
      project_pixel_size_float(widthPixels)
    );
#ifdef ANTIALIASING
    let coverageScale = select(
      1.0,
      (widthPixels + 0.5 / project.devicePixelRatio) / max(widthPixels, 1e-6),
      widthPixels > 0.0
    );
#endif
    let join = getLineJoinOffset(
      prevPositionCommon,
      currPositionCommon,
      nextPositionCommon,
      width,
#ifdef DASH_ENABLED
      1.0,
      vec2<f32>(0.0, 1.0),
#endif
#ifdef ANTIALIASING
      coverageScale,
#endif
      attributes.positions,
      attributes.instanceTypes
    );
#ifdef DASH_ENABLED
    varyings.vPathBounds = vec2<f32>(0.0, join.pathLength);
#endif

    geometry.position = vec4<f32>(currPositionCommon + join.offset, 1.0);
    geometry.uv = join.pathPosition;
    varyings.position = project_common_position_to_clipspace(geometry.position);
    varyings.vCornerOffset = join.cornerOffset;
    varyings.vMiterLength = join.miterLength;
    varyings.vPathPosition = join.pathPosition;
    varyings.vPathLength = join.pathLength;
    varyings.vJointType = join.jointType;
  }

  varyings.clipCoordinates = geometry.position.xy;
  clip_filterPosition(&varyings.position, geometry.worldPosition.xy);

  varyings.vColor = vec4<f32>(
    attributes.instanceColors.rgb,
    attributes.instanceColors.a * layer.opacity
  );
  return varyings;
}

@fragment
fn fragmentMain(varyings: Varyings) -> @location(0) vec4<f32> {
  geometry.uv = varyings.vPathPosition;

#ifdef ANTIALIASING
  // Coordinates of the outer silhouette, in units of half-width: rounded joints and caps are
  // bounded by the corner offset, everywhere else by the edge of the stroke. Dividing by the
  // screen-space derivative converts the distance to the boundary into device pixels, which stays
  // correct under perspective foreshortening and under extensions that rescale the stroke.
#ifdef DASH_ENABLED
  let isCorner =
    varyings.vPathPosition.y < varyings.vPathBounds.x ||
    varyings.vPathPosition.y > varyings.vPathBounds.y;
#else
  let isCorner = varyings.vPathPosition.y < 0.0 || varyings.vPathPosition.y > varyings.vPathLength;
#endif
  let isRound = varyings.vJointType > 0.5;

  // Distance to the silhouette in device pixels, from the derivative of the coordinate that
  // bounds it. Computed before the discards below: derivatives need uniform control flow and are
  // undefined after a discard in the quad. See dev-docs/RFCs/v9.4/analytic-antialiasing-rfc.md
  let bodyCoord = abs(varyings.vPathPosition.x);
  let cornerCoord = length(varyings.vCornerOffset);
  // Both evaluated so each derivative stays on one field across the corner/body boundary
  let bodyPixels = (1.0 - bodyCoord) / max(fwidth(bodyCoord), 1e-6);
  let cornerPixels = (1.0 - cornerCoord) / max(fwidth(cornerCoord), 1e-6);
#ifdef PATH_STYLE_OFFSET
  // Rounded corners still intersect the stroke-width envelope. Extensions may remap
  // vPathPosition.x independently of vCornerOffset, as PathStyleExtension does for offsets.
  let edgePixels = select(bodyPixels, min(cornerPixels, bodyPixels), isRound && isCorner);
#else
  let edgePixels = select(bodyPixels, cornerPixels, isRound && isCorner);
#endif

  // Fragments outside the coverage ramp must not write depth or picking colors.
  if (edgePixels <= -SMOOTH_EDGE_RADIUS) {
    discard;
  }

  if (isCorner) {
    if (!isRound && varyings.vMiterLength > path.miterLimit + 1.0) {
      discard;
    }
  }

  var color = varyings.vColor;

  // Feather one device pixel across the width only, before premultiplication. edgePixels is a
  // signed device-pixel distance and SMOOTH_EDGE_RADIUS is 0.5, so this ramps across one pixel.
  color.a *= smoothedge(0.0, edgePixels);
#else
#ifdef DASH_ENABLED
  if (
    varyings.vPathPosition.y < varyings.vPathBounds.x ||
    varyings.vPathPosition.y > varyings.vPathBounds.y
  ) {
#else
  if (
    varyings.vPathPosition.y < 0.0 ||
    varyings.vPathPosition.y > varyings.vPathLength
  ) {
#endif
    if (varyings.vJointType > 0.5 && length(varyings.vCornerOffset) > 1.0) {
      discard;
    }
    if (
      varyings.vJointType < 0.5 &&
      varyings.vMiterLength > path.miterLimit + 1.0
    ) {
      discard;
    }
  }
#endif

  // Fragment-layer injections that discard pixels must run after analytic coverage derivatives.
  // See TripsLayer, which rejects fragments outside of the active time window at this anchor.
  // DECKGL_FILTER_COLOR
  clip_filterColor(varyings.clipCoordinates);
#ifdef ANTIALIASING
  return deckgl_premultiplied_alpha(color);
#else
  return deckgl_premultiplied_alpha(varyings.vColor);
#endif
}
`,Yt=`#version 300 es
#define SHADER_NAME path-layer-vertex-shader
in vec2 positions;
in float instanceTypes;
in vec3 instanceStartPositions;
in vec3 instanceEndPositions;
in vec3 instanceLeftPositions;
in vec3 instanceRightPositions;
in vec3 instanceLeftPositions64Low;
in vec3 instanceStartPositions64Low;
in vec3 instanceEndPositions64Low;
in vec3 instanceRightPositions64Low;
in float instanceStrokeWidths;
in vec4 instanceColors;
in float rowIndexes;
uniform float opacity;
out vec4 vColor;
out vec2 vCornerOffset;
out float vMiterLength;
out vec2 vPathPosition;
out float vPathLength;
out float vJointType;
#ifdef DASH_ENABLED
out vec2 vPathBounds;
#endif
const float EPSILON = 0.001;
const vec3 ZERO_OFFSET = vec3(0.0);
float flipIfTrue(bool flag) {
return -(float(flag) * 2. - 1.);
}
vec3 getLineJoinOffset(
vec3 prevPoint, vec3 currPoint, vec3 nextPoint,
vec2 width
#ifdef DASH_ENABLED
, float sourcePathLength, vec2 sourcePathRange
#endif
#ifdef ANTIALIASING
, float coverageScale
#endif
) {
bool isEnd = positions.x > 0.0;
float sideOfPath = positions.y;
float isJoint = float(sideOfPath == 0.0);
vec3 deltaA3 = (currPoint - prevPoint);
vec3 deltaB3 = (nextPoint - currPoint);
mat3 rotationMatrix;
bool needsRotation = !path.billboard && project_needs_rotation(currPoint, rotationMatrix);
if (needsRotation) {
deltaA3 = deltaA3 * rotationMatrix;
deltaB3 = deltaB3 * rotationMatrix;
}
vec2 deltaA = deltaA3.xy / width;
vec2 deltaB = deltaB3.xy / width;
float lenA = length(deltaA);
float lenB = length(deltaB);
vec2 dirA = lenA > 0. ? normalize(deltaA) : vec2(0.0, 0.0);
vec2 dirB = lenB > 0. ? normalize(deltaB) : vec2(0.0, 0.0);
vec2 perpA = vec2(-dirA.y, dirA.x);
vec2 perpB = vec2(-dirB.y, dirB.x);
vec2 tangent = dirA + dirB;
tangent = length(tangent) > 0. ? normalize(tangent) : perpA;
vec2 miterVec = vec2(-tangent.y, tangent.x);
vec2 dir = isEnd ? dirA : dirB;
vec2 perp = isEnd ? perpA : perpB;
float L = isEnd ? lenA : lenB;
#ifdef DASH_ENABLED
vec3 currDelta3 = isEnd ? deltaA3 : deltaB3;
float currLength2D = length(currDelta3.xy);
float arcLengthRatio = 1.0;
float pathPositionOffset = 0.0;
float pathLength = L;
if (path.billboard) {
float visiblePathLength = sourcePathLength * (sourcePathRange.y - sourcePathRange.x);
arcLengthRatio = L > 0.0 ? visiblePathLength / L : 0.0;
pathPositionOffset = sourcePathLength * sourcePathRange.x;
pathLength = sourcePathLength;
} else if (currLength2D > 0.0) {
arcLengthRatio = length(currDelta3) / currLength2D;
pathLength = L * arcLengthRatio;
}
#endif
float sinHalfA = abs(dot(miterVec, perp));
float cosHalfA = abs(dot(dirA, miterVec));
float turnDirection = flipIfTrue(dirA.x * dirB.y >= dirA.y * dirB.x);
float cornerPosition = sideOfPath * turnDirection;
float miterSize = 1.0 / max(sinHalfA, EPSILON);
miterSize = mix(
min(miterSize, max(lenA, lenB) / max(cosHalfA, EPSILON)),
miterSize,
step(0.0, cornerPosition)
);
vec2 offsetVec = mix(miterVec * miterSize, perp, step(0.5, cornerPosition))
* (sideOfPath + isJoint * turnDirection);
bool isStartCap = lenA == 0.0 || (!isEnd && (instanceTypes == 1.0 || instanceTypes == 3.0));
bool isEndCap = lenB == 0.0 || (isEnd && (instanceTypes == 2.0 || instanceTypes == 3.0));
bool isCap = isStartCap || isEndCap;
if (isCap) {
offsetVec = mix(perp * sideOfPath, dir * path.capType * 4.0 * flipIfTrue(isStartCap), isJoint);
vJointType = path.capType;
} else {
vJointType = path.jointType;
}
#ifdef ANTIALIASING
vec2 coverageOffsetVec = offsetVec * coverageScale;
#ifdef DASH_ENABLED
vPathLength = pathLength;
#else
vPathLength = L;
#endif
vCornerOffset = coverageOffsetVec;
vMiterLength = dot(vCornerOffset, miterVec * turnDirection);
vMiterLength = isCap ? isJoint : vMiterLength;
vec2 offsetFromStartOfPath = coverageOffsetVec + deltaA * float(isEnd);
vPathPosition = vec2(
dot(offsetFromStartOfPath, perp),
#ifdef DASH_ENABLED
pathPositionOffset + dot(offsetFromStartOfPath, dir) * arcLengthRatio
#else
dot(offsetFromStartOfPath, dir)
#endif
);
geometry.uv = vPathPosition;
float isValid = step(instanceTypes, 3.5);
vec3 offset = vec3(coverageOffsetVec * width * isValid, 0.0);
#else
#ifdef DASH_ENABLED
vPathLength = pathLength;
#else
vPathLength = L;
#endif
vCornerOffset = offsetVec;
vMiterLength = dot(vCornerOffset, miterVec * turnDirection);
vMiterLength = isCap ? isJoint : vMiterLength;
vec2 offsetFromStartOfPath = vCornerOffset + deltaA * float(isEnd);
vPathPosition = vec2(
dot(offsetFromStartOfPath, perp),
#ifdef DASH_ENABLED
pathPositionOffset + dot(offsetFromStartOfPath, dir) * arcLengthRatio
#else
dot(offsetFromStartOfPath, dir)
#endif
);
geometry.uv = vPathPosition;
float isValid = step(instanceTypes, 3.5);
vec3 offset = vec3(offsetVec * width * isValid, 0.0);
#endif
if (needsRotation) {
offset = rotationMatrix * offset;
}
return offset;
}
void clipLine(inout vec4 position, vec4 refPosition) {
if (position.w < EPSILON) {
float r = (EPSILON - refPosition.w) / (position.w - refPosition.w);
position = refPosition + (position - refPosition) * r;
}
}
#ifdef DASH_ENABLED
vec2 getClippedPathRange(float startW, float endW) {
bool startClipped = startW < EPSILON;
bool endClipped = endW < EPSILON;
if (startClipped && endClipped) {
return vec2(0.0);
}
if (startClipped || endClipped) {
float intersection = clamp((EPSILON - startW) / (endW - startW), 0.0, 1.0);
return startClipped ? vec2(intersection, 1.0) : vec2(0.0, intersection);
}
return vec2(0.0, 1.0);
}
#endif
void main() {
geometry.pickingColor = picking_getPickingColorFromIndex(rowIndexes);
vColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
float isEnd = positions.x;
vec3 prevPosition = mix(instanceLeftPositions, instanceStartPositions, isEnd);
vec3 prevPosition64Low = mix(instanceLeftPositions64Low, instanceStartPositions64Low, isEnd);
vec3 currPosition = mix(instanceStartPositions, instanceEndPositions, isEnd);
vec3 currPosition64Low = mix(instanceStartPositions64Low, instanceEndPositions64Low, isEnd);
vec3 nextPosition = mix(instanceEndPositions, instanceRightPositions, isEnd);
vec3 nextPosition64Low = mix(instanceEndPositions64Low, instanceRightPositions64Low, isEnd);
geometry.worldPosition = currPosition;
vec2 widthPixels = vec2(clamp(
project_size_to_pixel(instanceStrokeWidths * path.widthScale, path.widthUnits),
path.widthMinPixels, path.widthMaxPixels) / 2.0);
vec3 width;
if (path.billboard) {
#ifdef DASH_ENABLED
vec4 prevPositionCommon;
vec4 nextPositionCommon;
vec4 prevPositionScreen = project_position_to_clipspace(
prevPosition, prevPosition64Low, ZERO_OFFSET, prevPositionCommon
);
#else
vec4 prevPositionScreen = project_position_to_clipspace(
prevPosition, prevPosition64Low, ZERO_OFFSET
);
#endif
vec4 currPositionScreen = project_position_to_clipspace(currPosition, currPosition64Low, ZERO_OFFSET, geometry.position);
#ifdef DASH_ENABLED
vec4 nextPositionScreen = project_position_to_clipspace(
nextPosition, nextPosition64Low, ZERO_OFFSET, nextPositionCommon
);
#else
vec4 nextPositionScreen = project_position_to_clipspace(
nextPosition, nextPosition64Low, ZERO_OFFSET
);
#endif
#ifdef DASH_ENABLED
vec4 sourcePathStartScreen = mix(currPositionScreen, prevPositionScreen, isEnd);
vec4 sourcePathEndScreen = mix(nextPositionScreen, currPositionScreen, isEnd);
vec2 billboardPathRange = getClippedPathRange(
sourcePathStartScreen.w, sourcePathEndScreen.w
);
#endif
clipLine(prevPositionScreen, currPositionScreen);
clipLine(nextPositionScreen, currPositionScreen);
clipLine(currPositionScreen, mix(nextPositionScreen, prevPositionScreen, isEnd));
width = vec3(widthPixels, 0.0);
DECKGL_FILTER_SIZE(width, geometry);
#ifdef ANTIALIASING
vec2 coveragePadding = vec2(0.5 / project.devicePixelRatio);
float coverageScale = length(width.xy) > 0.0
? length(width.xy + coveragePadding) / length(width.xy)
: 1.0;
#endif
#ifdef DASH_ENABLED
vec3 currentDeltaCommon = isEnd > 0.0
? geometry.position.xyz - prevPositionCommon.xyz
: nextPositionCommon.xyz - geometry.position.xyz;
float billboardPathLength = width.x > 0.0
? length(currentDeltaCommon) * project.scale / (width.x * project.focalDistance)
: 0.0;
#endif
vec3 offset = getLineJoinOffset(
prevPositionScreen.xyz / prevPositionScreen.w,
currPositionScreen.xyz / currPositionScreen.w,
nextPositionScreen.xyz / nextPositionScreen.w,
project_pixel_size_to_clipspace(width.xy)
#ifdef DASH_ENABLED
,
billboardPathLength, billboardPathRange
#endif
#ifdef ANTIALIASING
,
coverageScale
#endif
);
#ifdef DASH_ENABLED
vPathBounds = billboardPathLength * billboardPathRange;
#endif
DECKGL_FILTER_GL_POSITION(currPositionScreen, geometry);
gl_Position = vec4(currPositionScreen.xyz + offset * currPositionScreen.w, currPositionScreen.w);
} else {
prevPosition = project_position(prevPosition, prevPosition64Low);
currPosition = project_position(currPosition, currPosition64Low);
nextPosition = project_position(nextPosition, nextPosition64Low);
width = vec3(project_pixel_size(widthPixels), 0.0);
DECKGL_FILTER_SIZE(width, geometry);
#ifdef ANTIALIASING
vec2 coveragePadding = project_pixel_size(vec2(0.5 / project.devicePixelRatio));
float coverageScale = length(width.xy) > 0.0
? length(width.xy + coveragePadding) / length(width.xy)
: 1.0;
#endif
vec3 offset = getLineJoinOffset(
prevPosition, currPosition, nextPosition, width.xy
#ifdef DASH_ENABLED
, 1.0, vec2(0.0, 1.0)
#endif
#ifdef ANTIALIASING
, coverageScale
#endif
);
#ifdef DASH_ENABLED
vPathBounds = vec2(0.0, vPathLength);
#endif
geometry.position = vec4(currPosition + offset, 1.0);
gl_Position = project_common_position_to_clipspace(geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
}
DECKGL_FILTER_COLOR(vColor, geometry);
}
`,Xt=`#version 300 es
#define SHADER_NAME path-layer-fragment-shader
precision highp float;
in vec4 vColor;
in vec2 vCornerOffset;
in float vMiterLength;
in vec2 vPathPosition;
in float vPathLength;
in float vJointType;
#ifdef DASH_ENABLED
in vec2 vPathBounds;
#endif
out vec4 fragColor;
void main(void) {
geometry.uv = vPathPosition;
#ifdef ANTIALIASING
#ifdef DASH_ENABLED
bool isCorner = vPathPosition.y < vPathBounds.x || vPathPosition.y > vPathBounds.y;
#else
bool isCorner = vPathPosition.y < 0.0 || vPathPosition.y > vPathLength;
#endif
bool isRound = vJointType > 0.5;
float bodyCoord = abs(vPathPosition.x);
float cornerCoord = length(vCornerOffset);
float bodyPixels = (1.0 - bodyCoord) / max(fwidth(bodyCoord), 1e-6);
float cornerPixels = (1.0 - cornerCoord) / max(fwidth(cornerCoord), 1e-6);
#ifdef PATH_STYLE_OFFSET
float edgePixels = isRound && isCorner ? min(cornerPixels, bodyPixels) : bodyPixels;
#else
float edgePixels = isRound && isCorner ? cornerPixels : bodyPixels;
#endif
if (edgePixels <= -SMOOTH_EDGE_RADIUS) {
discard;
}
if (isCorner) {
if (!isRound && vMiterLength > path.miterLimit + 1.0) {
discard;
}
}
fragColor = vColor;
fragColor.a *= smoothedge(0.0, edgePixels);
#else
#ifdef DASH_ENABLED
if (vPathPosition.y < vPathBounds.x || vPathPosition.y > vPathBounds.y) {
#else
if (vPathPosition.y < 0.0 || vPathPosition.y > vPathLength) {
#endif
if (vJointType > 0.5 && length(vCornerOffset) > 1.0) {
discard;
}
if (vJointType < 0.5 && vMiterLength > path.miterLimit + 1.0) {
discard;
}
}
fragColor = vColor;
#endif
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`,Zt=[0,0,0,255],Qt={widthUnits:`meters`,widthScale:{type:`number`,min:0,value:1},widthMinPixels:{type:`number`,min:0,value:0},widthMaxPixels:{type:`number`,min:0,value:2**53-1},jointRounded:!1,capRounded:!1,miterLimit:{type:`number`,min:0,value:4},antialiasing:!1,billboard:!1,_pathType:null,getPath:{type:`accessor`,value:e=>e.path},getColor:{type:`accessor`,value:Zt},getWidth:{type:`accessor`,value:1},rounded:{deprecatedFor:[`jointRounded`,`capRounded`]}},$t={enter:(e,t)=>t.length?t.subarray(t.length-e.length):e};function en(e){if(e.isGeospatial)return null;let{unitsPerMeter:t}=e.distanceScales;return[t[0],t[1],t[2]]}function tn(e,t){return e===t||!!(e&&t&&e.length===t.length&&e.every((e,n)=>e===t[n]))}var nn=class extends P{getShaders(){let{antialiasing:e}=this.props;return super.getShaders({vs:Yt,fs:Xt,source:Jt,defines:e?{ANTIALIASING:1}:{},modules:[N,pe,M,qt,...this.context.device.type===`webgpu`?[dt]:[]]})}get wrapLongitude(){return!1}getBounds(){return this.context.device.type===`webgpu`?null:this.getAttributeManager()?.getBounds([`vertexPositions`])}getPathProjectionScale(e){let t=this.props.coordinateSystem;if(!this.getAttributeManager()?.getAttributes().instanceDashOffsets)return null;if(e instanceof u&&e.zoom>=12&&(t==="default"||t===`lnglat`||t===`cartesian`)){let n=p.getUniforms({viewport:e,coordinateSystem:t,coordinateOrigin:this.props.coordinateOrigin,autoWrapLongitude:this.wrapLongitude});return[e.projectionMode,n.coordinateOrigin[1],n.commonOrigin[1],...n.commonUnitsPerWorldUnit,...n.commonUnitsPerWorldUnit2,n.commonUnitsPerMeter[2]]}let n=en(e);return n?[e.projectionMode,...n]:[e.projectionMode]}shouldUpdateState(e){let{viewport:t}=this.context;return super.shouldUpdateState(e)||this.state?.tessellationResolution!==t.resolution||!tn(this.state?.pathProjectionScale,this.getPathProjectionScale(t))}initializeState(){let e=this.context.device.type===`webgpu`;this.getAttributeManager().addInstanced({...e?{pathPositions:{size:24,type:`float32`,transition:!1,accessor:`getPath`,update:this.calculateWebGPUPositions,shaderAttributes:{instanceLeftPositions:{size:3,elementOffset:0},instanceStartPositions:{size:3,elementOffset:3},instanceEndPositions:{size:3,elementOffset:6},instanceRightPositions:{size:3,elementOffset:9},instanceLeftPositions64Low:{size:3,elementOffset:12},instanceStartPositions64Low:{size:3,elementOffset:15},instanceEndPositions64Low:{size:3,elementOffset:18},instanceRightPositions64Low:{size:3,elementOffset:21}},noAlloc:!0}}:{vertexPositions:{size:3,vertexOffset:1,type:`float64`,fp64:this.use64bitPositions(),transition:$t,accessor:`getPath`,update:this.calculatePositions,noAlloc:!0,shaderAttributes:{instanceLeftPositions:{vertexOffset:0},instanceStartPositions:{vertexOffset:1},instanceEndPositions:{vertexOffset:2},instanceRightPositions:{vertexOffset:3}}}},instanceTypes:{size:1,type:e?`float32`:`uint8`,update:this.calculateSegmentTypes,noAlloc:!0},instanceStrokeWidths:{size:1,accessor:`getWidth`,transition:!e&&$t,defaultValue:1,bufferGroup:`path-instance-data`},instanceColors:{size:this.props.colorFormat.length,type:`unorm8`,accessor:`getColor`,transition:!e&&$t,defaultValue:Zt,bufferGroup:`path-instance-data`},rowIndexes:{size:1,type:`uint32`,accessor:(e,{index:t})=>e&&e.__source?e.__source.index:t,bufferGroup:`path-instance-data`}}),this.setState({pathTesselator:new Ut({fp64:this.use64bitPositions(),isWebGPU:e}),tessellationResolution:this.context.viewport.resolution,pathProjectionScale:this.getPathProjectionScale(this.context.viewport)})}updateState(e){super.updateState(e);let{props:t,oldProps:n,changeFlags:r}=e,i=this.getAttributeManager(),{viewport:a}=this.context,o=this.state.tessellationResolution!==a.resolution,s=this.getPathProjectionScale(a),c=!tn(this.state.pathProjectionScale,s),l=r.updateTriggersChanged&&(r.updateTriggersChanged.all||r.updateTriggersChanged.getPath)||t._pathType!==n._pathType||t.positionFormat!==n.positionFormat||t.wrapLongitude!==n.wrapLongitude||o;if(r.dataChanged||l){let{pathTesselator:e}=this.state,n=t.data.attributes||{};e.updateGeometry({data:t.data,geometryBuffer:n.getPath,buffers:n,normalize:!t._pathType,loop:t._pathType===`loop`,getGeometry:t.getPath,positionFormat:t.positionFormat,wrapLongitude:t.wrapLongitude,resolution:a.resolution,dataChanged:l?void 0:r.dataChanged}),this.setState({numInstances:e.instanceCount,startIndices:e.vertexStarts,tessellationResolution:a.resolution,pathProjectionScale:s}),!r.dataChanged||l?i.invalidateAll():c&&i.invalidate(`instanceDashOffsets`)}else c&&(this.setState({pathProjectionScale:s}),i.invalidate(`instanceDashOffsets`));(r.extensionsChanged||t.antialiasing!==n.antialiasing)&&(this.state.model?.destroy(),this.state.model=this._getModel(),i.invalidateAll())}getPickingInfo(e){let t=super.getPickingInfo(e),{index:n}=t,r=this.props.data;return r[0]&&r[0].__source&&(t.object=r.find(e=>e.__source.index===n)),t}disablePickingIndex(e){let t=this.props.data;if(t[0]&&t[0].__source)for(let n=0;n<t.length;n++)t[n].__source.index===e&&this._disablePickingIndex(n);else super.disablePickingIndex(e)}draw({uniforms:e}){let{jointRounded:t,capRounded:n,billboard:r,miterLimit:i,widthUnits:a,widthScale:o,widthMinPixels:s,widthMaxPixels:l}=this.props,u=this.state.model,d={jointType:Number(t),capType:Number(n),billboard:r,widthUnits:c[a],widthScale:o,miterLimit:i,widthMinPixels:s,widthMaxPixels:l};u.shaderInputs.setProps({path:d}),u.draw(this.context.renderPass)}_getModel(){let e=[0,1,2,1,4,2,1,3,4,3,5,4],t=[0,0,0,-1,0,1,1,-1,1,1,1,0];return new F(this.context.device,{...this.getShaders(),id:this.props.id,bufferLayout:this.getAttributeManager().getBufferLayouts(),geometry:new j({topology:`triangle-list`,attributes:{indices:new Uint16Array(e),positions:{value:new Float32Array(t),size:2}}}),isInstanced:!0})}calculatePositions(e){let{pathTesselator:t}=this.state;e.startIndices=t.vertexStarts,e.value=t.get(`positions`)}calculateSegmentTypes(e){let{pathTesselator:t}=this.state;e.startIndices=t.vertexStarts,e.value=t.get(`segmentTypes`)}calculateWebGPUPositions(e){let{pathTesselator:t}=this.state,n=t.get(`positions`);if(!n){e.value=null;return}let r=t.instanceCount,i=new Float32Array(r*24),a=[-1,0,1,2];for(let e=0;e<r;e++){let t=e*24;for(let o=0;o<4;o++){let s=e+a[o],c=t+o*3;for(let e=0;e<3;e++){let t=s>=0&&s<r?n[s*3+e]:0,a=Math.fround(t);i[c+e]=a,i[c+e+12]=t-a}}}e.startIndices=t.vertexStarts,e.value=i}};nn.defaultProps=Qt,nn.layerName=`PathLayer`;var rn=e(t(((e,t)=>{t.exports=n,t.exports.default=n;function n(e,t,n){n||=2;var i=t&&t.length,o=i?t[0]*n:e.length,s=r(e,0,o,n,!0),c=[];if(!s||s.next===s.prev)return c;var l,d,f,p,m,h,g;if(i&&(s=u(e,t,s,n)),e.length>80*n){l=f=e[0],d=p=e[1];for(var _=n;_<o;_+=n)m=e[_],h=e[_+1],m<l&&(l=m),h<d&&(d=h),m>f&&(f=m),h>p&&(p=h);g=Math.max(f-l,p-d),g=g===0?0:32767/g}return a(s,c,n,l,d,g,0),c}function r(e,t,n,r,i){var a,o;if(i===k(e,t,n,r)>0)for(a=t;a<n;a+=r)o=re(a,e[a],e[a+1],o);else for(a=n-r;a>=t;a-=r)o=re(a,e[a],e[a+1],o);return o&&S(o,o.next)&&(D(o),o=o.next),o}function i(e,t){if(!e)return e;t||=e;var n=e,r;do if(r=!1,!n.steiner&&(S(n,n.next)||x(n.prev,n,n.next)===0)){if(D(n),n=t=n.prev,n===n.next)break;r=!0}else n=n.next;while(r||n!==t);return t}function a(e,t,n,r,u,d,f){if(e){!f&&d&&h(e,r,u,d);for(var p=e,m,g;e.prev!==e.next;){if(m=e.prev,g=e.next,d?s(e,r,u,d):o(e)){t.push(m.i/n|0),t.push(e.i/n|0),t.push(g.i/n|0),D(e),e=g.next,p=g.next;continue}if(e=g,e===p){f?f===1?(e=c(i(e),t,n),a(e,t,n,r,u,d,2)):f===2&&l(e,t,n,r,u,d):a(i(e),t,n,r,u,d,1);break}}}}function o(e){var t=e.prev,n=e,r=e.next;if(x(t,n,r)>=0)return!1;for(var i=t.x,a=n.x,o=r.x,s=t.y,c=n.y,l=r.y,u=i<a?i<o?i:o:a<o?a:o,d=s<c?s<l?s:l:c<l?c:l,f=i>a?i>o?i:o:a>o?a:o,p=s>c?s>l?s:l:c>l?c:l,m=r.next;m!==t;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=p&&y(i,s,a,c,o,l,m.x,m.y)&&x(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function s(e,t,n,r){var i=e.prev,a=e,o=e.next;if(x(i,a,o)>=0)return!1;for(var s=i.x,c=a.x,l=o.x,u=i.y,d=a.y,f=o.y,p=s<c?s<l?s:l:c<l?c:l,m=u<d?u<f?u:f:d<f?d:f,h=s>c?s>l?s:l:c>l?c:l,g=u>d?u>f?u:f:d>f?d:f,v=_(p,m,t,n,r),b=_(h,g,t,n,r),S=e.prevZ,C=e.nextZ;S&&S.z>=v&&C&&C.z<=b;){if(S.x>=p&&S.x<=h&&S.y>=m&&S.y<=g&&S!==i&&S!==o&&y(s,u,c,d,l,f,S.x,S.y)&&x(S.prev,S,S.next)>=0||(S=S.prevZ,C.x>=p&&C.x<=h&&C.y>=m&&C.y<=g&&C!==i&&C!==o&&y(s,u,c,d,l,f,C.x,C.y)&&x(C.prev,C,C.next)>=0))return!1;C=C.nextZ}for(;S&&S.z>=v;){if(S.x>=p&&S.x<=h&&S.y>=m&&S.y<=g&&S!==i&&S!==o&&y(s,u,c,d,l,f,S.x,S.y)&&x(S.prev,S,S.next)>=0)return!1;S=S.prevZ}for(;C&&C.z<=b;){if(C.x>=p&&C.x<=h&&C.y>=m&&C.y<=g&&C!==i&&C!==o&&y(s,u,c,d,l,f,C.x,C.y)&&x(C.prev,C,C.next)>=0)return!1;C=C.nextZ}return!0}function c(e,t,n){var r=e;do{var a=r.prev,o=r.next.next;!S(a,o)&&C(a,r,r.next,o)&&E(a,o)&&E(o,a)&&(t.push(a.i/n|0),t.push(r.i/n|0),t.push(o.i/n|0),D(r),D(r.next),r=e=o),r=r.next}while(r!==e);return i(r)}function l(e,t,n,r,o,s){var c=e;do{for(var l=c.next.next;l!==c.prev;){if(c.i!==l.i&&b(c,l)){var u=ne(c,l);c=i(c,c.next),u=i(u,u.next),a(c,t,n,r,o,s,0),a(u,t,n,r,o,s,0);return}l=l.next}c=c.next}while(c!==e)}function u(e,t,n,i){for(var a=[],o=0,s=t.length,c,l,u;o<s;o++)c=t[o]*i,l=o<s-1?t[o+1]*i:e.length,u=r(e,c,l,i,!1),u===u.next&&(u.steiner=!0),a.push(v(u));for(a.sort(d),o=0;o<a.length;o++)n=f(a[o],n);return n}function d(e,t){return e.x-t.x}function f(e,t){var n=p(e,t);if(!n)return t;var r=ne(n,e);return i(r,r.next),i(n,n.next)}function p(e,t){var n=t,r=e.x,i=e.y,a=-1/0,o;do{if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){var s=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(s<=r&&s>a&&(a=s,o=n.x<n.next.x?n:n.next,s===r))return o}n=n.next}while(n!==t);if(!o)return null;var c=o,l=o.x,u=o.y,d=1/0,f;n=o;do r>=n.x&&n.x>=l&&r!==n.x&&y(i<u?r:a,i,l,u,i<u?a:r,i,n.x,n.y)&&(f=Math.abs(i-n.y)/(r-n.x),E(n,e)&&(f<d||f===d&&(n.x>o.x||n.x===o.x&&m(o,n)))&&(o=n,d=f)),n=n.next;while(n!==c);return o}function m(e,t){return x(e.prev,e,t.prev)<0&&x(t.next,e,e.next)<0}function h(e,t,n,r){var i=e;do i.z===0&&(i.z=_(i.x,i.y,t,n,r)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==e);i.prevZ.nextZ=null,i.prevZ=null,g(i)}function g(e){var t,n,r,i,a,o,s,c,l=1;do{for(n=e,e=null,a=null,o=0;n;){for(o++,r=n,s=0,t=0;t<l&&(s++,r=r.nextZ,r);t++);for(c=l;s>0||c>0&&r;)s!==0&&(c===0||!r||n.z<=r.z)?(i=n,n=n.nextZ,s--):(i=r,r=r.nextZ,c--),a?a.nextZ=i:e=i,i.prevZ=a,a=i;n=r}a.nextZ=null,l*=2}while(o>1);return e}function _(e,t,n,r,i){return e=(e-n)*i|0,t=(t-r)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function v(e){var t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function y(e,t,n,r,i,a,o,s){return(i-o)*(t-s)>=(e-o)*(a-s)&&(e-o)*(r-s)>=(n-o)*(t-s)&&(n-o)*(a-s)>=(i-o)*(r-s)}function b(e,t){return e.next.i!==t.i&&e.prev.i!==t.i&&!ee(e,t)&&(E(e,t)&&E(t,e)&&te(e,t)&&(x(e.prev,e,t.prev)||x(e,t.prev,t))||S(e,t)&&x(e.prev,e,e.next)>0&&x(t.prev,t,t.next)>0)}function x(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function S(e,t){return e.x===t.x&&e.y===t.y}function C(e,t,n,r){var i=T(x(e,t,n)),a=T(x(e,t,r)),o=T(x(n,r,e)),s=T(x(n,r,t));return!!(i!==a&&o!==s||i===0&&w(e,n,t)||a===0&&w(e,r,t)||o===0&&w(n,e,r)||s===0&&w(n,t,r))}function w(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function T(e){return e>0?1:e<0?-1:0}function ee(e,t){var n=e;do{if(n.i!==e.i&&n.next.i!==e.i&&n.i!==t.i&&n.next.i!==t.i&&C(n,n.next,e,t))return!0;n=n.next}while(n!==e);return!1}function E(e,t){return x(e.prev,e,e.next)<0?x(e,t,e.next)>=0&&x(e,e.prev,t)>=0:x(e,t,e.prev)<0||x(e,e.next,t)<0}function te(e,t){var n=e,r=!1,i=(e.x+t.x)/2,a=(e.y+t.y)/2;do n.y>a!=n.next.y>a&&n.next.y!==n.y&&i<(n.next.x-n.x)*(a-n.y)/(n.next.y-n.y)+n.x&&(r=!r),n=n.next;while(n!==e);return r}function ne(e,t){var n=new O(e.i,e.x,e.y),r=new O(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,r.next=n,n.prev=r,a.next=r,r.prev=a,r}function re(e,t,n,r){var i=new O(e,t,n);return r?(i.next=r.next,i.prev=r,r.next.prev=i,r.next=i):(i.prev=i,i.next=i),i}function D(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ)}function O(e,t,n){this.i=e,this.x=t,this.y=n,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}n.deviation=function(e,t,n,r){var i=t&&t.length,a=i?t[0]*n:e.length,o=Math.abs(k(e,0,a,n));if(i)for(var s=0,c=t.length;s<c;s++){var l=t[s]*n,u=s<c-1?t[s+1]*n:e.length;o-=Math.abs(k(e,l,u,n))}var d=0;for(s=0;s<r.length;s+=3){var f=r[s]*n,p=r[s+1]*n,m=r[s+2]*n;d+=Math.abs((e[f]-e[m])*(e[p+1]-e[f+1])-(e[f]-e[p])*(e[m+1]-e[f+1]))}return o===0&&d===0?0:Math.abs((d-o)/o)};function k(e,t,n,r){for(var i=0,a=t,o=n-r;a<n;a+=r)i+=(e[o]-e[a])*(e[a+1]+e[o+1]),o=a;return i}n.flatten=function(e){for(var t=e[0][0].length,n={vertices:[],holes:[],dimensions:t},r=0,i=0;i<e.length;i++){for(var a=0;a<e[i].length;a++)for(var o=0;o<t;o++)n.vertices.push(e[i][a][o]);i>0&&(r+=e[i-1].length,n.holes.push(r))}return n}}))(),1),an=ht.CLOCKWISE,on=ht.COUNTER_CLOCKWISE,V={isClosed:!0};function sn(e){if(e=e&&e.positions||e,!Array.isArray(e)&&!ArrayBuffer.isView(e))throw Error(`invalid polygon`)}function cn(e){return`positions`in e?e.positions:e}function ln(e){return`holeIndices`in e?e.holeIndices:null}function un(e){return Array.isArray(e[0])}function dn(e){return e.length>=1&&e[0].length>=2&&Number.isFinite(e[0][0])}function fn(e){let t=e[0],n=e[e.length-1];return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]}function pn(e,t,n,r){for(let i=0;i<t;i++)if(e[n+i]!==e[r-t+i])return!1;return!0}function mn(e,t,n,r,i){let a=t,o=n.length;for(let t=0;t<o;t++)for(let i=0;i<r;i++)e[a++]=n[t][i]||0;if(!fn(n))for(let t=0;t<r;t++)e[a++]=n[0][t]||0;return V.start=t,V.end=a,V.size=r,gt(e,i,V),a}function hn(e,t,n,r,i=0,a,o){a||=n.length;let s=a-i;if(s<=0)return t;let c=t;for(let t=0;t<s;t++)e[c++]=n[i+t];if(!pn(n,r,i,a))for(let t=0;t<r;t++)e[c++]=n[i+t];return V.start=t,V.end=c,V.size=r,gt(e,o,V),c}function gn(e,t){sn(e);let n=[],r=[];if(`positions`in e){let{positions:i,holeIndices:a}=e;if(a){let e=0;for(let o=0;o<=a.length;o++)e=hn(n,e,i,t,a[o-1],a[o],o===0?an:on),r.push(e);return r.pop(),{positions:n,holeIndices:r}}e=i}if(!un(e))return hn(n,0,e,t,0,n.length,an),n;if(!dn(e)){let i=0;for(let[a,o]of e.entries())i=mn(n,i,o,t,a===0?an:on),r.push(i);return r.pop(),{positions:n,holeIndices:r}}return mn(n,0,e,t,an),n}function _n(e,t,n){let r=e.length/3,i=0;for(let a=0;a<r;a++){let o=(a+1)%r;i+=e[a*3+t]*e[o*3+n],i-=e[o*3+t]*e[a*3+n]}return Math.abs(i/2)}function vn(e,t,n,r){let i=e.length/3;for(let a=0;a<i;a++){let i=a*3,o=e[i+0],s=e[i+1],c=e[i+2];e[i+t]=o,e[i+n]=s,e[i+r]=c}}function yn(e,t,n,r){let i=ln(e);i&&=i.map(e=>e/t);let a=cn(e),o=r&&t===3;if(n){let e=a.length;a=a.slice();let r=[];for(let i=0;i<e;i+=t){r[0]=a[i],r[1]=a[i+1],o&&(r[2]=a[i+2]);let e=n(r);a[i]=e[0],a[i+1]=e[1],o&&(a[i+2]=e[2])}}if(o){let e=_n(a,0,1),t=_n(a,0,2),r=_n(a,1,2);if(!e&&!t&&!r)return[];e>t&&e>r||(t>r?(n||(a=a.slice()),vn(a,0,2,1)):(n||(a=a.slice()),vn(a,2,0,1)))}return(0,rn.default)(a,i,t)}var bn=class extends Pe{constructor(e){let{fp64:t,IndexType:n=Uint32Array}=e;super({...e,attributes:{positions:{size:3,type:t?Float64Array:Float32Array},vertexValid:{type:Uint16Array,size:1},indices:{type:n,size:1}}})}get(e){let{attributes:t}=this;return e===`indices`?t.indices&&t.indices.subarray(0,this.vertexCount):t[e]}updateGeometry(e){super.updateGeometry(e);let t=this.buffers.indices;if(t)this.vertexCount=(t.value||t).length;else if(this.data&&!this.getGeometry)throw Error(`missing indices buffer`)}normalizeGeometry(e){if(this.normalize){let t=gn(e,this.positionSize);return this.opts.resolution?Dt(cn(t),ln(t),{size:this.positionSize,gridResolution:this.opts.resolution,edgeTypes:!0}):this.opts.wrapLongitude?Ft(cn(t),ln(t),{size:this.positionSize,maxLatitude:86,edgeTypes:!0}):t}return e}getGeometrySize(e){if(xn(e)){let t=0;for(let n of e)t+=this.getGeometrySize(n);return t}return cn(e).length/this.positionSize}getGeometryFromBuffer(e){return this.normalize||!this.buffers.indices?super.getGeometryFromBuffer(e):null}updateGeometryAttributes(e,t){if(e&&xn(e))for(let n of e){let e=this.getGeometrySize(n);t.geometrySize=e,this.updateGeometryAttributes(n,t),t.vertexStart+=e,t.indexStart=this.indexStarts[t.geometryIndex+1]}else{let n=e;this._updateIndices(n,t),this._updatePositions(n,t),this._updateVertexValid(n,t)}}_updateIndices(e,{geometryIndex:t,vertexStart:n,indexStart:r}){let{attributes:i,indexStarts:a,typedArrayManager:o}=this,s=i.indices;if(!s||!e)return;let c=r,l=yn(e,this.positionSize,this.opts.preproject,this.opts.full3d);s=o.allocate(s,r+l.length,{copy:!0});for(let e=0;e<l.length;e++)s[c++]=l[e]+n;a[t+1]=r+l.length,i.indices=s}_updatePositions(e,{vertexStart:t,geometrySize:n}){let{attributes:{positions:r},positionSize:i}=this;if(!r||!e)return;let a=cn(e);for(let e=t,o=0;o<n;e++,o++){let t=a[o*i],n=a[o*i+1],s=i>2?a[o*i+2]:0;r[e*3]=t,r[e*3+1]=n,r[e*3+2]=s}}_updateVertexValid(e,{vertexStart:t,geometrySize:n}){let{positionSize:r}=this,i=this.attributes.vertexValid,a=e&&ln(e);if(e&&e.edgeTypes?i.set(e.edgeTypes,t):i.fill(1,t,t+n),a)for(let e=0;e<a.length;e++)i[t+a[e]/r-1]=0;i[t+n-1]=0}};function xn(e){return Array.isArray(e)&&e.length>0&&!Number.isFinite(e[0])}var Sn=`struct SolidPolygonUniforms {
  extruded: f32,
  isWireframe: f32,
  elevationScale: f32,
};

@group(0) @binding(auto) var<uniform> solidPolygon: SolidPolygonUniforms;
`,Cn=`layout(std140) uniform solidPolygonUniforms {
  bool extruded;
  bool isWireframe;
  float elevationScale;
} solidPolygon;
`,wn={name:`solidPolygon`,source:Sn,vs:Cn,fs:Cn,uniformTypes:{extruded:`f32`,isWireframe:`f32`,elevationScale:`f32`}},Tn=`in vec4 fillColors;
in vec4 lineColors;
in float rowIndexes;
out vec4 vColor;
struct PolygonProps {
vec3 positions;
vec3 positions64Low;
vec3 normal;
float elevations;
};
vec3 project_offset_normal(vec3 vector) {
if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT ||
project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT_OFFSETS) {
return normalize(vector * project.commonUnitsPerWorldUnit);
}
return project_normal(vector);
}
void calculatePosition(PolygonProps props) {
vec3 pos = props.positions;
vec3 pos64Low = props.positions64Low;
vec3 normal = props.normal;
vec4 colors = solidPolygon.isWireframe ? lineColors : fillColors;
geometry.worldPosition = props.positions;
geometry.pickingColor = picking_getPickingColorFromIndex(rowIndexes);
if (solidPolygon.extruded) {
pos.z += props.elevations * solidPolygon.elevationScale;
}
gl_Position = project_position_to_clipspace(pos, pos64Low, vec3(0.), geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
if (solidPolygon.extruded) {
#ifdef IS_SIDE_VERTEX
normal = project_offset_normal(normal);
#else
normal = project_normal(normal);
#endif
geometry.normal = normal;
vec3 lightColor = lighting_getLightColor(colors.rgb, project.cameraPosition, geometry.position.xyz, geometry.normal);
vColor = vec4(lightColor, colors.a * layer.opacity);
} else {
vColor = vec4(colors.rgb, colors.a * layer.opacity);
}
DECKGL_FILTER_COLOR(vColor, geometry);
}
`,En=`\
#version 300 es
#define SHADER_NAME solid-polygon-layer-vertex-shader
in vec3 vertexPositions;
in vec3 vertexPositions64Low;
in float elevations;
${Tn}
void main(void) {
PolygonProps props;
props.positions = vertexPositions;
props.positions64Low = vertexPositions64Low;
props.elevations = elevations;
props.normal = vec3(0.0, 0.0, 1.0);
calculatePosition(props);
}
`,Dn=`\
#version 300 es
#define SHADER_NAME solid-polygon-layer-vertex-shader-side
#define IS_SIDE_VERTEX
in vec2 positions;
in vec3 vertexPositions;
in vec3 nextVertexPositions;
in vec3 vertexPositions64Low;
in vec3 nextVertexPositions64Low;
in float elevations;
in float instanceVertexValid;
${Tn}
void main(void) {
if(instanceVertexValid < 0.5){
gl_Position = vec4(0.);
return;
}
PolygonProps props;
vec3 pos;
vec3 pos64Low;
vec3 nextPos;
vec3 nextPos64Low;
#if RING_WINDING_ORDER_CW == 1
pos = vertexPositions;
pos64Low = vertexPositions64Low;
nextPos = nextVertexPositions;
nextPos64Low = nextVertexPositions64Low;
#else
pos = nextVertexPositions;
pos64Low = nextVertexPositions64Low;
nextPos = vertexPositions;
nextPos64Low = vertexPositions64Low;
#endif
props.positions = mix(pos, nextPos, positions.x);
props.positions64Low = mix(pos64Low, nextPos64Low, positions.x);
props.normal = vec3(
pos.y - nextPos.y + (pos64Low.y - nextPos64Low.y),
nextPos.x - pos.x + (nextPos64Low.x - pos64Low.x),
0.0);
props.elevations = elevations * positions.y;
calculatePosition(props);
}
`,On=`#version 300 es
#define SHADER_NAME solid-polygon-layer-fragment-shader
precision highp float;
in vec4 vColor;
out vec4 fragColor;
void main(void) {
fragColor = vColor;
geometry.uv = vec2(0.);
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;function kn(){return`fn project_offset_normal(vector: vec3<f32>) -> vec3<f32> {
  if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT ||
      project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT_OFFSETS) {
    return normalize(vector * project.commonUnitsPerWorldUnit);
  }
  return project_normal(vector);
}

fn apply_polygon_color(
  colors: vec4<f32>,
  normal: vec3<f32>,
  position: vec4<f32>
) -> vec4<f32> {
  if (solidPolygon.extruded > 0.5) {
    let lightColor = lighting_getLightColor2(
      colors.rgb,
      project.cameraPosition,
      position.xyz,
      normal
    );
    return vec4<f32>(lightColor, colors.a * layer.opacity);
  }
  return vec4<f32>(colors.rgb, colors.a * layer.opacity);
}
`}function An(){return`@fragment
fn fragmentMain(inp: Varyings) -> @location(0) vec4<f32> {
  geometry.uv = vec2<f32>(0.0, 0.0);

  clip_filterColor(inp.clipCoordinates);

  if (picking.isActive > 0.5) {
    if (!picking_isColorValid(inp.pickingColor)) {
      discard;
    }
    return vec4<f32>(inp.pickingColor, 1.0);
  }

  var fragColor = inp.vColor;

  if (picking.isHighlightActive > 0.5) {
    let highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
    if (picking_isColorZero(abs(inp.pickingColor - highlightedObjectColor))) {
      let highLightAlpha = picking.highlightColor.a;
      let blendedAlpha = highLightAlpha + fragColor.a * (1.0 - highLightAlpha);
      if (blendedAlpha > 0.0) {
        let highLightRatio = highLightAlpha / blendedAlpha;
        fragColor = vec4<f32>(
          mix(fragColor.rgb, picking.highlightColor.rgb, highLightRatio),
          blendedAlpha
        );
      } else {
        fragColor = vec4<f32>(fragColor.rgb, 0.0);
      }
    }
  }

  return deckgl_premultiplied_alpha(fragColor);
}
`}function jn(){return`\
${kn()}

struct Attributes {
  @location(0) vertexPositions: vec3<f32>,
  @location(1) vertexPositions64Low: vec3<f32>,
  @location(2) elevations: f32,
  @location(3) fillColors: vec4<f32>,
  @location(4) lineColors: vec4<f32>,
  @location(5) rowIndexes: u32,
};

struct Varyings {
  @builtin(position) position: vec4<f32>,
  @location(0) vColor: vec4<f32>,
  @location(1) pickingColor: vec3<f32>,
  @location(2) clipCoordinates: vec2<f32>,
};

@vertex
fn vertexMain(attributes: Attributes) -> Varyings {
  var outp: Varyings;

  var pos = attributes.vertexPositions;
  if (solidPolygon.extruded > 0.5) {
    pos.z += attributes.elevations * solidPolygon.elevationScale;
  }

  geometry.worldPosition = attributes.vertexPositions;
  geometry.pickingColor = picking_getPickingColorFromIndex(attributes.rowIndexes);

  let projectedPosition = project_position_to_clipspace_and_commonspace(
    pos,
    attributes.vertexPositions64Low,
    vec3<f32>(0.0)
  );
  geometry.position = projectedPosition.commonPosition;
  outp.position = projectedPosition.clipPosition;

  let normal = project_normal(vec3<f32>(0.0, 0.0, 1.0));
  geometry.normal = normal;

  let colors = select(
    attributes.fillColors,
    attributes.lineColors,
    solidPolygon.isWireframe > 0.5
  );
  outp.vColor = apply_polygon_color(colors, normal, geometry.position);
  outp.pickingColor = geometry.pickingColor;

  outp.clipCoordinates = geometry.position.xy;
  clip_filterPosition(&outp.position, geometry.worldPosition.xy);

  return outp;
}

${An()}
`}function Mn(e){return`\
const RING_WINDING_ORDER_CW: bool = ${e?`true`:`false`};

${kn()}

struct Attributes {
  @location(0) positions: vec2<f32>,
  @location(1) vertexPositions: vec3<f32>,
  @location(2) vertexPositions64Low: vec3<f32>,
  @location(3) nextVertexPositions: vec3<f32>,
  @location(4) nextVertexPositions64Low: vec3<f32>,
  @location(5) vertexValid: f32,
  @location(6) elevations: f32,
  @location(7) fillColors: vec4<f32>,
  @location(8) lineColors: vec4<f32>,
  @location(9) rowIndexes: u32,
};

struct Varyings {
  @builtin(position) position: vec4<f32>,
  @location(0) vColor: vec4<f32>,
  @location(1) pickingColor: vec3<f32>,
  @location(2) clipCoordinates: vec2<f32>,
};

@vertex
fn vertexMain(attributes: Attributes) -> Varyings {
  var outp: Varyings;
  outp.position = vec4<f32>(0.0);
  outp.vColor = vec4<f32>(0.0);
  outp.pickingColor = picking_getPickingColorFromIndex(attributes.rowIndexes);
  outp.clipCoordinates = vec2<f32>(0.0);

  if (attributes.vertexValid < 0.5) {
    return outp;
  }

  let pos = select(attributes.nextVertexPositions, attributes.vertexPositions, RING_WINDING_ORDER_CW);
  let pos64Low = select(
    attributes.nextVertexPositions64Low,
    attributes.vertexPositions64Low,
    RING_WINDING_ORDER_CW
  );
  let nextPos = select(attributes.vertexPositions, attributes.nextVertexPositions, RING_WINDING_ORDER_CW);
  let nextPos64Low = select(
    attributes.vertexPositions64Low,
    attributes.nextVertexPositions64Low,
    RING_WINDING_ORDER_CW
  );

  let position = mix(pos, nextPos, attributes.positions.x);
  let position64Low = mix(pos64Low, nextPos64Low, attributes.positions.x);

  var worldPosition = position;
  if (solidPolygon.extruded > 0.5) {
    worldPosition.z += attributes.elevations * attributes.positions.y * solidPolygon.elevationScale;
  }

  geometry.worldPosition = position;
  geometry.pickingColor = picking_getPickingColorFromIndex(attributes.rowIndexes);

  let projectedPosition = project_position_to_clipspace_and_commonspace(
    worldPosition,
    position64Low,
    vec3<f32>(0.0)
  );
  geometry.position = projectedPosition.commonPosition;
  outp.position = projectedPosition.clipPosition;

  let normal = project_offset_normal(vec3<f32>(
    pos.y - nextPos.y + (pos64Low.y - nextPos64Low.y),
    nextPos.x - pos.x + (nextPos64Low.x - pos64Low.x),
    0.0
  ));
  geometry.normal = normal;

  let colors = select(
    attributes.fillColors,
    attributes.lineColors,
    solidPolygon.isWireframe > 0.5
  );
  outp.vColor = apply_polygon_color(colors, normal, geometry.position);
  outp.pickingColor = geometry.pickingColor;

  outp.clipCoordinates = geometry.position.xy;
  clip_filterPosition(&outp.position, geometry.worldPosition.xy);

  return outp;
}

${An()}
`}function Nn(e,t){return e===`top`?jn():Mn(t)}var Pn=[0,0,0,255],Fn={filled:!0,extruded:!1,wireframe:!1,_normalize:!0,_windingOrder:`CW`,_full3d:!1,elevationScale:{type:`number`,min:0,value:1},getPolygon:{type:`accessor`,value:e=>e.polygon},getElevation:{type:`accessor`,value:1e3},getFillColor:{type:`accessor`,value:Pn},getLineColor:{type:`accessor`,value:Pn},material:!0},In={enter:(e,t)=>t.length?t.subarray(t.length-e.length):e},Ln=class extends P{getShaders(e){let t=!this.props._normalize&&this.props._windingOrder===`CCW`?0:1;return super.getShaders({vs:e===`top`?En:Dn,fs:On,source:Nn(e,!!t),defines:{RING_WINDING_ORDER_CW:t},modules:[N,pe,Oe,M,wn,...this.context.device.type===`webgpu`?[dt]:[]]})}get wrapLongitude(){return!1}getBounds(){return this.getAttributeManager()?.getBounds([`vertexPositions`])}initializeState(){let{viewport:e}=this.context,{coordinateSystem:t}=this.props,{_full3d:n}=this.props;e.isGeospatial&&t==="default"&&(t=`lnglat`);let r;t===`lnglat`&&(r=n?e.projectPosition.bind(e):e.projectFlat.bind(e)),this.setState({numInstances:0,polygonTesselator:new bn({preproject:r,fp64:this.use64bitPositions(),IndexType:Uint32Array})});let i=this.getAttributeManager(),a=this.context.device.type===`webgpu`;i.add({indices:{size:1,isIndexed:!0,update:this.calculateIndices,noAlloc:!0},vertexPositions:{size:3,type:`float64`,stepMode:`dynamic`,fp64:this.use64bitPositions(),transition:In,accessor:`getPolygon`,update:this.calculatePositions,noAlloc:!0,...a?{}:{shaderAttributes:{nextVertexPositions:{vertexOffset:1}}}},...a?{nextVertexPositions:{size:3,type:`float64`,stepMode:`dynamic`,fp64:this.use64bitPositions(),transition:!1,update:this.calculateNextPositions,noAlloc:!0}}:{},[a?`vertexValid`:`instanceVertexValid`]:{size:1,type:a?`float32`:`uint16`,stepMode:`instance`,update:this.calculateVertexValid,noAlloc:!0},elevations:{size:1,stepMode:`dynamic`,transition:In,accessor:`getElevation`,bufferGroup:`solid-polygon-instance-data`},fillColors:{size:this.props.colorFormat.length,type:`unorm8`,stepMode:`dynamic`,transition:In,accessor:`getFillColor`,defaultValue:Pn,bufferGroup:`solid-polygon-instance-data`},lineColors:{size:this.props.colorFormat.length,type:`unorm8`,stepMode:`dynamic`,transition:In,accessor:`getLineColor`,defaultValue:Pn,bufferGroup:`solid-polygon-instance-data`},rowIndexes:{size:1,type:`uint32`,stepMode:`dynamic`,accessor:(e,{index:t})=>e&&e.__source?e.__source.index:t,bufferGroup:`solid-polygon-instance-data`}})}getPickingInfo(e){let t=super.getPickingInfo(e),{index:n}=t,r=this.props.data;return r[0]&&r[0].__source&&(t.object=r.find(e=>e.__source.index===n)),t}disablePickingIndex(e){let t=this.props.data;if(t[0]&&t[0].__source)for(let n=0;n<t.length;n++)t[n].__source.index===e&&this._disablePickingIndex(n);else super.disablePickingIndex(e)}draw({uniforms:e}){let{extruded:t,filled:n,wireframe:r,elevationScale:i}=this.props,{topModel:a,sideModel:o,wireframeModel:s,polygonTesselator:c}=this.state,l={extruded:!!t,elevationScale:i,isWireframe:!1};s&&r&&(s.setInstanceCount(c.instanceCount-1),s.shaderInputs.setProps({solidPolygon:{...l,isWireframe:!0}}),s.draw(this.context.renderPass)),o&&n&&(o.setInstanceCount(c.instanceCount-1),o.shaderInputs.setProps({solidPolygon:l}),o.draw(this.context.renderPass)),a&&n&&(a.setVertexCount(c.vertexCount),a.shaderInputs.setProps({solidPolygon:l}),a.draw(this.context.renderPass))}updateState(e){super.updateState(e),this.updateGeometry(e);let{props:t,oldProps:n,changeFlags:r}=e,i=this.getAttributeManager();(r.extensionsChanged||t.filled!==n.filled||t.extruded!==n.extruded)&&(this.state.models?.forEach(e=>e.destroy()),this.setState(this._getModels()),i.invalidateAll())}updateGeometry({props:e,oldProps:t,changeFlags:n}){if(n.dataChanged||n.updateTriggersChanged&&(n.updateTriggersChanged.all||n.updateTriggersChanged.getPolygon)){let{polygonTesselator:t}=this.state,r=e.data.attributes||{};t.updateGeometry({data:e.data,normalize:e._normalize,geometryBuffer:r.getPolygon,buffers:this.context.device.type===`webgpu`?{...r}:r,getGeometry:e.getPolygon,positionFormat:e.positionFormat,wrapLongitude:e.wrapLongitude,resolution:this.context.viewport.resolution,fp64:this.use64bitPositions(),dataChanged:n.dataChanged,full3d:e._full3d}),this.setState({numInstances:t.instanceCount,startIndices:t.vertexStarts}),n.dataChanged||this.getAttributeManager().invalidateAll()}}_getModels(){let{id:e,filled:t,extruded:n}=this.props,r,i,a;if(t){let t=this.getShaders(`top`);t.defines={...t.defines,NON_INSTANCED_MODEL:1};let n=this.getAttributeManager().getBufferLayouts({isInstanced:!1});this.context.device.type===`webgpu`&&(n=n.filter(e=>e.name!==`indices`&&e.name!==`vertexValid`&&e.name!==`instanceVertexValid`&&e.name!==`nextVertexPositions`)),r=new F(this.context.device,{...t,id:`${e}-top`,topology:`triangle-list`,bufferLayout:n,isIndexed:!0,userData:{excludeAttributes:{vertexValid:!0,instanceVertexValid:!0,nextVertexPositions:!0}}})}if(n){let t=this.getAttributeManager().getBufferLayouts({isInstanced:!0});this.context.device.type===`webgpu`&&(t=t.filter(e=>e.name!==`indices`)),i=new F(this.context.device,{...this.getShaders(`side`),id:`${e}-side`,bufferLayout:t,geometry:new j({topology:`triangle-strip`,attributes:{positions:{size:2,value:new Float32Array([1,0,0,0,1,1,0,1])}}}),isInstanced:!0,userData:{excludeAttributes:{indices:!0}}}),a=new F(this.context.device,{...this.getShaders(`side`),id:`${e}-wireframe`,bufferLayout:t,geometry:new j({topology:`line-strip`,attributes:{positions:{size:2,value:new Float32Array([1,0,0,0,0,1,1,1])}}}),isInstanced:!0,userData:{excludeAttributes:{indices:!0}}})}return{models:[i,a,r].filter(Boolean),topModel:r,sideModel:i,wireframeModel:a}}calculateIndices(e){let{polygonTesselator:t}=this.state;e.startIndices=t.indexStarts,e.value=t.get(`indices`)}calculatePositions(e){let{polygonTesselator:t}=this.state;e.startIndices=t.vertexStarts;let n=this.props.data.attributes?.getPolygon;if(this.context.device.type===`webgpu`&&ArrayBuffer.isView(n?.value)){let{value:r,size:i=3,offset:a=0,stride:o}=n,s=a/r.BYTES_PER_ELEMENT,c=o?o/r.BYTES_PER_ELEMENT:i,l=new Float64Array(t.instanceCount*3);for(let e=0;e<t.instanceCount;e++){let t=s+e*c,n=e*3;l[n]=r[t],l[n+1]=r[t+1],l[n+2]=i>2?r[t+2]:0}e.value=l;return}e.value=t.get(`positions`)}calculateVertexValid(e){let t=this.props.data.attributes?.instanceVertexValid?.value,n=this.context.device.type===`webgpu`&&t?t:this.state.polygonTesselator.get(`vertexValid`);e.value=this.context.device.type===`webgpu`&&n?Float32Array.from(n):n}calculateNextPositions(e){let{polygonTesselator:t}=this.state,n=this.getAttributeManager().getAttributes(),r=n.vertexPositions.value,i=this.props.data.attributes?.instanceVertexValid?.value||n.vertexValid?.value||t.get(`vertexValid`);if(e.startIndices=t.vertexStarts,!r){e.value=r;return}let a=r.length/3,o=new r.constructor(r.length);for(let e=0;e<a;e++){let t=e*3,n=i?.[e]&&e+1<a?t+3:t;for(let e=0;e<3;e++)o[t+e]=r[n+e]}e.value=o}};Ln.defaultProps=Fn,Ln.layerName=`SolidPolygonLayer`;function Rn({data:e,getIndex:t,dataRange:n,replace:r}){let{startRow:i=0,endRow:a=1/0}=n,o=e.length,s=o,c=o;for(let n=0;n<o;n++){let r=t(e[n]);if(s>n&&r>=i&&(s=n),r>=a){c=n;break}}let l=s,u=c-s===r.length?void 0:e.slice(c);for(let t=0;t<r.length;t++)e[l++]=r[t];if(u){for(let t=0;t<u.length;t++)e[l++]=u[t];e.length=l}return{startRow:s,endRow:s+r.length}}function zn(e,t){if(!e)return null;let n=`startIndices`in e?e.startIndices[t]:t,r=e.featureIds.value[n];return n===-1?null:Bn(e,r,n)}function Bn(e,t,n){let r={properties:{...e.properties[t]}};for(let t in e.numericProps)r.properties[t]=e.numericProps[t].value[n];return r}function Vn(e){let t={points:null,lines:null,polygons:null};for(let n in t){let r=e[n].globalFeatureIds.value;t[n]=new Uint32Array(r)}return t}var Hn=`layout(std140) uniform sdfUniforms {
  float gamma;
  bool enabled;
  float buffer;
  float outlineBuffer;
  vec4 outlineColor;
} sdf;
`,Un={name:`sdf`,vs:Hn,fs:Hn,uniformTypes:{gamma:`f32`,enabled:`f32`,buffer:`f32`,outlineBuffer:`f32`,outlineColor:`vec4<f32>`}},H={none:0,start:1,center:2,end:3},Wn={name:`text`,vs:`\
layout(std140) uniform textUniforms {
  highp vec2 cutoffPixels;
  highp ivec2 align;
  highp float fontSize;
  bool flipY;
} text;

#define ALIGN_MODE_START ${H.start}
#define ALIGN_MODE_CENTER ${H.center}
#define ALIGN_MODE_END ${H.end}
`,getUniforms:({contentCutoffPixels:e=[0,0],contentAlignHorizontal:t=`none`,contentAlignVertical:n=`none`,fontSize:r,viewport:i})=>({cutoffPixels:e,align:[H[t],H[n]],fontSize:r,flipY:i?.flipY??!1}),uniformTypes:{cutoffPixels:`vec2<f32>`,align:`vec2<i32>`,fontSize:`f32`,flipY:`f32`}},Gn=`#version 300 es
#define SHADER_NAME multi-icon-layer-vertex-shader
in vec2 positions;
in vec3 instancePositions;
in vec3 instancePositions64Low;
in float instanceSizes;
in float instanceAngles;
in vec4 instanceColors;
in float rowIndexes;
in vec4 instanceIconFrames;
in float instanceColorModes;
in vec2 instanceOffsets;
in vec2 instancePixelOffset;
in vec4 instanceClipRect;
out float vColorMode;
out vec4 vColor;
out vec2 vTextureCoords;
out vec2 uv;
vec2 rotate_by_angle(vec2 vertex, float angle) {
float angle_radian = angle * PI / 180.0;
float cos_angle = cos(angle_radian);
float sin_angle = sin(angle_radian);
mat2 rotationMatrix = mat2(cos_angle, -sin_angle, sin_angle, cos_angle);
return rotationMatrix * vertex;
}
float getPixelOffsetFromAlignment(float anchor, float extent, float clipStart, float clipEnd, int mode) {
if (clipEnd < clipStart) return 0.0;
if (mode == ALIGN_MODE_START) {
return max(- (anchor + clipStart), 0.0);
}
if (mode == ALIGN_MODE_CENTER) {
float _min = max(0., anchor + clipStart);
float _max = min(extent, anchor + clipEnd);
return _min < _max ? (_min + _max) / 2.0 - anchor : 0.0;
}
if (mode == ALIGN_MODE_END) {
return min(extent - (anchor + clipEnd), 0.);
}
return 0.0;
}
void main(void) {
geometry.worldPosition = instancePositions;
geometry.uv = positions;
geometry.pickingColor = picking_getPickingColorFromIndex(rowIndexes);
uv = positions;
vec2 iconSize = instanceIconFrames.zw;
float sizePixels = clamp(
project_size_to_pixel(instanceSizes * icon.sizeScale, icon.sizeUnits),
icon.sizeMinPixels, icon.sizeMaxPixels
);
float instanceScale = sizePixels / text.fontSize;
vec2 pixelOffset = positions / 2.0 * iconSize + instanceOffsets;
pixelOffset = rotate_by_angle(pixelOffset, instanceAngles) * instanceScale;
pixelOffset += instancePixelOffset;
pixelOffset.y *= -1.0;
vec2 anchorPosScreen;
if (icon.billboard)  {
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
anchorPosScreen = gl_Position.xy / gl_Position.w;
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
vec3 offset = vec3(pixelOffset, 0.0);
DECKGL_FILTER_SIZE(offset, geometry);
gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);
} else {
vec3 offset_common = vec3(project_pixel_size(pixelOffset), 0.0);
if (text.flipY) {
offset_common.y *= -1.;
}
DECKGL_FILTER_SIZE(offset_common, geometry);
vec4 anchorPos = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0));
anchorPosScreen = anchorPos.xy / anchorPos.w;
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset_common, geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
}
anchorPosScreen = vec2(anchorPosScreen.x + 1.0, 1.0 - anchorPosScreen.y) / 2.0 * project.viewportSize / project.devicePixelRatio;
vec2 xy = project_size_to_pixel(instanceClipRect.xy);
vec2 wh = project_size_to_pixel(instanceClipRect.zw);
if (text.flipY) {
xy.y = -xy.y - wh.y;
}
if (text.align.x > 0 || text.align.y > 0) {
vec2 viewportPixels = project.viewportSize / project.devicePixelRatio;
vec2 scrollPixels = vec2(
getPixelOffsetFromAlignment(anchorPosScreen.x, viewportPixels.x, xy.x, xy.x + wh.x, text.align.x),
-getPixelOffsetFromAlignment(anchorPosScreen.y, viewportPixels.y, -xy.y - wh.y, -xy.y, text.align.y)
);
pixelOffset += scrollPixels;
gl_Position.xy += project_pixel_size_to_clipspace(scrollPixels);
}
if (instanceClipRect.z >= 0.) {
if (pixelOffset.x < xy.x || pixelOffset.x > xy.x + wh.x) {
gl_Position = vec4(0.0);
}
else if (text.cutoffPixels.x > 0.) {
float vpWidth = project.viewportSize.x / project.devicePixelRatio;
float l = max(anchorPosScreen.x + xy.x, 0.0);
float r = min(anchorPosScreen.x + xy.x + wh.x, vpWidth);
if (r - l < text.cutoffPixels.x) {
gl_Position = vec4(0.0);
}
}
}
if (instanceClipRect.w >= 0.) {
if (pixelOffset.y < xy.y || pixelOffset.y > xy.y + wh.y) {
gl_Position = vec4(0.0);
}
else if (text.cutoffPixels.y > 0.) {
float vpHeight = project.viewportSize.y / project.devicePixelRatio;
float t = max(anchorPosScreen.y - xy.y - wh.y, 0.0);
float b = min(anchorPosScreen.y - xy.y, vpHeight);
if (b - t < text.cutoffPixels.y) {
gl_Position = vec4(0.0);
}
}
}
vTextureCoords = mix(
instanceIconFrames.xy,
instanceIconFrames.xy + iconSize,
(positions.xy + 1.0) / 2.0
) / icon.iconsTextureDim;
vColor = instanceColors;
DECKGL_FILTER_COLOR(vColor, geometry);
vColorMode = instanceColorModes;
}
`,Kn=`#version 300 es
#define SHADER_NAME multi-icon-layer-fragment-shader
precision highp float;
uniform sampler2D iconsTexture;
in vec4 vColor;
in vec2 vTextureCoords;
in vec2 uv;
out vec4 fragColor;
void main(void) {
geometry.uv = uv;
if (!bool(picking.isActive)) {
float alpha = texture(iconsTexture, vTextureCoords).a;
vec4 color = vColor;
if (sdf.enabled) {
float distance = alpha;
alpha = smoothstep(sdf.buffer - sdf.gamma, sdf.buffer + sdf.gamma, distance);
if (sdf.outlineBuffer > 0.0) {
float inFill = alpha;
float inBorder = smoothstep(sdf.outlineBuffer - sdf.gamma, sdf.outlineBuffer + sdf.gamma, distance);
color = mix(sdf.outlineColor, vColor, inFill);
alpha = inBorder;
}
}
float a = alpha * color.a;
if (a < icon.alphaCutoff) {
discard;
}
fragColor = vec4(color.rgb, a * layer.opacity);
}
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;function qn({collision:e=!1}={}){return`\
struct IconUniforms {
  sizeScale: f32,
  iconsTextureDim: vec2<f32>,
  sizeBasis: f32,
  sizeMinPixels: f32,
  sizeMaxPixels: f32,
  billboard: i32,
  sizeUnits: i32,
  alphaCutoff: f32
};

struct TextUniforms {
  cutoffPixels: vec2<f32>,
  align: vec2<i32>,
  fontSize: f32,
  flipY: f32
};

struct SdfUniforms {
  gamma: f32,
  enabled: f32,
  buffer: f32,
  outlineBuffer: f32,
  outlineColor: vec4<f32>
};

${e?`struct CollisionUniforms {
  sort: i32,
  enabled: i32
};
`:``}

const ALIGN_MODE_START: i32 = 1;
const ALIGN_MODE_CENTER: i32 = 2;
const ALIGN_MODE_END: i32 = 3;

@group(0) @binding(auto) var<uniform> icon: IconUniforms;
@group(0) @binding(auto) var<uniform> text: TextUniforms;
@group(0) @binding(auto) var<uniform> sdf: SdfUniforms;
${e?`@group(0) @binding(auto) var<uniform> collision: CollisionUniforms;`:``}
@group(0) @binding(auto) var iconsTexture : texture_2d<f32>;
@group(0) @binding(auto) var iconsTextureSampler : sampler;
${e?`@group(0) @binding(auto) var collision_texture : texture_2d<f32>;
`:``}

fn rotate_by_angle(vertex: vec2<f32>, angle_deg: f32) -> vec2<f32> {
  let angle_radian = angle_deg * PI / 180.0;
  let c = cos(angle_radian);
  let s = sin(angle_radian);
  let rotation = mat2x2<f32>(vec2<f32>(c, -s), vec2<f32>(s, c));
  return rotation * vertex;
}

fn get_pixel_offset_from_alignment(
  anchor: f32,
  extent: f32,
  clipStart: f32,
  clipEnd: f32,
  mode: i32
) -> f32 {
  if (clipEnd < clipStart) {
    return 0.0;
  }
  if (mode == ALIGN_MODE_START) {
    return max(-(anchor + clipStart), 0.0);
  }
  if (mode == ALIGN_MODE_CENTER) {
    let minValue = max(0.0, anchor + clipStart);
    let maxValue = min(extent, anchor + clipEnd);
    if (minValue < maxValue) {
      return (minValue + maxValue) / 2.0 - anchor;
    }
    return 0.0;
  }
  if (mode == ALIGN_MODE_END) {
    return min(extent - (anchor + clipEnd), 0.0);
  }
  return 0.0;
}

${e?`fn collision_match(texCoords: vec2<f32>, pickingColor: vec3<f32>) -> f32 {
  let textureSize = vec2<i32>(textureDimensions(collision_texture));
  let pixelCoords = clamp(
    vec2<i32>(texCoords * vec2<f32>(textureSize)),
    vec2<i32>(0),
    textureSize - vec2<i32>(1)
  );
  let collisionPickingColor = textureLoad(collision_texture, pixelCoords, 0);
  let delta = dot(abs(collisionPickingColor.rgb - pickingColor), vec3<f32>(1.0));
  return step(delta, 0.001);
}

fn collision_is_visible(texCoords: vec2<f32>, pickingColor: vec3<f32>) -> f32 {
  if (collision.enabled == 0) {
    return 1.0;
  }

  var accumulator = 0.0;
  let stepSize = vec2<f32>(1.0) / project.viewportSize;

  for (var i: i32 = -2; i <= 2; i = i + 1) {
    for (var j: i32 = -2; j <= 2; j = j + 1) {
      let delta = vec2<f32>(f32(j), f32(i)) * stepSize;
      accumulator = accumulator + collision_match(texCoords + delta, pickingColor);
    }
  }

  return pow(accumulator / 25.0, 2.2);
}
`:``}

struct Attributes {
  @location(0) positions: vec2<f32>,

  @location(1) instancePositions: vec3<f32>,
  @location(2) instancePositions64Low: vec3<f32>,
  @location(3) instanceSizes: f32,
  @location(4) instanceAngles: f32,
  @location(5) instanceColors: vec4<f32>,
  @location(6) instanceIconFrames: vec4<f32>,
  @location(7) instanceColorModes: f32,
  @location(8) instanceOffsets: vec2<f32>,
  @location(9) instancePixelOffset: vec2<f32>,
  @location(10) rowIndexes: u32,
  @location(11) instanceClipRect: vec4<f32>,
  ${e?`@location(12) collisionPriorities: f32,`:``}
};

struct Varyings {
  @builtin(position) position: vec4<f32>,

  @location(0) vColorMode: f32,
  @location(1) vColor: vec4<f32>,
  @location(2) vTextureCoords: vec2<f32>,
  @location(3) uv: vec2<f32>,
  @location(4) pickingColor: vec3<f32>,
};

@vertex
fn vertexMain(inp: Attributes) -> Varyings {
  geometry.worldPosition = inp.instancePositions;
  geometry.uv = inp.positions;
  geometry.pickingColor = picking_getPickingColorFromIndex(inp.rowIndexes);

  var outp: Varyings;
  outp.uv = inp.positions;

  let iconSize = inp.instanceIconFrames.zw;

  let sizePixels = clamp(
    project_unit_size_to_pixel(inp.instanceSizes * icon.sizeScale, icon.sizeUnits),
    icon.sizeMinPixels, icon.sizeMaxPixels
  );
  let instanceScale = sizePixels / text.fontSize;

  var pixelOffset = inp.positions / 2.0 * iconSize + inp.instanceOffsets;
  pixelOffset = rotate_by_angle(pixelOffset, inp.instanceAngles) * instanceScale;
  pixelOffset = pixelOffset + inp.instancePixelOffset;
  pixelOffset.y = pixelOffset.y * -1.0;

  var pos: vec4<f32>;
  var anchorPosScreen: vec2<f32>;
  if (icon.billboard != 0) {
    pos = project_position_to_clipspace(inp.instancePositions, inp.instancePositions64Low, vec3<f32>(0.0));
    anchorPosScreen = pos.xy / pos.w;

    let clipOffset = project_pixel_size_to_clipspace(pixelOffset);
    pos = vec4<f32>(pos.x + clipOffset.x, pos.y + clipOffset.y, pos.z, pos.w);
  } else {
    var offsetCommon = vec3<f32>(project_pixel_size_vec2(pixelOffset), 0.0);
    if (text.flipY > 0.5) {
      offsetCommon.y = offsetCommon.y * -1.0;
    }
    let anchorPos = project_position_to_clipspace(inp.instancePositions, inp.instancePositions64Low, vec3<f32>(0.0));
    anchorPosScreen = anchorPos.xy / anchorPos.w;
    pos = project_position_to_clipspace(inp.instancePositions, inp.instancePositions64Low, offsetCommon);
  }

  anchorPosScreen = vec2<f32>(anchorPosScreen.x + 1.0, 1.0 - anchorPosScreen.y) / 2.0 *
    project.viewportSize / project.devicePixelRatio;
  var xy = project_size_vec2(inp.instanceClipRect.xy) * project.scale;
  var wh = project_size_vec2(inp.instanceClipRect.zw) * project.scale;

  if (text.flipY > 0.5) {
    xy.y = -xy.y - wh.y;
  }
  if (text.align.x > 0 || text.align.y > 0) {
    let viewportPixels = project.viewportSize / project.devicePixelRatio;
    let scrollPixels = vec2<f32>(
      get_pixel_offset_from_alignment(anchorPosScreen.x, viewportPixels.x, xy.x, xy.x + wh.x, text.align.x),
      -get_pixel_offset_from_alignment(anchorPosScreen.y, viewportPixels.y, -xy.y - wh.y, -xy.y, text.align.y)
    );
    pixelOffset = pixelOffset + scrollPixels;
    let scrollClipOffset = project_pixel_size_to_clipspace(scrollPixels);
    pos.x = pos.x + scrollClipOffset.x;
    pos.y = pos.y + scrollClipOffset.y;
  }

  if (inp.instanceClipRect.z >= 0.0) {
    if (pixelOffset.x < xy.x || pixelOffset.x > xy.x + wh.x) {
      pos = vec4<f32>(0.0);
    } else if (text.cutoffPixels.x > 0.0) {
      let viewportWidth = project.viewportSize.x / project.devicePixelRatio;
      let left = max(anchorPosScreen.x + xy.x, 0.0);
      let right = min(anchorPosScreen.x + xy.x + wh.x, viewportWidth);
      if (right - left < text.cutoffPixels.x) {
        pos = vec4<f32>(0.0);
      }
    }
  }
  if (inp.instanceClipRect.w >= 0.0) {
    if (pixelOffset.y < xy.y || pixelOffset.y > xy.y + wh.y) {
      pos = vec4<f32>(0.0);
    } else if (text.cutoffPixels.y > 0.0) {
      let viewportHeight = project.viewportSize.y / project.devicePixelRatio;
      let top = max(anchorPosScreen.y - xy.y - wh.y, 0.0);
      let bottom = min(anchorPosScreen.y - xy.y, viewportHeight);
      if (bottom - top < text.cutoffPixels.y) {
        pos = vec4<f32>(0.0);
      }
    }
  }

  ${e?`  if (collision.sort != 0) {
    pos.z = -0.001 * inp.collisionPriorities * pos.w;
  }
  `:``}

  let uvMix = (inp.positions.xy + vec2<f32>(1.0, 1.0)) * 0.5;
  outp.vTextureCoords = mix(inp.instanceIconFrames.xy, inp.instanceIconFrames.xy + iconSize, uvMix) / icon.iconsTextureDim;

  outp.position = pos;
  outp.vColor = inp.instanceColors;
  outp.vColorMode = inp.instanceColorModes;
  outp.pickingColor = picking_getPickingColorFromIndex(inp.rowIndexes);

  return outp;
}

@fragment
fn fragmentMain(inp: Varyings) -> @location(0) vec4<f32> {
  geometry.uv = inp.uv;

  let texColor = textureSample(iconsTexture, iconsTextureSampler, inp.vTextureCoords);
  var alpha = texColor.a;
  var color = inp.vColor;

  if (sdf.enabled > 0.5) {
    let distance = alpha;
    alpha = smoothstep(sdf.buffer - sdf.gamma, sdf.buffer + sdf.gamma, distance);

    if (sdf.outlineBuffer > 0.0) {
      let inFill = alpha;
      let inBorder = smoothstep(sdf.outlineBuffer - sdf.gamma, sdf.outlineBuffer + sdf.gamma, distance);
      color = mix(sdf.outlineColor, inp.vColor, inFill);
      alpha = inBorder;
    }
  } else if (inp.vColorMode == 0.0) {
    color = texColor;
  }

  var a = alpha * color.a * layer.opacity;
  if (a < icon.alphaCutoff) {
    discard;
  }

  if (picking.isActive > 0.5) {
    if (!picking_isColorValid(inp.pickingColor)) {
      discard;
    }
    return vec4<f32>(inp.pickingColor, 1.0);
  }

  ${e?`  let collisionFade = collision_is_visible(inp.position.xy / project.viewportSize, inp.pickingColor);
  a = a * collisionFade;
  if (a <= 0.0001) {
    discard;
  }
  `:``}

  var fragColor = deckgl_premultiplied_alpha(vec4<f32>(color.rgb, a));

  if (picking.isHighlightActive > 0.5) {
    let highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
    if (picking_isColorZero(abs(inp.pickingColor - highlightedObjectColor))) {
      let highLightAlpha = picking.highlightColor.a;
      let blendedAlpha = highLightAlpha + fragColor.a * (1.0 - highLightAlpha);
      if (blendedAlpha > 0.0) {
        let highLightRatio = highLightAlpha / blendedAlpha;
        fragColor = vec4<f32>(
          mix(fragColor.rgb, picking.highlightColor.rgb, highLightRatio),
          blendedAlpha
        );
      } else {
        fragColor = vec4<f32>(fragColor.rgb, 0.0);
      }
    }
  }

  return fragColor;
}
`}var Jn=qn(),Yn=192/256,Xn={getIconOffsets:{type:`accessor`,value:e=>e.offsets},getContentBox:{type:`accessor`,value:[0,0,-1,-1]},fontSize:1,alphaCutoff:.001,smoothing:.1,outlineWidth:0,outlineColor:{type:`color`,value:[0,0,0,255]},contentCutoffPixels:{type:`array`,value:[0,0]},contentAlignHorizontal:`none`,contentAlignVertical:`none`},Zn=class extends nt{getShaders(){let e=super.getShaders();return{...e,modules:[...e.modules,Wn,Un],vs:Gn,fs:Kn,source:Jn}}initializeState(){super.initializeState();let e=this.getAttributeManager(),t=e.attributes.instanceIconDefs;t.settings.update=this.calculateInstanceIconDefs,e.addInstanced({rowIndexes:{type:`uint32`,size:1,bufferGroup:`icon-instance-data`,accessor:(e,{index:t})=>t},instanceClipRect:{size:4,bufferGroup:`icon-instance-data`,accessor:`getContentBox`,defaultValue:[0,0,-1,-1]}})}updateState(e){super.updateState(e);let{props:t,oldProps:n,changeFlags:r}=e,{outlineColor:i}=t;if(r.extensionsChanged){this.state.fillModel?.destroy();let e=this.context.device.type===`webgpu`?this._getModel(`${this.props.id}-fill`):void 0;this.setState({fillModel:e,models:e?[this.state.model,e]:[this.state.model]})}if(r.updateTriggersChanged&&(r.updateTriggersChanged.getIcon||r.updateTriggersChanged.getIconOffsets)&&this.getAttributeManager().invalidate(`instanceIconDefs`),i!==n.outlineColor){let e=[i[0]/255,i[1]/255,i[2]/255,(i[3]??255)/255];this.setState({outlineColor:e})}!t.sdf&&t.outlineWidth&&w.warn(`${this.id}: fontSettings.sdf is required to render outline`)()}draw(e){let{sdf:t,smoothing:n,fontSize:r,outlineWidth:i,contentCutoffPixels:a,contentAlignHorizontal:o,contentAlignVertical:s}=this.props,{outlineColor:c}=this.state,l=i?Math.max(n,Yn*(1-i)):-1,u=this.state.model,d={buffer:Yn,outlineBuffer:l,gamma:n,enabled:!!t,outlineColor:c},f={contentCutoffPixels:a,contentAlignHorizontal:o,contentAlignVertical:s,fontSize:r,viewport:this.context.viewport};if(u.shaderInputs.setProps({sdf:d,text:f}),super.draw(e),t&&i){let{iconManager:e}=this.state;if(e.getTexture()){let e=this.state.fillModel||u;e.shaderInputs.setProps({sdf:{...d,outlineBuffer:Yn},text:f}),this._drawModel(e)}}}calculateInstanceIconDefs(e,{startRow:t,endRow:n}){let{data:r,getIcon:i,getIconOffsets:a}=this.props,o=e.getVertexOffset(t),s=e.value,{iterable:c,objectInfo:l}=fe(r,t,n);for(let t of c){l.index++;let n=i(t,l),r=a(t,l);if(n){let t=0;for(let i of Array.from(n)){let n=super.getInstanceIconDef(i);n[0]=r[t*2],n[1]+=r[t*2+1],n[6]=1,s.set(n,o),o+=e.size,t++}}}}};Zn.defaultProps=Xn,Zn.layerName=`MultiIconLayer`;var Qn=0x56bc75e2d63100000,$n=new Float64Array(256);for(let e=0;e<256;e++){let t=.5-(e/255)**(1/2.2);$n[e]=t*Math.abs(t)}$n[255]=-0x56bc75e2d63100000;var er=class{constructor({fontSize:e=24,buffer:t=3,radius:n=8,cutoff:r=.25,fontFamily:i=`sans-serif`,fontWeight:a=`normal`,fontStyle:o=`normal`,lang:s=null}={}){this.buffer=t,this.radius=n,this.cutoff=r,this.lang=s;let c=this.size=e+t*4,l=this._createCanvas(c),u=this.ctx=l.getContext(`2d`,{willReadFrequently:!0});u.font=`${o} ${a} ${e}px ${i}`,u.textBaseline=`alphabetic`,u.textAlign=`left`,u.fillStyle=`black`,this.gridOuter=new Float64Array(c*c),this.gridInner=new Float64Array(c*c),this.f=new Float64Array(c),this.z=new Float64Array(c+1),this.v=new Uint16Array(c)}_createCanvas(e){if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(e,e);let t=document.createElement(`canvas`);return t.width=t.height=e,t}draw(e){let{width:t,actualBoundingBoxAscent:n,actualBoundingBoxDescent:r,actualBoundingBoxLeft:i,actualBoundingBoxRight:a}=this.ctx.measureText(e),o=Math.ceil(n),s=Math.floor(-i),c=Math.max(0,Math.min(this.size-this.buffer,Math.ceil(a)-s)),l=Math.max(0,Math.min(this.size-this.buffer,o+Math.ceil(r))),u=c+2*this.buffer,d=l+2*this.buffer,f=Math.max(u*d,0),p=new Uint8ClampedArray(f),m={data:p,width:u,height:d,glyphWidth:c,glyphHeight:l,glyphTop:o,glyphLeft:s,glyphAdvance:t};if(c===0||l===0)return m;let{ctx:h,buffer:g,gridInner:_,gridOuter:v}=this;this.lang&&(h.lang=this.lang),h.clearRect(g,g,c,l),h.fillText(e,g-s,g+o);let y=h.getImageData(g,g,c,l);v.fill(Qn,0,f),_.fill(0,0,f);let b=3;for(let e=0;e<l;e++){let t=(e+g)*u+g;for(let e=0;e<c;e++,b+=4,t++){let e=y.data[b];if(e===0)continue;let n=$n[e];v[t]=Math.max(0,n),_[t]=Math.max(0,-n)}}tr(v,0,0,u,d,u,this.f,this.v,this.z);let x=Math.min(g,1);tr(_,g-x,g-x,c+2*x,l+2*x,u,this.f,this.v,this.z);let S=255/this.radius,C=255*(1-this.cutoff);for(let e=0;e<f;e++){let t=Math.sqrt(v[e])-Math.sqrt(_[e]);p[e]=Math.round(C-S*t)}return m}};function tr(e,t,n,r,i,a,o,s,c){for(let l=t;l<t+r;l++)nr(e,n*a+l,a,i,o,s,c);for(let l=n;l<n+i;l++)nr(e,l*a+t,1,r,o,s,c)}function nr(e,t,n,r,i,a,o){a[0]=0,o[0]=-0x56bc75e2d63100000,o[1]=Qn,i[0]=e[t];for(let s=1,c=0,l=0;s<r;s++){i[s]=e[t+s*n];let r=s*s;do{let e=a[c];l=(i[s]-i[e]+r-e*e)/(s-e)/2}while(l<=o[c]&&--c>-1);c++,a[c]=s,o[c]=l,o[c+1]=Qn}for(let s=0,c=0;s<r;s++){for(;o[c+1]<s;)c++;let r=a[c],l=s-r;e[t+s*n]=i[r]+l*l}}var rr=32,ir=[];function ar(e){return 2**Math.ceil(Math.log2(e))}function or({characterSet:e,measureText:t,buffer:n,maxCanvasWidth:r,mapping:i={},xOffset:a=0,yOffsetMin:o=0,yOffsetMax:s=0}){let c=a,l=o,u=s;for(let a of e)if(!i[a]){let{advance:e,width:o,ascent:s,descent:d}=t(a),f=s+d;c+o+n*2>r&&(c=0,l=u),i[a]={x:c+n,y:l+n,width:o,height:f,advance:e,anchorX:o/2,anchorY:s},c+=o+n*2,u=Math.max(u,l+f+n*2)}return{mapping:i,xOffset:c,yOffsetMin:l,yOffsetMax:u,canvasHeight:ar(u)}}function sr(e,t,n,r){let i=0;for(let a=t;a<n;a++){let t=e[a];i+=r[t]?.advance||0}return i}function cr(e,t,n,r,i,a){let o=t,s=0;for(let c=t;c<n;c++){let t=sr(e,c,c+1,i);s+t>r&&(o<c&&a.push(c),o=c,s=0),s+=t}return s}function lr(e,t,n,r,i,a){let o=t,s=t,c=t,l=0;for(let u=t;u<n;u++)if((e[u]===` `||e[u+1]===` `||u+1===n)&&(c=u+1),c>s){let t=sr(e,s,c,i);l+t>r&&(o<s&&(a.push(s),o=s,l=0),t>r&&(t=cr(e,s,c,r,i,a),o=a[a.length-1])),s=c,l+=t}return l}function ur(e,t,n,r,i=0,a){a===void 0&&(a=e.length);let o=[];return t===`break-all`?cr(e,i,a,n,r,o):lr(e,i,a,n,r,o),o}function dr(e,t,n,r,i,a){let o=0,s=0;for(let i=t;i<n;i++){let t=r[e[i]];t&&(s=Math.max(s,t.height))}for(let a=t;a<n;a++){let t=e[a],n=r[t];n?(i[a]=o+n.anchorX,o+=n.advance):(w.warn(`Missing character: ${t} (${t.codePointAt(0)})`)(),i[a]=o,o+=rr)}a[0]=o,a[1]=s}function fr(e,t,n,r,i,a){let o=Array.from(e),s=o.length,c=Array(s),l=Array(s),u=Array(s),d=(r===`break-word`||r===`break-all`)&&isFinite(i)&&i>0,f=[0,0],p=[0,0],m=0,h=t+n/2,g=0,_=0;for(let e=0;e<=s;e++){let t=o[e];if((t===`
`||e===s)&&(_=e),_>g){let e=d?ur(o,r,i,a,g,_):ir;for(let t=0;t<=e.length;t++){let r=t===0?g:e[t-1],i=t<e.length?e[t]:_;dr(o,r,i,a,c,p);for(let e=r;e<i;e++)l[e]=h,u[e]=p[0];m++,h+=n,f[0]=Math.max(f[0],p[0])}g=_}t===`
`&&(c[g]=0,l[g]=0,u[g]=0,g++)}return f[1]=m*n,{x:c,y:l,rowWidth:u,size:f}}function pr({value:e,length:t,stride:n,offset:r,startIndices:i,characterSet:a}){let o=e.BYTES_PER_ELEMENT,s=n?n/o:1,c=r?r/o:0,l=i[t]||Math.ceil((e.length-c)/s),u=a&&new Set,d=Array(t),f=e;if(s>1||c>0){let t=e.constructor;f=new t(l);for(let t=0;t<l;t++)f[t]=e[t*s+c]}for(let e=0;e<t;e++){let t=i[e],n=i[e+1]||l,r=f.subarray(t,n);d[e]=String.fromCodePoint.apply(null,r),u&&r.forEach(u.add,u)}if(u)for(let e of u)a.add(String.fromCodePoint(e));return{texts:d,characterCount:l}}var mr=class{constructor(e=5){this._cache={},this._order=[],this.limit=e}get(e){let t=this._cache[e];return t&&(this._deleteOrder(e),this._appendOrder(e)),t}set(e,t){this._cache[e]?(this.delete(e),this._cache[e]=t,this._appendOrder(e)):(Object.keys(this._cache).length===this.limit&&this.delete(this._order[0]),this._cache[e]=t,this._appendOrder(e))}delete(e){this._cache[e]&&(delete this._cache[e],this._deleteOrder(e))}_deleteOrder(e){let t=this._order.indexOf(e);t>=0&&this._order.splice(t,1)}_appendOrder(e){this._order.push(e)}};function hr(){let e=[];for(let t=32;t<128;t++)e.push(String.fromCharCode(t));return e}var U={fontFamily:`Monaco, monospace`,fontWeight:`normal`,characterSet:hr(),fontSize:64,buffer:4,sdf:!1,cutoff:.25,radius:12,smoothing:.1},gr=1024,_r=.9,vr=.3,yr=3,br=new mr(yr);function xr(e,t){let n;n=typeof t==`string`?new Set(Array.from(t)):new Set(t);let r=br.get(e);if(!r)return n;for(let e in r.mapping)n.has(e)&&n.delete(e);return n}function Sr(e,t){for(let n=0;n<e.length;n++)t.data[4*n+3]=e[n]}function Cr(e,t,n,r){e.font=`${r} ${n}px ${t}`,e.fillStyle=`#000`,e.textBaseline=`alphabetic`,e.textAlign=`left`}function wr(e,t,n){if(n===void 0){let n=e.measureText(`A`);return n.fontBoundingBoxAscent?{advance:0,width:0,ascent:Math.ceil(n.fontBoundingBoxAscent),descent:Math.ceil(n.fontBoundingBoxDescent)}:{advance:0,width:0,ascent:t*_r,descent:t*vr}}let r=e.measureText(n);return r.actualBoundingBoxAscent?{advance:r.width,width:Math.ceil(r.actualBoundingBoxRight-r.actualBoundingBoxLeft),ascent:Math.ceil(r.actualBoundingBoxAscent),descent:Math.ceil(r.actualBoundingBoxDescent)}:{advance:r.width,width:r.width,ascent:t*_r,descent:t*vr}}function Tr(e){w.assert(Number.isFinite(e)&&e>=yr,`Invalid cache limit`),br=new mr(e)}var Er=class{constructor(){this.props={...U}}get atlas(){return this._atlas}get mapping(){return this._atlas&&this._atlas.mapping}setProps(e={}){Object.assign(this.props,e),e._getFontRenderer&&(this._getFontRenderer=e._getFontRenderer),this._key=this._getKey();let t=xr(this._key,this.props.characterSet),n=br.get(this._key);if(n&&t.size===0){this._atlas!==n&&(this._atlas=n);return}let r=this._generateFontAtlas(t,n);this._atlas=r,br.set(this._key,r)}_generateFontAtlas(e,t){let{fontFamily:n,fontWeight:r,fontSize:i,buffer:a,sdf:o,radius:s,cutoff:c}=this.props,l=t&&t.data;l||(l=document.createElement(`canvas`),l.width=gr);let u=l.getContext(`2d`,{willReadFrequently:!0});Cr(u,n,i,r);let d=e=>wr(u,i,e),f;this._getFontRenderer?f=this._getFontRenderer(this.props):o&&(f={measure:d,draw:Dr(this.props)});let{mapping:p,canvasHeight:m,xOffset:h,yOffsetMin:g,yOffsetMax:_}=or({measureText:e=>f?f.measure(e):d(e),buffer:a,characterSet:e,maxCanvasWidth:gr,...t&&{mapping:t.mapping,xOffset:t.xOffset,yOffsetMin:t.yOffsetMin,yOffsetMax:t.yOffsetMax}});if(l.height!==m){let e=l.height>0?u.getImageData(0,0,l.width,l.height):null;l.height=m,e&&u.putImageData(e,0,0)}if(Cr(u,n,i,r),f)for(let t of e){let e=p[t],n=e.width,{data:r,left:i=0,top:a=0}=f.draw(t),o=e.x-i,s=e.y-a,c=Math.max(0,Math.round(o)),d=Math.max(0,Math.round(s)),m=Math.min(r.width,l.width-c),h=Math.min(r.height,l.height-d);u.putImageData(r,c,d,0,0,m,h),e.x=c,e.y=d,e.width=m,e.height=h,e.anchorX+=m/2-i-n/2,e.anchorY+=a}else for(let t of e){let e=p[t];u.fillText(t,e.x,e.y+e.anchorY)}let v=f?f.measure():d();return{baselineOffset:(v.ascent-v.descent)/2,xOffset:h,yOffsetMin:g,yOffsetMax:_,mapping:p,data:l,width:l.width,height:l.height}}_getKey(){let{fontFamily:e,fontWeight:t,fontSize:n,buffer:r,sdf:i,radius:a,cutoff:o}=this.props;return i?`${e} ${t} ${n} ${r} ${a} ${o}`:`${e} ${t} ${n} ${r}`}};function Dr({fontSize:e,buffer:t,radius:n,cutoff:r,fontFamily:i,fontWeight:a}){let o=new er({fontSize:e,buffer:t,radius:n,cutoff:r,fontFamily:i,fontWeight:`${a}`});return e=>{let{data:n,width:r,height:i}=o.draw(e),a=new ImageData(r,i);return Sr(n,a),{data:a,left:t,top:t}}}var Or=`struct TextBackgroundUniforms {
  billboard: f32,
  sizeScale: f32,
  sizeMinPixels: f32,
  sizeMaxPixels: f32,
  borderRadius: vec4<f32>,
  padding: vec4<f32>,
  sizeUnits: i32,
  stroked: f32,
};

@group(0) @binding(auto) var<uniform> textBackground: TextBackgroundUniforms;
`,kr=`layout(std140) uniform textBackgroundUniforms {
  bool billboard;
  float sizeScale;
  float sizeMinPixels;
  float sizeMaxPixels;
  vec4 borderRadius;
  vec4 padding;
  highp int sizeUnits;
  bool stroked;
} textBackground;
`,Ar={name:`textBackground`,source:Or,vs:kr,fs:kr,uniformTypes:{billboard:`f32`,sizeScale:`f32`,sizeMinPixels:`f32`,sizeMaxPixels:`f32`,borderRadius:`vec4<f32>`,padding:`vec4<f32>`,sizeUnits:`i32`,stroked:`f32`}},jr=`#version 300 es
#define SHADER_NAME text-background-layer-vertex-shader
in vec2 positions;
in vec3 instancePositions;
in vec3 instancePositions64Low;
in vec4 instanceRects;
in vec4 instanceClipRect;
in float instanceSizes;
in float instanceAngles;
in vec2 instancePixelOffsets;
in float instanceLineWidths;
in vec4 instanceFillColors;
in vec4 instanceLineColors;
out vec4 vFillColor;
out vec4 vLineColor;
out float vLineWidth;
out vec2 uv;
out vec2 dimensions;
vec2 rotate_by_angle(vec2 vertex, float angle) {
float angle_radian = radians(angle);
float cos_angle = cos(angle_radian);
float sin_angle = sin(angle_radian);
mat2 rotationMatrix = mat2(cos_angle, -sin_angle, sin_angle, cos_angle);
return rotationMatrix * vertex;
}
void main(void) {
geometry.worldPosition = instancePositions;
geometry.uv = positions;
geometry.pickingColor = picking_getPickingColorFromInstanceID();
uv = positions;
vLineWidth = instanceLineWidths;
float sizePixels = clamp(
project_size_to_pixel(instanceSizes * textBackground.sizeScale, textBackground.sizeUnits),
textBackground.sizeMinPixels, textBackground.sizeMaxPixels
);
float instanceScale = sizePixels / text.fontSize;
dimensions = instanceRects.zw * instanceScale + textBackground.padding.xy + textBackground.padding.zw;
vec2 pixelOffset = (positions * instanceRects.zw + instanceRects.xy) * instanceScale + mix(-textBackground.padding.xy, textBackground.padding.zw, positions);
pixelOffset = rotate_by_angle(pixelOffset, instanceAngles);
pixelOffset += instancePixelOffsets;
pixelOffset.y *= -1.0;
vec2 xy = project_size_to_pixel(instanceClipRect.xy);
vec2 wh = project_size_to_pixel(instanceClipRect.zw);
if (text.flipY) {
xy.y = -xy.y - wh.y;
}
if (instanceClipRect.z >= 0.0) {
dimensions.x = wh.x;
pixelOffset.x = xy.x + uv.x * wh.x + mix(-textBackground.padding.x, textBackground.padding.z, uv.x);
}
if (instanceClipRect.w >= 0.0) {
dimensions.y = wh.y;
pixelOffset.y = xy.y + uv.y * wh.y + mix(-textBackground.padding.y, textBackground.padding.w, uv.y);
}
if (textBackground.billboard)  {
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
vec3 offset = vec3(pixelOffset, 0.0);
DECKGL_FILTER_SIZE(offset, geometry);
gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);
} else {
vec3 offset_common = vec3(project_pixel_size(pixelOffset), 0.0);
if (text.flipY) {
offset_common.y *= -1.;
}
DECKGL_FILTER_SIZE(offset_common, geometry);
gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset_common, geometry.position);
DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
}
vFillColor = vec4(instanceFillColors.rgb, instanceFillColors.a * layer.opacity);
DECKGL_FILTER_COLOR(vFillColor, geometry);
vLineColor = vec4(instanceLineColors.rgb, instanceLineColors.a * layer.opacity);
DECKGL_FILTER_COLOR(vLineColor, geometry);
}
`,Mr=`#version 300 es
#define SHADER_NAME text-background-layer-fragment-shader
precision highp float;
in vec4 vFillColor;
in vec4 vLineColor;
in float vLineWidth;
in vec2 uv;
in vec2 dimensions;
out vec4 fragColor;
float round_rect(vec2 p, vec2 size, vec4 radii) {
vec2 pixelPositionCB = (p - 0.5) * size;
vec2 sizeCB = size * 0.5;
float maxBorderRadius = min(size.x, size.y) * 0.5;
vec4 borderRadius = vec4(min(radii, maxBorderRadius));
borderRadius.xy =
(pixelPositionCB.x > 0.0) ? borderRadius.xy : borderRadius.zw;
borderRadius.x = (pixelPositionCB.y > 0.0) ? borderRadius.x : borderRadius.y;
vec2 q = abs(pixelPositionCB) - sizeCB + borderRadius.x;
return -(min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - borderRadius.x);
}
float rect(vec2 p, vec2 size) {
vec2 pixelPosition = p * size;
return min(min(pixelPosition.x, size.x - pixelPosition.x),
min(pixelPosition.y, size.y - pixelPosition.y));
}
vec4 get_stroked_fragColor(float dist) {
float isBorder = smoothedge(dist, vLineWidth);
return mix(vFillColor, vLineColor, isBorder);
}
void main(void) {
geometry.uv = uv;
if (textBackground.borderRadius != vec4(0.0)) {
float distToEdge = round_rect(uv, dimensions, textBackground.borderRadius);
float shapeAlpha = smoothedge(-distToEdge, 0.0);
if (shapeAlpha == 0.0) {
discard;
}
if (textBackground.stroked) {
fragColor = get_stroked_fragColor(distToEdge);
} else {
fragColor = vFillColor;
}
fragColor.a *= shapeAlpha;
} else {
if (textBackground.stroked) {
float distToEdge = rect(uv, dimensions);
fragColor = get_stroked_fragColor(distToEdge);
} else {
fragColor = vFillColor;
}
}
DECKGL_FILTER_COLOR(fragColor, geometry);
}
`,Nr=`struct TextUniforms {
  cutoffPixels: vec2<f32>,
  align: vec2<i32>,
  fontSize: f32,
  flipY: f32,
};

@group(0) @binding(auto) var<uniform> text: TextUniforms;

fn rotate_by_angle(vertex: vec2<f32>, angle: f32) -> vec2<f32> {
  let angleRadian = radians(angle);
  let cosine = cos(angleRadian);
  let sine = sin(angleRadian);
  let rotationMatrix = mat2x2<f32>(
    vec2<f32>(cosine, -sine),
    vec2<f32>(sine, cosine)
  );
  return rotationMatrix * vertex;
}

struct Attributes {
  @builtin(instance_index) instanceIndex: u32,
  @location(0) positions: vec2<f32>,
  @location(1) instancePositions: vec3<f32>,
  @location(2) instancePositions64Low: vec3<f32>,
  @location(3) instanceSizes: f32,
  @location(4) instanceAngles: f32,
  @location(5) instanceRects: vec4<f32>,
  @location(6) instanceClipRect: vec4<f32>,
  @location(7) instancePixelOffsets: vec2<f32>,
  @location(8) instanceFillColors: vec4<f32>,
  @location(9) instanceLineColors: vec4<f32>,
  @location(10) instanceLineWidths: f32,
};

struct Varyings {
  @builtin(position) position: vec4<f32>,
  @location(0) vFillColor: vec4<f32>,
  @location(1) vLineColor: vec4<f32>,
  @location(2) vLineWidth: f32,
  @location(3) uv: vec2<f32>,
  @location(4) dimensions: vec2<f32>,
  @location(5) pickingColor: vec3<f32>,
};

@vertex
fn vertexMain(attributes: Attributes) -> Varyings {
  geometry.worldPosition = attributes.instancePositions;
  geometry.uv = attributes.positions;
  geometry.pickingColor = picking_getPickingColorFromIndex(attributes.instanceIndex);

  var varyings: Varyings;
  varyings.uv = attributes.positions;
  varyings.vLineWidth = attributes.instanceLineWidths;

  let sizePixels = clamp(
    project_unit_size_to_pixel(
      attributes.instanceSizes * textBackground.sizeScale,
      textBackground.sizeUnits
    ),
    textBackground.sizeMinPixels,
    textBackground.sizeMaxPixels
  );
  let instanceScale = sizePixels / text.fontSize;

  varyings.dimensions = attributes.instanceRects.zw * instanceScale +
    textBackground.padding.xy + textBackground.padding.zw;

  var pixelOffset =
    (attributes.positions * attributes.instanceRects.zw + attributes.instanceRects.xy) *
      instanceScale +
    mix(-textBackground.padding.xy, textBackground.padding.zw, attributes.positions);
  pixelOffset = rotate_by_angle(pixelOffset, attributes.instanceAngles);
  pixelOffset = pixelOffset + attributes.instancePixelOffsets;
  pixelOffset.y = pixelOffset.y * -1.0;

  var xy = project_size_vec2(attributes.instanceClipRect.xy) * project.scale;
  let wh = project_size_vec2(attributes.instanceClipRect.zw) * project.scale;
  if (text.flipY > 0.5) {
    xy.y = -xy.y - wh.y;
  }
  if (attributes.instanceClipRect.z >= 0.0) {
    varyings.dimensions.x = wh.x;
    pixelOffset.x = xy.x + varyings.uv.x * wh.x + mix(
      -textBackground.padding.x,
      textBackground.padding.z,
      varyings.uv.x
    );
  }
  if (attributes.instanceClipRect.w >= 0.0) {
    varyings.dimensions.y = wh.y;
    pixelOffset.y = xy.y + varyings.uv.y * wh.y + mix(
      -textBackground.padding.y,
      textBackground.padding.w,
      varyings.uv.y
    );
  }

  if (textBackground.billboard > 0.5) {
    var position = project_position_to_clipspace(
      attributes.instancePositions,
      attributes.instancePositions64Low,
      vec3<f32>(0.0)
    );
    let clipOffset = project_pixel_size_to_clipspace(pixelOffset);
    position = vec4<f32>(
      position.x + clipOffset.x,
      position.y + clipOffset.y,
      position.z,
      position.w
    );
    varyings.position = position;
  } else {
    var offsetCommon = vec3<f32>(project_pixel_size_vec2(pixelOffset), 0.0);
    if (text.flipY > 0.5) {
      offsetCommon.y = offsetCommon.y * -1.0;
    }
    varyings.position = project_position_to_clipspace(
      attributes.instancePositions,
      attributes.instancePositions64Low,
      offsetCommon
    );
  }

  varyings.vFillColor = vec4<f32>(
    attributes.instanceFillColors.rgb,
    attributes.instanceFillColors.a * layer.opacity
  );
  varyings.vLineColor = vec4<f32>(
    attributes.instanceLineColors.rgb,
    attributes.instanceLineColors.a * layer.opacity
  );
  varyings.pickingColor = geometry.pickingColor;
  return varyings;
}

fn round_rect(point: vec2<f32>, size: vec2<f32>, radii: vec4<f32>) -> f32 {
  let pixelPosition = (point - 0.5) * size;
  let halfSize = size * 0.5;
  let maxBorderRadius = min(size.x, size.y) * 0.5;
  var borderRadius = min(radii, vec4<f32>(maxBorderRadius));

  borderRadius = select(borderRadius.zwxy, borderRadius, pixelPosition.x > 0.0);
  let radius = select(borderRadius.y, borderRadius.x, pixelPosition.y > 0.0);
  let q = abs(pixelPosition) - halfSize + radius;
  return -(min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - radius);
}

fn rect(point: vec2<f32>, size: vec2<f32>) -> f32 {
  let pixelPosition = point * size;
  return min(
    min(pixelPosition.x, size.x - pixelPosition.x),
    min(pixelPosition.y, size.y - pixelPosition.y)
  );
}

fn get_stroked_frag_color(
  distanceToEdge: f32,
  lineWidth: f32,
  fillColor: vec4<f32>,
  lineColor: vec4<f32>
) -> vec4<f32> {
  let isBorder = smoothedge(distanceToEdge, lineWidth);
  return mix(fillColor, lineColor, isBorder);
}

@fragment
fn fragmentMain(varyings: Varyings) -> @location(0) vec4<f32> {
  geometry.uv = varyings.uv;
  var fragColor: vec4<f32>;

  if (any(textBackground.borderRadius != vec4<f32>(0.0))) {
    let distanceToEdge = round_rect(
      varyings.uv,
      varyings.dimensions,
      textBackground.borderRadius
    );
    let shapeAlpha = smoothedge(-distanceToEdge, 0.0);
    if (shapeAlpha == 0.0) {
      discard;
    }
    if (textBackground.stroked > 0.5) {
      fragColor = get_stroked_frag_color(
        distanceToEdge,
        varyings.vLineWidth,
        varyings.vFillColor,
        varyings.vLineColor
      );
    } else {
      fragColor = varyings.vFillColor;
    }
    fragColor.a = fragColor.a * shapeAlpha;
  } else if (textBackground.stroked > 0.5) {
    let distanceToEdge = rect(varyings.uv, varyings.dimensions);
    fragColor = get_stroked_frag_color(
      distanceToEdge,
      varyings.vLineWidth,
      varyings.vFillColor,
      varyings.vLineColor
    );
  } else {
    fragColor = varyings.vFillColor;
  }

  if (picking.isActive > 0.5) {
    if (!picking_isColorValid(varyings.pickingColor)) {
      discard;
    }
    return vec4<f32>(varyings.pickingColor, 1.0);
  }

  if (picking.isHighlightActive > 0.5) {
    let highlightedObjectColor = picking_normalizeColor(picking.highlightedObjectColor);
    if (picking_isColorZero(abs(varyings.pickingColor - highlightedObjectColor))) {
      let highlightAlpha = picking.highlightColor.a;
      let blendedAlpha = highlightAlpha + fragColor.a * (1.0 - highlightAlpha);
      if (blendedAlpha > 0.0) {
        let highlightRatio = highlightAlpha / blendedAlpha;
        fragColor = vec4<f32>(
          mix(fragColor.rgb, picking.highlightColor.rgb, highlightRatio),
          blendedAlpha
        );
      } else {
        fragColor = vec4<f32>(fragColor.rgb, 0.0);
      }
    }
  }

  return deckgl_premultiplied_alpha(fragColor);
}
`,Pr={billboard:!0,sizeScale:1,sizeUnits:`pixels`,sizeMinPixels:0,sizeMaxPixels:2**53-1,fontSize:1,borderRadius:{type:`object`,value:0},padding:{type:`array`,value:[0,0,0,0]},getPosition:{type:`accessor`,value:e=>e.position},getSize:{type:`accessor`,value:1},getAngle:{type:`accessor`,value:0},getPixelOffset:{type:`accessor`,value:[0,0]},getBoundingRect:{type:`accessor`,value:[0,0,0,0]},getClipRect:{type:`accessor`,value:[0,0,-1,-1]},getFillColor:{type:`accessor`,value:[0,0,0,255]},getLineColor:{type:`accessor`,value:[0,0,0,255]},getLineWidth:{type:`accessor`,value:1}},Fr=class extends P{getShaders(){return super.getShaders({vs:jr,fs:Mr,source:Nr,modules:[N,pe,M,Ar,Wn]})}initializeState(){this.getAttributeManager().addInstanced({instancePositions:{size:3,type:`float64`,fp64:this.use64bitPositions(),transition:!0,accessor:`getPosition`},instanceSizes:{size:1,transition:!0,bufferGroup:`text-background-instance-data`,accessor:`getSize`,defaultValue:1},instanceAngles:{size:1,transition:!0,bufferGroup:`text-background-instance-data`,accessor:`getAngle`},instanceRects:{size:4,bufferGroup:`text-background-instance-data`,accessor:`getBoundingRect`},instanceClipRect:{size:4,bufferGroup:`text-background-instance-data`,accessor:`getClipRect`,defaultValue:[0,0,-1,-1]},instancePixelOffsets:{size:2,transition:!0,bufferGroup:`text-background-instance-data`,accessor:`getPixelOffset`},instanceFillColors:{size:4,transition:!0,type:`unorm8`,accessor:`getFillColor`,defaultValue:[0,0,0,255]},instanceLineColors:{size:4,transition:!0,type:`unorm8`,accessor:`getLineColor`,defaultValue:[0,0,0,255]},instanceLineWidths:{size:1,transition:!0,bufferGroup:`text-background-instance-data`,accessor:`getLineWidth`,defaultValue:1}})}updateState(e){super.updateState(e);let{changeFlags:t}=e;t.extensionsChanged&&(this.state.model?.destroy(),this.state.model=this._getModel(),this.getAttributeManager().invalidateAll())}draw({uniforms:e}){let{billboard:t,sizeScale:n,sizeUnits:r,sizeMinPixels:i,sizeMaxPixels:a,getLineWidth:o,fontSize:s}=this.props,{padding:l,borderRadius:u}=this.props;l.length<4&&(l=[l[0],l[1],l[0],l[1]]),Array.isArray(u)||(u=[u,u,u,u]);let d=this.state.model,f={billboard:t,stroked:!!o,borderRadius:u,padding:l,sizeUnits:c[r],sizeScale:n,sizeMinPixels:i,sizeMaxPixels:a},p={fontSize:s,viewport:this.context.viewport};d.shaderInputs.setProps({textBackground:f,text:p}),d.draw(this.context.renderPass)}_getModel(){let e=[0,0,1,0,0,1,1,1];return new F(this.context.device,{...this.getShaders(),id:this.props.id,bufferLayout:this.getAttributeManager().getBufferLayouts(),geometry:new j({topology:`triangle-strip`,vertexCount:4,attributes:{positions:{size:2,value:new Float32Array(e)}}}),isInstanced:!0})}};Fr.defaultProps=Pr,Fr.layerName=`TextBackgroundLayer`;var Ir={start:1,middle:0,end:-1},Lr={top:1,center:0,bottom:-1},Rr=[0,0,0,255],zr={billboard:!0,sizeScale:1,sizeUnits:`pixels`,sizeMinPixels:0,sizeMaxPixels:2**53-1,background:!1,getBackgroundColor:{type:`accessor`,value:[255,255,255,255]},getBorderColor:{type:`accessor`,value:Rr},getBorderWidth:{type:`accessor`,value:0},backgroundBorderRadius:{type:`object`,value:0},backgroundPadding:{type:`array`,value:[0,0,0,0]},characterSet:{type:`object`,value:U.characterSet},fontFamily:U.fontFamily,fontWeight:U.fontWeight,lineHeight:1,outlineWidth:{type:`number`,value:0,min:0},outlineColor:{type:`color`,value:Rr},fontSettings:{type:`object`,value:{},compare:1},wordBreak:`break-word`,maxWidth:{type:`number`,value:-1},contentCutoffPixels:{type:`array`,value:[0,0]},contentAlignHorizontal:`none`,contentAlignVertical:`none`,getText:{type:`accessor`,value:e=>e.text},getPosition:{type:`accessor`,value:e=>e.position},getColor:{type:`accessor`,value:Rr},getSize:{type:`accessor`,value:32},getAngle:{type:`accessor`,value:0},getTextAnchor:{type:`accessor`,value:`middle`},getAlignmentBaseline:{type:`accessor`,value:`center`},getPixelOffset:{type:`accessor`,value:[0,0]},getContentBox:{type:`accessor`,value:[0,0,-1,-1]},backgroundColor:{deprecatedFor:[`background`,`getBackgroundColor`]}},Br=class extends I{constructor(){super(...arguments),this.getBoundingRect=(e,t)=>{let{size:[n,r]}=this.transformParagraph(e,t),{getTextAnchor:i,getAlignmentBaseline:a}=this.props,o=Ir[typeof i==`function`?i(e,t):i],s=Lr[typeof a==`function`?a(e,t):a];return[(o-1)*n/2,(s-1)*r/2,n,r]},this.getIconOffsets=(e,t)=>{let{getTextAnchor:n,getAlignmentBaseline:r}=this.props,{x:i,y:a,rowWidth:o,size:[,s]}=this.transformParagraph(e,t),c=Ir[typeof n==`function`?n(e,t):n],l=Lr[typeof r==`function`?r(e,t):r],u=i.length,d=Array(u*2),f=0;for(let e=0;e<u;e++)d[f++]=(c-1)*o[e]/2+i[e],d[f++]=(l-1)*s/2+a[e];return d}}initializeState(){this.state={styleVersion:0,fontAtlasManager:new Er},this.props.maxWidth>0&&w.once(1,`v8.9 breaking change: TextLayer maxWidth is now relative to text size`)()}updateState(e){let{props:t,oldProps:n,changeFlags:r}=e;(r.dataChanged||r.updateTriggersChanged&&(r.updateTriggersChanged.all||r.updateTriggersChanged.getText))&&this._updateText(),(this._updateFontAtlas()||t.lineHeight!==n.lineHeight||t.wordBreak!==n.wordBreak||t.maxWidth!==n.maxWidth)&&this.setState({styleVersion:this.state.styleVersion+1})}getPickingInfo({info:e}){return e.object=e.index>=0?this.props.data[e.index]:null,e}_updateFontAtlas(){let{fontSettings:e,fontFamily:t,fontWeight:n,_getFontRenderer:r}=this.props,{fontAtlasManager:i,characterSet:a}=this.state,o={...e,characterSet:a,fontFamily:t,fontWeight:n,_getFontRenderer:r};if(!i.mapping)return i.setProps(o),!0;for(let e in o)if(o[e]!==i.props[e])return i.setProps(o),!0;return!1}_updateText(){let{data:e,characterSet:t}=this.props,n=e.attributes?.getText,{getText:r}=this.props,i=e.startIndices,a,o=t===`auto`&&new Set;if(n&&i){let{texts:t,characterCount:s}=pr({...ArrayBuffer.isView(n)?{value:n}:n,length:e.length,startIndices:i,characterSet:o});a=s,r=(e,{index:n})=>t[n]}else{let{iterable:t,objectInfo:n}=fe(e);i=[0],a=0;for(let e of t){n.index++;let t=Array.from(r(e,n)||``);o&&t.forEach(o.add,o),a+=t.length,i.push(a)}}this.setState({getText:r,startIndices:i,numInstances:a,characterSet:o||t})}transformParagraph(e,t){let{fontAtlasManager:n}=this.state,r=n.mapping,{baselineOffset:i}=n.atlas,{fontSize:a}=n.props,o=this.state.getText,{wordBreak:s,lineHeight:c,maxWidth:l}=this.props;return fr(o(e,t)||``,i,c*a,s,l*a,r)}renderLayers(){let{startIndices:e,numInstances:t,getText:n,fontAtlasManager:{atlas:r,mapping:i},styleVersion:a}=this.state,{data:o,_dataDiff:s,getPosition:c,getColor:l,getSize:u,getAngle:d,getPixelOffset:f,getBackgroundColor:p,getBorderColor:m,getBorderWidth:h,getContentBox:g,backgroundBorderRadius:_,backgroundPadding:v,background:y,billboard:b,fontSettings:x,outlineWidth:S,outlineColor:C,sizeScale:w,sizeUnits:T,sizeMinPixels:ee,sizeMaxPixels:E,contentCutoffPixels:te,contentAlignHorizontal:ne,contentAlignVertical:re,transitions:D,updateTriggers:O}=this.props,k=this.getSubLayerClass(`characters`,Zn),ie=this.getSubLayerClass(`background`,Fr),{fontSize:A}=this.state.fontAtlasManager.props;return[y&&new ie({getFillColor:p,getLineColor:m,getLineWidth:h,borderRadius:_,padding:v,getPosition:c,getSize:u,getAngle:d,getPixelOffset:f,getClipRect:g,billboard:b,sizeScale:w,sizeUnits:T,sizeMinPixels:ee,sizeMaxPixels:E,fontSize:A,transitions:D&&{getPosition:D.getPosition,getAngle:D.getAngle,getSize:D.getSize,getFillColor:D.getBackgroundColor,getLineColor:D.getBorderColor,getLineWidth:D.getBorderWidth,getPixelOffset:D.getPixelOffset}},this.getSubLayerProps({id:`background`,updateTriggers:{getPosition:O.getPosition,getAngle:O.getAngle,getSize:O.getSize,getFillColor:O.getBackgroundColor,getLineColor:O.getBorderColor,getLineWidth:O.getBorderWidth,getPixelOffset:O.getPixelOffset,getBoundingRect:{getText:O.getText,getTextAnchor:O.getTextAnchor,getAlignmentBaseline:O.getAlignmentBaseline,styleVersion:a}}}),{data:o.attributes&&o.attributes.background?{length:o.length,attributes:o.attributes.background}:o,_dataDiff:s,autoHighlight:!1,getBoundingRect:this.getBoundingRect}),new k({sdf:x.sdf,smoothing:Number.isFinite(x.smoothing)?x.smoothing:U.smoothing,outlineWidth:S/(x.radius||U.radius),outlineColor:C,iconAtlas:r,iconMapping:i,getPosition:c,getColor:l,getSize:u,getAngle:d,getPixelOffset:f,getContentBox:g,billboard:b,sizeScale:w,sizeUnits:T,sizeMinPixels:ee,sizeMaxPixels:E,fontSize:A,contentCutoffPixels:te,contentAlignHorizontal:ne,contentAlignVertical:re,transitions:D&&{getPosition:D.getPosition,getAngle:D.getAngle,getColor:D.getColor,getSize:D.getSize,getPixelOffset:D.getPixelOffset,getContentBox:D.getContentBox}},this.getSubLayerProps({id:`characters`,updateTriggers:{all:O.getText,getPosition:O.getPosition,getAngle:O.getAngle,getColor:O.getColor,getSize:O.getSize,getPixelOffset:O.getPixelOffset,getContentBox:O.getContentBox,getIconOffsets:{getTextAnchor:O.getTextAnchor,getAlignmentBaseline:O.getAlignmentBaseline,styleVersion:a}}}),{data:o,_dataDiff:s,startIndices:e,numInstances:t,getIconOffsets:this.getIconOffsets,getIcon:n})]}static set fontAtlasCacheLimit(e){Tr(e)}};Br.defaultProps=zr,Br.layerName=`TextLayer`;var Vr={circle:{type:mt,props:{filled:`filled`,stroked:`stroked`,lineWidthMaxPixels:`lineWidthMaxPixels`,lineWidthMinPixels:`lineWidthMinPixels`,lineWidthScale:`lineWidthScale`,lineWidthUnits:`lineWidthUnits`,pointRadiusMaxPixels:`radiusMaxPixels`,pointRadiusMinPixels:`radiusMinPixels`,pointRadiusScale:`radiusScale`,pointRadiusUnits:`radiusUnits`,pointAntialiasing:`antialiasing`,pointBillboard:`billboard`,getFillColor:`getFillColor`,getLineColor:`getLineColor`,getLineWidth:`getLineWidth`,getPointRadius:`getRadius`}},icon:{type:nt,props:{iconAtlas:`iconAtlas`,iconMapping:`iconMapping`,iconSizeMaxPixels:`sizeMaxPixels`,iconSizeMinPixels:`sizeMinPixels`,iconSizeScale:`sizeScale`,iconSizeUnits:`sizeUnits`,iconAlphaCutoff:`alphaCutoff`,iconBillboard:`billboard`,getIcon:`getIcon`,getIconAngle:`getAngle`,getIconColor:`getColor`,getIconPixelOffset:`getPixelOffset`,getIconSize:`getSize`}},text:{type:Br,props:{textSizeMaxPixels:`sizeMaxPixels`,textSizeMinPixels:`sizeMinPixels`,textSizeScale:`sizeScale`,textSizeUnits:`sizeUnits`,textBackground:`background`,textBackgroundPadding:`backgroundPadding`,textFontFamily:`fontFamily`,textFontWeight:`fontWeight`,textLineHeight:`lineHeight`,textMaxWidth:`maxWidth`,textOutlineColor:`outlineColor`,textOutlineWidth:`outlineWidth`,textWordBreak:`wordBreak`,textCharacterSet:`characterSet`,textBillboard:`billboard`,textFontSettings:`fontSettings`,getText:`getText`,getTextAngle:`getAngle`,getTextColor:`getColor`,getTextPixelOffset:`getPixelOffset`,getTextSize:`getSize`,getTextAnchor:`getTextAnchor`,getTextAlignmentBaseline:`getAlignmentBaseline`,getTextBackgroundColor:`getBackgroundColor`,getTextBorderColor:`getBorderColor`,getTextBorderWidth:`getBorderWidth`}}},Hr={type:nn,props:{lineWidthUnits:`widthUnits`,lineWidthScale:`widthScale`,lineWidthMinPixels:`widthMinPixels`,lineWidthMaxPixels:`widthMaxPixels`,lineJointRounded:`jointRounded`,lineCapRounded:`capRounded`,lineMiterLimit:`miterLimit`,lineBillboard:`billboard`,lineAntialiasing:`antialiasing`,getLineColor:`getColor`,getLineWidth:`getWidth`}},Ur={type:Ln,props:{extruded:`extruded`,filled:`filled`,wireframe:`wireframe`,elevationScale:`elevationScale`,material:`material`,_full3d:`_full3d`,getElevation:`getElevation`,getFillColor:`getFillColor`,getLineColor:`getLineColor`}};function W({type:e,props:t}){let n={};for(let r in t)n[r]=e.defaultProps[t[r]];return n}function Wr(e,t){let{transitions:n,updateTriggers:r}=e.props,i={updateTriggers:{},transitions:n&&{getPosition:n.geometry}};for(let a in t){let o=t[a],s=e.props[a];a.startsWith(`get`)&&(s=e.getSubLayerAccessor(s),i.updateTriggers[o]=r[a],n&&(i.transitions[o]=n[a])),i[o]=s}return i}function Gr(e){if(Array.isArray(e))return e;switch(w.assert(e.type,`GeoJSON does not have type`),e.type){case`Feature`:return[e];case`FeatureCollection`:return w.assert(Array.isArray(e.features),`GeoJSON does not have features array`),e.features;default:return[{geometry:e}]}}function Kr(e,t,n={}){let r={pointFeatures:[],lineFeatures:[],polygonFeatures:[],polygonOutlineFeatures:[]},{startRow:i=0,endRow:a=e.length}=n;for(let n=i;n<a;n++){let i=e[n],{geometry:a}=i;if(a){if(a.type===`GeometryCollection`){w.assert(Array.isArray(a.geometries),`GeoJSON does not have geometries array`);let{geometries:e}=a;for(let a=0;a<e.length;a++){let o=e[a];qr(o,r,t,i,n)}}else qr(a,r,t,i,n)}}return r}function qr(e,t,n,r,i){let{type:a,coordinates:o}=e,{pointFeatures:s,lineFeatures:c,polygonFeatures:l,polygonOutlineFeatures:u}=t;if(!Yr(a,o)){w.warn(`${a} coordinates are malformed`)();return}switch(a){case`Point`:s.push(n({geometry:e},r,i));break;case`MultiPoint`:o.forEach(e=>{s.push(n({geometry:{type:`Point`,coordinates:e}},r,i))});break;case`LineString`:c.push(n({geometry:e},r,i));break;case`MultiLineString`:o.forEach(e=>{c.push(n({geometry:{type:`LineString`,coordinates:e}},r,i))});break;case`Polygon`:l.push(n({geometry:e},r,i)),o.forEach(e=>{u.push(n({geometry:{type:`LineString`,coordinates:e}},r,i))});break;case`MultiPolygon`:o.forEach(e=>{l.push(n({geometry:{type:`Polygon`,coordinates:e}},r,i)),e.forEach(e=>{u.push(n({geometry:{type:`LineString`,coordinates:e}},r,i))})})}}var Jr={Point:1,MultiPoint:2,LineString:2,MultiLineString:3,Polygon:3,MultiPolygon:4};function Yr(e,t){let n=Jr[e];for(w.assert(n,`Unknown GeoJSON type ${e}`);t&&--n>0;)t=t[0];return t&&Number.isFinite(t[0])}function Xr(){return{points:{},lines:{},polygons:{},polygonsOutline:{}}}function Zr(e){return e.geometry.coordinates}function Qr(e,t){let n=Xr(),{pointFeatures:r,lineFeatures:i,polygonFeatures:a,polygonOutlineFeatures:o}=e;return n.points.data=r,n.points._dataDiff=t.pointFeatures&&(()=>t.pointFeatures),n.points.getPosition=Zr,n.lines.data=i,n.lines._dataDiff=t.lineFeatures&&(()=>t.lineFeatures),n.lines.getPath=Zr,n.polygons.data=a,n.polygons._dataDiff=t.polygonFeatures&&(()=>t.polygonFeatures),n.polygons.getPolygon=Zr,n.polygonsOutline.data=o,n.polygonsOutline._dataDiff=t.polygonOutlineFeatures&&(()=>t.polygonOutlineFeatures),n.polygonsOutline.getPath=Zr,n}function $r(e){let t=Xr(),{points:n,lines:r,polygons:i}=e,a=Vn(e);t.points.data={length:n.positions.value.length/n.positions.size,attributes:{...n.attributes,getPosition:n.positions,rowIndexes:{size:1,type:`uint32`,value:a.points}},properties:n.properties,numericProps:n.numericProps,featureIds:n.featureIds},t.lines.data={length:r.pathIndices.value.length-1,startIndices:r.pathIndices.value,attributes:{...r.attributes,getPath:r.positions,rowIndexes:{size:1,type:`uint32`,value:a.lines}},properties:r.properties,numericProps:r.numericProps,featureIds:r.featureIds},t.lines._pathType=`open`;let o=i.positions.value.length/i.positions.size,s=Array(o).fill(1);for(let e of i.primitivePolygonIndices.value)s[e-1]=0;return t.polygons.data={length:i.polygonIndices.value.length-1,startIndices:i.polygonIndices.value,attributes:{...i.attributes,getPolygon:i.positions,instanceVertexValid:{size:1,value:new Uint16Array(s)},rowIndexes:{size:1,type:`uint32`,value:a.polygons}},properties:i.properties,numericProps:i.numericProps,featureIds:i.featureIds},t.polygons._normalize=!1,i.triangles&&(t.polygons.data.attributes.indices=i.triangles.value),t.polygonsOutline.data={length:i.primitivePolygonIndices.value.length-1,startIndices:i.primitivePolygonIndices.value,attributes:{...i.attributes,getPath:i.positions,rowIndexes:{size:1,type:`uint32`,value:a.polygons}},properties:i.properties,numericProps:i.numericProps,featureIds:i.featureIds},t.polygonsOutline._pathType=`open`,t}var ei=[`points`,`linestrings`,`polygons`],ti={...W(Vr.circle),...W(Vr.icon),...W(Vr.text),...W(Hr),...W(Ur),stroked:!0,filled:!0,extruded:!1,wireframe:!1,_full3d:!1,iconAtlas:{type:`object`,value:null},iconMapping:{type:`object`,value:{}},getIcon:{type:`accessor`,value:e=>e.properties.icon},getText:{type:`accessor`,value:e=>e.properties.text},pointType:`circle`,getRadius:{deprecatedFor:`getPointRadius`}},ni=class extends I{initializeState(){this.state={layerProps:{},features:{},featuresDiff:{}}}updateState({props:e,changeFlags:t}){if(!t.dataChanged)return;let{data:n}=this.props,r=n&&`points`in n&&`polygons`in n&&`lines`in n;this.setState({binary:r}),r?this._updateStateBinary({props:e,changeFlags:t}):this._updateStateJSON({props:e,changeFlags:t})}_updateStateBinary({props:e,changeFlags:t}){let n=$r(e.data);this.setState({layerProps:n})}_updateStateJSON({props:e,changeFlags:t}){let n=Gr(e.data),r=this.getSubLayerRow.bind(this),i={},a={};if(Array.isArray(t.dataChanged)){let e=this.state.features;for(let t in e)i[t]=e[t].slice(),a[t]=[];for(let o of t.dataChanged){let t=Kr(n,r,o);for(let n in e)a[n].push(Rn({data:i[n],getIndex:e=>e.__source.index,dataRange:o,replace:t[n]}))}}else i=Kr(n,r);let o=Qr(i,a);this.setState({features:i,featuresDiff:a,layerProps:o})}getPickingInfo(e){let t=super.getPickingInfo(e),{index:n,sourceLayer:r}=t;return t.featureType=ei.find(e=>r.id.startsWith(`${this.id}-${e}-`)),n>=0&&r.id.startsWith(`${this.id}-points-text`)&&this.state.binary&&(t.index=this.props.data.points.globalFeatureIds.value[n]),t}_updateAutoHighlight(e){let t=`${this.id}-points-`,n=e.featureType===`points`;for(let r of this.getSubLayers())r.id.startsWith(t)===n&&r.updateAutoHighlight(e)}_renderPolygonLayer(){let{extruded:e,wireframe:t}=this.props,{layerProps:n}=this.state,r=`polygons-fill`,i=this.shouldRenderSubLayer(r,n.polygons?.data)&&this.getSubLayerClass(r,Ur.type);if(i){let a=Wr(this,Ur.props),o=e&&t;return o||delete a.getLineColor,a.updateTriggers.lineColors=o,new i(a,this.getSubLayerProps({id:r,updateTriggers:a.updateTriggers}),n.polygons)}return null}_renderLineLayers(){let{extruded:e,stroked:t}=this.props,{layerProps:n}=this.state,r=`polygons-stroke`,i=`linestrings`,a=!e&&t&&this.shouldRenderSubLayer(r,n.polygonsOutline?.data)&&this.getSubLayerClass(r,Hr.type),o=this.shouldRenderSubLayer(i,n.lines?.data)&&this.getSubLayerClass(i,Hr.type);if(a||o){let e=Wr(this,Hr.props);return[a&&new a(e,this.getSubLayerProps({id:r,updateTriggers:e.updateTriggers}),n.polygonsOutline),o&&new o(e,this.getSubLayerProps({id:i,updateTriggers:e.updateTriggers}),n.lines)]}return null}_renderPointLayers(){let{pointType:e}=this.props,{layerProps:t,binary:n}=this.state,{highlightedObjectIndex:r}=this.props;!n&&Number.isFinite(r)&&(r=t.points.data.findIndex(e=>e.__source.index===r));let i=new Set(e.split(`+`)),a=[];for(let e of i){let i=`points-${e}`,o=Vr[e],s=o&&this.shouldRenderSubLayer(i,t.points?.data)&&this.getSubLayerClass(i,o.type);if(s){let c=Wr(this,o.props),l=t.points;if(e===`text`&&n){let{rowIndexes:e,...t}=l.data.attributes;l={...l,data:{...l.data,attributes:t}}}a.push(new s(c,this.getSubLayerProps({id:i,updateTriggers:c.updateTriggers,highlightedObjectIndex:r}),l))}}return a}renderLayers(){let{extruded:e}=this.props,t=this._renderPolygonLayer(),n=this._renderLineLayers(),r=this._renderPointLayers();return[!e&&t,n,r,e&&t]}getSubLayerAccessor(e){let{binary:t}=this.state;return!t||typeof e!=`function`?super.getSubLayerAccessor(e):(t,n)=>{let{data:r,index:i}=n;return e(zn(r,i),n)}}};ni.layerName=`GeoJsonLayer`,ni.defaultProps=ti;var ri=class{constructor(e){this.index=e,this.isVisible=!1,this.isSelected=!1,this.parent=null,this.children=[],this.content=null,this._loader=void 0,this._abortController=null,this._loaderId=0,this._isLoaded=!1,this._isCancelled=!1,this._needsReload=!1}get bbox(){return this._bbox}set bbox(e){this._bbox||(this._bbox=e,this.boundingBox=`west`in e?[[e.west,e.south],[e.east,e.north]]:[[e.left,e.top],[e.right,e.bottom]])}get data(){return this.isLoading&&this._loader?this._loader.then(()=>this.data):this.content}get isLoaded(){return this._isLoaded&&!this._needsReload}get isLoading(){return!!this._loader&&!this._isCancelled}get needsReload(){return this._needsReload||this._isCancelled}get byteLength(){let e=this.content?this.content.byteLength:0;return Number.isFinite(e)||console.error(`byteLength not defined in tile data`),e}async _loadData({getData:e,getRequestPriority:t,requestScheduler:n,onLoad:r,onError:i}){let{index:a,id:o,bbox:s,userData:c,zoom:l}=this,u=this._loaderId;this._abortController=new AbortController;let{signal:d}=this._abortController,f=await n.scheduleRequest(this,t);if(!f){this._isCancelled=!0;return}if(this._isCancelled){f.done();return}let p=null,m;try{p=await e({index:a,id:o,bbox:s,userData:c,zoom:l,signal:d})}catch(e){m=e||!0}finally{f.done()}if(u===this._loaderId){if(this._loader=void 0,this.content=p,this._isCancelled&&!p){this._isLoaded=!1;return}this._isLoaded=!0,this._isCancelled=!1,m?i(m,this):r(this)}}loadData(e){return this._isLoaded=!1,this._isCancelled=!1,this._needsReload=!1,this._loaderId++,this._loader=this._loadData(e),this._loader}setNeedsReload(){this.isLoading&&(this.abort(),this._loader=void 0),this._needsReload=!0}abort(){this.isLoaded||(this._isCancelled=!0,this._abortController?.abort())}},G={OUTSIDE:-1,INTERSECTING:0,INSIDE:1},ii=new k,ai=new k,oi=class e{constructor(e=[0,0,0],t=[0,0,0],n){n||=ii.copy(e).add(t).scale(.5),this.center=new k(n),this.halfDiagonal=new k(t).subtract(this.center),this.minimum=new k(e),this.maximum=new k(t)}clone(){return new e(this.minimum,this.maximum,this.center)}equals(e){return this===e||!!e&&this.minimum.equals(e.minimum)&&this.maximum.equals(e.maximum)}transform(e){return this.center.transformAsPoint(e),this.halfDiagonal.transform(e),this.minimum.transform(e),this.maximum.transform(e),this}intersectPlane(e){let{halfDiagonal:t}=this,n=ai.from(e.normal),r=t.x*Math.abs(n.x)+t.y*Math.abs(n.y)+t.z*Math.abs(n.z),i=this.center.dot(n)+e.distance;return i-r>0?G.INSIDE:i+r<0?G.OUTSIDE:G.INTERSECTING}distanceTo(e){return Math.sqrt(this.distanceSquaredTo(e))}distanceSquaredTo(e){let t=ii.from(e).subtract(this.center),{halfDiagonal:n}=this,r=0,i;return i=Math.abs(t.x)-n.x,i>0&&(r+=i*i),i=Math.abs(t.y)-n.y,i>0&&(r+=i*i),i=Math.abs(t.z)-n.z,i>0&&(r+=i*i),r}},K=new k,si=new k,ci=class e{constructor(e=[0,0,0],t=0){this.radius=-0,this.center=new k,this.fromCenterRadius(e,t)}fromCenterRadius(e,t){return this.center.from(e),this.radius=t,this}fromCornerPoints(e,t){return t=K.from(t),this.center=new k().from(e).add(t).scale(.5),this.radius=this.center.distance(t),this}equals(e){return this===e||!!e&&this.center.equals(e.center)&&this.radius===e.radius}clone(){return new e(this.center,this.radius)}union(e){let t=this.center,n=this.radius,r=e.center,i=e.radius,a=K.copy(r).subtract(t),o=a.magnitude();if(n>=o+i)return this.clone();if(i>=o+n)return e.clone();let s=(n+o+i)*.5;return si.copy(a).scale((-n+s)/o).add(t),this.center.copy(si),this.radius=s,this}expand(e){let t=K.from(e).subtract(this.center).magnitude();return t>this.radius&&(this.radius=t),this}transform(e){this.center.transform(e);let t=d(K,e);return this.radius=Math.max(t[0],Math.max(t[1],t[2]))*this.radius,this}distanceSquaredTo(e){let t=this.distanceTo(e);return t*t}distanceTo(e){let t=K.from(e).subtract(this.center);return Math.max(0,t.len()-this.radius)}intersectPlane(e){let t=this.center,n=this.radius,r=e.normal.dot(t)+e.distance;return r<-n?G.OUTSIDE:r<n?G.INTERSECTING:G.INSIDE}},li=new k,ui=new k,di=new k,fi=new k,pi=new k,mi=new k,hi=new k,q={COLUMN0ROW0:0,COLUMN0ROW1:1,COLUMN0ROW2:2,COLUMN1ROW0:3,COLUMN1ROW1:4,COLUMN1ROW2:5,COLUMN2ROW0:6,COLUMN2ROW1:7,COLUMN2ROW2:8},gi=class e{constructor(e=[0,0,0],t=[0,0,0,0,0,0,0,0,0]){this.center=new k().from(e),this.halfAxes=new m(t)}get halfSize(){let e=this.halfAxes.getColumn(0),t=this.halfAxes.getColumn(1),n=this.halfAxes.getColumn(2);return[new k(e).len(),new k(t).len(),new k(n).len()]}get quaternion(){let e=this.halfAxes.getColumn(0),t=this.halfAxes.getColumn(1),n=this.halfAxes.getColumn(2),r=new k(e).normalize(),i=new k(t).normalize(),a=new k(n).normalize();return new f().fromMatrix3(new m([...r,...i,...a]))}fromCenterHalfSizeQuaternion(e,t,n){let r=new f(n),i=new m().fromQuaternion(r);return i[0]*=t[0],i[1]*=t[0],i[2]*=t[0],i[3]*=t[1],i[4]*=t[1],i[5]*=t[1],i[6]*=t[2],i[7]*=t[2],i[8]*=t[2],this.center=new k().from(e),this.halfAxes=i,this}clone(){return new e(this.center,this.halfAxes)}equals(e){return this===e||!!e&&this.center.equals(e.center)&&this.halfAxes.equals(e.halfAxes)}getBoundingSphere(e=new ci){let t=this.halfAxes,n=t.getColumn(0,di),r=t.getColumn(1,fi),i=t.getColumn(2,pi),a=li.copy(n).add(r).add(i);return e.center.copy(this.center),e.radius=a.magnitude(),e}intersectPlane(e){let t=this.center,n=e.normal,r=this.halfAxes,i=n.x,a=n.y,o=n.z,s=Math.abs(i*r[q.COLUMN0ROW0]+a*r[q.COLUMN0ROW1]+o*r[q.COLUMN0ROW2])+Math.abs(i*r[q.COLUMN1ROW0]+a*r[q.COLUMN1ROW1]+o*r[q.COLUMN1ROW2])+Math.abs(i*r[q.COLUMN2ROW0]+a*r[q.COLUMN2ROW1]+o*r[q.COLUMN2ROW2]),c=n.dot(t)+e.distance;return c<=-s?G.OUTSIDE:c>=s?G.INSIDE:G.INTERSECTING}distanceTo(e){return Math.sqrt(this.distanceSquaredTo(e))}distanceSquaredTo(e){let t=ui.from(e).subtract(this.center),n=this.halfAxes,r=n.getColumn(0,di),i=n.getColumn(1,fi),a=n.getColumn(2,pi),o=r.magnitude(),s=i.magnitude(),c=a.magnitude();r.normalize(),i.normalize(),a.normalize();let l=0,u;return u=Math.abs(t.dot(r))-o,u>0&&(l+=u*u),u=Math.abs(t.dot(i))-s,u>0&&(l+=u*u),u=Math.abs(t.dot(a))-c,u>0&&(l+=u*u),l}computePlaneDistances(e,t,n=[-0,-0]){let r=1/0,i=-1/0,a=this.center,o=this.halfAxes,s=o.getColumn(0,di),c=o.getColumn(1,fi),l=o.getColumn(2,pi),u=mi.copy(s).add(c).add(l).add(a),d=hi.copy(u).subtract(e),f=t.dot(d);return r=Math.min(f,r),i=Math.max(f,i),u.copy(a).add(s).add(c).subtract(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),u.copy(a).add(s).subtract(c).add(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),u.copy(a).add(s).subtract(c).subtract(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),a.copy(u).subtract(s).add(c).add(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),a.copy(u).subtract(s).add(c).subtract(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),a.copy(u).subtract(s).subtract(c).add(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),a.copy(u).subtract(s).subtract(c).subtract(l),d.copy(u).subtract(e),f=t.dot(d),r=Math.min(f,r),i=Math.max(f,i),n[0]=r,n[1]=i,n}transform(e){this.center.transformAsPoint(e);let t=this.halfAxes.getColumn(0,di);t.transformAsPoint(e);let n=this.halfAxes.getColumn(1,fi);n.transformAsPoint(e);let r=this.halfAxes.getColumn(2,pi);return r.transformAsPoint(e),this.halfAxes=new m([...t,...n,...r]),this}getTransform(){throw Error(`not implemented`)}},_i=new k,vi=new k,yi=class e{constructor(e=[0,0,1],t=0){this.normal=new k,this.distance=-0,this.fromNormalDistance(e,t)}fromNormalDistance(e,t){return S(Number.isFinite(t)),this.normal.from(e).normalize(),this.distance=t,this}fromPointNormal(e,t){e=_i.from(e),this.normal.from(t).normalize();let n=-this.normal.dot(e);return this.distance=n,this}fromCoefficients(e,t,n,r){return this.normal.set(e,t,n),S(o(this.normal.len(),1)),this.distance=r,this}clone(){return new e(this.normal,this.distance)}equals(e){return o(this.distance,e.distance)&&o(this.normal,e.normal)}getPointDistance(e){return this.normal.dot(e)+this.distance}transform(e){let t=vi.copy(this.normal).transformAsVector(e).normalize(),n=this.normal.scale(-this.distance).transform(e);return this.fromPointNormal(n,t)}projectPointOntoPlane(e,t=[0,0,0]){let n=_i.from(e),r=this.getPointDistance(n),i=vi.copy(this.normal).scale(r);return n.subtract(i).to(t)}},bi=[new k([1,0,0]),new k([0,1,0]),new k([0,0,1])],xi=new k,Si=new k,Ci=class e{constructor(e=[]){this.planes=e}fromBoundingSphere(e){this.planes.length=2*bi.length;let t=e.center,n=e.radius,r=0;for(let e of bi){let i=this.planes[r],a=this.planes[r+1];i||=this.planes[r]=new yi,a||=this.planes[r+1]=new yi;let o=xi.copy(e).scale(-n).add(t);i.fromPointNormal(o,e);let s=xi.copy(e).scale(n).add(t),c=Si.copy(e).negate();a.fromPointNormal(s,c),r+=2}return this}computeVisibility(e){let t=G.INSIDE;for(let n of this.planes)switch(e.intersectPlane(n)){case G.OUTSIDE:return G.OUTSIDE;case G.INTERSECTING:t=G.INTERSECTING}return t}computeVisibilityWithPlaneMask(t,n){if(S(Number.isFinite(n),`parentPlaneMask is required.`),n===e.MASK_OUTSIDE||n===e.MASK_INSIDE)return n;let r=e.MASK_INSIDE,i=this.planes;for(let a=0;a<this.planes.length;++a){let o=a<31?1<<a:0;if(a<31&&(n&o)===0)continue;let s=i[a],c=t.intersectPlane(s);if(c===G.OUTSIDE)return e.MASK_OUTSIDE;c===G.INTERSECTING&&(r|=o)}return r}};Ci.MASK_OUTSIDE=4294967295,Ci.MASK_INSIDE=0,Ci.MASK_INDETERMINATE=2147483647,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k,new k;var J=new m,wi=new m,Ti=new m,Ei=new m,Di=new m;function Oi(e,t={}){let n=De,r=0,i=0,a=wi,o=Ti;a.identity(),o.copy(e);let s=n*ki(o);for(;i<10&&Mi(o)>s;)Ni(o,Ei),Di.copy(Ei).transpose(),o.multiplyRight(Ei),o.multiplyLeft(Di),a.multiplyRight(Ei),++r>2&&(++i,r=0);return t.unitary=a.toTarget(t.unitary),t.diagonal=o.toTarget(t.diagonal),t}function ki(e){let t=0;for(let n=0;n<9;++n){let r=e[n];t+=r*r}return Math.sqrt(t)}var Ai=[1,0,0],ji=[2,2,1];function Mi(e){let t=0;for(let n=0;n<3;++n){let r=e[J.getElementIndex(ji[n],Ai[n])];t+=2*r*r}return Math.sqrt(t)}function Ni(e,t){let n=Ee,r=0,i=1;for(let t=0;t<3;++t){let n=Math.abs(e[J.getElementIndex(ji[t],Ai[t])]);n>r&&(i=t,r=n)}let a=Ai[i],o=ji[i],s=1,c=0;if(Math.abs(e[J.getElementIndex(o,a)])>n){let t=e[J.getElementIndex(o,o)],n=e[J.getElementIndex(a,a)],r=e[J.getElementIndex(o,a)],i=(t-n)/2/r,l;l=i<0?-1/(-i+Math.sqrt(1+i*i)):1/(i+Math.sqrt(1+i*i)),s=1/Math.sqrt(1+l*l),c=l*s}return m.IDENTITY.to(t),t[J.getElementIndex(a,a)]=t[J.getElementIndex(o,o)]=s,t[J.getElementIndex(o,a)]=c,t[J.getElementIndex(a,o)]=-c,t}var Y=new k,Pi=new k,Fi=new k,Ii=new k,Li=new k,Ri=new m,zi={diagonal:new m,unitary:new m};function Bi(e,t=new gi){if(!e||e.length===0)return t.halfAxes=new m([0,0,0,0,0,0,0,0,0]),t.center=new k,t;let n=e.length,r=new k(0,0,0);for(let t of e)r.add(t);let i=1/n;r.multiplyByScalar(i);let a=0,o=0,s=0,c=0,l=0,u=0;for(let t of e){let e=Y.copy(t).subtract(r);a+=e.x*e.x,o+=e.x*e.y,s+=e.x*e.z,c+=e.y*e.y,l+=e.y*e.z,u+=e.z*e.z}a*=i,o*=i,s*=i,c*=i,l*=i,u*=i;let d=Ri;d[0]=a,d[1]=o,d[2]=s,d[3]=o,d[4]=c,d[5]=l,d[6]=s,d[7]=l,d[8]=u;let{unitary:f}=Oi(d,zi),p=t.halfAxes.copy(f),h=p.getColumn(0,Fi),g=p.getColumn(1,Ii),_=p.getColumn(2,Li),v=-Number.MAX_VALUE,y=-Number.MAX_VALUE,b=-Number.MAX_VALUE,x=Number.MAX_VALUE,S=Number.MAX_VALUE,C=Number.MAX_VALUE;for(let t of e)Y.copy(t),v=Math.max(Y.dot(h),v),y=Math.max(Y.dot(g),y),b=Math.max(Y.dot(_),b),x=Math.min(Y.dot(h),x),S=Math.min(Y.dot(g),S),C=Math.min(Y.dot(_),C);h=h.multiplyByScalar(.5*(x+v)),g=g.multiplyByScalar(.5*(S+y)),_=_.multiplyByScalar(.5*(C+b)),t.center.copy(h).add(g).add(_);let w=Pi.set(v-x,y-S,b-C).multiplyByScalar(.5),T=new m([w[0],0,0,0,w[1],0,0,0,w[2]]);return t.halfAxes.multiplyRight(T),t}var X=512,Vi=3,Hi=[[.5,.5],[0,0],[0,1],[1,0],[1,1]],Ui=Hi.concat([[0,.5],[.5,0],[1,.5],[.5,1]]),Wi=Ui.concat([[.25,.5],[.75,.5]]),Gi=class e{constructor(e,t,n){this.x=e,this.y=t,this.z=n}get children(){if(!this._children){let t=this.x*2,n=this.y*2,r=this.z+1;this._children=[new e(t,n,r),new e(t,n+1,r),new e(t+1,n,r),new e(t+1,n+1,r)]}return this._children}update(e){let{viewport:t,cullingVolume:n,elevationBounds:r,minZ:i,maxZ:a,bounds:o,offset:s,project:c}=e,l=this.getBoundingVolume(r,s,c);if(o&&!this.insideBounds(o)||n.computeVisibility(l)<0||c&&this.beyondHorizon(t.cameraPosition,c,r[1]))return!1;if(!this.childVisible){let{z:e}=this;if(e<a&&e>=i){let n=l.distanceTo(t.cameraPosition)*t.scale/t.height;e+=Math.floor(Math.log2(n))}if(e>=a)return this.selected=!0,!0}this.selected=!1,this.childVisible=!0;for(let t of this.children)t.update(e);return!0}getSelected(e=[]){if(this.selected&&e.push(this),this._children)for(let t of this._children)t.getSelected(e);return e}beyondHorizon(e,t,n){let r=e[0],i=e[1],a=e[2],o=Math.sqrt(r*r+i*i+a*a),s=Math.atan2(r,-i)*180/Math.PI,c=Math.asin(a/o)*180/Math.PI,[l,u]=Q(this.x,this.y,this.z),[d,f]=Q(this.x+1,this.y+1,this.z),p=(l+d)/2,m=p+((s-p+540)%360-180),h=t([Math.max(l,Math.min(m,d)),Math.max(f,Math.min(c,u)),n]);return h[0]*r+h[1]*i+h[2]*a<=h[0]*h[0]+h[1]*h[1]+h[2]*h[2]}insideBounds([e,t,n,r]){let i=X/2**this.z;return this.x*i<n&&this.y*i<r&&(this.x+1)*i>e&&(this.y+1)*i>t}getBoundingVolume(e,t,n){if(n){let t=this.z<1?Wi:this.z<2?Ui:Hi,r=[];for(let i of t){let t=Q(this.x+i[0],this.y+i[1],this.z);t[2]=e[0],r.push(n(t)),e[0]!==e[1]&&(t[2]=e[1],r.push(n(t)))}return Bi(r)}let r=X/2**this.z,i=this.x*r+t*X,a=X-(this.y+1)*r;return new oi([i,a,e[0]],[i+r,a+r,e[1]])}};function Ki(e,t,n,r){let i=e instanceof A?e.projectPosition:null,a=new Ci(Object.values(e.getFrustumPlanes()).map(({normal:e,distance:t})=>new yi(e.clone().negate(),t))),o=e.distanceScales.unitsPerMeter[2],s=n&&n[0]*o||0,c=n&&n[1]*o||0,l=e instanceof u&&e.pitch<=60?t:0;if(r){let[e,t,n,i]=r,a=h([e,i]),o=h([n,t]);r=[a[0],X-a[1],o[0],X-o[1]]}let d=new Gi(0,0,0),f={viewport:e,project:i,cullingVolume:a,elevationBounds:[s,c],minZ:l,maxZ:t,bounds:r,offset:0};if(d.update(f),e instanceof u&&e.subViewports&&e.subViewports.length>1){for(f.offset=-1;d.update(f)&&!(--f.offset<-3););for(f.offset=1;d.update(f)&&!(++f.offset>Vi););}return d.getSelected()}var Z=512,qi=[-1/0,-1/0,1/0,1/0],Ji={type:`object`,value:null,validate:(e,t)=>t.optional&&e===null||typeof e==`string`||Array.isArray(e)&&e.every(e=>typeof e==`string`),equal:(e,t)=>{if(e===t)return!0;if(!Array.isArray(e)||!Array.isArray(t))return!1;let n=e.length;if(n!==t.length)return!1;for(let r=0;r<n;r++)if(e[r]!==t[r])return!1;return!0}};function Yi(e,t){let n=[t.transformAsPoint([e[0],e[1]]),t.transformAsPoint([e[2],e[1]]),t.transformAsPoint([e[0],e[3]]),t.transformAsPoint([e[2],e[3]])];return[Math.min(...n.map(e=>e[0])),Math.min(...n.map(e=>e[1])),Math.max(...n.map(e=>e[0])),Math.max(...n.map(e=>e[1]))]}function Xi(e){return Math.abs(e.split(``).reduce((e,t)=>(e<<5)-e+t.charCodeAt(0)|0,0))}function Zi(e,t){if(!e||!e.length)return null;let{index:n,id:r}=t;if(Array.isArray(e)){let t=Xi(r)%e.length;e=e[t]}let i=e;for(let e of Object.keys(n)){let t=RegExp(`{${e}}`,`g`);i=i.replace(t,String(n[e]))}return Number.isInteger(n.y)&&Number.isInteger(n.z)&&(i=i.replace(/\{-y\}/g,String(2**n.z-n.y-1))),i}function Qi(e,t,n){let r;if(t&&t.length===2){let[n,i]=t,a=e.getBounds({z:n}),o=e.getBounds({z:i});r=[Math.min(a[0],o[0]),Math.min(a[1],o[1]),Math.max(a[2],o[2]),Math.max(a[3],o[3])]}else r=e.getBounds();return e.isGeospatial?[Math.max(r[0],n[0]),Math.max(r[1],n[1]),Math.min(r[2],n[2]),Math.min(r[3],n[3])]:[Math.max(Math.min(r[0],n[2]),n[0]),Math.max(Math.min(r[1],n[3]),n[1]),Math.min(Math.max(r[2],n[0]),n[2]),Math.min(Math.max(r[3],n[1]),n[3])]}function $i({viewport:e,z:t,cullRect:n}){return(e.subViewports||[e]).map(e=>ea(e,t||0,n))}function ea(e,t,n){if(!Array.isArray(t)){let r=n.x-e.x,i=n.y-e.y,{width:a,height:o}=n,s={targetZ:t},c=e.unproject([r,i],s),l=e.unproject([r+a,i],s),u=e.unproject([r,i+o],s),d=e.unproject([r+a,i+o],s);return[Math.min(c[0],l[0],u[0],d[0]),Math.min(c[1],l[1],u[1],d[1]),Math.max(c[0],l[0],u[0],d[0]),Math.max(c[1],l[1],u[1],d[1])]}let r=ea(e,t[0],n),i=ea(e,t[1],n);return[Math.min(r[0],i[0]),Math.min(r[1],i[1]),Math.max(r[2],i[2]),Math.max(r[3],i[3])]}function ta(e,t,n){return n?Yi(e,n).map(e=>e*t/Z):e.map(e=>e*t/Z)}function na(e,t){return 2**e*Z/t}function Q(e,t,n){let r=na(n,Z),i=e/r*360-180,a=Math.PI-2*Math.PI*t/r;return[i,180/Math.PI*Math.atan(.5*(Math.exp(a)-Math.exp(-a)))]}function ra(e,t,n,r){let i=na(n,r);return[e/i*Z,t/i*Z]}function ia(e,t,n,r,i=Z){if(e.isGeospatial){let[e,i]=Q(t,n,r),[a,o]=Q(t+1,n+1,r);return{west:e,north:i,east:a,south:o}}let[a,o]=ra(t,n,r,i),[s,c]=ra(t+1,n+1,r,i);return{left:a,top:o,right:s,bottom:c}}function aa(e,t,n,r,i){let[a,o,s,c]=ta(Qi(e,null,r),na(t,n),i),l=[];for(let e=Math.floor(a);e<s;e++)for(let n=Math.floor(o);n<c;n++)l.push({x:e,y:n,z:t});return l}function oa({viewport:e,maxZoom:t,minZoom:n,zRange:r,extent:i,tileSize:a=Z,modelMatrix:o,modelMatrixInverse:s,zoomOffset:c=0,visibleMinZoom:l,visibleMaxZoom:u}){let d=e.isGeospatial?Math.round(e.zoom+Math.log2(Z/a)+c):Math.ceil(e.zoom+c);if(typeof n==`number`&&Number.isFinite(n)&&d<n){if(!i)return[];d=n}if(typeof t==`number`&&Number.isFinite(t)&&d>t&&(d=t),l!=null&&e.zoom<l||u!=null&&e.zoom>u)return[];let f=i;return o&&s&&i&&!e.isGeospatial&&(f=Yi(i,o)),e.isGeospatial?Ki(e,d,r,i):aa(e,d,a,f||qi,s)}function sa(e){let t={},n;return r=>{for(let i in r)if(!ca(r[i],t[i])){n=e(r),t=r;break}return n}}function ca(e,t){if(e===t)return!0;if(Array.isArray(e)){let n=e.length;if(!t||t.length!==n)return!1;for(let r=0;r<n;r++)if(e[r]!==t[r])return!1;return!0}return!1}var la=1,ua=2,da=`never`,fa=`no-overlap`,pa=`best-available`,ma=5,ha=0,ga=1e8,_a=1e8-1,va={[pa]:xa,[fa]:Sa,[da]:()=>{}},ya={extent:null,tileSize:512,maxZoom:null,minZoom:null,maxCacheSize:null,maxCacheByteSize:null,refinementStrategy:`best-available`,zRange:null,maxRequests:6,debounceTime:0,zoomOffset:0,visibleMinZoom:null,visibleMaxZoom:null,onTileLoad:()=>{},onTileUnload:()=>{},onTileError:()=>{}},ba=class{constructor(e){this._getCullBounds=sa($i),this.opts={...ya,...e},this.setOptions(this.opts),this.onTileLoad=e=>{this.opts.onTileLoad?.(e),this.opts.maxCacheByteSize!==null&&(this._cacheByteSize+=e.byteLength,this._resizeCache())},this._requestScheduler=new Te({throttleRequests:this.opts.maxRequests>0||this.opts.debounceTime>0,maxRequests:this.opts.maxRequests,debounceTime:this.opts.debounceTime}),this._cache=new Map,this._tiles=[],this._dirty=!1,this._cacheByteSize=0,this._viewport=null,this._zRange=null,this._selectedTiles=null,this._frameNumber=0,this._modelMatrix=new y,this._modelMatrixInverse=new y}get tiles(){return this._tiles}get selectedTiles(){return this._selectedTiles}get isLoaded(){return this._selectedTiles!==null&&this._selectedTiles.every(e=>e.isLoaded)}get needsReload(){return this._selectedTiles!==null&&this._selectedTiles.some(e=>e.needsReload)}setOptions(e){Object.assign(this.opts,e),Number.isFinite(e.maxZoom)&&(this._maxZoom=Math.floor(e.maxZoom)),Number.isFinite(e.minZoom)&&(this._minZoom=Math.ceil(e.minZoom)),this._viewport=null}finalize(){for(let e of this._cache.values())e.isLoading&&e.abort();this._cache.clear(),this._tiles=[],this._selectedTiles=null}reloadAll(){for(let e of this._cache.keys()){let t=this._cache.get(e);!this._selectedTiles||!this._selectedTiles.includes(t)?this._cache.delete(e):t.setNeedsReload()}}update(e,{zRange:t,modelMatrix:n}={zRange:null,modelMatrix:null}){let r=n?new y(n):new y,i=!r.equals(this._modelMatrix);if(!this._viewport||!e.equals(this._viewport)||!o(this._zRange,t)||i){i&&(this._modelMatrixInverse=r.clone().invert(),this._modelMatrix=r),this._viewport=e,this._zRange=t;let n=this.getTileIndices({viewport:e,maxZoom:this._maxZoom,minZoom:this._minZoom,zRange:t,modelMatrix:this._modelMatrix,modelMatrixInverse:this._modelMatrixInverse});this._selectedTiles=n.map(e=>this._getTile(e,!0)),this._dirty&&this._rebuildTree()}else this.needsReload&&(this._selectedTiles=this._selectedTiles.map(e=>this._getTile(e.index,!0)));let a=this.updateTileStates();return this._pruneRequests(),this._dirty&&this._resizeCache(),a&&this._frameNumber++,this._frameNumber}isTileVisible(e,t,n){if(!e.isVisible)return!1;if(t&&this._viewport){let r=this._getCullBounds({viewport:this._viewport,z:this._zRange,cullRect:t}),{bbox:i}=e;for(let[e,t,a,o]of r){let r;if(`west`in i)r=i.west<a&&i.east>e&&i.south<o&&i.north>t;else{if(n&&!y.IDENTITY.equals(n)){let[e,t,r,a]=Yi([i.left,i.top,i.right,i.bottom],n);i={left:e,top:t,right:r,bottom:a}}let s=Math.min(i.top,i.bottom),c=Math.max(i.top,i.bottom);r=i.left<a&&i.right>e&&s<o&&c>t}if(r)return!0}return!1}return!0}getTileIndices({viewport:e,maxZoom:t,minZoom:n,zRange:r,modelMatrix:i,modelMatrixInverse:a}){let{tileSize:o,extent:s,zoomOffset:c,visibleMinZoom:l,visibleMaxZoom:u}=this.opts;return oa({viewport:e,maxZoom:t,minZoom:n,zRange:r,tileSize:o,extent:s,modelMatrix:i,modelMatrixInverse:a,zoomOffset:c,visibleMinZoom:l,visibleMaxZoom:u})}getTileId(e){return`${e.x}-${e.y}-${e.z}`}getTileZoom(e){return e.z}getTileMetadata(e){let{tileSize:t}=this.opts;return{bbox:ia(this._viewport,e.x,e.y,e.z,t)}}getParentIndex(e){return{x:Math.floor(e.x/2),y:Math.floor(e.y/2),z:e.z-1}}updateTileStates(){let e=this.opts.refinementStrategy||`best-available`,t=Array(this._cache.size),n=0;for(let e of this._cache.values())t[n++]=e.isVisible,e.isSelected=!1,e.isVisible=!1;for(let e of this._selectedTiles)e.isSelected=!0,e.isVisible=!0;(typeof e==`function`?e:va[e])(Array.from(this._cache.values())),n=0;for(let e of this._cache.values())if(t[n++]!==e.isVisible)return!0;return!1}_getRequestPriority(e){if(!e.isSelected&&!e.isVisible)return-1;let t=this._getTileDistancePriority(e);return e.isSelected?ha+t:ga+t}_getTileDistancePriority(e){let{width:t,height:n}=this._viewport||{};if(!this._viewport||!t||!n)return 0;try{let r=this._getTileScreenCorners(e.bbox),i=[t/2,n/2];if(r.length===4){if(this._isPointInPolygon(i,r))return 0;let e=r.reduce((e,t,n)=>{let a=r[(n+1)%r.length];return Math.min(e,this._getPointToSegmentDistanceSquared(i,t,a))},2**53-1);return Math.min(e,_a)}}catch{}return _a}_getTileScreenCorners(e){return(`west`in e?[[e.west,e.south],[e.east,e.south],[e.east,e.north],[e.west,e.north]]:[[e.left,e.top],[e.right,e.top],[e.right,e.bottom],[e.left,e.bottom]]).map(e=>this._viewport.project(e)).filter(([e,t])=>Number.isFinite(e)&&Number.isFinite(t))}_isPointInPolygon(e,t){let n=!1,[r,i]=e;for(let e=0,a=t.length-1;e<t.length;a=e++){let[o,s]=t[e],[c,l]=t[a];s>i!=l>i&&r<(c-o)*(i-s)/(l-s)+o&&(n=!n)}return n}_getPointToSegmentDistanceSquared(e,t,n){let[r,i]=e,[a,o]=t,[s,c]=n,l=s-a,u=c-o,d=l*l+u*u,f=d?Math.max(0,Math.min(1,((r-a)*l+(i-o)*u)/d)):0,p=a+f*l,m=o+f*u,h=r-p,g=i-m;return h*h+g*g}_pruneRequests(){let{maxRequests:e=0}=this.opts,t=[],n=0;for(let e of this._cache.values())e.isLoading&&(n++,!e.isSelected&&!e.isVisible&&t.push(e));for(;e>0&&n>e&&t.length>0;)t.shift().abort(),n--}_rebuildTree(){let{_cache:e}=this;for(let t of e.values())t.parent=null,t.children&&(t.children.length=0);for(let t of e.values()){let e=this._getNearestAncestor(t);t.parent=e,e?.children&&e.children.push(t)}}_resizeCache(){let{_cache:e,opts:t}=this,n=t.maxCacheSize??(t.maxCacheByteSize===null?ma*this.selectedTiles.length:1/0),r=t.maxCacheByteSize??1/0;if(e.size>n||this._cacheByteSize>r){for(let[i,a]of e)if(!a.isVisible&&!a.isSelected&&(this._cacheByteSize-=t.maxCacheByteSize===null?0:a.byteLength,e.delete(i),this.opts.onTileUnload?.(a)),e.size<=n&&this._cacheByteSize<=r)break;this._rebuildTree(),this._dirty=!0}this._dirty&&=(this._tiles=Array.from(this._cache.values()).sort((e,t)=>e.zoom-t.zoom),!1)}_getTile(e,t){let n=this.getTileId(e),r=this._cache.get(n),i=!1;return!r&&t?(r=new ri(e),Object.assign(r,this.getTileMetadata(r.index)),Object.assign(r,{id:n,zoom:this.getTileZoom(r.index)}),i=!0,this._cache.set(n,r),this._dirty=!0):r&&r.needsReload&&(i=!0),r&&i&&r.loadData({getData:this.opts.getTileData,getRequestPriority:this._getRequestPriority.bind(this),requestScheduler:this._requestScheduler,onLoad:this.onTileLoad,onError:this.opts.onTileError}),r}_getNearestAncestor(e){let{_minZoom:t=0}=this,n=e.index;for(;this.getTileZoom(n)>t;){n=this.getParentIndex(n);let e=this._getTile(n);if(e)return e}return null}};function xa(e){for(let t of e)t.state=0;for(let t of e)t.isSelected&&!Ca(t)&&wa(t);for(let t of e)t.isVisible=!!(t.state&ua)}function Sa(e){for(let t of e)t.state=0;for(let t of e)t.isSelected&&Ca(t);let t=Array.from(e).sort((e,t)=>e.zoom-t.zoom);for(let e of t)if(e.isVisible=!!(e.state&ua),e.children&&(e.isVisible||e.state&la))for(let t of e.children)t.state=la;else e.isSelected&&wa(e)}function Ca(e){let t=e;for(;t;){if(t.isLoaded||t.content)return t.state|=ua,!0;t=t.parent}return!1}function wa(e){for(let t of e.children)t.isLoaded||t.content?t.state|=ua:wa(t)}var Ta={TilesetClass:ba,data:{type:`data`,value:[]},dataComparator:Ji.equal,renderSubLayers:{type:`function`,value:e=>new ni(e)},getTileData:{type:`function`,optional:!0,value:null},onViewportLoad:{type:`function`,optional:!0,value:null},onTileLoad:{type:`function`,value:e=>{}},onTileUnload:{type:`function`,value:e=>{}},onTileError:{type:`function`,value:e=>console.error(e)},extent:{type:`array`,optional:!0,value:null,compare:!0},tileSize:512,maxZoom:null,minZoom:0,maxCacheSize:null,maxCacheByteSize:null,refinementStrategy:pa,zRange:null,maxRequests:6,debounceTime:0,zoomOffset:0,visibleMinZoom:null,visibleMaxZoom:null},Ea=class extends I{initializeState(){this.state={tileset:null,isLoaded:!1}}finalizeState(){this.state?.tileset?.finalize()}get isLoaded(){return!!this.state?.tileset?.selectedTiles?.every(e=>e.isLoaded&&(!e.content||!e.layers||e.layers.every(e=>e.isLoaded)))}shouldUpdateState({changeFlags:e}){return e.somethingChanged}updateState({changeFlags:e}){let{tileset:t}=this.state,n=e.propsOrDataChanged||e.updateTriggersChanged,r=e.dataChanged||e.updateTriggersChanged&&(e.updateTriggersChanged.all||e.updateTriggersChanged.getTileData);t?n&&(t.setOptions(this._getTilesetOptions()),r?t.reloadAll():t.tiles.forEach(e=>{e.layers=null})):(t=new this.props.TilesetClass(this._getTilesetOptions()),this.setState({tileset:t})),this._updateTileset()}_getTilesetOptions(){let{tileSize:e,maxCacheSize:t,maxCacheByteSize:n,refinementStrategy:r,extent:i,maxZoom:a,minZoom:o,maxRequests:s,debounceTime:c,zoomOffset:l,visibleMinZoom:u,visibleMaxZoom:d}=this.props;return{maxCacheSize:t,maxCacheByteSize:n,maxZoom:a,minZoom:o,tileSize:e,refinementStrategy:r,extent:i,maxRequests:s,debounceTime:c,zoomOffset:l,visibleMinZoom:u,visibleMaxZoom:d,getTileData:this.getTileData.bind(this),onTileLoad:this._onTileLoad.bind(this),onTileError:this._onTileError.bind(this),onTileUnload:this._onTileUnload.bind(this)}}_updateTileset(){let e=this.state.tileset,{zRange:t,modelMatrix:n}=this.props,r=e.update(this.context.viewport,{zRange:t,modelMatrix:n}),{isLoaded:i}=e,a=this.state.isLoaded!==i,o=this.state.frameNumber!==r;i&&(a||o)&&this._onViewportLoad(),o&&this.setState({frameNumber:r}),this.state.isLoaded=i}_onViewportLoad(){let{tileset:e}=this.state,{onViewportLoad:t}=this.props;t&&t(e.selectedTiles)}_onTileLoad(e){this.props.onTileLoad(e),e.layers=null,this.setNeedsUpdate()}_onTileError(e,t){this.props.onTileError(e),t.layers=null,this.setNeedsUpdate()}_onTileUnload(e){this.props.onTileUnload(e)}getTileData(e){let{data:t,getTileData:n,fetch:r}=this.props,{signal:i}=e;return e.url=typeof t==`string`||Array.isArray(t)?Zi(t,e):null,n?n(e):r&&e.url?r(e.url,{propName:`data`,layer:this,signal:i}):null}renderSubLayers(e){return this.props.renderSubLayers(e)}getSubLayerPropsByTile(e){return null}getPickingInfo(e){let t=e.sourceLayer,n=t.props.tile,r=e.info;return r.picked&&(r.tile=n),r.sourceTile=n,r.sourceTileSubLayer=t,r}_updateAutoHighlight(e){e.sourceTileSubLayer.updateAutoHighlight(e)}renderLayers(){let{visibleMinZoom:e,visibleMaxZoom:t,minZoom:n,extent:r}=this.props,i=this.context.viewport.zoom;if(e!=null&&i<e||t!=null&&i>t||n!=null&&!r&&i<n){for(let e of this.state.tileset.tiles)e.layers=null;return[]}return this.state.tileset.tiles.map(e=>{let t=this.getSubLayerPropsByTile(e);if(e.isLoaded||e.content){if(e.layers)t&&e.layers[0]&&Object.keys(t).some(n=>e.layers[0].props[n]!==t[n])&&(e.layers=e.layers.map(e=>e.clone(t)));else{let n=this.renderSubLayers({...this.props,...this.getSubLayerProps({id:e.id,updateTriggers:this.props.updateTriggers}),data:e.content,_offset:0,tile:e});e.layers=C(n,Boolean).map(n=>n.clone({tile:e,...t}))}}return e.layers})}filterSubLayer({layer:e,cullRect:t}){let{tile:n}=e.props,{modelMatrix:r}=this.props;return this.state.tileset.isTileVisible(n,t,r?new y(r):null)}};Ea.defaultProps=Ta,Ea.layerName=`TileLayer`;var Da={dataType:null,batchType:null,name:`Terrain`,id:`terrain`,module:`terrain`,version:`4.4.5`,worker:!0,extensions:[`png`,`pngraw`,`jpg`,`jpeg`,`gif`,`webp`,`bmp`],mimeTypes:[`image/png`,`image/jpeg`,`image/gif`,`image/webp`,`image/bmp`],options:{terrain:{tesselator:`auto`,bounds:void 0,meshMaxError:10,elevationDecoder:{rScaler:1,gScaler:0,bScaler:0,offset:0},skirtHeight:void 0}}},Oa=[1],ka=1,Aa=1,ja=90,Ma=180,Na={...Ea.defaultProps,elevationData:Ji,texture:{...Ji,optional:!0},meshMaxError:{type:`number`,value:4},bounds:{type:`array`,value:null,optional:!0,compare:!0},color:{type:`color`,value:[255,255,255]},elevationDecoder:{type:`object`,value:{rScaler:1,gScaler:0,bScaler:0,offset:0}},workerUrl:``,wireframe:!1,material:!0,loaders:[Da]};function Pa(e){return Array.isArray(e)?e.join(`;`):e||``}function Fa(e,t,n){let r=(e[2]-e[0])/t*ka,i=(e[3]-e[1])/t*ka,a=[e[0]-r,e[1]-i,e[2]+r,e[3]+i];return n?[Math.max(a[0],-180),Math.max(a[1],-90),Math.min(a[2],Ma),Math.min(a[3],ja)]:a}function Ia(e){return!Number.isFinite(e)||e<=0?Aa:Math.max(e,Aa)}var La=class extends I{updateState({props:e,oldProps:t}){let n=e.elevationData!==t.elevationData;if(n){let{elevationData:t}=e,n=t&&(Array.isArray(t)||Ra(t));this.setState({isTiled:n})}let r=n||e.meshMaxError!==t.meshMaxError||e.elevationDecoder!==t.elevationDecoder||e.bounds!==t.bounds;if(!this.state.isTiled&&r){let t=this.loadTerrain(e);this.setState({terrain:t})}e.workerUrl&&w.removed(`workerUrl`,`loadOptions.terrain.workerUrl`)()}loadTerrain({elevationData:e,bounds:t,elevationDecoder:n,meshMaxError:r,signal:i}){if(!e)return null;let a=Ia(r),o=this.getLoadOptions();o={...o,terrain:{skirtHeight:this.state.isTiled?a*2:0,...o?.terrain,bounds:t,meshMaxError:a,elevationDecoder:n}};let{fetch:s}=this.props;return s(e,{propName:`elevationData`,layer:this,loadOptions:o,signal:i})}getTiledTerrainData(e){let{elevationData:t,fetch:n,texture:r,elevationDecoder:i,meshMaxError:a}=this.props,{viewport:o}=this.context,s=Zi(t,e),c=r&&Zi(r,e),{signal:l}=e,u=[0,0],d=[0,0];if(o.isGeospatial){let t=e.bbox;u=o.projectFlat([t.west,t.south]),d=o.projectFlat([t.east,t.north])}else{let t=e.bbox;u=[t.left,t.bottom],d=[t.right,t.top]}let f=Fa([u[0],u[1],d[0],d[1]],this.props.tileSize,o instanceof A),p=this.loadTerrain({elevationData:s,bounds:f,elevationDecoder:i,meshMaxError:a,signal:l}),m=c?n(c,{propName:`texture`,layer:this,loaders:[],signal:l}).catch(e=>null):Promise.resolve(null);return Promise.all([p,m])}renderSubLayers(e){let t=this.getSubLayerClass(`mesh`,ve),{color:n,wireframe:r,material:i}=this.props,{data:a}=e;if(!a)return null;let[o,s]=a,{viewport:c}=this.context,l=c instanceof A,u=o?.header?.boundingBox,d=u&&u.every(([e,t])=>e>=-180&&e<=Ma&&t>=-90&&t<=ja);return new t(e,{data:Oa,mesh:o,texture:s,_instanced:!1,coordinateSystem:l&&d?ce.LNGLAT:ce.CARTESIAN,getPosition:e=>[0,0,0],getColor:n,wireframe:r,material:i})}onViewportLoad(e){if(!e)return;let{zRange:t}=this.state,n=e.map(e=>e.content).filter(Boolean).map(e=>e[0].header.boundingBox.map(e=>e[2]));if(n.length===0)return;let r=Math.min(...n.map(e=>e[0])),i=Math.max(...n.map(e=>e[1]));(!t||r<t[0]||i>t[1])&&this.setState({zRange:[r,i]})}renderLayers(){let{color:e,material:t,elevationData:n,texture:r,wireframe:i,meshMaxError:a,elevationDecoder:o,tileSize:s,maxZoom:c,minZoom:l,extent:u,maxRequests:d,onTileLoad:f,onTileUnload:p,onTileError:m,maxCacheSize:h,maxCacheByteSize:g,refinementStrategy:_,zoomOffset:v}=this.props;return this.state.isTiled?new Ea(this.getSubLayerProps({id:`tiles`}),{getTileData:this.getTiledTerrainData.bind(this),renderSubLayers:this.renderSubLayers.bind(this),updateTriggers:{getTileData:{elevationData:Pa(n),texture:Pa(r),meshMaxError:a,elevationDecoder:o,projectionMode:this.context.viewport.projectionMode,zoomOffset:v}},onViewportLoad:this.onViewportLoad.bind(this),zRange:this.state.zRange||null,tileSize:s,maxZoom:c,minZoom:l,extent:u,maxRequests:d,onTileLoad:f,onTileUnload:p,onTileError:m,maxCacheSize:h,maxCacheByteSize:g,refinementStrategy:_,zoomOffset:v}):n?new(this.getSubLayerClass(`mesh`,ve))(this.getSubLayerProps({id:`mesh`}),{data:Oa,mesh:this.state.terrain,texture:r,_instanced:!1,getPosition:e=>[0,0,0],getColor:e,material:t,wireframe:i}):null}};La.defaultProps=Na,La.layerName=`TerrainLayer`;var Ra=e=>e.includes(`{x}`)&&(e.includes(`{y}`)||e.includes(`{-y}`)),za=new u({width:1,height:1,longitude:0,latitude:0,zoom:0});function Ba(e){let[t,n]=za.projectPosition(e);return[t,n]}function Va(e){return e.isGeospatial?za:e}function Ha(e,t){let n=[1/0,1/0,-1/0,-1/0];for(let r of e){let e=r.getBounds();if(e){let i=r.projectPosition(e[0],{viewport:t,autoOffset:!1}),a=r.projectPosition(e[1],{viewport:t,autoOffset:!1});n[0]=Math.min(n[0],i[0]),n[1]=Math.min(n[1],i[1]),n[2]=Math.max(n[2],a[0]),n[3]=Math.max(n[3],a[1])}}return Number.isFinite(n[0])?n:null}var Ua=2048;function Wa(e){let{bounds:t,viewport:n,border:r=0}=e,{isGeospatial:i}=n;if(t[2]<=t[0]||t[3]<=t[1])return null;let a=i?za.unprojectPosition([(t[0]+t[2])/2,(t[1]+t[3])/2,0]):n.unprojectPosition([(t[0]+t[2])/2,(t[1]+t[3])/2,0]),{width:o,height:s,zoom:c}=e;if(c===void 0){o-=r*2,s-=r*2;let e=Math.min(o/(t[2]-t[0]),s/(t[3]-t[1]));c=Math.min(Math.log2(e),20)}else if(!o||!s){let e=2**c;o=Math.round(Math.abs(t[2]-t[0])*e),s=Math.round(Math.abs(t[3]-t[1])*e);let n=Ua-r*2;if(o>n||s>n){let e=n/Math.max(o,s);o=Math.round(o*e),s=Math.round(s*e),c+=Math.log2(e)}}return i?new u({id:n.id,x:r,y:r,width:o,height:s,longitude:a[0],latitude:a[1],zoom:c,orthographic:!0}):new Me({id:n.id,x:r,y:r,width:o,height:s,target:a,zoom:c,flipY:!1})}function Ga(e,t){let n;if(t&&t.length===2){let[r,i]=t,a=e.getBounds({z:r}),o=e.getBounds({z:i});n=[Math.min(a[0],o[0]),Math.min(a[1],o[1]),Math.max(a[2],o[2]),Math.max(a[3],o[3])]}else n=e.getBounds();let r=e.projectPosition(n.slice(0,2)),i=e.projectPosition(n.slice(2,4));return[r[0],r[1],i[0],i[1]]}function Ka(e,t,n){if(!e)return[0,0,1,1];let r=qa(Ga(t,n));return e[2]-e[0]<=r[2]-r[0]&&e[3]-e[1]<=r[3]-r[1]?e:[Math.max(e[0],r[0]),Math.max(e[1],r[1]),Math.min(e[2],r[2]),Math.min(e[3],r[3])]}function qa(e){let t=e[2]-e[0],n=e[3]-e[1],r=(e[0]+e[2])/2,i=(e[1]+e[3])/2;return[r-t,i-n,r+t,i+n]}var $={NONE:0,WRITE_HEIGHT_MAP:1,USE_HEIGHT_MAP:2,USE_COVER:3,USE_COVER_ONLY:4,SKIP:5},Ja=Object.keys($).map(e=>`const float TERRAIN_MODE_${e} = ${$[e]}.0;`).join(`
`)+`
layout(std140) uniform terrainUniforms {
  float mode;
  vec4 bounds;
} terrain;

uniform sampler2D terrain_map;
`,Ya={name:`terrain`,dependencies:[p],vs:`${Ja}
out vec3 commonPos;
// In globe mode, absolute Mercator position for terrain FBO UV lookups
out vec2 terrainMercPos;
out float terrainHeight;

vec2 terrain_globe_to_mercator(vec3 globePosition) {
  float D = length(globePosition);
  float sinLat = clamp(globePosition.z / D, -0.999998, 0.999998);
  float x = atan(globePosition.x, -globePosition.y);
  float y = atanh(sinLat);
  return (vec2(x, y) + PI) * WORLD_SCALE;
}
`,fs:`${Ja}in vec2 terrainMercPos;\nin float terrainHeight;`,inject:{"vs:#main-start":`
if (terrain.mode == TERRAIN_MODE_SKIP) {
  gl_Position = vec4(0.0);
  return;
}
`,"vs:DECKGL_FILTER_GL_POSITION":`
commonPos = geometry.position.xyz;
terrainHeight = commonPos.z + project.commonOrigin.z;
if (project.projectionMode == PROJECTION_MODE_GLOBE) {
  terrainMercPos = terrain_globe_to_mercator(commonPos);
  terrainHeight = length(commonPos) - GLOBE_RADIUS;
} else {
  terrainMercPos = commonPos.xy;
}
if (terrain.mode == TERRAIN_MODE_WRITE_HEIGHT_MAP) {
  vec2 texCoords = (terrainMercPos - terrain.bounds.xy) / terrain.bounds.zw;
  position = vec4(texCoords * 2.0 - 1.0, 0.0, 1.0);
}
if (terrain.mode == TERRAIN_MODE_USE_HEIGHT_MAP) {
  vec3 anchor = geometry.worldPosition;
  anchor.z = 0.0;
  vec3 anchorCommon = project_position(anchor);
  vec2 anchorMercPos = project.projectionMode == PROJECTION_MODE_GLOBE
    ? terrain_globe_to_mercator(anchorCommon)
    : anchorCommon.xy;
  vec2 texCoords = (anchorMercPos - terrain.bounds.xy) / terrain.bounds.zw;
  if (texCoords.x >= 0.0 && texCoords.y >= 0.0 && texCoords.x <= 1.0 && texCoords.y <= 1.0) {
    float terrainZ = texture(terrain_map, texCoords).r;
    if (project.projectionMode == PROJECTION_MODE_GLOBE) {
      // Height map is written in Mercator common space (units = TILE_SIZE / EARTH_CIRCUMFERENCE / cos(lat))
      // Convert to globe radial units (units = GLOBE_RADIUS / EARTH_RADIUS)
      terrainZ *= cos(radians(geometry.worldPosition.y)) * PI;
      geometry.position.xyz += normalize(geometry.position.xyz) * terrainZ;
    } else {
      geometry.position.z += terrainZ;
    }
    position = project_common_position_to_clipspace(geometry.position);
  }
}
    `,"fs:#main-start":`
if (terrain.mode == TERRAIN_MODE_WRITE_HEIGHT_MAP) {
  fragColor = vec4(terrainHeight, 0.0, 0.0, 1.0);
  return;
}
    `,"fs:DECKGL_FILTER_COLOR":`
if ((terrain.mode == TERRAIN_MODE_USE_COVER) || (terrain.mode == TERRAIN_MODE_USE_COVER_ONLY)) {
  vec2 texCoords = (terrainMercPos - terrain.bounds.xy) / terrain.bounds.zw;
  vec4 pixel = texture(terrain_map, texCoords);
  if (terrain.mode == TERRAIN_MODE_USE_COVER_ONLY) {
    color = pixel;
  } else {
    // pixel is premultiplied
    color = pixel + color * (1.0 - pixel.a);
  }
  return;
}
    `},getUniforms:(e={})=>{if(!e.dummyHeightMap)return{};if(`terrainSkipRender`in e||`drawToTerrainHeightMap`in e){let{drawToTerrainHeightMap:t,heightMap:n,heightMapBounds:r,dummyHeightMap:i,terrainCover:a,useTerrainHeightMap:o,terrainSkipRender:s}=e,{commonOrigin:c}=p.getUniforms(e.project),l=s?$.SKIP:$.NONE,u=i,d=null;if(t)l=$.WRITE_HEIGHT_MAP,d=r;else if(o&&n)l=$.USE_HEIGHT_MAP,u=n,d=r;else if(a){let t=(e.isPicking?a.getPickingFramebuffer():a.getRenderFramebuffer())?.colorAttachments[0].texture;e.isPicking&&(l=$.SKIP),t?(u=t,l=l===$.SKIP?$.USE_COVER_ONLY:$.USE_COVER,d=a.bounds):e.isPicking&&!s&&(l=$.NONE)}return{mode:l,terrain_map:u,bounds:d?[d[0]-c[0],d[1]-c[1],d[2]-d[0],d[3]-d[1]]:[0,0,0,0]}}return{mode:$.NONE,terrain_map:e.dummyHeightMap,bounds:[0,0,0,0]}},uniformTypes:{mode:`f32`,bounds:`vec4<f32>`}};function Xa(e,t){return e.createFramebuffer({id:t.id,colorAttachments:[e.createTexture({id:t.id,...t.float&&{format:`rgba32float`,type:5126},dimension:`2d`,width:1,height:1,sampler:t.interpolate===!1?{minFilter:`nearest`,magFilter:`nearest`}:{minFilter:`linear`,magFilter:`linear`}})]})}var Za=class{constructor(e){this.isDirty=!0,this.renderViewport=null,this.bounds=null,this.layers=[],this.targetBounds=null,this.targetBoundsCommon=null,this.targetLayer=e,this.tile=$a(e)}get id(){return this.targetLayer.id}get isActive(){return!!this.targetLayer.getCurrentLayer()}shouldUpdate({targetLayer:e,viewport:t,layers:n,layerNeedsRedraw:r}){e&&(this.targetLayer=e);let i=t?this._updateViewport(t):!1,a=n?this._updateLayers(n):!1;if(r){for(let e of this.layers)if(r[e]){a=!0;break}}return a||i}_updateLayers(e){let t=!1;if(e=this.tile?Qa(this.tile,e):e,e.length!==this.layers.length)t=!0;else for(let n=0;n<e.length;n++)if(e[n].id!==this.layers[n]){t=!0;break}return t&&(this.layers=e.map(e=>e.id)),t}_updateViewport(e){let t=this.targetLayer,n=!1;if(this.tile&&`boundingBox`in this.tile){if(!this.targetBounds){n=!0,this.targetBounds=this.tile.boundingBox;let e=Ba(this.targetBounds[0]),t=Ba(this.targetBounds[1]);this.targetBoundsCommon=[e[0],e[1],t[0],t[1]]}}else this.targetBounds!==t.getBounds()&&(n=!0,this.targetBounds=t.getBounds(),this.targetBoundsCommon=Ha([t],Va(e)));if(!this.targetBoundsCommon)return!1;let r=Math.ceil(e.zoom+.5);if(this.tile)this.bounds=this.targetBoundsCommon;else{let t=this.renderViewport?.zoom;n||=r!==t;let i=e instanceof A?this.targetBoundsCommon:Ka(this.targetBoundsCommon,e),a=this.bounds;n=n||!a||i.some((e,t)=>e!==a[t]),this.bounds=i}return n&&(this.renderViewport=Wa({bounds:this.bounds,zoom:r,viewport:e})),n}getRenderFramebuffer(){return!this.renderViewport||this.layers.length===0?null:(this.fbo||=Xa(this.targetLayer.context.device,{id:this.id}),this.fbo)}getPickingFramebuffer(){return!this.renderViewport||this.layers.length===0&&!this.targetLayer.props.pickable?null:(this.pickingFbo||=Xa(this.targetLayer.context.device,{id:`${this.id}-picking`,interpolate:!1}),this.pickingFbo)}filterLayers(e){return e.filter(({id:e})=>this.layers.includes(e))}delete(){let{fbo:e,pickingFbo:t}=this;e&&(e.colorAttachments[0].destroy(),e.destroy()),t&&(t.colorAttachments[0].destroy(),t.destroy())}};function Qa(e,t){return t.filter(t=>{let n=$a(t);return!n||eo(e.boundingBox,n.boundingBox)})}function $a(e){for(;e;){let{tile:t}=e.props;if(t)return t;e=e.parent}return null}function eo(e,t){return e&&t?e[0][0]<t[1][0]&&t[0][0]<e[1][0]&&e[0][1]<t[1][1]&&t[0][1]<e[1][1]:!1}var to={blendColorOperation:`max`,blendColorSrcFactor:`one`,blendColorDstFactor:`one`,blendAlphaOperation:`max`,blendAlphaSrcFactor:`one`,blendAlphaDstFactor:`one`},no=class extends ne{getRenderableLayers(e,t){let{layers:n}=t,r=[],i=this._getDrawLayerParams(e,t,!0);for(let e=0;e<n.length;e++){let t=n[e];!t.isComposite&&i[e].shouldDrawLayer&&r.push(t)}return r}renderHeightMap(e,t){let n=e.getRenderFramebuffer(),r=e.renderViewport;n&&r&&(n.resize(r),this.render({...t,target:n,pass:`terrain-height-map`,layers:t.layers,viewports:[r],effects:[],clearColor:[0,0,0,0]}))}renderTerrainCover(e,t){let n=e.getRenderFramebuffer(),r=e.renderViewport;if(!n||!r)return;let i=e.filterLayers(t.layers);n.resize(r),this.render({...t,target:n,pass:`terrain-cover-${e.id}`,layers:i,viewports:[r],clearColor:[0,0,0,0]})}getLayerParameters(e,t,n){return{...e.props.parameters,blend:!0,depthCompare:`always`,...e.props.operation.includes(`terrain`)&&to}}getShaderModuleProps(e,t,n){return{terrain:{project:n.project}}}},ro=class extends v{constructor(){super(...arguments),this.drawParameters={}}getRenderableLayers(e,t){let{layers:n}=t,r=[];this.drawParameters={},this._resetColorEncoder(t.pickZ);let i=this._getDrawLayerParams(e,t);for(let e=0;e<n.length;e++){let t=n[e];!t.isComposite&&i[e].shouldDrawLayer&&(r.push(t),this.drawParameters[t.id]=i[e].layerParameters)}return r}renderTerrainCover(e,t){let n=e.getPickingFramebuffer(),r=e.renderViewport;if(!n||!r)return;let i=e.filterLayers(t.layers),a=e.targetLayer;a.props.pickable&&i.unshift(a),n.resize(r);let o=this.drawParameters[a.id]?.blendColor?.[3]??0;this.render({...t,pickingFBO:n,pass:`terrain-cover-picking-${e.id}`,layers:i,viewports:[r],cullRect:void 0,deviceRect:r,pickZ:!1,clearColor:[0,0,0,o]})}getLayerParameters(e,t,n){let r;return this.drawParameters[e.id]?r=this.drawParameters[e.id]:(r=super.getLayerParameters(e,t,n),r.blend=!0),{...r,depthCompare:`always`,blendAlphaSrcFactor:`constant`}}getShaderModuleProps(e,t,n){return{...super.getShaderModuleProps(e,t,n),terrain:{project:n.project}}}},io=2048,ao=class{static isSupported(e){return e.isTextureFormatRenderable(`rgba32float`)}constructor(e){this.renderViewport=null,this.bounds=null,this.layers=[],this.layersBounds=[],this.layersBoundsCommon=null,this.lastViewport=null,this.device=e}getRenderFramebuffer(){return this.renderViewport?(this.fbo||=Xa(this.device,{id:`height-map`,float:!0}),this.fbo):null}shouldUpdate({layers:e,viewport:t}){let n=e.length!==this.layers.length||e.some((e,t)=>e!==this.layers[t]||e.props.transitions||e.getBounds()!==this.layersBounds[t]);n&&(this.layers=e,this.layersBounds=e.map(e=>e.getBounds()),this.layersBoundsCommon=Ha(e,Va(t)));let r=!this.lastViewport||!t.equals(this.lastViewport);if(!this.layersBoundsCommon)this.renderViewport=null;else if(n||r){let e=t instanceof A?this.layersBoundsCommon:Ka(this.layersBoundsCommon,t);if(e[2]<=e[0]||e[3]<=e[1])return this.renderViewport=null,!1;this.bounds=e,this.lastViewport=t;let n=t.scale,r=(e[2]-e[0])*n,i=(e[3]-e[1])*n,a=t.isGeospatial?Ba([t.longitude??0,t.latitude??0]):[t.center[0],t.center[1]];return this.renderViewport=r>0||i>0?Wa({bounds:[a[0]-1,a[1]-1,a[0]+1,a[1]+1],zoom:t.zoom,width:Math.min(r,io),height:Math.min(i,io),viewport:t}):null,!0}return!1}delete(){this.fbo&&(this.fbo.colorAttachments[0].delete(),this.fbo.delete())}},oo=class{constructor(){this.id=`terrain-effect`,this.props=null,this.useInPicking=!0,this.isPicking=!1,this.isDrapingEnabled=!1,this.terrainCovers=new Map}setup({device:e,deck:t}){this.dummyHeightMap=e.createTexture({width:1,height:1,data:new Uint8Array([0,0,0,0])}),this.terrainPass=new no(e,{id:`terrain`}),this.terrainPickingPass=new ro(e,{id:`terrain-picking`}),ao.isSupported(e)?this.heightMap=new ao(e):w.warn(`Terrain offset mode is not supported by this browser`)(),t._addDefaultShaderModule(Ya)}preRender(e){if(e.pickZ){this.isDrapingEnabled=!1;return}let{viewports:t}=e,n=e.pass.startsWith(`picking`);this.isPicking=n,this.isDrapingEnabled=!0;let r=t[0],i=(n?this.terrainPickingPass:this.terrainPass).getRenderableLayers(r,e),a=i.filter(e=>e.props.operation.includes(`terrain`));if(a.length===0)return;n||i.filter(e=>e.state.terrainDrawMode===`offset`).length>0&&this._updateHeightMap(a,r,e);let o=i.filter(e=>e.state.terrainDrawMode===`drape`),s=e.effects?.filter(e=>e!==this);this._updateTerrainCovers(a,o,r,{...e,effects:s})}getShaderModuleProps(e,t){if(e.props.operation.includes(`mask`))return{terrain:{dummyHeightMap:this.dummyHeightMap}};let{terrainDrawMode:n}=e.state,r=this.isDrapingEnabled?this.terrainCovers.get(e.id)??null:null;return this.isPicking&&e.props.operation.includes(`terrain`)&&(e.state._hasPickingCover=!!r?.getPickingFramebuffer()),{terrain:{project:t.project,isPicking:this.isPicking,heightMap:this.heightMap?.getRenderFramebuffer()?.colorAttachments[0].texture||null,heightMapBounds:this.heightMap?.bounds,dummyHeightMap:this.dummyHeightMap,terrainCover:r,useTerrainHeightMap:n===`offset`,terrainSkipRender:n===`drape`||!e.props.operation.includes(`draw`)}}}cleanup({deck:e}){this.dummyHeightMap&&=(this.dummyHeightMap.delete(),void 0),this.heightMap&&=(this.heightMap.delete(),void 0);for(let e of this.terrainCovers.values())e.delete();this.terrainCovers.clear(),e._removeDefaultShaderModule(Ya)}_updateHeightMap(e,t,n){this.heightMap&&this.heightMap.shouldUpdate({layers:e,viewport:t})&&this.terrainPass.renderHeightMap(this.heightMap,{...n,layers:e,shaderModuleProps:{terrain:{heightMapBounds:this.heightMap.bounds,dummyHeightMap:this.dummyHeightMap,drawToTerrainHeightMap:!0},project:{devicePixelRatio:1}}})}_updateTerrainCovers(e,t,n,r){let i={};for(let e of t)e.state.terrainCoverNeedsRedraw&&(i[e.id]=!0,e.state.terrainCoverNeedsRedraw=!1);for(let e of this.terrainCovers.values())e.isDirty=e.isDirty||e.shouldUpdate({layerNeedsRedraw:i});for(let i of e)this._updateTerrainCover(i,t,n,r);this.isPicking||this._pruneTerrainCovers()}_updateTerrainCover(e,t,n,r){let i=this.isPicking?this.terrainPickingPass:this.terrainPass,a=this.terrainCovers.get(e.id);a||(a=new Za(e),this.terrainCovers.set(e.id,a));try{let o=a.shouldUpdate({targetLayer:e,viewport:n,layers:t});(this.isPicking||a.isDirty||o)&&(i.renderTerrainCover(a,{...r,layers:t,shaderModuleProps:{terrain:{dummyHeightMap:this.dummyHeightMap,terrainSkipRender:!1},project:{devicePixelRatio:1}}}),this.isPicking||(a.isDirty=!1))}catch(t){e.raiseError(t,`Error rendering terrain cover ${a.id}`)}}_pruneTerrainCovers(){let e=[];for(let[t,n]of this.terrainCovers)n.isActive||e.push(t);for(let t of e)this.terrainCovers.delete(t)}},so={terrainDrawMode:void 0},co=class extends Ne{getShaders(){return{modules:[Ya]}}initializeState(){this.context.deck?._addDefaultEffect(new oo)}updateState(e){let{props:t,oldProps:n}=e;if(this.state.terrainDrawMode&&t.terrainDrawMode===n.terrainDrawMode&&t.extruded===n.extruded)return;let{terrainDrawMode:r}=t;if(!r){let e=this.props.extruded,t=this.getAttributeManager()?.attributes,n=t&&`instancePositions`in t;r=e||n?`offset`:`drape`}this.setState({terrainDrawMode:r})}onNeedsRedraw(){let e=this.state;e.terrainDrawMode===`drape`&&(e.terrainCoverNeedsRedraw=!0)}};co.defaultProps=so,co.extensionName=`TerrainExtension`,i()&&(async()=>{let e=await r(),t,i=`drape`,o,s=``,c=``,l=[0,0,0,0],u,d=()=>(u=new La({id:`terrain`,elevationData:s,texture:c,bounds:l,elevationDecoder:{rScaler:6553.6,gScaler:25.6,bScaler:.1,offset:-1e4},meshMaxError:2,operation:`terrain+draw`,material:!1}),[u,new ve({id:`blocks`,data:[0],mesh:o,coordinateSystem:re,coordinateOrigin:D(e),getPosition:()=>[0,0,0],getColor:[217,83,79],extensions:[new co],terrainDrawMode:i})]),f=a({num:`05`,title:`Fix A1 — deck.gl owns the terrain`,expect:e.dataset===`real`?`MapLibre is flat underneath; the Skansen Kronan hill is a deck.gl TerrainLayer built from the real DEM. In "drape" the buildings are painted flat onto the surface and lose their height. In "offset" each vertex is lifted by the ground height and they stand up again — but the ground under a building here spans only 0.7 m (median), so almost none of them visibly tilt.`:`MapLibre is flat underneath; the hill is a deck.gl TerrainLayer. In "drape" the blocks are painted onto the surface and lose their height. In "offset" each vertex is lifted by the ground height, so a wide block tilts with the slope.`,claim:`deck.gl will drape onto any layer we mark as terrain — it picks the target by a property, not by a fixed class. Cost: MapLibre drops to a flat background map, the feature is experimental, and draping discards height.`,decision:`A1 works, and its price is on screen: MapLibre drops to a flat background map, TerrainExtension is exported as experimental, and drape mode discards height. Choose A1 only if live terrain interaction is worth giving up the real basemap.`,findings:[`This is the only page fed the DEM at full resolution — 1024×1024 over 500 m, 0.49 m/px — where MapLibre gets 256 px tiles resampled through scene.elevation. That shows. The real DTCC raster is not a smooth ridge: 3.76% of its pixels are steeper than 45°, 4,725 are steeper than 70°, and the steepest is 86.6°, because it carries retaining walls, cut faces and building-shaped steps. At meshMaxError 2 the Delatin mesh resolves those into a fringe of white shards along the east flank. That is the data and the tolerance, not a bug, and it is left untuned deliberately — retuning it for the real tile would be tuning a parameter to make the picture nicer.`,`The page promised 'a wide block tilts with the slope' in offset mode. Measured on the real tile the ground under one building group spans 0.70 m median (1.41 m mean, 9.48 m max), which is a tilt of 1.5° median and above 5° for only 9 of the 103 groups. The lift is real and correct; the tilt is invisible.`,`Defect we found and fixed (Task 8): this page drew the real terrain in a different frame from everything else on it. TerrainLayer was handed the projected corners of the EPSG:3006 box, but SWEREF99 TM grid north is 2.57° off true north here, so those two corners bound a 475.90 × 521.69 m rectangle rather than 500 × 500 — up to 12 m of displacement against the buildings beside it. Fixed to use the same anchor mapping every other layer uses. Worth knowing: it did not look broken before the fix.`],dataset:n(e),controls:[{kind:`select`,id:`mode`,label:`terrainDrawMode`,options:[`drape`,`offset`],value:`drape`,onChange:e=>{i=e,t.setProps({layers:d()}),f.probe(`terrainDrawMode now: ${i}`)}}]}),p=te(f.canvasHost,e);p.on(`load`,async()=>{let[n,r]=await Promise.all([e.elevationImage(),ie(e.files.blocks)]);s=n.dem,c=n.map,l=n.bounds,o=r,t=T(p,d()),f.probe(`terrain-effect.ts:74  layers.filter(l => l.props.operation.includes('terrain'))  — target chosen by property, so DTCC's terrain_surface_mesh qualifies.`),f.probe(`TerrainExtension is exported from @deck.gl/extensions as experimental.`),f.probe(`terrainDrawMode in use: ${i}  (auto-select rule, terrain-extension.ts: is3d || hasAnchor ? 'offset' : 'drape')`);let a=!1;t.setProps({onAfterRender:()=>{!a&&u.isLoaded&&(a=!0,f.ready())}})})})();