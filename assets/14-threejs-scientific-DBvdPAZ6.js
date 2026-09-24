import{t as e}from"./dataset-5whEyHbd.js";import{r as t,t as n}from"./chrome-BDM6kZSm.js";import{A as r,At as i,Dt as a,Et as o,G as s,I as c,M as l,N as u,Ot as d,U as f,Y as p,_ as m,_t as h,c as ee,d as g,f as te,ft as ne,g as re,gt as ie,h as ae,l as oe,m as se,n as ce,o as le,pt as ue,rt as de,s as _,t as fe,tt as pe,u as v,ut as me,y as he}from"./three.module-RYnr__O9.js";import{n as ge,t as y}from"./colormap-CL31EnH4.js";import{a as _e,d as ve,f as ye,g as b,h as be,i as xe,l as Se,m as Ce,n as x,o as we,p as Te,r as Ee,s as De,t as Oe,u as S,v as C}from"./scientific-probes-OhA_8jbL.js";import{t as ke}from"./OrbitControls-B8aoyP3r.js";var w={name:`VolumeRenderShader1`,uniforms:{u_size:{value:new d(1,1,1)},u_renderstyle:{value:0},u_renderthreshold:{value:.5},u_clim:{value:new a(1,1)},u_data:{value:null},u_cmdata:{value:null}},vertexShader:`

		varying vec3 v_position;
		varying vec3 v_cameraInObj;
		varying vec3 v_viewDirInObj;

		void main() {
				vec4 position4 = vec4(position, 1.0);

				v_position = position;

				// Express the camera position and view direction in the object's local
				// space so the fragment shader can build the per-fragment view ray.
				// For perspective cameras, rays converge at v_cameraInObj.
				// For orthographic cameras, rays travel along v_viewDirInObj.
				v_cameraInObj = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
				v_viewDirInObj = (inverse(modelViewMatrix) * vec4(0.0, 0.0, -1.0, 0.0)).xyz;

				gl_Position = projectionMatrix * modelViewMatrix * position4;
		}`,fragmentShader:`

				precision highp float;
				precision mediump sampler3D;

				uniform vec3 u_size;
				uniform int u_renderstyle;
				uniform float u_renderthreshold;
				uniform vec2 u_clim;

				uniform sampler3D u_data;
				uniform sampler2D u_cmdata;

				varying vec3 v_position;
				varying vec3 v_cameraInObj;
				varying vec3 v_viewDirInObj;

				// The maximum distance through our rendering volume is sqrt(3).
				const int MAX_STEPS = 887;	// 887 for 512^3, 1774 for 1024^3
				const int REFINEMENT_STEPS = 4;
				const float relative_step_size = 1.0;
				const vec4 ambient_color = vec4(0.2, 0.4, 0.2, 1.0);
				const vec4 diffuse_color = vec4(0.8, 0.2, 0.2, 1.0);
				const vec4 specular_color = vec4(1.0, 1.0, 1.0, 1.0);
				const float shininess = 40.0;

				void cast_mip(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray);
				void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray);

				float sample1(vec3 texcoords);
				vec4 apply_colormap(float val);
				vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray);


				void main() {
						// Per-fragment ray direction in object space, pointing from the back
						// face toward the camera. For perspective cameras the rays converge
						// at the camera position; for orthographic cameras they are parallel
						// to the view direction.
						vec3 view_ray = isOrthographic
								? normalize(-v_viewDirInObj)
								: normalize(v_cameraInObj - v_position);

						// Slab-based ray/AABB intersection: v_position lies on the back face
						// of the cuboid, so stepping along view_ray traverses the volume and
						// exits through the front face at t = distance.
						vec3 t1 = (vec3(-0.5) - v_position) / view_ray;
						vec3 t2 = (u_size - vec3(0.5) - v_position) / view_ray;
						vec3 tmax = max(t1, t2);
						float distance = min(min(tmax.x, tmax.y), tmax.z);

						// Decide how many steps to take
						int nsteps = int(distance / relative_step_size + 0.5);
						if ( nsteps < 1 )
								discard;

						// Get starting location and step vector in texture coordinates
						vec3 front = v_position + view_ray * distance;
						vec3 step = ((v_position - front) / u_size) / float(nsteps);
						vec3 start_loc = front / u_size;

						// For testing: show the number of steps. This helps to establish
						// whether the rays are correctly oriented
						//'gl_FragColor = vec4(0.0, float(nsteps) / 1.0 / u_size.x, 1.0, 1.0);
						//'return;

						if (u_renderstyle == 0)
								cast_mip(start_loc, step, nsteps, view_ray);
						else if (u_renderstyle == 1)
								cast_iso(start_loc, step, nsteps, view_ray);

						if (gl_FragColor.a < 0.05)
								discard;
				}


				float sample1(vec3 texcoords) {
						/* Sample float value from a 3D texture. Assumes intensity data. */
						return texture(u_data, texcoords.xyz).r;
				}


				vec4 apply_colormap(float val) {
						val = (val - u_clim[0]) / (u_clim[1] - u_clim[0]);
						float n = float(textureSize(u_cmdata, 0).x); // see #33842
						val = (val * (n - 1.0) + 0.5) / n;
						return texture2D(u_cmdata, vec2(val, 0.5));
				}


				void cast_mip(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray) {

						float max_val = -1e6;
						int max_i = 100;
						vec3 loc = start_loc;

						// Enter the raycasting loop. In WebGL 1 the loop index cannot be compared with
						// non-constant expression. So we use a hard-coded max, and an additional condition
						// inside the loop.
						for (int iter=0; iter<MAX_STEPS; iter++) {
								if (iter >= nsteps)
										break;
								// Sample from the 3D texture
								float val = sample1(loc);
								// Apply MIP operation
								if (val > max_val) {
										max_val = val;
										max_i = iter;
								}
								// Advance location deeper into the volume
								loc += step;
						}

						// Refine location, gives crispier images
						vec3 iloc = start_loc + step * (float(max_i) - 0.5);
						vec3 istep = step / float(REFINEMENT_STEPS);
						for (int i=0; i<REFINEMENT_STEPS; i++) {
								max_val = max(max_val, sample1(iloc));
								iloc += istep;
						}

						// Resolve final color
						gl_FragColor = apply_colormap(max_val);
				}


				void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray) {

						gl_FragColor = vec4(0.0);	// init transparent
						vec4 color3 = vec4(0.0);	// final color
						vec3 dstep = 1.5 / u_size;	// step to sample derivative
						vec3 loc = start_loc;

						float low_threshold = u_renderthreshold - 0.02 * (u_clim[1] - u_clim[0]);

						// Enter the raycasting loop. In WebGL 1 the loop index cannot be compared with
						// non-constant expression. So we use a hard-coded max, and an additional condition
						// inside the loop.
						for (int iter=0; iter<MAX_STEPS; iter++) {
								if (iter >= nsteps)
										break;

								// Sample from the 3D texture
								float val = sample1(loc);

								if (val > low_threshold) {
										// Take the last interval in smaller steps
										vec3 iloc = loc - 0.5 * step;
										vec3 istep = step / float(REFINEMENT_STEPS);
										for (int i=0; i<REFINEMENT_STEPS; i++) {
												val = sample1(iloc);
												if (val > u_renderthreshold) {
														gl_FragColor = add_lighting(val, iloc, dstep, view_ray);
														return;
												}
												iloc += istep;
										}
								}

								// Advance location deeper into the volume
								loc += step;
						}
				}


				vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray)
				{
					// Calculate color by incorporating lighting

						// View direction
						vec3 V = normalize(view_ray);

						// calculate normal vector from gradient
						vec3 N;
						float val1, val2;
						val1 = sample1(loc + vec3(-step[0], 0.0, 0.0));
						val2 = sample1(loc + vec3(+step[0], 0.0, 0.0));
						N[0] = val1 - val2;
						val = max(max(val1, val2), val);
						val1 = sample1(loc + vec3(0.0, -step[1], 0.0));
						val2 = sample1(loc + vec3(0.0, +step[1], 0.0));
						N[1] = val1 - val2;
						val = max(max(val1, val2), val);
						val1 = sample1(loc + vec3(0.0, 0.0, -step[2]));
						val2 = sample1(loc + vec3(0.0, 0.0, +step[2]));
						N[2] = val1 - val2;
						val = max(max(val1, val2), val);

						float gm = length(N); // gradient magnitude
						N = normalize(N);

						// Flip normal so it points towards viewer
						float Nselect = float(dot(N, V) > 0.0);
						N = (2.0 * Nselect - 1.0) * N;	// ==	Nselect * N - (1.0-Nselect)*N;

						// Init colors
						vec4 ambient_color = vec4(0.0, 0.0, 0.0, 0.0);
						vec4 diffuse_color = vec4(0.0, 0.0, 0.0, 0.0);
						vec4 specular_color = vec4(0.0, 0.0, 0.0, 0.0);

						// note: could allow multiple lights
						for (int i=0; i<1; i++)
						{
								 // Get light direction (make sure to prevent zero division)
								vec3 L = normalize(view_ray);	//lightDirs[i];
								float lightEnabled = float( length(L) > 0.0 );
								L = normalize(L + (1.0 - lightEnabled));

								// Calculate lighting properties
								float lambertTerm = clamp(dot(N, L), 0.0, 1.0);
								vec3 H = normalize(L+V); // Halfway vector
								float specularTerm = pow(max(dot(H, N), 0.0), shininess);

								// Calculate mask
								float mask1 = lightEnabled;

								// Calculate colors
								ambient_color +=	mask1 * ambient_color;	// * gl_LightSource[i].ambient;
								diffuse_color +=	mask1 * lambertTerm;
								specular_color += mask1 * specularTerm * specular_color;
						}

						// Calculate final color by componing different components
						vec4 final_color;
						vec4 color = apply_colormap(val);
						final_color = color * (ambient_color + diffuse_color) + specular_color;
						final_color.a = color.a;
						return final_color;
				}`},Ae=0,T=[`smoke · speed`,`smoke · pressure`,`heat · temperature`],je=[1280,720],Me=[1280,720],E=[3,5,7],Ne=[3.5,5.5,7.5];function Pe(e){let t=new Float32Array(1);return t[0]=e,new Uint32Array(t.buffer)[0]}var Fe=2,D=512,Ie=1,Le=5e3,Re=.3,ze=[`WebGLRenderer`,`Scene`,`PerspectiveCamera`,`BufferGeometry`,`BufferAttribute`,`Mesh`,`MeshLambertMaterial`,`AmbientLight`,`DirectionalLight`,`LineSegments`,`LineBasicMaterial`,`Data3DTexture`,`DataTexture`,`ShaderMaterial`,`WebGLRenderTarget`,`DepthTexture`,`Raycaster`,`BoxGeometry`,`PlaneGeometry`,`addons/controls/OrbitControls`,`addons/shaders/VolumeShader`],O=null,Be={};function k(e,t){return n=>{Be[e]=(Be[e]??0)+1,t(n)}}var A=`
uniform highp sampler3D uData;
uniform vec3 uOrigin;
uniform vec3 uSpacing;
uniform vec3 uSize;
vec3 benchVolumeTexcoord(vec3 world) {
  vec3 index = (world - uOrigin) / uSpacing;
  return (index + 0.5) / uSize;
}
float benchSampleVolume(vec3 world) {
  return texture(uData, benchVolumeTexcoord(world)).r;
}`,j=`
uniform sampler2D uSliceData;
uniform vec2 uSliceDims;
float benchSampleSlice(vec2 uv) {
  vec2 texcoord = (uv * (uSliceDims - 1.0) + 0.5) / uSliceDims;
  return texture(uSliceData, texcoord).r;
}`,Ve=`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`,He=`
precision highp float;
precision highp sampler3D;
#include <packing>
uniform vec2 uClim;
uniform float uOpacityScale;
uniform float uStep;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform sampler2D uOpaqueDepth;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
varying vec3 vWorld;
${y}
${A}
float benchVolumeAlpha(float f) {
  float a = f < 0.5 ? mix(0.0, 0.05, f / 0.5) : mix(0.05, 0.6, (f - 0.5) / 0.5);
  return a * uOpacityScale;
}
void main() {
  vec3 rayOrigin = cameraPosition;
  vec3 rayDir = normalize(vWorld - rayOrigin);
  vec3 ta = (uBoxMin - rayOrigin) / rayDir;
  vec3 tb = (uBoxMax - rayOrigin) / rayDir;
  vec3 tsmall = min(ta, tb);
  vec3 tbig = max(ta, tb);
  float tNear = max(max(tsmall.x, tsmall.y), tsmall.z);
  float tFar = min(min(tbig.x, tbig.y), tbig.z);
  tNear = max(tNear, 0.0);
  if (tFar <= tNear) discard;
  float opaqueDepth = texture(uOpaqueDepth, gl_FragCoord.xy / uResolution).x;
  float opaqueViewZ = perspectiveDepthToViewZ(opaqueDepth, uNear, uFar);
  float rayViewZ = (viewMatrix * vec4(rayDir, 0.0)).z;
  if (rayViewZ < 0.0) tFar = min(tFar, opaqueViewZ / rayViewZ);
  if (tFar <= tNear) discard;
  vec4 acc = vec4(0.0);
  float t = tNear + 0.5 * uStep;
  for (int i = 0; i < ${D}; i++) {
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
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,We=`
precision highp float;
uniform vec2 uClim;
uniform float uSliceAlpha;
varying vec2 vUv;
${y}
${j}
void main() {
  float value = benchSampleSlice(vUv);
  float f = clamp((value - uClim.x) / (uClim.y - uClim.x), 0.0, 1.0);
  gl_FragColor = vec4(benchColormap(f), uSliceAlpha);
}`,Ge=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`,Ke=`
precision highp float;
uniform sampler2D uColor;
varying vec2 vUv;
void main() {
  gl_FragColor = texture(uColor, vUv);
}`,qe=`
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,Je=`
precision highp float;
precision highp sampler3D;
uniform vec3 uProbeWorld;
${A}
void main() { gl_FragColor = vec4(benchSampleVolume(uProbeWorld), 0.0, 0.0, 1.0); }`,Ye=`
precision highp float;
uniform vec2 uProbeUv;
${j}
void main() { gl_FragColor = vec4(benchSampleSlice(uProbeUv), 0.0, 0.0, 1.0); }`,Xe=[[`volume vertex`,Ve],[`volume fragment (incl. the shared sampler and the shared colormap)`,He],[`slice vertex`,Ue],[`slice fragment`,We],[`blit vertex`,Ge],[`blit fragment`,Ke],[`verification vertex`,qe],[`verification volume fragment`,Je],[`verification slice fragment`,Ye]],M=new Set([`void main() {`,`precision highp float;`,`precision mediump sampler3D;`,`precision highp sampler3D;`]);function Ze(){let e=e=>e.split(`
`).map(e=>e.trim()).filter(e=>e.length>0&&!/^[{}();,]+$/.test(e)&&!e.startsWith(`//`)),t=new Set([...e(w.vertexShader),...e(w.fragmentShader)]),n=[],r=0,i=Xe.map(([t,i])=>{r+=i.split(`
`).filter(e=>e.trim().length>0).length;let a=e(i);return n.push(...a),{shader:t,lines:a.length}}),a=[...new Set(n)],o=a.filter(e=>t.has(e)),s=o.filter(e=>!M.has(e)).length;return{totalLines:r,compiledLines:n.length,distinctLines:a.length,identicalToStock:n.filter(e=>t.has(e)).length,reusedFromStock:s,identicalLines:o,ownDistinctLines:a.length-s,stockSubstantiveLines:t.size,perShader:i}}function Qe(e){let t=new ee;return t.setAttribute(`position`,new _(e.positions,3)),t.setAttribute(`normal`,new _(e.normals,3)),t.setIndex(new _(e.indices,1)),t}function $e(e){let t=[],n=0;for(let r=0;r<e.length-1;r++){let i=e[r],a=e[r+1];a-i>=2?t.push([i,a]):n++}let r=t.reduce((e,[t,n])=>e+(n-t),0),i=new Uint32Array((r-t.length)*2),a=0;for(let[e,n]of t)for(let t=e;t<n-1;t++)i[a++]=t,i[a++]=t+1;if(a!==i.length||a!==(r-t.length)*2)throw Error(`smoke.streamlines: emitted ${a/2} segments for ${t.length} polylines over ${r} vertices; ${r-t.length} segments is the only count that does not join one line to the next`);return{indices:i,lines:t.length,dropped:n}}function et(e){let t=1/0,n=-1/0;for(let r=0;r<e.length;r++)e[r]<t&&(t=e[r]),e[r]>n&&(n=e[r]);return[t,n]}function tt(e){let t={buffers:0,textures:0,renderTargets:0,renderbuffers:0},n=e,r=(r,i,a)=>{let o=n[r].bind(e),s=n[i].bind(e),c=new WeakSet;n[r]=(...e)=>{let n=o(...e);return n&&(c.add(n),t[a]++),n},n[i]=(...e)=>{let n=e[0];return n&&c.has(n)&&(c.delete(n),t[a]--),s(...e)}};return r(`createBuffer`,`deleteBuffer`,`buffers`),r(`createTexture`,`deleteTexture`,`textures`),r(`createFramebuffer`,`deleteFramebuffer`,`renderTargets`),r(`createRenderbuffer`,`deleteRenderbuffer`,`renderbuffers`),t}function N(e){let[t,n,r]=e;return[[1,1,1],[2,1,1],[1,2,1],[1,1,2],[3,5,7],[t-2,1,1],[1,n-2,1],[1,1,r-2]].filter(([e,i,a])=>e>=1&&i>=1&&a>=1&&e<=t-2&&i<=n-2&&a<=r-2)}function nt(e,t,n,r){return[e.origin[0]+t*e.spacing[0],e.origin[1]+n*e.spacing[1],r]}function rt(e,t,n,r){return[e.origin[0]+t*e.spacing[0],e.origin[1]+n*e.spacing[1],e.origin[2]+r*e.spacing[2]]}function it(e,t,n,r,i,a){let o=S(i),s=0,c=n.texture.image,l=[c.width,c.height,c.depth];if(r.data.value!==n.texture)throw Error(`${e}: the material's uData uniform is bound to a different texture from this case's upload`);let u=r.origin.value.toArray(),d=r.spacing.value.toArray(),f=r.size.value.toArray();for(let n=0;n<3;n++)if(l[n]!==t.dims[n]||f[n]!==l[n]||u[n]!==t.origin[n]||d[n]!==t.spacing[n])throw Error(`${e}: the Data3DTexture upload does not match the shipped grid -- texture dims ${JSON.stringify(l)} and shader uSize ${JSON.stringify(f)} vs ${JSON.stringify(t.dims)}, shader uOrigin ${JSON.stringify(u)} vs ${JSON.stringify(t.origin)}, shader uSpacing ${JSON.stringify(d)} vs ${JSON.stringify(t.spacing)}`);let p=c.data;if(p!==t.data)throw Error(`${e}: the Data3DTexture is backed by a different array from the shipped grid's. Data3DTexture holds its array by reference, so anything but the shipped array means the payload was copied or reordered on the way to the GPU, and the order it is in is no longer the order scientific-data.ts validated.`);let m=t.dims[0]*t.dims[1]*t.dims[2];if(p.length!==m)throw Error(`${e}: the uploaded array holds ${p.length} values but dims ${t.dims.join(`x`)} need ${m}`);for(let[n,r,i]of N(t.dims)){let c=rt(t,n,r,i),l=Ce(t,n,r,i)[0],u=a(c),d=Math.abs(u-l);if(d>s&&(s=d),!(d<=o))throw Error(`${e}: node (${n}, ${r}, ${i}) reads ${l} through probeGridNode but the GPU samples ${u} from the uploaded texture at the same world point, off by ${d.toExponential(4)} against an interpolated tolerance of ${o.toExponential(4)}`)}return s}function at(e,t,n,r,i,a,o){let s=[t.origin[0],t.origin[1],t.origin[2]],c=[t.origin[0]+t.spacing[0]*(t.dims[0]-1),t.origin[1]+t.spacing[1]*(t.dims[1]-1),t.origin[2]+t.spacing[2]*(t.dims[2]-1)],l=(t,n,r)=>{let i=x(n,r);if(!(i<=.05))throw Error(`${e}: ${t} is at ${JSON.stringify(n)} but the grid it draws covers ${JSON.stringify(r)} -- ${i.toFixed(4)} m apart, over the ${Oe} m alignment tolerance`)};l(`the volume ray-clip uniform uBoxMin`,[i.x,i.y,i.z],s),l(`the volume ray-clip uniform uBoxMax`,[a.x,a.y,a.z],c),n.computeBoundingBox();let u=n.boundingBox;l(`the volume box mesh's low corner`,[u.min.x,u.min.y,u.min.z],s),l(`the volume box mesh's high corner`,[u.max.x,u.max.y,u.max.z],c);let d=r.getAttribute(`uv`),f=r.getAttribute(`position`);if(!d||!f)throw Error(`${e}: the slice plane carries no uv/position attribute`);for(let t=0;t<d.count;t++){let n=s[0]+d.getX(t)*(c[0]-s[0]),r=s[1]+d.getY(t)*(c[1]-s[1]),i=Math.hypot(f.getX(t)-n,f.getY(t)-r);if(!(i<=.05))throw Error(`${e}: slice-plane vertex ${t} carries uv (${d.getX(t)}, ${d.getY(t)}), which maps to world (${n}, ${r}), but the vertex is at (${f.getX(t)}, ${f.getY(t)}) -- ${i.toFixed(4)} m apart. The plane's UVs do not run with world x/y.`)}r.computeBoundingBox();let p=r.boundingBox;l(`the slice plane's low corner`,[p.min.x,p.min.y,o],[s[0],s[1],o]),l(`the slice plane's high corner`,[p.max.x,p.max.y,o],[c[0],c[1],o])}function ot(e,t,n,r,i,a){let[o,s]=t.dims,c=S(i),l=0,u=[[1,1],[2,1],[1,2],[3,5],[o-2,1],[1,s-2]];for(let[i,d]of u){let u=[i/(o-1),d/(s-1)],f=n[i+o*d],p=a(u),m=Math.abs(p-f);if(m>l&&(l=m),!(m<=c))throw Error(`${e}: the slice plane at z=${r} samples ${p} at uv ${JSON.stringify(u)} but node (${i}, ${d}) of the resampled plane holds ${f}, off by ${m.toExponential(4)} against an interpolated tolerance of ${c.toExponential(4)}`);let h=b(t,nt(t,i,d,r))[0];if(f!==Math.fround(h))throw Error(`${e}: the slice plane holds ${f} at node (${i}, ${d}) but sampleGridTrilinear reads ${h} (${Math.fround(h)} as float32) at the world point that node is drawn at`)}return l}function st(e,t,n){let r=e.smoke.slice;if(r.axis!==`z`||r.fixedLocalAxis!==2||r.localAxes[0]!==0||r.localAxes[1]!==1)throw Error(`smoke.slice: this page's a-fastest adapter is only known to be world-ascending for axis "z" with localAxes [0, 1] and fixedLocalAxis 2; the manifest ships axis=${JSON.stringify(r.axis)}, localAxes=${JSON.stringify(r.localAxes)}, fixedLocalAxis=${r.fixedLocalAxis}. Re-measure the on-disk order before rendering it.`);let i=r.resolution,[a,o,,s,c]=r.domainLocalBounds,l=0;for(let e=0;e<i;e++)for(let n=0;n<i;n++){let u=[a+n*(s-a)/(i-1),o+e*(c-o)/(i-1),r.fixedLocalCoordinate],d=Math.abs(r.pressure[n+i*e]-b(t,u)[0]);d>l&&(l=d)}let u=S(n);if(!(l<=u))throw Error(`smoke.slice: Core's FieldSlice pressure disagrees with the volume grid at z=${r.fixedLocalCoordinate} m by ${l.toExponential(4)} Pa, over the ${u.toExponential(4)} interpolated tolerance for a span of ${n}.`);return l}function ct(e){let t=e.cases.smoke.dataCategory,n=e.cases.heat.dataCategory;if(t!==`synthetic`)throw Error(`manifest cases.smoke.dataCategory is ${JSON.stringify(t)}, expected "synthetic"`);if(n!==`simulation`)throw Error(`manifest cases.heat.dataCategory is ${JSON.stringify(n)}, expected "simulation"`);return{smoke:`synthetic`,heat:`simulation`}}function lt(e){let t=e;if(!t.eye)throw Error("camera pose arrived without its derived eye position: every pose this page renders comes from orbitV1Pose, which ships `eye` with the pose. Re-deriving it here would silently reintroduce the z-up/azimuth-origin mismatch CameraPose exists to prevent — and Three.js defaults to y-up, which is exactly the trap.");return t.eye}te.enabled=!1,t()&&ut();async function ut(){let e;try{let t=await C(),r=await F(t);e=n(P(t)),dt(e,t,r)}catch(t){let r=`14-threejs-scientific failed to start: ${t.message}`;(e??=n(P())).fail(r),console.error(r,t)}}function P(e){let t=e?.manifest.coordinateFrame.localBounds,n=t?t[2]:0,r=t?t[5]:80,i=e?e.smoke.slice.fixedLocalCoordinate:(n+r)/2;return{num:`14`,title:`Three.js — scientific comparison`,expect:`the same scene as page 13, drawn by Three.js: one canvas holding grey Gothenburg terrain with its buildings, the synthetic DTCC smoke field as a translucent volume above them, a coloured horizontal slice through that volume at the height the manifest declares for Core's FieldSlice (40 m on this tile), and 24 Core-precomputed streamlines threading it. Click a building to read its marker back — a conditioned mesher region, not a building, and on this tile its identity is run-local at best.`,claim:`Three.js is the general-purpose engine: it will draw the city fine, but it has no scientific visualization of its own, so the volume rendering is ours to write and ours to maintain.`,decision:`Whether one Three.js scene can carry city geometry and scientific fields together, with identity and values readable back — and what it costs in code we own. This is the second measurement of what page 13 measured; Task 7 compares the two probes.`,correction:`Picking returns a *conditioned mesher region*, not a building: 215 source buildings condition to 103 regions, the mesh carries 206 markers, and 103 of those were appended by the mesh splitter and have no source building at all. Canonical DTCC traceability fails on this tile — the footprint tiles carry no id, so Core mints a fresh uuid4 per load.`,findings:[`There is no volume renderer in Three.js. three/addons/shaders/VolumeShader.js exists and was the starting point, but it does maximum-intensity and isosurface casting only — no transparent compositing and no depth interaction with opaque geometry — so the front-to-back compositor, the opaque depth stop and the two-pass wiring behind them are code this repo now owns. The probe panel carries the measured line count.`,`Depth occlusion between a volume and a city is not free here the way it is in vtk.js: terrain, buildings, streamlines and the slice render into an offscreen target with a depth texture, that colour is blitted to the canvas, and the volume pass reconstructs the opaque view distance from the depth texture and stops each ray there. One WebGLRenderer, one canvas, two passes. The offscreen target is multisampled at the canvas's own sample count, so the city is rasterized here exactly as page 13 rasterizes it — the first version of this page left it single-sampled and thereby manufactured a ~12% Three.js speed advantage that does not exist. See the probe panel.`,`The slice is the TRUE plane at the requested height, resampled through sampleGridTrilinear, not the nearest node layer — same as page 13, and for the same reason: nz is 32 on both grids, so a K-index slider works by coincidence, and snapping put page 13's plane at 41.29 m while it claimed 40 m.`,`Axis order is asserted before any mesh exists, because Three.js ships no second world-to-offset implementation to check against the way vtk.js does: the upload declaration, the payload invariant (the texture must be backed by the shipped array itself), and a GPU round trip through the scene's own sampler GLSL. The middle leg used to recompute offset arithmetic and compare it against gridNodeIndex; review showed that could not fail, and it was removed rather than dressed up. x<->y stays undetectable in the DECLARATION on both shipped grids (32x32 and 64x64), but a reordered payload IS caught.`,`The benchmark ends every forced frame in a one-pixel readback, not gl.finish(): page 13 measured that gl.finish() alone returns before the frame is drawn under Chrome's ANGLE/SwiftShader command buffer. Verified here by stripping the readback from this page: cpu mean 0.17 ms against a gpu mean of 133.25 ms, a 780x overstatement (page 13's was 200x), and the smoke test catches it. Both pages pin the drawing surface to 1280x720 and record their context attributes, and with the opaque pass sampled the same way on both, the two renderers come out INDISTINGUISHABLE on this scene: p50 151.2 ms here against 152.8 ms on page 13, three runs each, about 1% apart.`,`Measured, and the answer Task 7 needs: Three.js 0.185.1 does NOT leak GL objects per drawing-buffer resize. Live counts hold at 37 buffers / 12 textures / 5 framebuffers / 2 renderbuffers from ready onward — flat across three benchmark runs, 100 control cycles and eight viewport resizes. vtk.js 36.12.1, instrumented the same way in the same session, goes from 9/8/1 to 9/14/7 across three benchmark runs — one texture, one framebuffer AND one renderbuffer per resize, never returned.`],controls:[{kind:`select`,id:`data-case`,label:`Data case`,options:[...T],value:T[0],onChange:k(`data-case`,e=>O?.setCase(e))},{kind:`range`,id:`slice-z`,label:`Slice height (m)`,min:n,max:r,step:(r-n)/80,value:i,onChange:k(`slice-z`,e=>O?.setSliceHeight(e))},{kind:`range`,id:`range-low`,label:`Colour low (fraction of case range)`,min:0,max:1,step:.01,value:0,onChange:k(`range-low`,e=>O?.setColourFraction(`low`,e))},{kind:`range`,id:`range-high`,label:`Colour high (fraction of case range)`,min:0,max:1,step:.01,value:1,onChange:k(`range-high`,e=>O?.setColourFraction(`high`,e))},{kind:`range`,id:`opacity`,label:`Volume opacity`,min:0,max:1,step:.01,value:Re,onChange:k(`opacity`,e=>O?.setOpacity(e))},{kind:`toggle`,id:`streamlines`,label:`Streamlines`,value:!0,onChange:k(`streamlines`,e=>O?.setStreamlines(e))},{kind:`button`,id:`camera-reset`,label:`Reset camera`,onClick:k(`camera-reset`,()=>O?.resetCamera())}]}}async function F(t){let n=t.heat.grid,r=await fetch(e(n.dataUrl));if(!r.ok)throw Error(`heat grid ${n.dataUrl}: ${r.status}`);let i=new Float32Array(await r.arrayBuffer()),a=n.dims[0]*n.dims[1]*n.dims[2];if(i.length!==a)throw Error(`heat grid ${n.dataUrl}: ${i.length} values but dims ${n.dims.join(`x`)} need ${a}`);return i}function dt(e,t,n){let te=t.manifest,y=t.smoke.grid,x=t.city.objects,Oe=t.city.buildings.cellObjectIndex;if(!Oe)throw Error(`buildings mesh carries no cell_object_index`);let S=Oe;if(S.length!==t.city.buildings.indices.length/3)throw Error(`buildings mesh carries ${S.length} cell markers for ${t.city.buildings.indices.length/3} triangles; faceIndex would not be a marker row`);let C={renderer:`threejs`,status:`ready`,canvasCount:0,field:!0,provenance:ct(te),resources:{buffers:0,textures:0,renderTargets:0,listeners:0,observers:0},measurementValid:!0},w={buffers:0,textures:0,renderTargets:0,renderbuffers:0},D=0,k=0,A=()=>{C.resources={buffers:w.buffers,textures:w.textures,renderTargets:w.renderTargets,listeners:D,observers:k},e.setProbe(`glObjects`,{...w,listeners:D,observers:k}),C.canvasCount=e.canvasHost.querySelectorAll(`canvas`).length,e.setProbe(`gpuSampleStats`,zn.lastGpuSampleStats()),e.setProbe(`parity`,nr()),e.setScientificProbe(C)},j=document.createElement(`canvas`);j.style.cssText=`position:absolute;inset:0;width:100%;height:100%`,e.canvasHost.prepend(j);let Xe=j.getContext(`webgl2`,{preserveDrawingBuffer:!1,depth:!0,alpha:!0,powerPreference:`high-performance`});if(!Xe)throw Error(`no WebGL2 context`);let M=Xe;w=tt(M);let N=new fe({canvas:j,context:M});if(N.autoClear=!1,N.outputColorSpace=c,N.setClearColor(new g(.93,.93,.92),1),!N.extensions.has(`EXT_color_buffer_float`))throw Error(`EXT_color_buffer_float is unavailable, so the GPU sampling round-trip cannot be read back`);let ut=N.extensions.has(`OES_texture_float_linear`),P=ut?u:p,F=new pe(30,1,Ie,Le);F.up.set(0,0,1);let dt=e=>{let[t,n,r]=e.dims,i=new se(e.data,t,n,r);return i.format=ue,i.type=he,i.minFilter=P,i.magFilter=P,i.wrapS=v,i.wrapT=v,i.wrapR=v,i.unpackAlignment=4,i.needsUpdate=!0,{texture:i,uniformOrigin:[e.origin[0],e.origin[1],e.origin[2]],uniformSpacing:[e.spacing[0],e.spacing[1],e.spacing[2]],uniformSize:[t,n,r]}},ht=(e,t,n,r,i)=>{let[a,o,s]=r.dims,c=[r.spacing[0]*(a-1),r.spacing[1]*(o-1),r.spacing[2]*(s-1)],l=new le(c[0],c[1],c[2]);l.translate(r.origin[0]+c[0]/2,r.origin[1]+c[1]/2,r.origin[2]+c[2]/2);let u=new de(c[0],c[1]);u.translate(r.origin[0]+c[0]/2,r.origin[1]+c[1]/2,0);let d=new Float32Array(a*o),f=new ae(d,a,o,ue,he);return f.minFilter=P,f.magFilter=P,f.wrapS=v,f.wrapT=v,f.unpackAlignment=4,f.needsUpdate=!0,{id:e,fieldName:t,unit:n,field:r,range:i,upload:dt(r),boxGeometry:l,planeGeometry:u,sliceValues:d,sliceTexture:f}},gt=et(y.speed),_t=et(y.pressure),vt=t.heat.grid,I=[ht(T[0],`speed`,te.fields.speed.unit,De(y,`speed`),gt),ht(T[1],`pressure`,te.fields.pressure.unit,De(y,`pressure`),_t),ht(T[2],`temperature`,vt.unit,Se(vt,n),[vt.min,vt.max])],L=I[0],R=t.smoke.slice.fixedLocalCoordinate,yt={value:I[0].upload.texture},bt={value:new d},xt={value:new d},St={value:new d},Ct={value:new d},wt={value:new d},Tt={value:new a(0,1)},Et={value:Re},Dt={value:Fe},Ot={value:new a(1,1)},kt={value:Ie},At={value:Le},jt={value:I[0].sliceTexture},Mt={value:new a(1,1)},Nt={value:.43},Pt={value:new d},Ft={value:new a};function z(e){let[t,n,r]=e.field.dims;yt.value=e.upload.texture,bt.value.set(...e.upload.uniformOrigin),xt.value.set(...e.upload.uniformSpacing),St.value.set(...e.upload.uniformSize),Ct.value.set(e.field.origin[0],e.field.origin[1],e.field.origin[2]),wt.value.set(e.field.origin[0]+e.field.spacing[0]*(t-1),e.field.origin[1]+e.field.spacing[1]*(n-1),e.field.origin[2]+e.field.spacing[2]*(r-1)),jt.value=e.sliceTexture,Mt.value.set(t,n)}let It=new re(1,1,o);It.minFilter=p,It.magFilter=p,M.bindFramebuffer(M.FRAMEBUFFER,null);let Lt=M.getParameter(M.SAMPLES),B=new i(1,1,{depthTexture:It,depthBuffer:!0,stencilBuffer:!1,samples:Lt,minFilter:p,magFilter:p}),Rt={value:It},zt=new i(1,1,{type:he,format:me,depthBuffer:!1,stencilBuffer:!1,minFilter:p,magFilter:p}),Bt=new de(2,2),Vt=new h({uniforms:{uData:yt,uOrigin:bt,uSpacing:xt,uSize:St,uProbeWorld:Pt},vertexShader:qe,fragmentShader:Je,depthTest:!1,depthWrite:!1}),Ht=new h({uniforms:{uSliceData:jt,uSliceDims:Mt,uProbeUv:Ft},vertexShader:qe,fragmentShader:Ye,depthTest:!1,depthWrite:!1}),Ut=new f(Bt,Vt),Wt=new ie;Wt.add(Ut);let Gt=new oe,Kt=new Float32Array(4);function qt(e){return Ut.material=e,N.setRenderTarget(zt),N.clear(),N.render(Wt,Gt),N.readRenderTargetPixels(zt,0,0,1,1,Kt),N.setRenderTarget(null),Kt[0]}let Jt=NaN;function Yt(e,t){let[n,r]=e.field.dims;for(let i=0;i<r;i++)for(let r=0;r<n;r++)e.sliceValues[r+n*i]=b(e.field,nt(e.field,r,i,t))[0];Jt=t,e.sliceTexture.needsUpdate=!0}let V=0,Xt=new Map;for(let e of I){z(e),Yt(e,R);let t=e.range[1]-e.range[0];V=Math.max(V,it(e.id,e.field,e.upload,{data:yt,origin:bt,spacing:xt,size:St},t,e=>(Pt.value.set(e[0],e[1],e[2]),qt(Vt))));{let t=rt(e.field,E[0],E[1],E[2]),n=Ce(e.field,E[0],E[1],E[2])[0];Pt.value.set(t[0],t[1],t[2]);let r=qt(Vt);Xt.set(e.id,{world:t,cpu:n,gpu:r,delta:Math.abs(r-n)})}at(e.id,e.field,e.boxGeometry,e.planeGeometry,Ct.value,wt.value,R),V=Math.max(V,ot(e.id,e.field,e.sliceValues,R,t,e=>(Ft.value.set(e[0],e[1]),qt(Ht))))}z(L),Wt.remove(Ut),Bt.dispose(),Vt.dispose(),Ht.dispose(),zt.dispose();let Zt=De(y,`pressure`),Qt=_t[1]-_t[0],$t=st(t,Zt,Qt),H=new ie,en=new ie;H.add(new ce(16777215,1.6));let tn=new m(16777215,2.2);tn.position.set(.4,-.6,1).normalize(),H.add(tn);let nn=Qe(t.city.terrain),rn=new s({color:new g(.62,.62,.6)});H.add(new f(nn,rn));let an=Qe(t.city.buildings),on=new s({color:new g(.8,.78,.74)}),sn=new f(an,on);H.add(sn);let{indices:cn,lines:ln,dropped:un}=$e(t.smoke.streamlines.vertexOffsets),U=new ee;U.setAttribute(`position`,new _(t.smoke.streamlines.positions,3));let[dn,fn]=et(t.smoke.streamlines.speed),pn=new Float32Array(t.smoke.streamlines.speed.length*3);for(let e=0;e<t.smoke.streamlines.speed.length;e++){let[n,r,i]=ge(t.smoke.streamlines.speed[e],dn,fn);pn[e*3]=n/255,pn[e*3+1]=r/255,pn[e*3+2]=i/255}U.setAttribute(`color`,new _(pn,3)),U.setIndex(new _(cn,1));let mn=new r({vertexColors:!0}),W=new l(U,mn);H.add(W);let hn=new h({uniforms:{uClim:Tt,uSliceAlpha:Nt,uSliceData:jt,uSliceDims:Mt},vertexShader:Ue,fragmentShader:We,transparent:!0,depthWrite:!1,side:2}),G=new f(L.planeGeometry,hn);G.position.z=R,H.add(G);let gn=new h({uniforms:{uData:yt,uOrigin:bt,uSpacing:xt,uSize:St,uBoxMin:Ct,uBoxMax:wt,uClim:Tt,uOpacityScale:Et,uStep:Dt,uOpaqueDepth:Rt,uResolution:Ot,uNear:kt,uFar:At},vertexShader:Ve,fragmentShader:He,side:1,transparent:!0,depthTest:!1,depthWrite:!1,blending:5,blendSrc:201,blendDst:205,blendEquation:100}),K=new f(L.boxGeometry,gn);K.frustumCulled=!1,en.add(K);let _n=new de(2,2),vn=new h({uniforms:{uColor:{value:B.texture}},vertexShader:Ge,fragmentShader:Ke,depthTest:!1,depthWrite:!1}),yn=new ie;yn.add(new f(_n,vn));let bn=new oe;function q(){N.setRenderTarget(B),N.clear(),N.render(H,F),N.setRenderTarget(null),N.clear(),N.render(yn,bn),N.render(en,F)}let J=new ke(F,j);J.enableDamping=!1,J.addEventListener(`change`,q);function Y(e){let t=lt(e);F.position.set(t[0],t[1],t[2]),J.target.set(e.target[0],e.target[1],e.target[2]),F.lookAt(J.target),F.updateMatrixWorld()}let xn=0,Sn=1,Cn=Re;function wn(){let[e,t]=L.range,n=t-e,r=e+Math.min(xn,Sn)*n,i=e+Math.max(xn,Sn)*n;return i>r?[r,i]:[r,r+(n||1)*.001]}function X(){let[t,n]=wn();Tt.value.set(t,n),Et.value=Cn,Nt.value=.25+.6*Cn,e.setReadout(`Colour range`,`${t.toFixed(2)} – ${n.toFixed(2)} ${L.unit}`)}function Tn(){if(Yt(L,R),G.position.z=R,Jt!==G.position.z)throw Error(`the slice payload was resampled at z = ${Jt} m but the plane was moved to ${G.position.z} m`);let[t,n]=L.field.dims;e.setReadout(`Slice`,`z = ${R.toFixed(2)} m exactly — the ${t}×${n} plane resampled through sampleGridTrilinear, not snapped to the nearest node layer`)}let En=t.city.buildings.positions,Dn=t.city.buildings.indices;function On(e){let t=[0,0,0];for(let n=0;n<3;n++){let r=Dn[e*3+n]*3;t[0]+=En[r]/3,t[1]+=En[r+1]/3,t[2]+=En[r+2]/3}return t}function kn(t){let n=b(L.field,t)[0];C.selectedValue={field:L.fieldName,value:n,unit:L.unit,world:t},e.setReadout(`Sampled value`,`${n.toFixed(4)} ${L.unit} (${L.fieldName}) at (${t.map(e=>e.toFixed(1)).join(`, `)})`)}function An(n){if(!Number.isInteger(n)||n<0||n>=S.length){delete C.selectedObject,e.setReadout(`Pick`,`cell ${n} is outside the buildings mesh (${S.length} cells)`),e.setReadout(`Marker`,`none — nothing is selected`),e.setReadout(`Source buildings`,`none — nothing is selected`),e.setReadout(`DTCC ids`,`none — nothing is selected`),e.setReadout(`Traceability`,`not applicable — nothing is selected`),A();return}let r=S[n],i=ve(x,t.city.identityStability,r);C.selectedObject=i,e.setReadout(`Pick`,`cell ${n}`),e.setReadout(`Marker`,`${r} — a conditioned mesher region, not a building`),e.setReadout(`Source buildings`,i.sourceIndexes.length?`${i.sourceIndexes.length}: source index ${i.sourceIndexes.join(`, `)}`:`none — this region has no source building`),e.setReadout(`DTCC ids`,i.dtccIds.length?i.dtccIds.join(`, `):`none — there is no id to trace`),e.setReadout(`Traceability`,_e(i.traceability)),kn(On(n)),A()}function jn(t){let n=I.find(e=>e.id===t);n&&(L=n,z(L),K.geometry=L.boxGeometry,G.geometry=L.planeGeometry,X(),Tn(),e.setReadout(`Data case`,`${L.id} (${L.unit}), grid ${L.field.dims.join(`×`)}`),C.selectedValue&&kn(C.selectedValue.world),q(),A())}O={setSliceHeight(e){R=e,Tn(),q(),A()},setColourFraction(e,t){e===`low`?xn=t:Sn=t,X(),q(),A()},setOpacity(e){Cn=e,X(),q(),A()},setStreamlines(e){W.visible=e,q(),A()},resetCamera(){Y(ye(0)),q(),A()},setCase:jn};function Z(e,t,n){N.setPixelRatio(n),N.setSize(e,t,!1);let r=Math.max(1,Math.floor(e*n)),i=Math.max(1,Math.floor(t*n));B.setSize(r,i),Ot.value.set(r,i),F.aspect=r/i,F.updateProjectionMatrix()}let Q=new ResizeObserver(()=>{let t=e.canvasHost.getBoundingClientRect();Z(Math.max(1,Math.floor(t.width)),Math.max(1,Math.floor(t.height)),window.devicePixelRatio||1),q(),A()});Q.observe(e.canvasHost),k+=1;let Mn=new ne,Nn=new a,Pn=t=>{let n=j.getBoundingClientRect();if(n.width===0||n.height===0)return;Nn.set((t.clientX-n.left)/n.width*2-1,-((t.clientY-n.top)/n.height)*2+1),Mn.setFromCamera(Nn,F);let r=Mn.intersectObject(sn,!1)[0];if(!r||r.faceIndex===void 0||r.faceIndex===null){e.setReadout(`Pick`,`no building under the cursor`),A();return}An(r.faceIndex),q()};j.addEventListener(`pointerdown`,Pn),D+=1;let Fn=mt(M),In=new Uint8Array(4),Ln=()=>{M.finish(),M.readPixels(0,0,1,1,M.RGBA,M.UNSIGNED_BYTE,In)},Rn=0,zn=xe({renderFrame:e=>{Rn+=1,Y(e),q(),Ln()},gpuTimer:Fn});function Bn(t){let n={phase:t,benchmarkSize:je,drawingBufferWidth:M.drawingBufferWidth,drawingBufferHeight:M.drawingBufferHeight,devicePixelRatio:window.devicePixelRatio,contextAttributes:M.getContextAttributes(),opaqueTargetSamples:B.samples,volumeStepMetres:Fe,volumeFilter:ut?`linear (OES_texture_float_linear)`:`nearest (OES_texture_float_linear absent)`};e.setProbe(t===`benchmark`?`renderSurfaceBenchmark`:`renderSurfaceInteractive`,n),e.setProbe(`renderSurface`,n)}async function Vn(){let t={...w,listeners:D,observers:k},n=e.canvasHost.getBoundingClientRect(),r=Math.max(1,Math.floor(n.width)),i=Math.max(1,Math.floor(n.height)),a=window.devicePixelRatio||1;Q.unobserve(e.canvasHost),Z(je[0],je[1],1);try{let e=await zn.runBenchmark();return C.benchmark=e,Bn(`benchmark`),A(),e}finally{Z(r,i,a),Q.observe(e.canvasHost),q(),Bn(`interactive`),A();let n={...w,listeners:D,observers:k};(!be(t,n)||t.renderbuffers!==n.renderbuffers)&&e.probe(`Three.js 0.185.1 GL-object growth across one benchmark run: ${JSON.stringify(we(t,n))}. Page 13 measures the same thing the same way, where vtk.js 36.12.1 leaks up to one texture and one framebuffer per drawing-buffer resize.`)}}let Hn=!1;function Un(){if(!Hn){Hn=!0,Q.disconnect(),--k,j.removeEventListener(`pointerdown`,Pn),--D;try{J.dispose();for(let e of I)e.upload.texture.dispose(),e.sliceTexture.dispose(),e.boxGeometry.dispose(),e.planeGeometry.dispose();nn.dispose(),rn.dispose(),an.dispose(),on.dispose(),U.dispose(),mn.dispose(),_n.dispose(),vn.dispose(),hn.dispose(),gn.dispose(),B.dispose(),N.dispose()}catch(t){e.probe(`Three.js teardown after context loss: ${t.message}`)}}}Ee(j,{probe:C,stopBenchmark:()=>zn.stop(),disposeGpuResources:Un,onLost:()=>{A(),e.fail(`The WebGL context was lost. Measurements from this session are no longer valid — reload to start a new one.`)}}),D+=1;let Wn=null,$=new Uint8Array(4);function Gn(t){if(!Wn){let t=e.canvasHost.getBoundingClientRect(),n=Math.max(1,Math.floor(t.width)),r=Math.max(1,Math.floor(t.height)),i=window.devicePixelRatio||1;Q.unobserve(e.canvasHost),Wn=()=>{Z(n,r,i),Q.observe(e.canvasHost)}}return Z(Me[0],Me[1],1),Y({...t,eye:Te(t)}),q(),A(),{width:Me[0],height:Me[1]}}function Kn(){Yn(!0),Qn(!1),Xn(!0),Zn(!0),$n(!1);let e=Wn;Wn=null,e?.(),Y(ye(0)),q(),A()}function qn(e,n){Nn.set(e*2-1,1-n*2),Mn.setFromCamera(Nn,F);let r=Mn.intersectObject(sn,!1)[0];if(!r||r.faceIndex===void 0||r.faceIndex===null)return{hit:!1,cellId:null,marker:null,sourceIndexes:null,dtccIds:null,traceability:null,world:null,distanceM:null};let i=r.faceIndex,a=S[i],o=ve(x,t.city.identityStability,a);return{hit:!0,cellId:i,marker:a,sourceIndexes:o.sourceIndexes,dtccIds:o.dtccIds,traceability:o.traceability,world:[r.point.x,r.point.y,r.point.z],distanceM:r.distance}}function Jn(e,t){q();let n=M.drawingBufferWidth,r=M.drawingBufferHeight,i=Math.min(n-1,Math.max(0,Math.floor(e*n))),a=Math.min(r-1,Math.max(0,Math.floor((1-t)*r)));return M.readPixels(i,a,1,1,M.RGBA,M.UNSIGNED_BYTE,$),[$[0],$[1],$[2],$[3]]}function Yn(e){K.visible=e,q()}function Xn(e){W.visible=e,q()}function Zn(e){sn.visible=e,q()}function Qn(e){e?(rn.color.setRGB(0,0,0),on.color.setRGB(0,0,0),N.setClearColor(new g(0,0,0),1),G.visible=!1,W.visible=!1):(rn.color.setRGB(.62,.62,.6),on.color.setRGB(.8,.78,.74),N.setClearColor(new g(.93,.93,.92),1),G.visible=!0,W.visible=!0),q()}function $n(e){Nt.value=e?1:.25+.6*Cn,q()}function er(e){let t=b(L.field,e)[0],[n,r]=wn();return{value:t,rgb:ge(t,n,r)}}let tr=null;function nr(){try{let e=L.field,[t,n,r]=E,i=rt(e,t,n,r),a=[e.origin[0]+Ne[0]*e.spacing[0],e.origin[1]+Ne[1]*e.spacing[1],e.origin[2]+Ne[2]*e.spacing[2]],o=Ce(e,t,n,r)[0],s=j.getBoundingClientRect();L.boxGeometry.computeBoundingBox(),L.planeGeometry.computeBoundingBox();let c=L.boxGeometry.boundingBox,l=L.planeGeometry.boundingBox,u=F.projectionMatrix.elements;return tr={schema:1,renderer:`threejs`,caseId:L.id,colourRange:wn(),sliceRequestedZ:R,opacityScale:Et.value,streamlinesVisible:W.visible,invariants:{fixedGridNode:{index:[t,n,r],world:i,value:o,bits:Pe(o)},interpolated:{world:a,value:b(e,a)[0]},fieldSpan:L.range[1]-L.range[0]},camera:{fovDeg:F.fov,aspect:F.aspect,near:F.near,far:F.far,projScaleX:u[0],projScaleY:u[5],eye:[F.position.x,F.position.y,F.position.z],target:[J.target.x,J.target.y,J.target.z],up:[F.up.x,F.up.y,F.up.z]},surface:{drawingBufferWidth:M.drawingBufferWidth,drawingBufferHeight:M.drawingBufferHeight,devicePixelRatio:window.devicePixelRatio,cssWidth:s.width,cssHeight:s.height,samples:Lt},volumeBounds:{min:[c.min.x,c.min.y,c.min.z],max:[c.max.x,c.max.y,c.max.z]},sliceBounds:{min:[l.min.x,l.min.y,G.position.z],max:[l.max.x,l.max.y,G.position.z]},depthTarget:{width:B.width,height:B.height,samples:B.samples,hasDepthTexture:!!B.depthTexture},librarySample:null,gpuSampleFloat:Xt.get(L.id)??null,parityNotes:[`invariants.* compare src/lib with itself. Both pages call probeGridNode and sampleGridTrilinear on the same Float32Array, so they are bit-identical by construction and can only fail if src/lib changes. They are INVARIANTS, not evidence that the two renderers agree numerically.`,`depthTarget is non-null here and null on page 13 because page 13 owns no PAGE-LEVEL depth target -- NOT because vtk.js does without one. Both renderers use THE SAME MECHANISM: opaque geometry into a depth texture, each volume ray clamped against it. vtkOpenGLVolumeMapper does it inside the library (the //VTK::ZBuffer::Impl substitution, dists.y = min(zdepth, dists.y)); this page does it by hand with an offscreen target, a DepthTexture and a reconstructed view distance. What differs is VENDORED versus HAND-WRITTEN, which is a maintenance-burden fact and not an architectural one.`,`gpuSampleFloat is non-null here and null on page 13: this page can run its own sampler GLSL against its own uploaded texture and read the float back, and vtk.js 36.12.1 exposes no supported equivalent. The GPU evidence the suite compares on BOTH pages is the rendered pixel (parity.pixelAt).`,`camera.projScaleX/projScaleY are each library's OWN projection matrix diagonal, and their absolute scale is NOT comparable between the pages: measured, vtk.js's getProjectionMatrix returns an unnormalised matrix (396.5 / 1031.6 where three returns 1.43 / 3.73 for the same 30 degree vertical fov). Their RATIO is comparable and is the aspect ratio, which is what the suite compares.`,`volumeBounds and sliceBounds are NODE extents on both pages. Page 13 reads vtk.js's own stored image origin/spacing/dimensions rather than vtkImageData.getBounds(), which pads by half a voxel at every face; this page reads the box and plane meshes' real vertex bounding boxes. The two are directly comparable and are held to ALIGNMENT_TOLERANCE_M.`,`librarySample is null here and non-null on page 13: vtkImageData.getScalarValueFromWorld is a second, library-owned world->value implementation. Three.js ships nothing of the kind, which is why this page's axis-order evidence is a GPU round trip instead.`]},tr}catch(e){return tr??{schema:1,renderer:`threejs`,unavailable:e.message}}}let rr=e.canvasHost.getBoundingClientRect();Z(Math.max(1,Math.floor(rr.width)),Math.max(1,Math.floor(rr.height)),window.devicePixelRatio||1),X(),Tn(),Y(ye(0)),q();for(let e of I)z(e),K.geometry=e.boxGeometry,G.geometry=e.planeGeometry,N.compile(H,F),N.compile(en,F),q();z(L),K.geometry=L.boxGeometry,G.geometry=L.planeGeometry,X(),Tn(),q(),e.setReadout(`Data case`,`${L.id} (${L.unit}), grid ${L.field.dims.join(`×`)}`),An(Ae),A();let ir=ft(t,S);Bn(`interactive`);let ar=Ze();e.setProbe(`glslBurden`,ar),pt(e,t,I,ir,{streamlineCount:ln,streamlinesDropped:un,gpuTimer:!!Fn,sliceWorstPa:$t,pressureSpan:Qt,glsl:ar,floatLinear:ut,worstGpuDelta:V,opaqueTargetSamples:B.samples}),e.setProbe(`field`,!0),e.setProbe(`apis`,ze),Object.assign(window.__bench,{markers:ir,selectCell:An,setReadout:e.setReadout,controlCalls:Be,runBenchmark:Vn,sliceGeometry:()=>({requestedZ:R,renderedZ:Jt,dims:[L.sliceTexture.image.width,L.sliceTexture.image.height,L.sliceValues.length/(L.sliceTexture.image.width*L.sliceTexture.image.height)],originZ:L.field.origin[2],nodeSpacingZ:L.field.spacing[2]}),parity:{begin:Gn,end:Kn,pickAt:qn,pixelAt:Jn,setVolumeVisible:Yn,setStreamlinesVisible:Xn,setBuildingsVisible:Zn,isolateVolume:Qn,setSliceOpaque:$n,sampleCpu:er,framesRendered:()=>Rn}}),e.ready()}function ft(e,t){let n=e.city.objects,r=0,i=0,a=0;for(let e of n.values())e.sourceIndexes.length===0?i++:(r++,e.sourceIndexes.length>1&&a++);let o=-1,s=-1,c=-1;for(let e=0;e<t.length;e++){let r=n.get(t[e]);if(r){if(r.sourceIndexes.length===0){s<0&&(s=e);continue}o<0&&(o=e),r.sourceIndexes.length>1&&c<0&&(c=e)}}return{total:n.size,attributed:r,unattributed:i,multiSource:a,attributedCell:o,unattributedCell:s,multiSourceCell:c}}function pt(e,t,n,r,i){let a=t.smoke.grid,o=t.manifest.coordinateFrame.localBounds;e.probe(`objects: ${r.total} markers — ${r.attributed} attributed (${r.multiSource} standing for more than one source building), ${r.unattributed} split-added with no source building at all. identityStability=${t.city.identityStability}, so canonical DTCC traceability has failed on this tile.`),e.probe(`associations, passed through from Core verbatim: smoke.grid=${JSON.stringify(a.association)}, smoke.slice=${JSON.stringify(t.smoke.slice.association)}, smoke.streamlines=${JSON.stringify(t.smoke.streamlines.association)}, heat=${JSON.stringify(t.heat.grid.association)}. A null here is Core's own answer, not a missing value.`),e.probe(`streamlines: ${i.streamlineCount} polylines drawn from ${t.smoke.streamlines.vertexOffsets.length-1} declared (${i.streamlinesDropped} dropped as degenerate), ${t.smoke.streamlines.positions.length/3} vertices total. Core precomputed every vertex; this page walks vertexOffsets and emits segments, and integrates nothing.`);let s=[a.origin[0]+a.spacing[0]*(a.dims[0]-1),a.origin[1]+a.spacing[1]*(a.dims[1]-1),a.origin[2]+a.spacing[2]*(a.dims[2]-1)],c=x(a.origin,[o[0],o[1],o[2]]),l=x(s,[o[3],o[4],o[5]]);e.probe(`alignment landmarks (tolerance ${Oe} m): smoke grid origin vs localBounds min = ${c.toFixed(4)} m; far corner vs localBounds max = ${l.toFixed(4)} m.`);let u=t.smoke.slice;e.probe(`Core FieldSlice vs the volume grid, trilinear at the same ${u.resolution}x${u.resolution} world points, z=${u.fixedLocalCoordinate} m, on PRESSURE: worst |dp| = ${i.sliceWorstPa.toExponential(3)} Pa against an interpolated tolerance of ${S(i.pressureSpan).toExponential(3)} (span ${i.pressureSpan.toFixed(3)}). Asserted, not reported. Pressure and not speed because the shipped speed field is bit-identically z-invariant (max |f(z) - f(z=0)| = 0.0 against 12.02 for pressure), so a speed cross-check has no power at all over the z axis.`);for(let t of n)e.probe(`${t.id}: grid ${t.field.dims.join(`x`)}, asserted before any mesh existed on three legs — the upload declaration, the payload invariant (the texture must be backed by the shipped array itself), and a GPU round trip through the scene's own sampler GLSL at asymmetric interior nodes, plus the placement of the volume box and slice plane against the grid they claim to cover.`);e.probe(`What the three legs can and cannot do, corrected after review, because the first version of this panel credited a leg that could not fail. Leg A pins the DECLARATION: the texture's own dims and the live shader uniforms against the shipped grid, by exact equality. Leg B is now the PAYLOAD invariant and nothing more -- the texture must be backed by the shipped array itself, since Data3DTexture holds its array by reference, so any reordering or re-typing on the way to the GPU means a different array object and fails here. Leg C proves the SAMPLER, by running the scene's own VOLUME_SAMPLE_GLSL on the real texture and reading the result back; it is the only leg that can see a wrong texcoord formula, filter or swizzle, and it is strictly more than page 13 has. What was REMOVED: leg B used to recompute the world -> texel -> offset arithmetic and compare it against gridNodeIndex, then read the uploaded array at that offset and compare against probeGridNode. Both were algebraic identities given leg A's exact equalities and Data3DTexture's by-reference storage -- confirmed over all 163,840 nodes of both shipped grids with 0 mismatches and no upload defect able to make either fire. That is page 13's tautology restated sideways, and it is gone rather than dressed up. What REMAINS unchecked, stated plainly: whether the shipped bytes are in the order they claim is a declaration question, answerable only against a second decode of the file, which nothing here does.`),e.probe(`GPU sampling round trip: worst |delta| between what probeGridNode reads and what the scene's own sampler GLSL returns for the same world point, over every case and every probe node, is ${i.worstGpuDelta.toExponential(3)} in field units. Not bit-exact, and it cannot be: (world - origin) / spacing does not land on an exact integer for these irrational spacings, so the sampler interpolates by a vanishing weight. Held to the repo's interpolated tolerance (1e-5 * max(span, 1)); the negative control that drops the half-texel centring term moves a probe by half a node and fails by orders of magnitude.`),e.probe(`Axis-order gap, stated rather than papered over: whether a shipped payload is in the order it claims is a DECLARATION check, not something any browser-side probe can derive from the bytes. The smoke grid ships "order": "x-fastest,y,z-slowest" and scientific-data.ts asserts it against GRID_ORDER. field.grid.json ships no "order" field at all -- scripts/real/sample_field.py writes the heat grid x-fastest (its own comment says so) but does not record it. Adding it needs sample_field.py plus a regenerated scientific-manifest.json, whose dependency record hashes field.grid.json; that is an artifact-regeneration task, not a page change.`),e.probe(`Negative controls, run against this page and measured, not asserted from the armchair. Each was applied one at a time to the shipped source, rebuilt, and loaded:
  (1) dims handed to Data3DTexture permuted to (nz, ny, nx): leg A throws on heat - temperature (texture dims [32,64,64] vs [64,64,32]) and is a GENUINE NO-OP on the 32x32x32 smoke cube, which is the stated limit.
  (2) payload reordered z-fastest, dims/origin/spacing left correct: leg A passes, leg B throws. Read the reason honestly: it fires because reordering a payload means ALLOCATING A DIFFERENT ARRAY, which is exactly the invariant leg B now states, and not because any arithmetic detected the transposition. The earlier version of this control was reported as node-level offset/value disagreement (2.1591 expected, 2.1353 uploaded), which made a tautological check look discriminating.
  (2b) payload transposed x<->y, dims untouched: same leg, same reason. Worth keeping separately because x<->y is invisible to every DECLARATION check on both shipped grids.
  (3) half-texel centring dropped from the shared sampler GLSL: legs A and B pass, leg C throws off by 1.8694e-1 against a 1.1032e-4 tolerance -- 1700x the bound.
  (3b) applyCaseUniforms mis-wired to write uSpacing into uOrigin: leg A throws, naming both. The earlier version of leg A, which compared the upload RECORD against the field, could not have caught this -- it read two expressions that are copies of each other. Reading the live uniform objects is what made it a real check.
  (3c) volume box mesh translated 100 m in x: the placement leg throws, naming the corner and the 100.0000 m. That is the one link the sampler legs cannot see -- they prove the sampler answers correctly for a world point handed to it, not that the ray asks about the right world points.
  (4) slice plane filled b-fastest: the slice leg throws at node (2,1).
  (4b) the slice sampler's V flipped in the ONE shared SLICE_SAMPLE_GLSL string: the slice GPU leg throws, 7.94 off at uv (0.032, 0.032). This control exists because review pointed out that the plane's UV -> world mapping was relying silently on three's PlaneGeometry convention; it is now asserted per vertex as well.
  (9) the streamline walk changed to emit a segment from each vertex to the next across line boundaries: throws, 4073 segments emitted where 4049 is the only count that does not join one polyline to the next. scientific-data.ts already validates vertexOffsets against actualCount, [0] === 0, monotonicity and seedIndices range before this page sees the array, so this was the one failure mode left.
  (5) Core FieldSlice a/b order transposed: 24.691 Pa against a 8.2015e-4 tolerance, the same number page 13 records for the same control.
  (6) the one-pixel readback stripped from the benchmark's frame completion: cpu mean 0.17 ms against a gpu mean of 133.25 ms, a 780x overstatement, and the smoke test's cpuMean > 0.5 * gpuMean assertion fails. Page 13 measured 0.45 ms against 95 ms for the same defect.`),e.probe(`Structural limit on both pages, restated rather than rediscovered: permuting x and y in a grid DECLARATION is a genuine no-op on both shipped grids (32x32 and 64x64 in x/y, and the heat grid's x and y spacings are equal too), so no declaration check can see it. What this page adds over page 13 is that a transposed PAYLOAD, x<->y included, is caught: leg B pins the texture to the shipped array itself, so any reorder is a different array, and leg C reads values back through the GPU at asymmetric nodes on a field that is not x/y symmetric. Page 13's legs compare offsets and could not.`),e.probe(`GLSL this page owns, measured not estimated. ${i.glsl.perShader.length} shaders, ${i.glsl.totalLines} non-blank lines, ${i.glsl.compiledLines} substantive lines as compiled, ${i.glsl.distinctLines} DISTINCT substantive lines -- the last is the maintenance surface, since the colormap and the volume sampler are one string each included by more than one shader. Against three/addons/shaders/VolumeShader.js (${i.glsl.stockSubstantiveLines} substantive lines): ${i.glsl.identicalToStock} lines are textually identical, but every distinct one of them is boilerplate (${JSON.stringify(i.glsl.identicalLines)}), so lines REUSED VERBATIM = ${i.glsl.reusedFromStock}.\nThat zero is a line-intersection metric and it would be dishonest to leave it as a maintenance-burden statement, so here is the structure behind it. Of the ${i.glsl.distinctLines} distinct lines owned, about 11 are the shared five-stop colormap (src/lib/colormap.ts's COLORMAP_GLSL -- shared-library code that this count charges to this page) and about 5 are verification scaffolding that never runs in a frame. What is genuinely NEW is the front-to-back compositor and the opaque depth stop: the addon does maximum-intensity and isosurface casting only, with no transparent compositing and no interaction with opaque geometry. What is NOT new, merely re-typed rather than reused, is the addon's own algorithm skeleton -- the slab ray/AABB intersection, the bounded march with a hard MAX_STEPS and an in-loop break, the clim normalisation, the sample-helper factoring, the half-texel centring and the terminal alpha discard. And \`#include <packing>\` pulls perspectiveDepthToViewZ out of three's own chunk library, which is real reuse this count does not see -- so compiledLines is not "what the GPU sees" either. Task 8 should read this as: the compositor and depth stop are ours to maintain, the ray-march skeleton is a re-typed library algorithm, and roughly a fifth of the owned lines are shared or test-only.`),e.probe(`Resource behaviour, measured on both pages in one session through the same instrumentation: THREE.JS DOES NOT LEAK PER DRAWING-BUFFER RESIZE. This page holds 37 buffers / 12 textures / 5 framebuffers / 2 renderbuffers from ready onward -- flat across three whole benchmark runs (two surface changes each), flat across 100 control cycles, and flat across eight viewport resizes. vtk.js 36.12.1, measured the same way at the same time, goes 9/8/1 at ready to 9/14/7 after three benchmark runs, one texture and one framebuffer per resize, monotonically, never returned.
A FOURTH OBJECT TYPE was added after review and it makes vtk.js's leak a third larger than first reported: renderbuffers leak per resize as well, so the shape is one texture + one framebuffer + one renderbuffer per resize rather than two objects. This page allocates exactly 2 renderbuffers in total, both belonging to the multisampled opaque target, and neither moves. The direction of the comparison is unchanged; its magnitude was understated.`),e.probe(`Nothing moves the counts after ready, and getting there took two fixes worth recording. Three.js uploads a geometry's attribute buffers lazily, on the first render that uses them, so the first switch to each cold case used to allocate 8 buffers at that moment: 21 -> 37 over 100 control cycles, where page 13 was flat at 9. Not a leak -- bounded by the three cases, reported live and correctly -- but the spike's gate is worded "100 control/resize cycles with stable resource counts" and a one-off warm-up cost fails it for the wrong reason, so every case is now compiled and drawn once before ready() and the counts are flat from there. Before that, the same measurement caught this page publishing BEFORE the render that allocates in setCase, reporting 21 where the truth was 29 -- page 13's residual defect in a new place, found by measuring a case switch rather than by reading the code, and fixed by publishing after the render.`),e.probe(`Frame times, three runs per page, measured side by side in one session, both pinned to 1280x720, orbit-v1, 30 warmup + 180 forced frames, software rasterizer (ANGLE/SwiftShader), 180/180 GPU samples kept throughout. Reported as p50, which is the robust statistic here -- the means carry a long tail from the rasterizer (p95 runs 189-212 ms).
  THIS PAGE (Three.js): cpu p50 153.5 / 148.3 / 151.2 ms, median of medians 151.2 (means 161.0 / 153.6 / 155.7).
  PAGE 13 (vtk.js):     cpu p50 152.8 / 154.2 / 150.2 ms, median of medians 152.8 (means 158.0 / 162.1 / 156.6).
ON EQUAL TERMS THE TWO RENDERERS ARE INDISTINGUISHABLE ON THIS SCENE. This page measured them about 1% apart; an independent re-measurement on another machine put them 2.4% apart with a within-page spread under 1.5 ms, which means the separation can EXCEED the run-to-run spread. So the honest reading is "a few percent apart on a software rasterizer, indistinguishable for a decision", NOT "inside the noise" -- the conclusion is the same, there is no winner, but the reason is scale, not variance. CPU and GPU agree to within 0.2% on both, which is the signature of a frame that was actually waited on rather than merely submitted.
These numbers REPLACE the ones this page published before review, and the correction is the point: at one sample in the opaque pass this page measured p50 142.7 against page 13's 160.4 and would have reported a ~12% Three.js advantage. That advantage was this page rasterizing terrain, buildings and streamlines at one sample while page 13 rasterized them at four. Sampling the opaque pass at the canvas's own count closes it entirely. A software rasterizer says nothing about a hardware GPU; what these support is the RATIO between two renderers doing identical work, and the ratio is 1.`),e.probe(`TASK 7 PARITY SURFACE, published as window.__bench.probe.parity with the same shape on both pages, plus the primitives window.__bench.parity.{begin, end, pickAt, pixelAt, setVolumeVisible, setStreamlinesVisible, setBuildingsVisible, isolateVolume, setSliceOpaque, sampleCpu, framesRendered}. READ THE SPLIT, because it is the whole point of the object: parity.invariants.* (the fixed grid node and its float32 bits, the interpolated value, the field span) compare src/lib WITH ITSELF -- both pages read the same Float32Array through the same probeGridNode and interpolate through the same sampleGridTrilinear, so they are bit-identical by construction, cannot fail unless src/lib changes, and are NOT evidence that the two renderers agree numerically. Everything else in the object is measured off this renderer's own objects: the camera and its projection, the drawing surface and its sample count, where the volume and the slice actually sit in this scene, and the library's own world->value answer. Where a field is null the other renderer has something this one genuinely has not, and parityNotes says which and why -- the suite asserts the nulls rather than skipping them.`),e.probe(`What the parity suite (tests/scientific.spec.ts) actually compares between the two renderers, as opposed to what merely looks comparable: a REAL ray-cast pick at the same fraction of the same pinned 1280x720 surface under the same camera (vtkCellPicker on page 13, Raycaster.faceIndex on page 14 -- two independent intersection implementations over one index space); the PIXEL each renderer's own shader wrote for a known world point on the slice plane, against the shared colormap's answer; the volume accumulated along a ray with and without an opaque building in it, measured against a black background so the number is the volume's own contribution and not partly the background's; GL-object growth over 100 control cycles and ten resizes, bounded PER RENDERER because the two genuinely differ; and what each library tears down when the context is lost. selectCell(id) compared between the pages is none of these -- it is the shared lookup compared with itself.`),e.probe(`GPU timing: EXT_disjoint_timer_query_webgl2 ${i.gpuTimer?`available — gpuFrameTimesMs will be recorded`:`unavailable — gpuFrameTimesMs stays null`}. Run window.__bench.runBenchmark() for orbit-v1 (30 warmup + 180 forced frames). cpuFrameTimesMs is wall time for a COMPLETED frame: each forced render ends in a one-pixel readback, because gl.finish() alone returns before the frame is drawn under ANGLE/SwiftShader and reported a 0.45 ms frame against the GPU timer's 95 ms on page 13.`),e.probe(`DIVERGENCES from page 13, with reasons, so Task 7 can tell a renderer difference from a page difference:
1. FORCED — volume rendering. vtk.js ships vtkVolumeMapper; Three.js ships no volume renderer at all. The front-to-back compositor, its opacity ramp (the same 0 / 0.05*scale / 0.6*scale piecewise function page 13 hands vtkPiecewiseFunction) and its ${Fe} m step (page 13's setSampleDistance(${Fe})) are written here.\n2. FORCED, and CORRECTED at review — depth interaction. The first version of this entry said vtk.js "composites its volume against opaque geometry inside one render pass", implying it needs no depth prepass and this page invented one. THAT IS WRONG, and it is the kind of wrong that becomes a maintenance-burden conclusion: vtkOpenGLVolumeMapper renders opaque geometry to a depth texture and clamps every ray against it in the //VTK::ZBuffer::Impl substitution, dists.y = min(zdepth, dists.y). BOTH RENDERERS USE THE SAME MECHANISM. What is forced here is writing it: terrain, buildings, streamlines and the slice render into an offscreen target with a depth texture, that colour is blitted to the canvas, and the volume shader reconstructs the opaque view distance and stops each ray there. One WebGLRenderer, one canvas, two passes. The honest burden statement is VENDORED versus HAND-WRITTEN, not "vtk.js does not need this".
3. NOT a divergence any more, and the correction that matters most on this page: the offscreen opaque target is multisampled at the canvas's own sample count (measured ${i.opaqueTargetSamples}, read from gl.SAMPLES rather than hard-coded), so terrain, buildings and streamlines are rasterized here with exactly the multisampling page 13 gets from its antialias:true canvas. The first version of this page left the target single-sampled and told you that was FORCED, because "a multisampled target cannot hand a depth TEXTURE to the volume pass". That is false for three 0.185.1: WebGLTextures.updateMultisampleRenderTarget blits depth into the single-sample framebuffer whose depth attachment is the DepthTexture, guarded by resolveDepthBuffer, which defaults true. The cost of the mistake was the headline number: at one sample this page measured p50 142.7 ms against page 13's 160.4 ms and would have published "Three.js draws the same scene ~12% faster", when what it had actually measured was this page drawing the city at one sample and page 13 drawing it at four. See the frame-time probe for the numbers on equal terms.
4. FORCED — lighting. vtk.js lights a renderer automatically with a headlight; Three.js has no default lighting, so this page adds one ambient and one directional light. Same two flat greys.
5. FORCED — streamline width. Page 13 sets lineWidth 2; WebGL implementations may ignore any width but 1 and Chrome's does, so these lines are one pixel wide.
6. FORCED — picking. vtkCellPicker resolves a cell through the polydata's own cell data; Three.js's Raycaster returns a faceIndex and knows nothing about attached arrays, so the marker lookup reads the shipped cellObjectIndex directly. Same array, same index space, asserted at startup.
7. FORCED — axis-order check shape. vtk.js supplies getOffsetIndexFromWorld as a second world-to-offset implementation; Three.js supplies nothing of the kind. Writing that second implementation here was tried and DELETED at review: with the declaration already pinned by exact equality it reduced to gridNodeIndex compared with itself. What stands instead is the payload invariant plus a GPU round trip through the scene's own sampler.
8. CHOSEN for parity — colour management off and outputColorSpace linear, so the shared five-stop ramp reaches the drawing buffer as the same numbers vtk.js writes. Three.js would otherwise apply an sRGB conversion page 13 does not, and Task 7 would be comparing colour pipelines.
9. FORCED — clipping range. Three.js has no resetCameraClippingRange, so near/far are pinned to [${Ie}, ${Le}] m, covering the tile and the orbit radius. Depth precision is therefore constant across a run here and recomputed per frame on page 13.
10. MEASURED, not chosen — canvasCount after context loss. vtk.js's teardown removes its canvas from the DOM and page 13 reports 0; Three.js's renderer.dispose() releases GPU resources and leaves the element, so this page reports 1. Both numbers are live DOM counts.
11. MEASURED — GL counters are installed one step earlier here: this page creates its own WebGL2 context (with vtk.js's own attribute set, RenderWindow.js:178-182) and instruments it before WebGLRenderer sees it, where page 13 can only wrap after vtkFullScreenRenderWindow exists. That caveat was over-cautious and is withdrawn: counters installed on the prototype before any page script returned EXACTLY the numbers each page reports for itself, at every snapshot on both pages, so the later wrap misses nothing. Absolute baselines ARE comparable between the pages, as well as growth.
12. NOT a divergence, and stated because it looks like one: the INTERACTIVE drawing buffer is 1280x492 on both pages at the suite's 1280x800 viewport. That is a coincidence of how two different headers happen to wrap, not a guarantee, and it is exactly why both pages pin the surface to 1280x720 for the benchmark rather than trusting it. Verified by measurement rather than by reading the code: at a 900x640 viewport the interactive drawing buffer is 900x198, it reads 1280x720 while runBenchmark is in flight, and 900x198 again after it returns.
13. MEASURED — 3D texture filtering is ${i.floatLinear?`linear (OES_texture_float_linear present)`:`NEAREST: OES_texture_float_linear is absent`}. Recorded because it changes what the volume looks like between machines.
14. MEASURED, and undeclared in the first version of this ledger: this page calls publish() at the end of every control handler (slice height, colour range, opacity, streamlines, camera reset); page 13's equivalents only render. That is the same shape as the defect closed on page 13's RESIZE path in ce187bf, still present on its control paths and silently fixed here. It changes no number today -- measured, vtk.js allocates nothing on a control path, so the two pages agree -- but it is a real difference in the __bench surface Task 7 joins on and it belongs in this list rather than in a commit message. NOW CLOSED: the Task 6 residual added publish() to page 13's control handlers, so both pages refresh alike. No number moved — vtk.js allocates nothing on those paths, measured before and after the change.
15. LIMITATION, same on both as far as this page can tell: the volume ray stops at OPAQUE depth, so the translucent slice does not attenuate volume behind it. Page 13 draws its slice as a translucent vtkImageSlice actor, which is also not in the volume mapper's depth input, but that has not been measured here and is not claimed.
16. MEASURED — what happens to an in-flight benchmark when the context is lost. Three.js: attachContextLoss calls driver.stop(), the loop exits at the next frame boundary and the driver RESOLVES with the partial samples it had. vtk.js: fs.delete() tears the render window down under the running loop, so the very next renderFrame throws and the run REJECTS ("Cannot read properties of undefined (reading 'getChildRenderWindowsByReference')"). Either way the 180-frame measurement does not happen and measurementValid is false; the two behaviours are different and Task 7 asserts each rather than accepting whichever one turns up.
17. NOT A RENDERER DIFFERENCE, and logged here because it changes what the context-loss claim means: on a browser with no EXT_disjoint_timer_query_webgl2 a benchmark run CANNOT BE INTERRUPTED AT ALL. createBenchmarkDriver (src/lib/scientific-probes.ts) awaits a real macrotask once per measured frame only inside the GPU timer's readResult; with no timer its 210-frame loop is one unbroken microtask chain, the queued webglcontextlost event is never delivered until the loop ends, and driver.stop() stops nothing. MEASURED ON FIREFOX (which exposes no such extension): both pages returned all 180 frames AFTER the context was lost. measurementValid is false, so the samples cannot be quoted -- but "sampling stopped on context loss" is true on chromium and false on firefox, and the fix would be in src/lib, which no page task owns.
18. MEASURED, browser matrix — firefox on this machine runs WebGL on the real GPU (RENDERER "Apple M1, or similar") where chromium is pinned to ANGLE/SwiftShader, so the same two pages measure p50 4-5 ms there against 167-183 ms here. Still no winner between the renderers on either engine, and the software numbers remain the comparable ones because both pages pay the same rasterizer. Firefox also reports SAMPLES 4, OES_texture_float_linear and EXT_color_buffer_float, so nothing in either scene falls back there. WebKit is OUT OF SCOPE and untested; Task 9 must say so rather than say "browsers".
`)}function mt(e){let t=e.getExtension(`EXT_disjoint_timer_query_webgl2`);if(!t||typeof e.createQuery!=`function`)return;let n=null;return{beginFrame(){n=e.createQuery(),n&&e.beginQuery(t.TIME_ELAPSED_EXT,n)},endFrame(){n&&e.endQuery(t.TIME_ELAPSED_EXT)},async readResult(){let r=n;if(n=null,!r)return null;for(let n=0;n<64;n++){if(e.getQueryParameter(r,e.QUERY_RESULT_AVAILABLE)){let n=!!e.getParameter(t.GPU_DISJOINT_EXT),i=e.getQueryParameter(r,e.QUERY_RESULT);return e.deleteQuery(r),{ms:i/1e6,disjoint:n}}await new Promise(e=>setTimeout(e,0))}return e.deleteQuery(r),null}}}