# engine-bench notes

## Environment

maplibre-gl pinned to 5.24.0: @deck.gl/mapbox 9.4.0 interleaved mode reads `map.transform`, removed from `Map` in maplibre-gl 6.x (verified: 6.8.0 `map.transform === undefined`). Spec §2 says 5.x.

## Briefing corrections

- deck.gl 9.4.0 ScenegraphLayer does not render glTF COLOR_0 (stock vertex shader declares no colour attribute); B2 "works in every viewer today" holds for the mesh path (SimpleMeshLayer / Tile3DLayer mesh content), not the glTF path.
- Pages 02/03 are titled "floats" after the briefing's wording, but the synthetic hill is ≥ 5 m above sea level everywhere, so sea-level geometry is buried, never floating; the mechanism (MapLibre never drapes `custom` layers) is the same. The page bodies say "buried".

## Findings

- dtcc-core#85 round trip on `gothenburg-skansen-kronan` (`save_volume_mesh` in the dtcc-sim container -> `load_volume_mesh` natively): **no loss**. vertices 50729 -> 50729, cells 182331 -> 182331, field `temperature` -> `temperature`, dtype float64 -> float64, max |dT| 0.0. Full record in `public/data/real/dataset.json` under `stage2.roundtrip`.
- The temperature field sampled onto the ground mesh (`field.glb`/`field-baked.glb`, 6,288 vertices) is much flatter than either the full volume solve or the synthetic scene's display range, and this is expected, not a defect. The solve's full field spans 18.00-32.95 degC (mean 26.11) and the 64x64x32 volume grid sampled for `field.grid.f32` spans 18.00-32.49 degC, but the ground mesh itself — which sits at `ground_bc_type: dirichlet, ground_value: 18.0` — spans only 18.00-22.63 degC, and its 2nd/98th-percentile colour range (`field.json`'s `tmin`/`tmax`, what pages actually colour against) is 18.00-18.746 degC, a 0.75 degC band. The ground is a Dirichlet boundary pinned to the ambient value, so almost every ground vertex sits at or near 18 degC by construction; only vertices close to a hot building wall or roof rise above it. The synthetic scene's fixed display range is [10, 35] degC (25 degC span) for comparison. Left as measured — not retuned. Consequence for the briefing: normalising a 0.75 degC span onto the same five-stop blue-to-red ramp still paints a full blue-to-red gradient across the mesh — the ramp always spans its input's own min-to-max, regardless of how narrow that input is — so pages 07/08/10/11 on the real dataset will *look* like a dramatic temperature swing across the surface while representing almost no actual variation. A reader who sees only the screenshot, without this number, would be misled about how much the real solve's ground temperature actually varies.
- Page 08 (`field-baked.glb`, COLOR_0 = baked RGB, no `_TEMPERATURE`): right copy (SimpleMeshLayer) renders coloured — blue-to-red gradient with a red/yellow hot spot. Left copy (ScenegraphLayer) renders plain white/grey; COLOR_0 never reaches its GPU buffer at all. Probe: `simpleMesh = {inBufferLayout: true, inShaderLayout: true, inVsSource: true}` (probed as `colors`), `scenegraph = {inBufferLayout: false, inShaderLayout: false, inVsSource: false}` (probed as `COLOR_0`). Buffer-layout names printed to the probe panel: SimpleMeshLayer → `geometry, instancePositions, instanceColors, instanceModelMatrix` (colors folded into the interleaved `geometry` entry's nested attributes); ScenegraphLayer → `instancePositions, instanceColors, instanceModelMatrix, geometry` (its `geometry` entry has no colour attribute at all — stock scenegraph-layer-vertex.glsl.ts never declares one). So B2 stands for the mesh path only.
- Page 07 (fix B1): on deck.gl 9.4.0 the fix is one `getShaders()` override plus a `draw()` override to feed the uniform — patch the two stock vertex anchors (`in vec3 positions;`, `void main(void) {`) and the flat-path fragment assignment, append a 2-float uniform-block module, and `_TEMPERATURE` binds and colours. No buffer-layout entry was needed (the attribute already reaches the model's `bufferLayout`), and `src/lib/probe.ts` needed no change: once the attribute is declared and used, WebGL program introspection puts it in `model.pipeline.shaderLayout.attributes`, so the probe flips to `{inBufferLayout: true, inShaderLayout: true, inVsSource: true}` on its own. One trap the briefing's "genuinely small" hides: the fragment shader has three `fragColor = ...;` assignments (PBR, textured flat, flat) — a naive first-match replace patches the dead PBR branch and leaves the surface uncoloured, so the anchor must be the exact `fragColor = vColor;`, and each anchor needs its own no-op guard.
- Implementation note (not a briefing correction): `loadGltfMesh` (`src/lib/deck-map.ts`) previously dropped the glTF accessor's `normalized` flag when building each `Attr`, which crashed `SimpleMeshLayer` on `field-baked.glb`'s normalized Uint8 VEC3 `COLOR_0` (`Error: size: 3` from luma.gl's `VertexFormatDecoder`, deck.gl 9.4.0 / loaders.gl `@loaders.gl/gltf`). Fixed at the source: `loadGltfMesh` now carries `a.normalized` through into every returned `Attr`, so page 08 needs no page-local workaround.
- Page 11 (@kitware/vtk.js 36.12.1): the plan's opacity transfer function (10→0, 20→0.02, 35→0.35) accumulated enough opacity from the 10–20 °C ambient field to hide the isosurface at every slider value above ~15 °C; retuned to 10→0, 20→0.002, 28→0.02, 35→0.12. vtk.js volume + surface compositing works; the defect was the numbers.
- Page 12 (PlayCanvas 2.22.0, `field-baked.glb`): contrary to the task facts' assumption ("PlayCanvas 2.22.0 ignores glTF COLOR_0 unless the material sets diffuseVertexColor"), the mesh rendered with correct vertex colours (blue-to-red gradient with a red/yellow hot spot) straight out of `instantiateRenderEntity()` — no material patch needed. Verified directly: built and screenshotted the page once with a `meshInstance.material.diffuseVertexColor = true; material.update();` loop applied after instantiation, and once with that loop entirely removed; the two screenshots were visually identical. `pc.Application` (deprecated in favour of `AppBase`/`createGraphicsDevice` but still present in 2.22.0) initialised and rendered cleanly under Playwright/SwiftShader with zero console errors either way, so this version's `ContainerHandler`/glTF parser must already set `diffuseVertexColor` on generated materials when a primitive has `COLOR_0`. Page 12 therefore ships without any vertex-colour workaround.
- Page 10 (Cesium `VoxelPrimitive`, 1.145.0): the volumetric renderer is real and does render our 64×64×32 float grid, but "working volumetric renderer" understates the assembly. (a) `VoxelProvider` is an interface with an instantiation-throwing constructor and no public concrete implementation for in-memory data — the only shipped one is `Cesium3DTilesVoxelProvider`, which wants a 3D Tiles tileset with `EXT_primitive_voxels`/`EXT_structural_metadata` glTF content. Feeding a plain `Float32Array` means hand-rolling an object with 17 properties (`shape, dimensions, names, types, componentTypes, minimumValues, maximumValues, globalTransform, shapeTransform, minBounds, maxBounds, paddingBefore, paddingAfter, maximumTileCount, availableLevels, requestData`, plus the optional `metadataOrder`) that Cesium reads as plain properties, and both `VoxelPrimitive` and `VoxelProvider` are marked `@experimental` — outside the deprecation policy. (b) It is expensive: the ray-march runs at roughly one frame per second at 1280×800 under Playwright's SwiftShader, enough to starve the globe's own tile refinement, so page 10 adds the primitive only after the terrain has settled. `stepSize` (1 → 8) changes nothing there; the cost is shader-bound, not step-bound. (c) The volume is drawn as a full-screen ray-march compositing front-to-back, so the briefing's mental model of "the hot core shows red" needs `depthTest = false` (the hottest air in our field is at ground level, i.e. inside the hill) and a steeper opacity ramp than the obvious one — at `alpha = t²·0.9` the ray saturates on the cool near side and the core never reaches the screen. Even at `t³·0.35` the front-to-back composite still dilutes the handful of peak voxels with everything in front of them, so at any legible opacity the core reads amber, not the red the top of the colour scale implies.
- Real tile `gothenburg-skansen-kronan` (500 m box, EPSG:3006 [318369, 6398890, 318869, 6399390],
  relief 53.5 m, 217 LOD0 footprints in `footprints.geojson` — what page 01 draws — and 103 connected
  components in the drawn LOD1 surface mesh, i.e. 103 welded building groups, which is what pages
  02/03/05/06/09 draw), pages 01/02/03. (An earlier draft of this entry said "215 buildings"; that was
  a stale Stage 1 count from before the Task 3b regeneration and never a measured figure. Re-measured
  on the shipped data in Task 8: 217 and 103.) Page 01's `fill-extrusion` drapes
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
  real branch describing what the screenshot shows. The remaining ten pages still carry
  synthetic-only `expect:` text on `?dataset=real`; Task 12 Step 3 sweeps them.
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
  east-west and -10.85 / +10.84 m north-south**, about 11 screen px at zoom 16.2. Measured on screen,
  not just on paper: pages 05 and 06 share a camera and both draw the same 10 m contour rule over the
  same DEM, so the contour marks should land on the same pixels. Cross-correlating the two masks over
  the hill, page 05 before the fix peaked at a shift of (+15, -20) screen px with 4,130 px of overlap
  at zero shift; after the fix it peaks at (+4, -4) px with 9,358 at zero shift — the residual is the
  Delatin terrain mesh disagreeing with MapLibre's 256 px DEM tiles, not a frame error.
  Fixed by handing `TerrainLayer` `extentLngLatBounds(scene)`, the same true-north 500 m square every
  other layer and page already uses. `terrain.json` is left alone: as source metadata the reprojected
  corners are correct, they are just not a bbox and not the bench's frame.
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
  on 3.7 m of ground — 40% of its height, plainly visible but not a vanishing — while 30 of 103 go
  under completely and the hilltop octagon is swallowed by 50.5 m. At 0.5 they float by 1.85 m median,
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
  floats: of the 103 building groups, 55 sink into the ground (14 of them out of sight, worst 47.1 m)
  and only 47 float, by at most 3.00 m — less than a third of the median 9.35 m building height, i.e.
  barely visible. Only 17 of 103 are off by more than 5 m. So on a 500 m tile the model-origin clamp
  error is not "floats clear", it is "correct to within a couple of metres for most of the tile and
  catastrophic for the few buildings on the hill". Both `expect:` texts corrected.
- Pages 04 and 12 are now gated on `scene.hasField` like 07, 08, 10 and 11, and added to
  `FIELD_PAGES` in `tests/smoke.spec.ts`. Both gate before any engine is constructed: on
  `?dataset=real` page 04 reports and finishes in 546 ms without building a MapLibre map, page 12 in
  737 ms without constructing `pc.Application`. Their header `expect:` lines still describe the
  synthetic field render while the body says there is no field — the same mismatch the four pages
  gated in Task 6 already carry, and Task 12 Step 3's sweep covers all six.
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
