# engine-bench notes

## Environment

maplibre-gl pinned to 5.24.0: @deck.gl/mapbox 9.4.0 interleaved mode reads `map.transform`, removed from `Map` in maplibre-gl 6.x (verified: 6.8.0 `map.transform === undefined`). Spec §2 says 5.x.

## Briefing corrections

- deck.gl 9.4.0 ScenegraphLayer does not render glTF COLOR_0 (stock vertex shader declares no colour attribute); B2 "works in every viewer today" holds for the mesh path (SimpleMeshLayer / Tile3DLayer mesh content), not the glTF path.
- Pages 02/03 are titled "floats" after the briefing's wording, but the synthetic hill is ≥ 5 m above sea level everywhere, so sea-level geometry is buried, never floating; the mechanism (MapLibre never drapes `custom` layers) is the same. The page bodies say "buried".

## Findings

- Page 08 (`field-baked.glb`, COLOR_0 = baked RGB, no `_TEMPERATURE`): right copy (SimpleMeshLayer) renders coloured — blue-to-red gradient with a red/yellow hot spot. Left copy (ScenegraphLayer) renders plain white/grey; COLOR_0 never reaches its GPU buffer at all. Probe: `simpleMesh = {inBufferLayout: true, inShaderLayout: true, inVsSource: true}` (probed as `colors`), `scenegraph = {inBufferLayout: false, inShaderLayout: false, inVsSource: false}` (probed as `COLOR_0`). Buffer-layout names printed to the probe panel: SimpleMeshLayer → `geometry, instancePositions, instanceColors, instanceModelMatrix` (colors folded into the interleaved `geometry` entry's nested attributes); ScenegraphLayer → `instancePositions, instanceColors, instanceModelMatrix, geometry` (its `geometry` entry has no colour attribute at all — stock scenegraph-layer-vertex.glsl.ts never declares one). So B2 stands for the mesh path only.
- Page 07 (fix B1): on deck.gl 9.4.0 the fix is one `getShaders()` override plus a `draw()` override to feed the uniform — patch the two stock vertex anchors (`in vec3 positions;`, `void main(void) {`) and the flat-path fragment assignment, append a 2-float uniform-block module, and `_TEMPERATURE` binds and colours. No buffer-layout entry was needed (the attribute already reaches the model's `bufferLayout`), and `src/lib/probe.ts` needed no change: once the attribute is declared and used, WebGL program introspection puts it in `model.pipeline.shaderLayout.attributes`, so the probe flips to `{inBufferLayout: true, inShaderLayout: true, inVsSource: true}` on its own. One trap the briefing's "genuinely small" hides: the fragment shader has three `fragColor = ...;` assignments (PBR, textured flat, flat) — a naive first-match replace patches the dead PBR branch and leaves the surface uncoloured, so the anchor must be the exact `fragColor = vColor;`, and each anchor needs its own no-op guard.
- Implementation note (not a briefing correction): `loadGltfMesh` (`src/lib/deck-map.ts`) previously dropped the glTF accessor's `normalized` flag when building each `Attr`, which crashed `SimpleMeshLayer` on `field-baked.glb`'s normalized Uint8 VEC3 `COLOR_0` (`Error: size: 3` from luma.gl's `VertexFormatDecoder`, deck.gl 9.4.0 / loaders.gl `@loaders.gl/gltf`). Fixed at the source: `loadGltfMesh` now carries `a.normalized` through into every returned `Attr`, so page 08 needs no page-local workaround.
- Page 11 (@kitware/vtk.js 36.12.1): the plan's opacity transfer function (10→0, 20→0.02, 35→0.35) accumulated enough opacity from the 10–20 °C ambient field to hide the isosurface at every slider value above ~15 °C; retuned to 10→0, 20→0.002, 28→0.02, 35→0.12. vtk.js volume + surface compositing works; the defect was the numbers.
- Page 12 (PlayCanvas 2.22.0, `field-baked.glb`): contrary to the task facts' assumption ("PlayCanvas 2.22.0 ignores glTF COLOR_0 unless the material sets diffuseVertexColor"), the mesh rendered with correct vertex colours (blue-to-red gradient with a red/yellow hot spot) straight out of `instantiateRenderEntity()` — no material patch needed. Verified directly: built and screenshotted the page once with a `meshInstance.material.diffuseVertexColor = true; material.update();` loop applied after instantiation, and once with that loop entirely removed; the two screenshots were visually identical. `pc.Application` (deprecated in favour of `AppBase`/`createGraphicsDevice` but still present in 2.22.0) initialised and rendered cleanly under Playwright/SwiftShader with zero console errors either way, so this version's `ContainerHandler`/glTF parser must already set `diffuseVertexColor` on generated materials when a primitive has `COLOR_0`. Page 12 therefore ships without any vertex-colour workaround.
- Page 10 (Cesium `VoxelPrimitive`, 1.145.0): the volumetric renderer is real and does render our 64×64×32 float grid, but "working volumetric renderer" understates the assembly. (a) `VoxelProvider` is an interface with an instantiation-throwing constructor and no public concrete implementation for in-memory data — the only shipped one is `Cesium3DTilesVoxelProvider`, which wants a 3D Tiles tileset with `EXT_primitive_voxels`/`EXT_structural_metadata` glTF content. Feeding a plain `Float32Array` means hand-rolling an object with 17 properties (`shape, dimensions, names, types, componentTypes, minimumValues, maximumValues, globalTransform, shapeTransform, minBounds, maxBounds, paddingBefore, paddingAfter, maximumTileCount, availableLevels, requestData`, plus the optional `metadataOrder`) that Cesium reads as plain properties, and both `VoxelPrimitive` and `VoxelProvider` are marked `@experimental` — outside the deprecation policy. (b) It is expensive: the ray-march runs at roughly one frame per second at 1280×800 under Playwright's SwiftShader, enough to starve the globe's own tile refinement, so page 10 adds the primitive only after the terrain has settled. `stepSize` (1 → 8) changes nothing there; the cost is shader-bound, not step-bound. (c) The volume is drawn as a full-screen ray-march compositing front-to-back, so the briefing's mental model of "the hot core shows red" needs `depthTest = false` (the hottest air in our field is at ground level, i.e. inside the hill) and a steeper opacity ramp than the obvious one — at `alpha = t²·0.9` the ray saturates on the cool near side and the core never reaches the screen. Even at `t³·0.35` the front-to-back composite still dilutes the handful of peak voxels with everything in front of them, so at any legible opacity the core reads amber, not the red the top of the colour scale implies.
- Real tile `gothenburg-skansen-kronan` (500 m box, EPSG:3006 [318369, 6398890, 318869, 6399390],
  relief 53.5 m, 217 footprints / 215 buildings), pages 01/02/03. Page 01's `fill-extrusion` drapes
  correctly on real data: every footprint stands where the DEM puts it, and toggling Terrain moves
  the whole city with the ground. Pages 02 and 03 draw the same buildings re-based to z = 0 and
  produce the *same* buried silhouette as each other, so the mechanism (MapLibre never drapes a
  `custom` layer) reproduces exactly. The visual is milder than the synthetic page — most buildings
  keep something above ground instead of five of six vanishing — but not for the reason the plan
  gave. The plan expected "buildings on low ground stand clear, only the ones on the hill get
  buried". Measured against the DEM: the terrain
  under a footprint centroid is 0.40 m at its lowest, median 3.57 m, mean 5.57 m, max 52.80 m,
  while the buildings are 2.50–28.26 m tall (median 8.69 m). So nothing stands clear — the tile's
  local zero is an empty low corner of the DEM, not where the city is. Every one of the 217 has at
  least 0.4 m of ground over its base; 60 of 217 vanish completely (roof at or below the terrain
  over their own centroid), including all 8 that stand on ground above 20 m; across all 217 the
  median building keeps 4.5 m of its 8.7 m height above the local ground, i.e. roughly half.
  (Counts are from `footprints.geojson` + `terrain-rgb.png`, the LOD0 heights; pages 02/03 draw the
  LOD1 mesh, so treat them as the shape of the result, not as a per-triangle census.) Vertex-level,
  on the drawn mesh: 19,030 of 20,726 vertices are lowered by more than 1 m when `buildings` is
  flattened into `buildings-flat` (median drop 2.93 m, mean 6.56 m, max 55.47 m).
- Framing confirmed: `zoom = 14.2 + Math.log2(EXTENT / extent)` = 16.2 frames the real 500 m tile the
  same way 14.2 frames the synthetic 2000 m one — far tile corner high in the canvas, near edge
  running off the bottom, in both. Spec §7's parenthetical "15.2" would have been a full zoom level
  too wide. No retune needed.
- Page 02's probe said "sea-level geometry is below ground here". The real tile's DEM bottoms out at
  exactly 0.000 m (it is `z0` by construction), so at the low point z = 0 geometry is *at* ground,
  not below it. Reworded to "z = 0 geometry is nowhere above the ground here — buried, never
  floating", which is exactly true on both datasets.
- Pages 01/02/03 `expect:` lines were written for the synthetic six blocks ("five vanish inside the
  hill and one just pokes through") and are false on the real tile. Made dataset-aware, with the
  real branch describing what the screenshot shows. The remaining ten pages still carry
  synthetic-only `expect:` text on `?dataset=real`; Task 12 Step 3 sweeps them.
- **Defect, found but not fixed here — `blocks.glb` on the real dataset carries torn geometry.**
  `flatten_buildings` (`scripts/real/stage1_build.py:169`) loops over face markers and does
  `positions[verts, 2] -= positions[verts, 2].min()` per marker. Adjacent buildings in the DTCC
  surface mesh share vertices — the `buildings` submesh is 103 connected components for ~215
  buildings — so a vertex shared by two markers is lowered twice, by two different amounts, and the
  triangles around it stretch. Measured: 11,171 of 37,672 triangles in `buildings-flat` have their
  three vertices moved by amounts differing by more than 1 m (7,421 by more than 5 m, max 50.34 m);
  the tallest vertical triangle edge grows from 16.59 m in `buildings` to 50.34 m in
  `buildings-flat`. On screen it shows as spikes and cones where a clean building stands in page 06
  (`blocks-draped.glb`, the un-flattened copy) — clearest at the hilltop, where page 06 draws a
  clean octagon and pages 02/03 draw a 50 m cone. It is hidden in the shipped page 02/03 screenshots
  because the hill buries it. It does not change what those pages demonstrate, but `blocks.glb` is
  not a faithful "the same buildings at z = 0". A correct fix has to split shared vertices per
  marker before re-basing, which means editing `stage1_build.py` and re-running Stage 1 — outside
  this task's file list.
