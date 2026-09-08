# engine-bench notes

## Environment

maplibre-gl pinned to 5.24.0: @deck.gl/mapbox 9.4.0 interleaved mode reads `map.transform`, removed from `Map` in maplibre-gl 6.x (verified: 6.8.0 `map.transform === undefined`). Spec §2 says 5.x.

## Briefing corrections

- deck.gl 9.4.0 ScenegraphLayer does not render glTF COLOR_0 (stock vertex shader declares no colour attribute); B2 "works in every viewer today" holds for the mesh path (SimpleMeshLayer / Tile3DLayer mesh content), not the glTF path.

## Findings

- Page 08 (`field-baked.glb`, COLOR_0 = baked RGB, no `_TEMPERATURE`): right copy (SimpleMeshLayer) renders coloured — blue-to-red gradient with a red/yellow hot spot. Left copy (ScenegraphLayer) renders plain white/grey; COLOR_0 never reaches its GPU buffer at all. Probe: `simpleMesh = {inBufferLayout: true, inShaderLayout: true, inVsSource: true}` (probed as `colors`), `scenegraph = {inBufferLayout: false, inShaderLayout: false, inVsSource: false}` (probed as `COLOR_0`). Buffer-layout names printed to the probe panel: SimpleMeshLayer → `geometry, instancePositions, instanceColors, instanceModelMatrix` (colors folded into the interleaved `geometry` entry's nested attributes); ScenegraphLayer → `instancePositions, instanceColors, instanceModelMatrix, geometry` (its `geometry` entry has no colour attribute at all — stock scenegraph-layer-vertex.glsl.ts never declares one). So B2 stands for the mesh path only.
- Implementation note (not a briefing correction): `loadGltfMesh` (`src/lib/deck-map.ts`) copies each glTF accessor into `{value, size}` and drops the accessor's `normalized` flag. `field-baked.glb`'s COLOR_0 is a normalized Uint8 VEC3 accessor; without `normalized: true` carried through, luma.gl's `VertexFormatDecoder` rejects a 3-component uint8 vertex format outright (`Error: size: 3`) before SimpleMeshLayer draws anything. Page 08's `main.ts` restores `mesh.attributes.COLOR_0.normalized = true` on the object `loadGltfMesh` already returns (no change to the shared helper) — this is what makes the mesh-path render succeed and is worth fixing in `loadGltfMesh` itself if a later page hits the same normalized-byte-attribute path.
