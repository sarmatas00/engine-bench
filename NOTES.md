# engine-bench notes

## Environment

maplibre-gl pinned to 5.24.0: @deck.gl/mapbox 9.4.0 interleaved mode reads `map.transform`, removed from `Map` in maplibre-gl 6.x (verified: 6.8.0 `map.transform === undefined`). Spec §2 says 5.x.

## Briefing corrections

- deck.gl 9.4.0 ScenegraphLayer does not render glTF COLOR_0 (stock vertex shader declares no colour attribute); B2 "works in every viewer today" holds for the mesh path (SimpleMeshLayer / Tile3DLayer mesh content), not the glTF path.
- Pages 02/03 are titled "floats" after the briefing's wording, but the synthetic hill is ≥ 5 m above sea level everywhere, so sea-level geometry is buried, never floating; the mechanism (MapLibre never drapes `custom` layers) is the same. The page bodies say "buried".

## Findings

- dtcc-core#85 round trip on `gothenburg-skansen-kronan` (`save_volume_mesh` in the dtcc-sim container -> `load_volume_mesh` natively): **no loss**. vertices 45733 -> 45733, cells 164154 -> 164154, field `temperature` -> `temperature`, dtype float64 -> float64, max |dT| 0.0. Full record in `public/data/real/dataset.json` under `stage2.roundtrip`.
- The container's solve and Stage 1's raster disagree on the tile's terrain minimum by 0.12 m — measured while verifying the frame, not a defect to fix. `heat.xdmf`'s volume mesh (loaded natively with `load_volume_mesh`) has z in `[1.2397061261541102, 81.2397061261541]`, a domain height of exactly `mesh_domain_height` = 80.0 m above *its own* terrain floor of 1.2397 m. `public/data/real/dataset.json`'s `z0` — Stage 1's raster minimum, the value everything in this bench treats as the tile's local zero — is 1.1191982915663998 m. The two floors differ by 0.1205 m: the container solved its mesh against a terrain sample that was not bit-for-bit the same minimum Stage 1 recorded from the raster. Harmless against 53.45 m of relief (0.2% of it), but it is exactly the class of cross-revision fact this file exists to hold, so it is recorded here rather than left to be rediscovered.
- **Superseded by the Task 11 entry below (measured on the shipped renders): the prediction in this
  bullet that pages 07/08/10/11 "will *look* like a dramatic temperature swing across the surface"
  is wrong for the surface pages (07, 08, 12) — the synthetic and real datasets turn out to have
  nearly the same colour distribution, 82.6/11.7/2.9/2.8 vs 83.0/12.0/4.3/0.7 by band. Any earlier
  note repeating that prediction as fact is wrong and is corrected by the Task 11 entry.** The
  temperature field sampled onto the ground mesh (`field.glb`/`field-baked.glb`, 6,288 vertices) is much flatter than either the full volume solve or the synthetic scene's display range, and this is expected, not a defect. The solve's full field spans 18.00-32.95 degC (mean 26.11) and the 64x64x32 volume grid sampled for `field.grid.f32` spans 18.00-32.49 degC, but the ground mesh itself — which sits at `ground_bc_type: dirichlet, ground_value: 18.0` — spans only 18.00-22.63 degC, and its 2nd/98th-percentile colour range (`field.json`'s `tmin`/`tmax`, what pages actually colour against) is 18.00-18.746 degC, a 0.75 degC band. The ground is a Dirichlet boundary pinned to the ambient value, so almost every ground vertex sits at or near 18 degC by construction; only vertices close to a hot building wall or roof rise above it. The synthetic scene's fixed display range is [10, 35] degC (25 degC span) for comparison. Left as measured — not retuned. Consequence for the briefing: normalising a 0.75 degC span onto the same five-stop blue-to-red ramp still paints a full blue-to-red gradient across the mesh — the ramp always spans its input's own min-to-max, regardless of how narrow that input is — so pages 07/08/10/11 on the real dataset will *look* like a dramatic temperature swing across the surface while representing almost no actual variation. A reader who sees only the screenshot, without this number, would be misled about how much the real solve's ground temperature actually varies.
- Page 08 (`field-baked.glb`, COLOR_0 = baked RGB, no `_TEMPERATURE`): right copy (SimpleMeshLayer) renders coloured — blue-to-red gradient with a red/yellow hot spot. Left copy (ScenegraphLayer) renders plain white/grey; COLOR_0 never reaches its GPU buffer at all. Probe: `simpleMesh = {inBufferLayout: true, inShaderLayout: true, inVsSource: true}` (probed as `colors`), `scenegraph = {inBufferLayout: false, inShaderLayout: false, inVsSource: false}` (probed as `COLOR_0`). Buffer-layout names printed to the probe panel: SimpleMeshLayer → `geometry, instancePositions, instanceColors, instanceModelMatrix` (colors folded into the interleaved `geometry` entry's nested attributes); ScenegraphLayer → `instancePositions, instanceColors, instanceModelMatrix, geometry` (its `geometry` entry has no colour attribute at all — stock scenegraph-layer-vertex.glsl.ts never declares one). So B2 stands for the mesh path only.
- Page 07 (fix B1): on deck.gl 9.4.0 the fix is one `getShaders()` override plus a `draw()` override to feed the uniform — patch the two stock vertex anchors (`in vec3 positions;`, `void main(void) {`) and the flat-path fragment assignment, append a 2-float uniform-block module, and `_TEMPERATURE` binds and colours. No buffer-layout entry was needed (the attribute already reaches the model's `bufferLayout`), and `src/lib/probe.ts` needed no change: once the attribute is declared and used, WebGL program introspection puts it in `model.pipeline.shaderLayout.attributes`, so the probe flips to `{inBufferLayout: true, inShaderLayout: true, inVsSource: true}` on its own. One trap the briefing's "genuinely small" hides: the fragment shader has three `fragColor = ...;` assignments (PBR, textured flat, flat) — a naive first-match replace patches the dead PBR branch and leaves the surface uncoloured, so the anchor must be the exact `fragColor = vColor;`, and each anchor needs its own no-op guard.
- Implementation note (not a briefing correction): `loadGltfMesh` (`src/lib/deck-map.ts`) previously dropped the glTF accessor's `normalized` flag when building each `Attr`, which crashed `SimpleMeshLayer` on `field-baked.glb`'s normalized Uint8 VEC3 `COLOR_0` (`Error: size: 3` from luma.gl's `VertexFormatDecoder`, deck.gl 9.4.0 / loaders.gl `@loaders.gl/gltf`). Fixed at the source: `loadGltfMesh` now carries `a.normalized` through into every returned `Attr`, so page 08 needs no page-local workaround.
- Page 11 (@kitware/vtk.js 36.12.1): the plan's opacity transfer function (10→0, 20→0.02, 35→0.35) accumulated enough opacity from the 10–20 °C ambient field to hide the isosurface at every slider value above ~15 °C; retuned to 10→0, 20→0.002, 28→0.02, 35→0.12. vtk.js volume + surface compositing works; the defect was the numbers.
- Page 12 (PlayCanvas 2.22.0, `field-baked.glb`): contrary to the task facts' assumption ("PlayCanvas 2.22.0 ignores glTF COLOR_0 unless the material sets diffuseVertexColor"), the mesh rendered with correct vertex colours (blue-to-red gradient with a red/yellow hot spot) straight out of `instantiateRenderEntity()` — no material patch needed. Verified directly: built and screenshotted the page once with a `meshInstance.material.diffuseVertexColor = true; material.update();` loop applied after instantiation, and once with that loop entirely removed; the two screenshots were visually identical. `pc.Application` (deprecated in favour of `AppBase`/`createGraphicsDevice` but still present in 2.22.0) initialised and rendered cleanly under Playwright/SwiftShader with zero console errors either way, so this version's `ContainerHandler`/glTF parser must already set `diffuseVertexColor` on generated materials when a primitive has `COLOR_0`. Page 12 therefore ships without any vertex-colour workaround.
- Page 10 (Cesium `VoxelPrimitive`, 1.145.0): the volumetric renderer is real and does render our 64×64×32 float grid, but "working volumetric renderer" understates the assembly. (a) `VoxelProvider` is an interface with an instantiation-throwing constructor and no public concrete implementation for in-memory data — the only shipped one is `Cesium3DTilesVoxelProvider`, which wants a 3D Tiles tileset with `EXT_primitive_voxels`/`EXT_structural_metadata` glTF content. Feeding a plain `Float32Array` means hand-rolling an object with 17 properties (`shape, dimensions, names, types, componentTypes, minimumValues, maximumValues, globalTransform, shapeTransform, minBounds, maxBounds, paddingBefore, paddingAfter, maximumTileCount, availableLevels, requestData`, plus the optional `metadataOrder`) that Cesium reads as plain properties, and both `VoxelPrimitive` and `VoxelProvider` are marked `@experimental` — outside the deprecation policy. (b) It is expensive: the ray-march runs at roughly one frame per second at 1280×800 under Playwright's SwiftShader, enough to starve the globe's own tile refinement, so page 10 adds the primitive only after the terrain has settled. `stepSize` (1 → 8) changes nothing there; the cost is shader-bound, not step-bound. (c) The volume is drawn as a full-screen ray-march compositing front-to-back, so the briefing's mental model of "the hot core shows red" needs `depthTest = false` (the hottest air in our field is at ground level, i.e. inside the hill) and a steeper opacity ramp than the obvious one — at `alpha = t²·0.9` the ray saturates on the cool near side and the core never reaches the screen. Even at `t³·0.35` the front-to-back composite still dilutes the handful of peak voxels with everything in front of them, so at any legible opacity the core reads amber, not the red the top of the colour scale implies.
- Real tile `gothenburg-skansen-kronan` (500 m box, EPSG:3006 [318369, 6398890, 318869, 6399390],
  relief 53.5 m, 215 LOD0 footprints in `footprints.geojson` (217 before the post-#85 upgrade) — what page 01 draws — and 103 connected
  components in the drawn LOD1 surface mesh, i.e. 103 welded building groups, which is what pages
  02/03/05/06/09 draw), pages 01/02/03. (This entry has been wrong in both directions. An early draft said
  "215 buildings" as a stale Stage 1 count that was never measured; Task 8 re-measured the
  then-shipped data and corrected it to 217 and 103. The post-#85 regeneration on THIS branch then
  took the shipped tile to **215 footprints** -- see "Native drift: two buildings disappear" below --
  so 217 went stale again and the whole-branch review caught it. Measured at HEAD:
  `footprints.geojson` has **215** features and `buildings.mesh.json.sourceBuildingCount` is **215**.
  The 103 connected components are unchanged. Treat 217 as the pre-upgrade count only.) Page 01's `fill-extrusion` drapes
  correctly on real data: every footprint stands where the DEM puts it, and toggling Terrain moves
  the whole city with the ground. Pages 02 and 03 draw the same buildings re-based to z = 0 and
  produce the *same* buried silhouette as each other, so the mechanism (MapLibre never drapes a
  `custom` layer) reproduces exactly. The visual is milder than the synthetic page — most buildings
  keep something above ground instead of five of six vanishing — but not for the reason the plan
  gave. The plan expected "buildings on low ground stand clear, only the ones on the hill get
  buried". **Correction: the digits this bullet originally gave here did not reproduce (see the
  final review's re-measurement below); the qualitative claim — nothing stands clear, roughly half —
  still holds.** Under the same convention the page-09 finding names for its building-group
  centroids — a footprint's own true polygon centroid (area-weighted, not a vertex mean), matched
  against the nearest-cell height in `terrain-rgb.png` (the same nearest-cell convention
  `stage1_build.py` used to write it) — the terrain under a footprint centroid is 1.20 m at its
  lowest, median 3.60 m, mean 5.65 m, max 53.00 m, while the buildings are 2.50–28.26 m tall (median
  8.69 m). So nothing stands clear — the tile's local zero is an empty low corner of the DEM, not
  where the city is. Every one of the 217 has at least 1.2 m of ground over its base; 58 of 217
  vanish completely (roof at or below the terrain over their own centroid), including all 8 that
  stand on ground above 20 m; across all 217 the median building keeps 4.22 m of its 8.7 m height
  above the local ground, i.e. roughly half. (Re-measured for the final review's fix pass with a
  script sampling `footprints.geojson` centroids against `terrain-rgb.png`, decoded with
  `scripts/real/benchio.decode_terrain_rgb`; script and output are in the fix report.)
  (Counts are from `footprints.geojson` + `terrain-rgb.png`, the LOD0 heights; pages 02/03 draw the
  LOD1 mesh, so treat them as the shape of the result, not as a per-triangle census.) Vertex-level,
  on the drawn mesh: 18,477 of 20,726 vertices are lowered by more than 1 m when `buildings` is
  flattened into `buildings-flat` (median drop 1.27 m, mean 2.84 m, max 50.34 m).
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
  real branch describing what the screenshot shows. The remaining ten pages still carried
  synthetic-only `expect:` text on `?dataset=real`. **Correction: this bullet originally said "Task
  12 Step 3 sweeps them" — that sweep never happened for the six field pages (see the entry below,
  corrected in the final review's fix pass).** Pages 05, 06 and 09 did pick up dataset-aware
  `expect:` text along the way; the fix for 04/07/08/10/11/12 is the separate `hasField` mismatch
  described below.
- **Defect found in Task 7, fixed in Task 3b — `blocks.glb` on the real dataset carried torn
  geometry.** `flatten_buildings` (`scripts/real/stage1_build.py:169`, old version) looped over
  face markers and did `positions[verts, 2] -= positions[verts, 2].min()` per marker. Adjacent
  buildings in the DTCC surface mesh share vertices — the `buildings` submesh is 103 connected
  components for 217 LOD0 footprints — so a vertex shared by two markers was lowered twice, by two
  different amounts, and the triangles around it stretched. Measured on the shipped (buggy) mesh:
  11,171 of 37,672 triangles in `buildings-flat` had their three vertices moved by amounts
  differing by more than 1 m (7,421 by more than 5 m, max 50.34 m); the tallest vertical triangle
  edge grew from 16.59 m in `buildings` to 50.34 m in `buildings-flat`. On screen it showed as
  spikes and cones where a clean building stands in page 06 (`blocks-draped.glb`, the un-flattened
  copy) — clearest at the hilltop, where page 06 draws a clean octagon and pages 02/03 drew a 50 m
  cone. It was hidden in the Task 7 page 02/03 screenshots because the hill buries it — **that spike
  was our bug, not a real-data observation; any earlier note describing a hilltop spike as tile
  behaviour is wrong and is corrected by this entry.**
  Fixed by grouping vertices by connected component instead of by face marker, so a welded pair of
  buildings moves as one rigid unit — the invariant that catches the old bug is edge length, which
  a translation cannot change. Verified on the regenerated data: every edge length in
  `buildings-flat` matches `buildings` exactly (`np.allclose` true), min z is `0.000000`, and the
  tallest vertical edge is unchanged at 16.59 m in both meshes (not 50.34 m). Vertex-level, the
  correct flatten still moves plenty of geometry — 18,477 of 20,726 vertices drop by more than 1 m,
  median drop 1.27 m, mean 2.84 m, max 50.34 m (a legitimate per-component base offset now, not a
  stretch) — it just no longer tears any triangle. Re-screenshotted pages 02/03 on `?dataset=real`:
  the hilltop now shows the same clean octagonal building page 06 draws, no spike.
- **Defect found in Task 8, fixed in `src/lib/dataset.ts` — page 05 drew the real terrain in a
  different frame from everything else on the page.** `realScene().elevationImage()` handed
  deck.gl's `TerrainLayer` the `bounds_lonlat` field of `terrain.json`, which
  `scripts/real/stage1_build.py:103` writes as `tf.transform(bounds[0], bounds[1])` and
  `tf.transform(bounds[2], bounds[3])` — the true WGS84 lon/lat of the **SW and NE corners** of the
  EPSG:3006 box. SWEREF99 TM grid north is 2.5684 deg west of true north at this tile (measured from
  `dataset.json`'s origin with pyproj), so the 500 m grid square is rotated in lon/lat and those two
  corners are not its bounding box: they describe a rectangle **475.90 m wide by 521.69 m tall**.
  `TerrainLayer.bounds` is an axis-aligned `[W, S, E, N]` rectangle, so the raster was squeezed 4.8%
  in longitude and stretched 4.3% in latitude against the SimpleMeshLayer blocks beside it, which
  deck.gl places in metre offsets from the anchor. Displacement at the tile edge: **+12.06 / -12.03 m
  east-west and -10.85 / +10.84 m north-south**, which is 10.9 ground px at the zoom-16.2 nadir scale
  (1.111 m per CSS px at 57.698 degN). Measured on screen, not just on paper: pages 05 and 06 share
  a camera and both draw the same 10 m contour rule over the same DEM, so the contour marks should
  land on the same pixels. Cross-correlating the two masks over the hill, page 05 before the fix
  peaked at a shift of (+15, -20) screen px with 4,130 px of overlap at zero shift; after the fix it
  peaks at (+4, -4) px with 9,358 at zero shift — the residual is the Delatin terrain mesh
  disagreeing with MapLibre's 256 px DEM tiles, not a frame error.
  Fixed by handing `TerrainLayer` `extentLngLatBounds(scene)`, the same true-north 500 m square every
  other layer and page already uses. `terrain.json` is left alone: as source metadata the reprojected
  corners are correct, they are just not a bbox and not the bench's frame.
- **The two page-05 displacement figures above, ~11 px and ~25 px, are not the same quantity and were
  never comparable** — recorded in Task 12 because an earlier draft left them side by side, a factor
  of two apart, with no note saying why. The 11 px is analytic: the *largest in-plane* raster offset
  (12.06 m, at the tile edge) divided by the nadir ground resolution. It assumes a top-down camera,
  and the defect is a scale about the tile centre, so it falls to zero at the centre and only reaches
  11 px at the edge. The 25 px is the magnitude of `(+15, -20)`, the peak of a 2-D cross-correlation
  fitted as a single *translation*, in the shared pitched view (`initialView` in `src/lib/tiles.ts`:
  pitch 60, bearing -20, 1280x800). A single translation is the wrong model for a centre-anchored
  scale error, and that peak also absorbs everything else the two terrain renderers disagree about.
  Projecting the in-plane error through the actual camera (MapLibre's `cameraToCenterDistance` =
  0.5 x 800 / tan(36.87 deg / 2) = 1200 px) gives an on-screen displacement of 5.2 px at the hill
  centroid, 10.6 px over the hill's south-west flank, and **at most 11.0 px anywhere on the tile** —
  so the analytic figure is not a lower bound on the measured one, it is close to an upper bound on
  the part of it this defect can explain. Roughly half the 25 px peak is the frame error; the rest is
  the Delatin-versus-256-px-tile disagreement the post-fix (+4, -4) peak measures directly. What the
  two figures do agree on is the sign, the direction, and the outcome: the fix collapses the peak from
  25 px to 5.7 px and more than doubles the overlap at zero shift, 4,130 -> 9,358.
- Consequence of the above worth carrying to the briefing: **the bench draws the real tile rotated
  2.57 deg from true north.** Local metres in this repo are EPSG:3006 grid metres (building vertices
  are easting/northing minus the origin, the DEM is sampled on the grid axes), while `src/lib/geo.ts`
  converts local metres to lon/lat as a true-north equirectangular offset from the anchor. The two are
  the same frame only at the anchor; at the tile corners they differ by 15.5-16.2 m. This is uniform
  across every page and harmless for what the bench demonstrates — every engine gets the same
  rotation, so no comparison between engines is affected — but the bench is not a georeferenced
  product, and nothing in it should be screenshotted next to a real basemap.
- Page 05 (deck.gl `TerrainLayer`) on the real tile: the terrain loads and drapes correctly, and it is
  the only page fed the DEM at full resolution — 1024x1024 over 500 m, 0.49 m/px — where MapLibre gets
  256 px tiles resampled through `scene.elevation`. That shows. The real DEM is not a smooth ridge:
  3.76% of its pixels are steeper than 45 deg, 4,725 are steeper than 70 deg, and the steepest is
  86.6 deg, because the DTCC terrain raster carries retaining walls, cut faces and building-shaped
  steps (the footprint outlines are legible in a hillshade of it). At `meshMaxError: 2` the Delatin
  mesh resolves those into a band of thin bright facets along the east flank of the Skansen Kronan
  hill, which reads on screen as a fringe of white shards. It is the data and the tolerance, not a
  bug, and it is left alone deliberately: retuning `meshMaxError` for the real tile would be tuning a
  parameter to make the picture nicer. Page 06 does not show it because MapLibre never sees that
  detail.
- Page 05's `expect:` promised "a wide block tilts with the slope" in `offset` mode. Measured on the
  real tile: the ground under one building group spans 0.70 m (median), 1.41 m (mean), 9.48 m (max),
  which across the footprint is a tilt of 1.5 deg median and above 5 deg for only 9 of the 103 groups.
  The lift is real and correct; the tilt is invisible. Real branch of the `expect:` says so.
- Page 06 (pre-draped) on the real tile: the cleanest of the five. `blocks-draped.glb` puts every
  building on the real ground, and the Skansen Kronan fortress sits as a single octagon on the hilltop
  (component 4, centroid local (-72.2, -197.6), ground 50.50 m, height 5.13 m) — the same octagon
  pages 02/03 draw once the Task 3b flatten fix landed. The detachment the page exists to show is much
  milder here than on the synthetic ridge, and for a structural reason: exaggeration `e` moves the
  ground under a building by `(e-1) x ground`, and the median ground under a building on this tile is
  3.70 m against a median building height of 9.35 m. So at exaggeration 2.0 the median building takes
  on 3.7 m of ground — 40% of its height, plainly visible but not a vanishing — while, under the same
  convention as the page-09 finding, 30 of 103 go under completely (stable at 30 under both DEM
  conventions tried; only a mesh-vertex definition of "ground" moves it, to 28) and the hilltop
  octagon is swallowed by 50.5 m. At 0.5 they float by 1.85 m median,
  25.25 m at the hilltop. On the synthetic ridge the same slider moves the hill by up to 120 m.
- Page 09 (Cesium) on the real tile: the mechanism reproduces, the story inverts. The polygon and the
  line are `classificationType: TERRAIN` / `clampToGround` and both project per-pixel, correctly. But
  the demo ring and line scale by `k = extent / 1000 = 0.25`, which on a 500 m tile puts the gold line
  along `y = 0` from x = -225 m to +225 m, where the DEM only moves from 3.00 m to 5.80 m: **2.8 m of
  relief over 450 m**, so the line renders dead straight and demonstrates nothing. The blue ring is
  luckier — its corners sit at 46.92, 7.78, 2.03 and 1.53 m, so its west edge does fold 45 m down the
  hill flank and the drape is obvious. The glTF model is the real correction. The synthetic page says
  the clamp makes blocks "float clear"; on this tile the anchor's ground is 3.40 m, near the tile
  floor of 0.00 m, against a 53.5 m relief, so the single clamp point mostly *buries* rather than
  floats. Under this convention — a group's ground is the DEM sampled at that group's centroid,
  compared against the anchor's 3.40 m — 55 sink into the ground (14 of them out of sight, worst
  47.1 m), 47 float — by at most 3.00 m, less than a third of the median 9.35 m building height,
  i.e. barely visible — and 1 lands exactly level, which is the group the earlier "55 and 47"
  arithmetic dropped (55 + 47 + 1 = 103, of 103 building groups total). Only 17 of 103 are off by
  more than 5 m. A footprint spans a range of ground, so there is no single right answer and the
  split is convention-sensitive — measured against each
  group's own lowest mesh vertex instead it is 50 sink / 53 float / 0 level, with the same 14 out of
  sight. Re-measured in Task 12 off `public/data/real/buildings.mesh.*` and `terrain-rgb.png`; every
  other figure in this bullet (47.1, 3.00, 17, 9.35) reproduced exactly. So on a 500 m tile the
  model-origin clamp error is not "floats clear", it is "correct to within a couple of metres for
  most of the tile and catastrophic for the few buildings on the hill". Both `expect:` texts corrected.
- Pages 04 and 12 are now gated on `scene.hasField` like 07, 08, 10 and 11, and added to
  `FIELD_PAGES` in `tests/smoke.spec.ts`. Both gate before any engine is constructed: on
  `?dataset=real` page 04 reports and finishes in 546 ms without building a MapLibre map, page 12 in
  737 ms without constructing `pc.Application`. **Correction: this bullet originally claimed their
  header `expect:` lines still described the synthetic field render while the body said there was no
  field, and that "Task 12 Step 3's sweep covers all six" — that sweep never ran. The final review
  caught the mismatch still live in `pages/04:13`, `07:16`, `08:12`, `10:21`, `11:33` and `12:9`: all
  six branched `expect:` on `scene.dataset`, never on `scene.hasField`, so on a checkout with no
  field the header still promised the field render while the body said there was none — e.g. page
  07's header still said "deep blue nearly everywhere, with cyan-to-red rims…" with no field to
  colour. Fixed in the final fix pass: all six `expect:` lines now check `scene.hasField` first and
  print a short "nothing — this dataset has no temperature field" line that matches
  `noFieldForThisDataset`'s body probe, before falling through to the existing dataset branch.
  Verified against the actual degraded path (a copy of `dist/data/real/dataset.json` with
  `stages.stage2` set to `null`, served via `vite preview`), not by reading the diff.**
- **DTCC's `dtcc-sim` image does not build as shipped on an Apple Silicon machine (`docker compose
  build dtcc-sim` under `--platform linux/amd64`) — two separate, one-line-fixable defects in
  `dtcc-sim/Dockerfile`, neither of which is a FEniCSx or TetGen problem.**
  1. **Missing `ar`.** The vendored-TetGen build step fails while linking `libtet.a`:
     ```
     FAILED: [code=127] libtet.a
     : && /opt/conda/bin/cmake -E rm -f libtet.a && CMAKE_AR-NOTFOUND qc libtet.a ...
     /bin/sh: 1: CMAKE_AR-NOTFOUND: not found
     ```
     Cause: conda-forge's `compilers` metapackage does not put a plain `ar` on `PATH` (only a
     `gcc-ar` wrapper), the Dockerfile never sets `CMAKE_AR`, and no conda activation script runs
     inside a Docker `RUN` layer — so CMake's `find_program(CMAKE_AR)` resolves to the literal
     string `CMAKE_AR-NOTFOUND`, which the shell then tries to exec. Fix: add `binutils` to the
     `mamba install` line in `dtcc-sim/Dockerfile` (alongside `compilers`, `cmake`, `ninja`, ...) —
     this supplies `/opt/conda/bin/ar`, after which CMake reports a real `AR` and the static
     library links.
  2. **Unbounded build parallelism OOMs under emulation.** With (1) fixed, the image can get all
     the way to `pip install -e ".[service]"` (building the `dtcc-core` wheel, which compiles C++
     extensions via scikit-build-core/CMake/Ninja) and be killed by the host for memory pressure —
     ninja defaults to one job per core, and this Mac's Docker Desktop VM has 10 CPUs allocated to
     an amd64-under-QEMU build, so the C++ compile fans out to far more concurrent memory-hungry
     `g++`/`ld` processes than an emulated build can afford. Fix: bound the parallelism, e.g.
     `ENV CMAKE_BUILD_PARALLEL_LEVEL=2` and `ENV MAKEFLAGS=-j2` in `dtcc-sim/Dockerfile` before the
     `pip install -e ".[service]"` step (2 was sufficient on a 10-CPU host under emulation; a CI
     runner with a fixed core count could pick a value from `nproc`).

  Verified end to end: patched a copy of `dtcc-sim/Dockerfile` (via `docker build -f -` on stdin,
  context only — the `dtcc-sim` clone itself was never modified, `git status --short` there stayed
  clean throughout) with both one-line fixes, built `dtcc-sim:local` (4.33 GB, ~3 min build time
  once Docker's layer cache had the earlier attempt's completed steps), confirmed
  `python -c "import dtcc_core, dtcc_sim"` succeeds in it with TetGen available, and ran the actual
  urban-heat solve against the bench's real tile through it (see Stage 2 in `README.md`) —
  50,729 vertices, 182,331 cells, T 18.00–32.95 degC, `KSP` converged in 8 iterations. Both fixes
  are one line each in `dtcc-sim/Dockerfile`; this note is written so a DTCC engineer can apply them
  directly upstream.
- **Fixed — `heat.meta.json`'s provenance field was unattributable.** The container's
  `dtcc_core.__version__` is the literal string `"unknown"` (no `__version__` attribute is set on
  the package installed from
  `git+https://github.com/dtcc-platform/dtcc-core.git@9774162563d94a038a9ae799495020101b8250d7`),
  confirming the concern raised on Task 9's first pass: the brief's Interfaces section names the
  `heat.meta.json` key `dtcc_core_revision`, but the original code (transcribed as given, since at
  the time Task 10 read whatever key the code wrote) wrote `dtcc_core_version` from
  `getattr(dtcc_core, "__version__", "unknown")` — which on this pin carried no revision
  information at all, so the round-trip measurement that is the whole point of Stage 2
  (dtcc-core#85) was attributed to a literal `"unknown"`. Fixed with `benchio.distribution_revision`
  (`scripts/real/benchio.py`) — a pure-stdlib resolver using `importlib.metadata`'s
  `direct_url.json` (the VCS commit pip actually installed, or the git `HEAD` of an editable
  install's path, falling back to the declared version) — and `solve.py` now writes
  `"dtcc_core_revision": benchio.distribution_revision("dtcc-core")`. Verified: `heat.meta.json`
  now records `"dtcc_core_revision": "9774162563d94a038a9ae799495020101b8250d7"` — the exact pin
  from `dtcc-sim/pyproject.toml` — and the same resolver against the native venv's editable install
  returns its git `HEAD`, `5cf56fa0a5f88659cd888010cd7121fe56f9577e`, via the editable-install
  fallback path (confirmed directly, and by
  `scripts/real/tests/test_benchio.py::test_distribution_revision_resolves_the_editable_dtcc_core_install`).
  Task 10's downstream plan was updated to match: it reads `dtcc_core_revision` (not `..._version`),
  and its two native-side keys are `solver_dtcc_core_revision` and `native_dtcc_core_revision`.
- **`dtcc_core.__version__` does not exist on the installed `dtcc-core` package** (neither the
  container's pinned-commit install nor the native venv's editable install sets it — `getattr(dtcc_core,
  "__version__", ...)` silently returns the default instead of raising). This is a provenance trap
  for any DTCC tooling that records versions by reading `__version__`: it fails silently, not
  loudly, so a script can run to completion and log a placeholder as if it were real data. We only
  caught it here because the round-trip measurement (dtcc-core#85) needed an attributable revision
  and a flat `"unknown"` in every run's `heat.meta.json` was conspicuous. `importlib.metadata`'s
  `direct_url.json` is the reliable source instead (see the fix above).
- **Task 11, the six field pages on the real solve — what is actually on screen, and a correction to
  the entry above.** An earlier entry (written from the numbers, before anything had been drawn)
  predicted that normalising the ground field's 0.75 °C band onto the five-stop ramp would "paint a
  full blue-to-red gradient across the mesh" and make pages 07/08/10/11 look like a dramatic
  temperature swing. Measured on the shipped renders, that is wrong for the surface pages and
  understated for the volume pages.
  *Surface (pages 07, 08, 12).* The ground field is not merely narrow, it is degenerate: its median
  is exactly 18.000 °C and 83.7% of the 6,288 ground vertices sit within 0.01 °C of 18.0, because
  `ground_bc_type: dirichlet` pins them there. So the ramp is not spread across the mesh at all —
  the surface renders deep blue nearly everywhere, with cyan-to-red rims a few metres wide hugging
  the building walls (the Robin wall/roof BCs at 28/32 °C) and white gaps where the buildings
  themselves stand. Classifying every on-ramp pixel of the page 07 screenshot by its position on the
  ramp: 82.6% in the bottom tenth, 11.7% lower-middle, 2.9% upper-middle, 2.8% top tenth, median
  ramp position 0.003. The synthetic page 07, measured the same way, is 83.0 / 12.0 / 4.3 / 0.7% —
  i.e. **the two renders have nearly the same colour distribution**; the synthetic Gaussian hot spot
  over a 2,000 m tile is just as blue. What differs is only what the ramp's two ends mean: 25 °C on
  synthetic, 0.75 °C here. That is the whole of the misleading risk, and it is not visible in the
  picture — which is why the header line carries the range (`18.0–18.7 °C`) and why pages 07 and 08
  now say so in `expect:` as well. Demonstrated on screen: dragging page 07's Scale max to 30 °C — a
  scale a reader would call ordinary — turns the entire surface uniformly blue with a few faint cyan
  patches. Same data, honest scale, no picture.
- **Page 07's colour-pixel assertion passes on the real dataset, and would pass on any field.**
  Measured centre pixel on `?dataset=real`: RGB [42, 129, 185], channel spread **143** (threshold is
  40). It is not a warm pixel: on the ramp that is position 0.068, i.e. 18.05 °C — the centre of the
  tile is ordinary pinned ground. The spread is large because the ramp's *bottom* stop, (33, 102,
  172), already has a channel spread of 139 on its own. So the assertion does exactly what its
  comment claims — proves the surface is coloured rather than grey/white/black — and can never fail
  for a coloured pixel on this colormap regardless of the field's dynamic range. No dataset-aware
  threshold is needed in Task 12's matrix, and a passing assertion here must not be read as evidence
  that the real field varies.
- **Defect found and fixed in Task 11 — pages 10 and 11 were colouring a volume with the ground
  mesh's colour range. Our bug, not a property of DTCC's data.** `scene.colourRange` comes from
  `field.json`'s `tmin`/`tmax`, which `scripts/real/sample_field.py` computes as the 2nd/98th
  percentile of the temperature interpolated onto the **ground surface**: 18.000–18.746 °C. Pages 10
  and 11 draw `field.grid.f32`, which is the same solve sampled through the *air* over the tile:
  131,072 voxels, 18.00–32.49 °C, mean 21.80, median 20.31. Two different geometries, two different
  ranges, and the pages were using the wrong one. On the synthetic dataset the mistake is invisible,
  because `T(x, y, z)` spans 10–35 on the surface and 10–34.95 on the grid; on the real dataset it
  destroyed both renders:
  · **65.0%** of the voxels sat at or above `tmax`, clamping to the top of the ramp *and* the top of
  the opacity curve, so page 10 drew a solid red-orange mass with a thin cyan rim instead of a plume.
  · Page 11's isosurface slider spanned 18.030–18.717 °C, above which lay **78.4%** of the grid at
  the low end and **65.3%** at the high end — every reachable contour enclosed most of the domain, so
  the isosurface was a near box-filling slab at any slider position and the volume behind it never
  showed. (Synthetic, for comparison: the same slider spanned 15.2% down to 0.01% of the grid.)
  The solver output was never at fault, and neither was Cesium or vtk.js; both engines drew exactly
  what they were handed. Fixed by taking the colour scale from the loaded grid's own `min`/`max` in
  both pages — the same rule `field.json` already applies to the ground mesh, so each page now scales
  to the data it actually draws. `loadGrid` moved ahead of `mountChrome` on both pages so the sliders
  can present the range they drive (the `hasField` gate still runs first: with no stage 2 there is no
  grid file to fetch), and `scaleMinBounds`/`scaleMaxBounds` now take the value rather than the Scene,
  since pages 07/08 scale to the ground field and page 10 to the volume.
  Measured after the fix. Page 10 on the real tile is now a broad translucent haze — yellow-green
  through its body, amber over the densest blocks, a soft cyan fringe, and the globe graticule and
  hill silhouette visible through it. Page 11's isosurface at the default 23.80 °C encloses **30.2%**
  of the volume and renders as a scalloped lens of warm air over the built-up half of the tile with a
  few detached islands to the south-west; across the slider the contour now runs from 67.1% of the
  volume down to 0.0%, so the control spans something real. Cost on the synthetic renders, measured
  by pixel comparison rather than asserted: page 10's canvas differs by a **maximum of 1** in any
  channel (the ramp top moves 35 → 34.9516, 0.19% of the ramp); page 11's canvas has 119 pixels of
  768,000 differing by more than 4 and 87 by more than 16, all of them on the isosurface silhouette,
  where the contour value moves 20.000 → 19.981 °C. Both are invisible side by side. The slider
  readouts do change on synthetic, deliberately: they now print the data's own extent, 34.95 and
  19.98. One cosmetic residue, left alone: these sliders step by 1 °C, so the handle snaps to the
  nearest whole degree while the readout carries the exact value (32.49 sits on the 32 notch on real,
  34.95 on the 35 notch on synthetic) — the readout, not the handle, is what the render uses.
  Header note for readers: `dataset.json`'s header line still shows the *ground* range (18.0–18.7 °C),
  which is what pages 07/08/12 colour against; pages 10 and 11 say in their `expect:` text that they
  carry their own scale and what it is.
- Page 04 on the real tile: exactly as designed — two flat grey copies of the ground field mesh at
  ±`sideOffset(scene)` (left ScenegraphLayer, flat-lit and pale; right SimpleMeshLayer, lit and
  darker), and the probe values are identical to synthetic: ScenegraphLayer
  `{loaded: true, inBufferLayout: true, inShaderLayout: false, inVsSource: false}`, SimpleMeshLayer
  all three false. Page 08 likewise: right copy coloured from `COLOR_0`, left copy plain white,
  `simpleMesh.inBufferLayout = true` / `scenegraph.inBufferLayout = false`. Page 12 renders the real
  baked mesh cleanly in PlayCanvas space with no console errors and its API table's first row now
  names the real anchor (`lon 11.9564, lat 57.6978`). Timings headless under SwiftShader: 04 1.7 s,
  07 0.7 s, 08 1.0 s, 11 0.4 s, 12 0.4 s, 10 13.6–14.5 s (the ray-march, as documented above).
- **Defect found in Task 11, fixed — the colour-scale sliders misreported the real scale.** Two
  things, both visible only once a dataset with non-round values existed. (a) `renderControl`
  printed `String(value)`, so the real range's 2nd percentile appeared beside the slider as
  "17.99999987228115" and the 98th as "18.746469572546268". (b) The "Scale max" slider on pages 07,
  08 and 10 was hard-coded to a 20–50 track, but the real `tmax` is 18.75 — *below* the track's
  minimum — so the browser pinned the handle to the left end while the readout beside it said 18.75,
  and the first drag would have jumped the scale by more than its entire span. Fixed with a two-
  decimal readout in `src/lib/chrome.ts` and `scaleMinBounds`/`scaleMaxBounds` in
  `src/lib/dataset.ts`, both written to be exact no-ops on the synthetic scene (whole-number values
  print byte-identically; `[10, 35]` still yields 0–20 and 20–50). Verified rather than assumed:
  synthetic pages 04, 06, 07, 08, 10, 11 and 12 screenshotted before and after the change are
  pixel-identical, except page 08's probe panel, where the two probe blocks swapped order — a
  pre-existing race between which layer's `draw()` fires first, same text either way — and ±1 of
  SwiftShader noise inside page 11's volume raycast.
- **Task 12, the whole matrix and the real-screenshot sweep.** `bun run test` now runs
  `13 pages x {synthetic, real}` = **26 tests, 26 passed, 0 skipped** (1 worker, 1.5 min; Cesium
  page 10 is 17.7 s synthetic / 16.5 s real, page 09 9.9 / 10.8 s, everything else under 4 s).
  Every screenshot under `screens/` was deleted before the run and regenerated from scratch: an
  earlier task left a stale PNG on disk still showing a "no field" gate after the field existed, so
  nothing on disk was trusted. All 13 `screens/real/*.png` were then opened and compared against
  their own page header. Verdict: **13 of 13 show what their header promises**, with the numbers
  re-measured rather than eyeballed where a number was available —
  · page 07's ramp distribution on the fresh render: 82.8% of on-ramp pixels in the bottom tenth,
  11.3% lower-middle, 3.0% upper-middle, 2.9% top tenth, median ramp position 0.003; synthetic the
  same way 83.2 / 11.8 / 4.3 / 0.7. Both reproduce Task 11's figures, so the surface pages are
  unchanged by the volume-scale fix, as expected — 07 and 08 scale to the ground field, which that
  fix did not touch.
  · page 11's isosurface, recomputed from the shipped `field.grid.f32` (131,072 voxels,
  18.00–32.49 degC): 67.0% of the volume enclosed at the bottom of the slider, 30.2% at the default
  23.80 degC, 0.0% at the top. The header's "67% / 30% / almost nothing" is exact.
  · page 09's counts re-measured off the shipped meshes; see the page 09 bullet above for the
  correction and the convention.
  One measured qualification, not a contradiction: page 10's header calls the warm parts of the
  volume "amber patches". Classifying the render by hue, the body of the haze sits at hue 66–78
  (yellow-green, 5th–95th percentile), the cyan fringe is 5.2% of the frame with a median distance
  of 11 px from the blob edge (so it is a fringe, not scatter), and genuinely amber pixels
  (hue < 50) are **0.58% of the frame**, the largest patch 309 px over the densest blocks. "Amber
  patches" is honest; "an amber core" would not be, and the header does not say that.
- Task 12, `pages/00-index/main.ts`: the index blurb is dataset-aware, and three rows of its table
  are overridden on `?dataset=real` because they described the synthetic scene and not the render —
  01 ("Blocks follow the hill" -> 217 real footprints), 02 ("stay at sea level" -> stay at the tile
  floor and are buried, since the real DEM bottoms out at 0.0 m) and 10 ("3-D temperature plume" ->
  a broad haze, not a sharp plume). The other nine rows are true on both datasets and were left
  alone. Pages 04 and 12 were checked and need no dataset branch: their `expect:` text describes
  what both renders do, and both were confirmed against the real screenshots.

## Post-#85 Core upgrade: measured drift (2026-09-17, spike Task 1)

Regenerated on native Core `4c8d621` (was `5cf56fa`) and container Core `5ca2ca4`
(was `9774162`), same tile, same bounds, same solver arguments. The posted
dtcc-twin#1 and dtcc-core#85 comments quote the pre-upgrade numbers, so this is
what changed and what did not.

**Correction.** An earlier version of this section said "no drift at all on the
native side". That was wrong: the footprint count moved. It is recorded below.

### Native geometry: unchanged

Byte-identical after regeneration, not merely equal in count: `terrain.tif`,
`basemap.png`, `terrain-rgb.png`, `ground.mesh.bin` and `buildings-flat.mesh.bin`.
Unchanged to full precision: `bounds`, `origin`, `extent`, `anchor_lonlat`,
`z0 = 1.1191982915663998`, `relief.zmin/zmax/relief`, `cell_size`. Mesh counts
unchanged: `ground` 6288 vertices / 8920 triangles, `buildings` 20726 / 37672,
`buildings-flat` 20726 / 37672.

`buildings.mesh.bin` grew from 949,488 to 1,100,176 bytes, which is exactly the new
`cell_object_index` array (37,672 triangles x 4 bytes = 150,688) and nothing else.

### Native drift: two buildings disappear (217 -> 215)

`footprints.geojson` went from **217 to 215 features**. The 215 survivors have
byte-identical geometry and identical heights; no footprint was added or moved.

Measured cause, not inferred. `download_footprints` still returns **217**, and all
217 survive `extract_roof_points` and `compute_building_heights`. The two are
dropped by `City.add_buildings(remove_outside_terrain=True)`:

```
download_footprints            : 217
after extract_roof_points      : 217
after compute_building_heights : 217
add_buildings(remove=False)    : 217
add_buildings(remove=True)     : 215
```

Both are the two buildings the builder logs `has no roof points. using min height`
for (areas 11.57 m2 and 13.68 m2, `estimated_height` 2.5, `measured_height` None).
With no lidar returns they carry an **empty** `POINT_CLOUD` geometry, whose bounds
are zeros, and `Object.bounds` folds those zeros into the aggregate:

```
terrain bounds  : x[318369.0, 318869.0]  y[6398890.0, 6399390.0]
building bounds : x[0.00, 318460.55]     y[0.00, 6399125.05]      <- dragged to the origin
its LOD0 bounds : x[318456.42, 318460.55] y[6399120.86, 6399125.05]
```

`contains_bounds` then fails for a footprint sitting ~90 m inside the tile edge, and
the building is removed as "outside the terrain". `contains_bounds` defaults to
`ignore_z=True`, so this is not a z issue.

The exact line is now pinned. `City.add_buildings` is unchanged between `5cf56fa` and
`4c8d621`; `Object.calculate_bounds` was rewritten, and the new version skips empty
geometries for `Surface`, `MultiSurface` and `Solid` but **not** for `PointCloud`. An
empty point cloud therefore falls through to a forced `calculate_bounds()` and is
unioned in as a zero box. The intent is already in the code; `PointCloud` is missing
from the list. Reported as a draft: `docs/upstream/dtcc-core-empty-pointcloud-bounds.md`.

**It does not move any geometry.** Both buildings contribute no mesh faces either
way, which is why every mesh count above is unchanged. Nothing was worked around:
suppressing the symptom would hide a Core behavior change.

### Container drift: the volume mesh and the field

| metric | pre-upgrade (9774162) | post-upgrade (5ca2ca4) | change |
| --- | --- | --- | --- |
| volume vertices | 50729 | 45733 | -4996 (-9.85%) |
| volume cells | 182331 | 164154 | -18177 (-9.97%) |
| solve field max | 32.95301610756346 | 33.40870697822927 | **+0.4557 degC** |
| solve field mean | 26.11123898229059 | 25.928026176922955 | -0.1832 degC |
| solve field min | 17.999999852416245 | 17.999999876920903 | +2.45e-08 |
| sampled grid max | 32.49213547378579 | 32.264330029565414 | -0.2278 degC |
| ground-sampled tmax | 18.746469572546268 | 18.7647502942796 | +0.0183 degC |
| ground-sampled tmin | 17.99999987228115 | 17.99999989500044 | +2.27e-08 |

The solve maximum moving **+0.46 degC** is the largest scientific number in this
change and the one to quote if anyone asks what the upgrade cost. The minima are
pinned by the Dirichlet ground and open boundaries at 18.0 and do not move.

**Why this is the container Core upgrade and not our R6 workaround.** The
classification cast is provably selection-neutral: on 200k synthetic points,
`classification == 2` selects the same 66,870 points before and after, and the values
round-trip exactly. Independently, the native terrain raster, built from the same
point cloud with that same cast applied, is byte-identical to pre-upgrade. The only
thing that changed on the volume side is container Core itself.

**The dtcc-core#85 round-trip claim still holds** on the upgraded stack: vertices and
cells agree before and after, `field_present` true, float64 both ways,
`max_abs_delta` 0.0, `lossless` true.

### Regeneration is bit-deterministic

Two independent end-to-end runs on the upgraded stack (stage 1, stage 2 in the
container, sampling, `generate:real`) produced **byte-identical** `heat.h5`,
`heat.pre.f64`, `field.grid.f32`, `field.mesh.bin`, `buildings.mesh.bin`,
`ground.mesh.bin`, `terrain.tif` and `footprints.geojson`. The only differences were
the `solved_at` and `stages.*` timestamps. The emulated FEM solve is reproducible run
to run, so any future artifact difference is a real change, not solver noise.

### Identity

**Verdict: `unstable_observed`.** Loading the same bounds twice produces different
DTCC building UUIDs, so the footprint tiles carry no `id` property and `Object.id`
falls back to a fresh `uuid4()` per load. Renderer picking must continue on
`sourceIndex`, and both pages must report canonical traceability as failed. Measured,
not assumed: both mapping hashes are in `buildings.mesh.json`.

**Coverage is partial, and visibly so.** 215 source buildings condition to 103
regions; the mesh carries 206 markers, because
`_split_ground_mesh_building_components` appends one marker per split component and
never reports the parent it split from. So 103 markers carry DTCC ids (30,958
triangles) and 103 do not (6,714 triangles, 17.8% of the building geometry). Those
103 are recorded as empty `objects` entries, which says "no conditioned region behind
this marker" rather than guessing one. Their parent region is recoverable only by
geometry, which has not been done and is not implied anywhere in the artifact.

The contract boundary published in `buildings.mesh.json` is **`regionMarkerCount`**
(103), not `conditionedRegionCount`. The two are equal on this tile but they are
different quantities: `conditionedRegionCount` is the count before the raster clip and
the coverage renormalization, and those stages are not guaranteed to be identity.
Readers must use `regionMarkerCount`.

### Workarounds to remove

`core_compat.py` section 1 (`integer_classification`, `prepare_city`,
`patch_terrain_raster_classification`) works around an upstream regression that stops
both Core and dtcc-sim from building the tile at all. Delete the section as a unit
when the upstream fix lands. Draft: `docs/upstream/dtcc-core-classification-dtype.md`.
Section 2 is not a workaround and stays.

**Both drafts were posted on 2026-09-18** as `sarmatas00`, after a duplicate search
turned up nothing upstream: `dtcc-core#110` (the classification dtype regression) and
`dtcc-core#111` (`add_buildings(remove_outside_terrain=True)` deleting buildings with no
roof points). The headers in `docs/upstream/` carry the issue links.

## vtk.js 36.12.1: three measured findings (2026-09-18, spike Task 5)

### `gl.finish()` does not force a completed frame under ANGLE/SwiftShader

The first working benchmark on page 13 reported a CPU mean of **0.45 ms** while
`EXT_disjoint_timer_query_webgl2` reported **95 ms** over the same 180 frames. A 200x
overstatement of frame rate, on the page whose entire job is measuring frame rate, and
it passed every check the task brief specified.

`gl.finish()` returns without waiting under Chrome's ANGLE/SwiftShader command buffer.
The fix is a 1x1 `gl.readPixels` at the end of each frame, which is a real pipeline
sync: `FRAMEBUFFER_BINDING` and `READ_FRAMEBUFFER_BINDING` are both null after
`render()`, so it blocks on the default framebuffer. CPU and GPU then agree, with CPU
sitting marginally above GPU (44.71 vs 44.47 ms) -- the signature of a completed frame
plus submission.

Deleting that one line leaves every gate green, so the smoke suite now asserts
`cpuMean > 0.5 * gpuMean`. Verified to catch the regression: with `readPixels` stripped
from the built chunk the ratio falls to 0.003 and the assertion fails.

**Task 6 must do the same or the two pages are not comparable.**

### `vtkOpenGLRenderWindow` leaks one texture, one framebuffer and one renderbuffer per resize

Measured with GL-object counters installed before the first render. The leak tracks
drawing-buffer **resizes**, never frames, and never recovers:

~~~
startup               8 textures /  1 framebuffer
+6 viewport resizes  14          /  7
+3 benchmark runs    20          / 13     (two setSize calls each)
+8 slice rebuilds    no change
+3 case switches     no change
~~~

Confirmed independently at prototype level: exactly +1 texture, +1 framebuffer and
+1 renderbuffer per resize. The renderbuffer was missed on the first pass, because
neither page counted that type until Task 6's review added it -- the leak's magnitude
was understated by a third for a day. Page-owned allocations (buffers, listeners,
observers) stay flat throughout, so this is vtk.js's, not ours. Task 6 needs the same instrumentation to know whether
Three.js does it too; it is a maintenance-burden input for Task 8.

### A node-vs-trilinear probe cannot check axis order, at any node

Worth recording because the first fix for it was the same mistake one level down.
`sampleGridTrilinear` calls `probeGridNode` internally with the same `dims`, so both
sides of such a comparison route through one `gridNodeIndex`. A transposition moves
both identically. At an exact node the trilinear path collapses to a single
`probeGridNode` call, and on the heat grid's irrational spacing the residual 1e-15 of
float noise is present on the **correct** payload -- so an exact-equality assert fails
on correct data and passes on reversed garbage.

Checking axis order needs a genuinely independent second implementation. Page 13 uses
`vtkImageData.getOffsetIndexFromWorld`, whose matrix-inverse path catches four classes
a componentwise dims/origin/spacing comparison cannot see at all: a permuted or flipped
`direction` matrix, a wrong `numberOfComponents`, a wrongly bound scalar array, and a
shifted extent.

Known structural limit, stated rather than papered over: swapping x and y via
dims/spacing is a genuine no-op on both shipped grids (32x32 and 64x64 in x/y), so it is
undetectable by construction. Swapping x and y via `direction` is caught.

### The shipped tile cannot discriminate several things it appears to

Recorded together because each one has already produced a check that passed for the
wrong reason:

- `regionMarkerCount` and `conditionedRegionCount` are **both 103**, so a test comparing
  the wrong one still passes.
- The smoke grid is **32x32x32**, a cube, so a transposed index is invisible on it. The
  heat grid (64x64x32) discriminates z but not x/y.
- `nz` is **32 on both grids**, so a K-index slider works on both by coincidence. Page 13
  drives the slice by world height in metres instead.
- `smoke.speed` and `smoke.velocity` are **bit-identically z-invariant** (max deviation
  0.0; pressure 12.02, heat 14.26), so any z-axis cross-check run on speed has zero power
  over z. Cross-check on pressure.

When shipped data cannot distinguish two fields, build a fixture that can.

## vtk.js vs Three.js: the measured comparison (2026-09-19, spike Tasks 5 and 6)

Both pages draw the same DTCC artifacts from the same bundle, through the same
shared probe and benchmark code, at the same pinned 1280x720 drawing surface.

### Frame time: indistinguishable, and the first answer was wrong

Reported as p50, the robust statistic under a software rasterizer:

~~~
Three.js (page 14)  cpu p50  151.2 ms   (independent re-measure: 145.6)
vtk.js   (page 13)  cpu p50  152.8 ms   (independent re-measure: 149.1)
~~~

**There is no frame-time winner on this scene.** A few percent apart on
ANGLE/SwiftShader is indistinguishable for a decision.

> **These two figures are a single Task 6 session under an earlier protocol, and
> they are superseded.** No session in the seven-session table in
> `docs/scientific-visualization-measurements.md` contains a vtk.js 152.8, and
> the ~1.05% gap implied here sits *outside* the 2.0-7.1% range measured across
> those seven. Quote the range, not this pair. The conclusion is unchanged --
> both say no winner -- but a single session's figures are exactly what this
> spike's own rule says to publish as a range or not at all.

The first version of this measurement said Three.js was ~12% faster. It was
wrong, and the reason is worth keeping: page 14's offscreen opaque target was
single-sampled while page 13's canvas was multisampled at 4, so the two pages
were rasterizing terrain, buildings and streamlines at different sample counts.
The page labelled that FORCED, on the claim that a multisampled target cannot
hand a depth *texture* to the volume pass. That claim is false for three
0.185.1: `updateMultisampleRenderTarget` blits depth into the single-sample
framebuffer whose depth attachment is the `DepthTexture`, and
`resolveDepthBuffer` defaults true. Sampled the same way, the gap collapsed from
12.4% to 2.4%.

A page artifact wearing a renderer property's clothes. Caught only because the
review re-measured instead of reading.

### Resource growth: a real difference, and it favours Three.js

Per drawing-buffer resize, measured with GL-object counters on both pages and
confirmed independently at prototype level:

~~~
vtk.js 36.12.1   +1 texture, +1 framebuffer, +1 renderbuffer   per resize, never recovered
Three.js 0.185.1  0           0              0                  flat across 8 resizes
~~~

vtk.js's counts go 8/1/1 at startup to 18/11/11 after ten resizes. Growth tracks
resizes, never frames, never slice rebuilds, never case switches. Three.js holds
flat at 37 buffers / 12 textures / 5 framebuffers / 2 renderbuffers from ready
onward, across 100 control cycles, three benchmark runs and eight resizes.

### Maintenance burden: ~85 distinct GLSL lines, zero of them reused

Three.js has no volume renderer. The stock `three/addons/shaders/VolumeShader.js`
supplies only maximum-intensity and isosurface modes, not transparent
front-to-back compositing, so page 14 hand-writes the compositor and a two-pass
opaque depth stop.

9 shaders, 144 non-blank lines, 128 substantive as compiled, **85 distinct lines
owned**. Textual overlap with the stock addon is 11 lines, every distinct one of
which is `void main() {` or a precision qualifier, so **verbatim reuse is 0**.

That zero needs its structure stated or it misleads in the other direction: ~12
of the 85 are the shared colormap charged to this page (`COLORMAP_GLSL` measures
12 non-blank lines; this line said "~11" until Task 8 counted it), ~5 are verification
scaffolding that never runs in a frame, `#include <packing>` pulls
`perspectiveDepthToViewZ` from three's own chunk library as uncounted reuse, and
while the compositor and depth stop are genuinely new, the slab ray/AABB
intersection, the bounded march with a hard `MAX_STEPS`, the clim normalisation,
the sampler-helper factoring, the half-texel centring and the terminal alpha
discard are the addon's algorithm re-typed rather than reused.

vtk.js needs none of this: `vtkVolumeMapper` is the product.

**But it is the same mechanism, not a different one.** The parity suite's first
wording claimed the two renderers occlude the volume by "genuinely different
mechanisms", and that is wrong.
`@kitware/vtk.js/Rendering/OpenGL/VolumeMapper.js:113` substitutes
`//VTK::ZBuffer::Impl` with a `zBufferTexture` read and
`dists.y = min(zdepth, dists.y);` — the identical opaque-depth-texture clamp page
14 writes by hand. Neutralising that one line drives vtk.js's occlusion ratio to
1.00, symmetric with deleting page 14's `tFar = min(tFar, opaqueViewZ/rayViewZ)`.

So the burden difference is **ownership, not capability**: both pages run a depth
prepass and clamp the ray against it; on one it is vendored and maintained by
Kitware, on the other it is ~85 lines this repo owns. Do not write that vtk.js
needs no depth prepass.

## The decision rule, applied (2026-09-20, spike Task 9)

The rule, verbatim from the plan: **reject correctness failures, then sustained
FPS below 20, then compare maintenance burden and presentation. Permit neither.**

Run in that order, each gate naming what it consumed and on which surface. The
full evidence is `docs/scientific-visualization-measurements.md`; this section
applies the rule to it and adds no measurement of its own except the GPU pass
that document's appended Task 9 section records.

### Gate 1 — correctness. Rejects neither.

Consumed: the **23 genuinely cross-renderer assertions** of
`tests/scientific.spec.ts`. Not the 127 assertions the file contains (the
whole-branch review counted them; this said 130 and it was never 130). The
other ~104 are excluded by name and for a reason -- the three class counts
below were hand-tallied against the wrong total and sum 3 high, which changes
nothing about what they exclude:

- **9 `src/lib` invariants.** Both pages call the same shared function, so these
  compare `src/lib` with itself and cannot fail unless the shared library is
  edited. **They must never be quoted as "the renderers agree".**
- **72 single-page checks**, each of which holds on one page independently.
- **26 page-drift guards**, which compare the two *pages'* controls and readouts,
  not the two renderers.
- **The camera block is also excluded.** vtk.js's `getProjectionMatrix` returns
  an unnormalised matrix (396.5 / 1031.6 where Three.js returns 1.43 / 3.73 for
  the same 30° vertical field of view), so only the aspect ratio is comparable
  and that is all the suite compares.

The two loads the correctness claim rests on:

- **The picking sweep is the camera evidence.** 20 fixed rays at fractions of the
  pinned 1280x720 surface under `orbit-v1`'s own pose: `vtkCellPicker` over the
  polydata's cell data against `Raycaster.faceIndex` over the shipped
  `cellObjectIndex`. Two independent intersection implementations, one index
  space, nothing shared deciding the answer. Re-driven live on ANGLE Metal for
  this task: **17 hits, 3 misses, zero disagreements on hit, cell id or marker,
  worst intersection-point separation 1.2e-11 m against a 0.05 m bound.**
- **The 18-point GPU loop is the numerical evidence.** 3 world points x 3 data
  cases x 2 colour windows, each renderer's own shader read out of its own
  texture upload and out of its own drawing buffer, compared against CPU truth.
  Worst channel delta **1 of 255** on both renderers, on SwiftShader and again on
  ANGLE Metal.

Surface: chromium and firefox under ANGLE/SwiftShader for the suite of record;
re-verified on chromium under ANGLE Metal (Apple M4) for this task, 13 of 13
tests passing including the `OCCLUSION_CROSS_PAGE = 1.20` pin, which read 1.20.
**WebKit is untested and the conclusion is qualified to chromium and firefox, not
to "browsers".**

**Neither path is rejected.** Both renderers draw the same scene, from the same
artifacts, and agree on identity and on value.

### Gate 2 — sustained FPS below 20. Rejects neither.

Consumed: **the GPU-hardware pass**, `docs/scientific-visualization-measurements.md`,
appended Task 9 section. Surface: **ANGLE Metal Renderer: Apple M4**, hardware,
1280x720 pinned and asserted per run, `orbit-v1`, three interleaved sessions of
three cold page loads per page.

**Minimum sustained FPS (`1000 / p95`) is 126.6 - 163.9 across all 18 runs**;
vtk.js 126.6 - 156.3 over its 9 runs, Three.js 133.3 - 163.9 over its 9.
`classifyFps` returns **`meets-target` on all 18**. The gate rejects at 20 and
targets 30; both paths clear the target by more than four times.

**This gate did NOT consume the software numbers, and that is the whole point of
the extra pass.** The 3.2 - 5.9 FPS figures elsewhere in that document are
ANGLE/SwiftShader software rasterization and classify `fails-interactive-mvp` on
every run of both renderers. Running the gate on them would have rejected both
paths on evidence about neither — the same category error as the 12% MSAA
phantom, one level up. The two sets of numbers are never compared; they are
different surfaces and they live in different sections.

Scope of the FPS row: one M4, one Chromium build, one scene, one surface, one
day. It does not predict an integrated GPU, a 4K surface, a larger grid, or
WebKit.

### Gate 3 — maintenance burden and presentation. This is the gate that decides.

Frame time decides nothing here, on either surface, and it is placed last
deliberately so that ordering does not imply otherwise. **There is no frame-time
winner and the sign of the gap is not stable.** On SwiftShader the cross-renderer
gap spans 2.0 - 7.1% against a within-condition spread of 0.4 - 9.6%, with the
sign reversed in one session of seven. On Metal the gap spans 3.6 - 11.1% against
a spread of 3.4 - 17.0%, with the sign reversed in one session of three — and on
the same runs the CPU clock and the GPU timer point in **opposite directions**,
the CPU putting vtk.js behind in two sessions of three while the GPU timer puts
Three.js behind in all three. Two rasterizers, ten sessions, the same answer: not
a renderer property.

What the two paths actually cost, measured:

| | vtk.js 36.12.1 (page 13) | Three.js 0.185.1 (page 14) |
|---|---|---|
| GLSL owned | **0 lines, 0 shaders** | **~85 distinct lines**, 9 shaders, 0 reused verbatim — structure below |
| API entry points | **13**, all public `@kitware/vtk.js/...`, plus 2 rendering-profile imports. 0 experimental, 0 private | **21**: 19 core classes plus **2 `three/addons/*` modules**, which are not under the core stability guarantee |
| Undocumented dependencies | none found | **2**: `#include <packing>` resolving against three's internal `ShaderChunk`, and `WebGLRenderer`'s multisample depth-resolve behaviour, established by measurement rather than documentation |
| GL objects per drawing-buffer resize | **+1 texture, +1 framebuffer, +1 renderbuffer, never recovered** — +8/+8/+8 over 8 resizes, reproduced in seven sessions including one on hardware | **0, 0, 0** |
| GL objects over 100 no-resize control cycles | 0 on all six counters | 0 on all six counters |
| Page code fetched | 1,166,378 B of JS over 8 requests | 675,460 B over 6 |
| `dist` bundle | 1,168,299 B raw / 315,376 B gzip, 9 files | 677,411 B raw / 181,229 B gzip, 7 files |
| Data fetched | 3,251,647 B over 11 requests | **identical** |

**The ~85 published with its structure, because the bare zero misleads in both
directions.** Of the 85 distinct lines: about **12** are the shared colormap
(`COLORMAP_GLSL`), charged to this page because they compile into its fragment
shaders even though `src/lib` owns them; about **5** are verification scaffolding
that never runs in a frame; `#include <packing>` pulls `perspectiveDepthToViewZ`
out of Three.js's own chunk library and **is real reuse that is not counted
anywhere in the 85**; and the ray/AABB slab intersection, the bounded march with
a hard `MAX_STEPS`, the clim normalisation, the sampler-helper factoring and the
half-texel centring are the stock addon's algorithm **re-typed rather than
reused**. The compositor and the depth stop are genuinely new. The 11 lines that
are textually identical to the stock addon are all `void main() {` or
`precision highp float;`, which is why verbatim reuse computes to 0.

**The mechanism is the same on both pages.** Both renderers clamp the volume ray
against an opaque-depth texture: vtk.js inside `vtkOpenGLVolumeMapper`, which
substitutes `//VTK::ZBuffer::Impl` with a `zBufferTexture` read and
`dists.y = min(zdepth, dists.y);`, and page 14 by hand with an offscreen target
and a reconstructed view distance. Neutralising vtk.js's one line drives its
occlusion ratio to 1.00, symmetric with deleting page 14's
`tFar = min(tFar, opaqueViewZ / rayViewZ)`. **Do not write that vtk.js needs no
depth prepass. Both pages run one.** The difference is ownership, not capability.

### What the rule concludes

**The rule rejects neither path.** "Permit neither" is available and this
evidence does not reach it: gate 1 rejected nothing and gate 2 rejected nothing
on the surface it was given.

Gate 3 is a comparison, not a rejection, and it does not point one way on every
axis. Two of its three measured axes favour vtk.js — **0 GLSL lines against ~85,
and 13 public entry points with no addon tier against 21 entries including 2
addons and 2 undocumented dependencies** — and both are permanent: code this repo
would own and maintain, and API surface outside a stability guarantee. One axis
favours Three.js, and it is a live defect rather than a code-volume figure:
**vtk.js leaks three GL objects per drawing-buffer resize and never recovers
them**, reproduced identically in seven sessions on two rasterizers. That leak is
bounded and its shape is known — it tracks resizes only, never frames, never
slice rebuilds, never case switches, which the 100-cycle control result is the
evidence for — so its cost is set by how often a real page resizes its drawing
buffer, and it is an upstream bug with a clean reproduction rather than a
property of the approach.

**On this evidence, for a scientific view of this shape, vtk.js is the path with
the lower long-term cost**, and the reason is the burden axis, not speed and not
correctness. Three.js reaches the same picture and the same numbers; it reaches
them through a volume compositor and depth stop this repo writes and keeps
working against `three/addons/*` and two internal behaviours, and that is the
liability the measurement is actually about.

**The scope of that sentence, stated so it is not read wider than it was
measured.** It is one 500 m Gothenburg tile, one 32x32x32 synthetic smoke grid
and one 64x64x32 solved heat grid, one machine, one week, chromium and firefox
for correctness and one Apple M4 for the frame rate. It is not a claim about
vtk.js and Three.js in general. Things that are not measured here and could move
it: WebKit; any GPU that is not this one; a scene with substantially more
geometry or a substantially larger grid; a production interaction model that
resizes the drawing buffer continuously, which would raise the price of the
vtk.js leak; and anything about either library outside this one scene.

### The VTK.wasm companion

**Verdict: FEASIBLE FOR FURTHER EVALUATION.** All eleven success assertions
passed twice — once in the working environment and once from a clean install with
a bit-identical frame — in 11 minutes of a four-hour box. Full record:
`spikes/vtk-wasm/README.md`.

**The verdict is an input to this task. Its numbers are not.** Task 9 **did not
rank VTK.wasm against the two measured paths and could not have**: the probe ran
on ANGLE Metal on an M4 and the comparison of record is ANGLE/SwiftShader, so
putting its figures beside the evidence table would be a category error, not a
close call. Two caveats travel with the verdict:

- **The npm package is not the runtime.** `@kitware/vtk-wasm@3.0.4` is 432 KB of
  loader with **no `.wasm` in it**; the 84 MB binary comes from a GitHub `dist`
  branch whose documented default is a **moving nightly** at a version
  (`9.7.20260913`) unrelated to the npm version. Real use means self-hosting and
  pinning it.
- **One engine.** Chromium only. Firefox and WebKit were not tested, exactly as
  they are not tested for the frame times here.

## The geometry axis: flagship, pages 15 and 16 (2026-09-24)

The spike measured one 500 m Gothenburg tile with 215 extruded footprints. Its
own scope note named "a scene with substantially more geometry" as unmeasured.
`dtcc-core`'s Delft flagship model answers that half, and only that half.

~~~
                       shipped tile      flagship        ratio
buildings                      215        10,344           48x
vertices                    20,726     1,163,146           56x
triangles                   37,672       694,354           18x
~~~

Source: `flagship.dtcc`, sha256 `02139d40...c214`, generated by dtcc-core
`161f93f` with `--volume-spacing 20 20 5`. Extracted by
`scripts/flagship/extract.py` into `public/data/flagship/`.

### This axis has no volume result, and cannot have one

**flagship carries no usable volume grid.** The native format's 256 MiB ceiling
applies to the WHOLE model, not just the volume, and the 2 km city is already
~213 MiB of it. Measured, by running the generator:

~~~
--volume-spacing 20 20 10 (default)  100x100x14   230.9 MiB   ok
--volume-spacing 20 20  5            100x100x28   254.2 MiB   ok  <- the ceiling
--volume-spacing 20 20  4            100x100x35        --     "Canonical model exceeds 256 MiB limit"
--volume-spacing 16 16  4            125x125x35        --     same
--volume-spacing  8  8  1            250x250x139       --     rejected early by volume_layout
~~~

Two separate ceilings: `volume_layout` checks the volume alone and rejects up
front; the serializer then checks the whole model and rejects after ~3 minutes
of work. The budget goes to the **tetrahedral mesh** (6 tets/cell, ~120 bytes a
cell) rather than the VolumeGrid (4 bytes a cell per float32 field), and to the
grid's **seven fields** (34 bytes a cell once velocity's 3 components and
float64 pressure are counted).

**The largest volume that fits has 28 z layers, FEWER than the 32 both existing
cases already use.** Nothing on this axis may be quoted as a volume result.

### Frame time: Three.js wins here, and the sign never reverses

Six interleaved cold-context runs per renderer, orbit-flagship-v1, 30 warmup +
180 measured frames, pinned 1280x720, matched 30 degree FOV, ANGLE Metal on an
Apple M4.

~~~
                    vtk.js (15)      Three.js (16)   disjoint?  gap vs widest spread
cpu p50          4.90 - 5.40 ms    2.80 - 3.30 ms      yes       1.60 vs 0.50
cpu p95          6.50 - 6.70 ms    3.80 - 4.10 ms      yes       2.40 vs 0.30
gpu p50          3.32 - 3.82 ms    1.35 - 1.72 ms      yes       1.60 vs 0.50
min FPS (1000/p95)    149 - 154        244 - 263       yes         --
~~~

**Three.js is faster on this scene.** The ranges do not overlap, the gap exceeds
the within-condition spread on every metric, and the sign does not reverse in
any of the six runs on either clock. That is the test the volume comparison
failed. Ranges, never a ratio. Both clear the 30 FPS target by 5-8x.

> **This table has been measured three times and only the third is valid.** The
> first two were not renderer comparisons.
>
> ~~~
> 1st  no controls, AA MISMATCHED    vtk 4.80-6.20   three 2.30-2.50
> 2nd  controls, AA still mismatched vtk 5.40-5.60   three 2.70-2.80
> 3rd  AA matched, surface matched   vtk 4.90-5.40   three 2.80-3.30   <- this one
> ~~~
>
> **The confound: the two pages were not antialiasing the same.** vtk.js's
> `get3DContext` does not pass `antialias`, so it took the WebGL default of
> true; page 16 asked for `antialias: false`. Measured on the shipped pages:
> `SAMPLES` 4 against `SAMPLES` 0. vtk.js was resolving 4x MSAA at every
> one-pixel readback and Three.js was resolving nothing, so vtk.js was carrying
> strictly more work in a comparison published as a renderer difference.
> **Pages 13 and 14 already carry a comment warning about exactly this**, and it
> was not read before these pages were written. The team spotted it by eye
> before any check did: "the anti-aliasing looks better to me on the VTK
> version".
>
> The conclusion survived the correction -- still disjoint, still no sign
> reversal -- but on a narrower margin (gap 1.60 against a 0.50 spread, where
> the mismatched table read 2.60 against 0.20).

### Surface: the pages were rendering 1280x720 into 1913 CSS pixels

Both pages pinned the drawing buffer to the benchmark surface for their whole
life, and the browser stretched it across the element. That is the blur the team
reported ("the meshes look terrible"). Both now size the buffer to the element
at device pixels and pin 1280x720 only for the duration of a run, as pages 13
and 14 do. Each vtk.js `setSize` costs two GL objects it never returns, which is
the resize leak and is reported rather than hidden.

One defect came straight out of that change: page 15's picker converted
normalized display coordinates with the 1280x720 constant instead of the live
surface, and resolved triangle **2203** where page 16 resolved **658873** -- the
first time the two ever disagreed. Fixed to read the live render-window size.

### Correctness: the two renderers agree exactly

`vtkCellPicker` over the polydata's cell data against `Raycaster.faceIndex` over
the shipped `cell_object_index` -- two independent intersection implementations
-- resolved **the same triangle 658873** (`NL.IMBAG.Pand.0503100000034469-0`) in
all twelve runs. Resource counts were flat across every 210-frame run: vtk.js 2
buffers, Three.js 3, zero textures and render targets on both. That says
nothing about the vtk.js resize leak -- these pages never resize.

### Three traps on this axis

- **orbit-v1's literals do not transfer.** `radius 500, target [0,0,40]` was
  tuned to a 250 m tile; flagship's extent is ~1000 m, so reusing them puts the
  camera inside the city and still returns 180 plausible frame times.
  orbit-flagship-v1 derives both from `dataset.json` using orbit-v1's own ratios.
- **A centre-screen pick misses the city.** The camera target sits at half the
  *tallest* building (53.8 m, the EWI tower); ordinary Delft rooftops are 10-20 m,
  so the centre ray passes over them and reaches ground level ~93 m past the
  target. "No selectedObject" looked like broken picking and was not. Both pages
  aim at a projected building centroid instead and record expected against
  picked; a mismatch is occlusion, verified by distance (1985.5 m against
  2001.4 m), not assumed.
- **`vtkInteractor.disable()` stops vtk.js rendering, it does not merely stop
  the mouse.** Reached for to keep a drag from moving the camera mid-run. The
  run then completed all 180 frames, reported `measurementValid: true`, and drew
  nothing: cpu p50 fell from 5.5 ms to 0.3 ms with **zero** GPU samples kept.
  That reads as a 15x speedup, not as a broken run, and only a side-by-side
  against the same page without the call exposed it. Both pages now take the
  camera away from the pointer without touching rendering -- page 15 by dropping
  the interactor STYLE, page 16 by `controls.enabled = false`.
- **The two pages did not agree on whether they were interactive, and nothing
  said so.** vtk.js's `FullScreenRenderWindow` installs an interactor by
  default, so page 15 orbited from its first commit while page 16 had no
  controls at all. Measured by screenshot hash before and after a drag: page 15
  changed, page 16 was byte-identical. The probe now publishes `interactive`,
  and page 16 carries OrbitControls like page 14 does.
- **Neither renderer's default FOV may be inherited.** vtk.js defaults to 30,
  Three.js to 50. Taking each default would have the two pages drawing different
  amounts of city at the same camera position, and the difference would read as
  a renderer gap. Both now set `FLAGSHIP_FOV_DEG` explicitly.

### Upstream notes

- **68 source surfaces were skipped at extraction.** Every one has fewer than 3
  distinct vertices and zero area, verified individually. Nothing drawable is
  missing.
- **`download_flagship_sources.py` was not reproducible.** `water.geojson` is a
  live PDOK API query that was pinned by sha256; it had already drifted one day
  after the snapshot. The other 16 sources matched. dtcc-core `9b4e9b9` resolved
  this by **removing all 17 checksums**, so `dataset.json` records flagship's own
  sha256 instead -- this bench verifies what it measured whether or not upstream
  does.
