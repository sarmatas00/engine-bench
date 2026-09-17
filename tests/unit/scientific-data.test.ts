import {describe, expect, test, beforeEach, afterEach} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  decodeScientificBundle,
  loadMeshPair,
  loadScientificBundle,
  type ArraySpec,
  type BuildingsMeshJson,
  type FieldGridJson,
  type MeshPairJson,
  type ScientificManifest,
  type ScientificRawBlobs,
  type ScientificRawManifest,
} from '../../src/lib/scientific-data';

// ---------------------------------------------------------------------------
// Fixture builders. Deliberately tiny (a handful of vertices/samples) so each
// test can see exactly what it is asserting on -- the real committed bundle
// is exercised separately, at the bottom of this file, so a regression in
// generation doesn't get mistaken for a regression in the loader.

type PackedArray = {name: string; type: ArraySpec['type']; components: number; values: number[]};

function packArrays(entries: PackedArray[]): {bytes: Uint8Array; specs: ArraySpec[]} {
  const chunks: Uint8Array[] = [];
  const specs: ArraySpec[] = [];
  let offset = 0;
  const pad = () => { while (offset % 4) { chunks.push(new Uint8Array([0])); offset += 1; } };
  for (const e of entries) {
    pad();
    let bytes: Uint8Array;
    if (e.type === 'f32') bytes = new Uint8Array(Float32Array.from(e.values).buffer);
    else if (e.type === 'u32') bytes = new Uint8Array(Uint32Array.from(e.values).buffer);
    else bytes = Uint8Array.from(e.values);
    specs.push({name: e.name, type: e.type, components: e.components, offset, length: e.values.length});
    chunks.push(bytes);
    offset += bytes.byteLength;
  }
  pad();
  const out = new Uint8Array(offset);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return {bytes: out, specs};
}

function meshPairJson(specs: ArraySpec[], byteLength: number, vertexCount: number, indexCount: number, name: string): MeshPairJson {
  return {bin: `${name}.mesh.bin`, vertexCount, indexCount, byteLength, arrays: specs};
}

/** A quad (4 verts, 2 triangles) sitting inside LOCAL_BOUNDS, no identity. */
function terrainFixture(): {json: MeshPairJson; bytes: Uint8Array} {
  const positions = [-5, -5, 0, 5, -5, 0, 5, 5, 0, -5, 5, 0];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  const indices = [0, 1, 2, 0, 2, 3];
  const {bytes, specs} = packArrays([
    {name: 'positions', type: 'f32', components: 3, values: positions},
    {name: 'normals', type: 'f32', components: 3, values: normals},
    {name: 'indices', type: 'u32', components: 1, values: indices},
  ]);
  return {json: meshPairJson(specs, bytes.byteLength, 4, indices.length, 'ground'), bytes};
}

/**
 * 3 markers, 4 triangles, all within LOCAL_BOUNDS:
 *  - marker 0: one source building (the common case).
 *  - marker 1: a merged region fanning out to three source buildings.
 *  - marker 2: a split-added region with no source building -- empty, valid.
 * regionMarkerCount=2 (markers 0,1 are conditioned), splitAddedMarkers=1
 * (marker 2), conditionedRegionCount is set to a different, wrong-if-used
 * number on purpose so a loader that used it instead would fail here.
 */
function buildingsFixture(opts?: {identityStability?: BuildingsMeshJson['identityStability']; cellObjectIndex?: number[]}): {json: BuildingsMeshJson; bytes: Uint8Array} {
  const positions = [-3, -3, 0, 3, -3, 0, 3, 3, 0, -3, 3, 0, -1, -1, 1, 1, -1, 1];
  const normals = new Array(positions.length / 3 * 3).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0));
  const indices = [0, 1, 2, 0, 2, 3, 0, 1, 4, 1, 4, 5];
  const cellObjectIndex = opts?.cellObjectIndex ?? [0, 1, 2, 2];
  const {bytes, specs} = packArrays([
    {name: 'positions', type: 'f32', components: 3, values: positions},
    {name: 'normals', type: 'f32', components: 3, values: normals},
    {name: 'indices', type: 'u32', components: 1, values: indices},
    {name: 'cell_object_index', type: 'u32', components: 1, values: cellObjectIndex},
  ]);
  const base = meshPairJson(specs, bytes.byteLength, positions.length / 3, indices.length, 'buildings');
  const json: BuildingsMeshJson = {
    ...base,
    objects: [
      {sourceIndexes: [5], dtccIds: ['00000000-0000-0000-0000-00000000000a']},
      {sourceIndexes: [6, 7, 8], dtccIds: [
        '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-00000000000c',
        '00000000-0000-0000-0000-00000000000d',
      ]},
      {sourceIndexes: [], dtccIds: []},
    ],
    objectIndexSpace: 'conditioned_building_region',
    regionMarkerCount: 2,
    conditionedRegionCount: 9, // deliberately wrong if a loader used this as the boundary
    splitAddedMarkers: 1,
    sourceBuildingCount: 9,
    identityStability: opts?.identityStability ?? 'unstable_observed',
    firstLoadHash: 'first-hash',
    secondLoadHash: opts?.identityStability === 'stable_observed_two_loads' ? 'first-hash' : 'second-hash',
    auditedAt: '2026-09-11T00:00:00Z',
  };
  return {json, bytes};
}

const LOCAL_BOUNDS: [number, number, number, number, number, number] = [-10, -10, 0, 10, 10, 10];

function heatGridFixture(overrides?: Partial<FieldGridJson>): FieldGridJson {
  return {
    dims: [2, 2, 2],
    origin: [-10, -10, 0],
    spacing: [20, 20, 10],
    min: 10,
    max: 20,
    dataUrl: '/data/real/field.grid.f32',
    ...overrides,
  };
}

/** grid (2^3), slice (2^2), and 2 streamlines (3 + 2 points) in one blob. */
function smokeFixture() {
  const gridN = 8;
  const sliceN = 4;
  const streamPositions = [
    0, 0, 0, 0, 0, 1, 0, 0, 2, // line 0: 3 points
    1, 1, 0, 1, 1, 1, // line 1: 2 points
  ];
  const streamCount = streamPositions.length / 3;
  const {bytes, specs} = packArrays([
    {name: 'grid_velocity', type: 'f32', components: 3, values: new Array(gridN * 3).fill(0).map((_, i) => i * 0.1)},
    {name: 'grid_speed', type: 'f32', components: 1, values: new Array(gridN).fill(1)},
    {name: 'grid_pressure', type: 'f32', components: 1, values: new Array(gridN).fill(101325)},
    {name: 'slice_velocity', type: 'f32', components: 3, values: new Array(sliceN * 3).fill(0.2)},
    {name: 'slice_speed', type: 'f32', components: 1, values: new Array(sliceN).fill(2)},
    {name: 'slice_pressure', type: 'f32', components: 1, values: new Array(sliceN).fill(101300)},
    {name: 'streamline_positions', type: 'f32', components: 3, values: streamPositions},
    {name: 'streamline_velocity', type: 'f32', components: 3, values: new Array(streamCount * 3).fill(0.3)},
    {name: 'streamline_speed', type: 'f32', components: 1, values: new Array(streamCount).fill(3)},
    {name: 'streamline_pressure', type: 'f32', components: 1, values: new Array(streamCount).fill(101200)},
  ]);
  const byName = new Map(specs.map(s => [s.name, s]));
  const only = (...names: string[]) => names.map(n => byName.get(n)!);
  return {
    bytes,
    grid: {
      resolution: 2, dims: [2, 2, 2] as [number, number, number], origin: [-10, -10, 0] as [number, number, number],
      spacing: [20, 20, 10] as [number, number, number], association: 'vertex',
      arrays: only('grid_velocity', 'grid_speed', 'grid_pressure'),
    },
    slice: {
      axis: 'z', position: 0.5, resolution: 2, localAxes: [0, 1] as [number, number], fixedLocalAxis: 2,
      fixedLocalCoordinate: 5, domainLocalBounds: LOCAL_BOUNDS, association: null,
      arrays: only('slice_velocity', 'slice_speed', 'slice_pressure'),
    },
    streamlines: {
      seedAxis: 'z', seedPosition: 0.5, requestedCount: 2, actualCount: 2, steps: 3, stepSize: 0.05,
      domainLocalBounds: LOCAL_BOUNDS, vertexOffsets: [0, 3, 5], seedIndices: [1, 0], association: null,
      arrays: only('streamline_positions', 'streamline_velocity', 'streamline_speed', 'streamline_pressure'),
    },
  };
}

function scientificManifest(overrides?: Partial<ScientificManifest>): ScientificManifest {
  const smoke = smokeFixture();
  return {
    schemaVersion: 1,
    coordinateFrame: {crs: 'EPSG:3006', origin: [100, 200], z0: 1, bounds: [90, 190, 110, 210], localBounds: LOCAL_BOUNDS},
    fields: {
      velocity: {unit: 'm/s', dim: 3}, speed: {unit: 'm/s', dim: 1},
      pressure: {unit: 'Pa', dim: 1}, temperature: {unit: 'degC', dim: 1},
    },
    cases: {
      smoke: {dataCategory: 'synthetic', dtccCoreRevision: 'test', grid: smoke.grid, slice: smoke.slice, streamlines: smoke.streamlines},
      heat: {dataCategory: 'simulation', source: 'test-sim', unit: 'degC',
             surfaceTmin: 10, surfaceTmax: 20,
             surfaceSampling: 'ground mesh (test)', gridRangeSource: 'field.grid.json (test)',
             association: null},
    },
    dependencies: [],
    binary: {path: 'scientific.bin', byteLength: smoke.bytes.byteLength, sha256: ''},
    ...overrides,
  };
}

function fixture(opts?: {identityStability?: BuildingsMeshJson['identityStability']}) {
  const terrain = terrainFixture();
  const buildings = buildingsFixture(opts);
  const smoke = smokeFixture();
  const manifest: ScientificRawManifest = {
    scientific: scientificManifest(),
    terrainMesh: terrain.json,
    buildingsMesh: buildings.json,
    heatGrid: heatGridFixture(),
  };
  const blob: ScientificRawBlobs = {scientific: smoke.bytes, terrain: terrain.bytes, buildings: buildings.bytes};
  return {manifest, blob};
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------

describe('decodeScientificBundle: building identity', () => {
  test('decodes a multi-source fan-out entry and an empty (split-added) entry without collapsing them', () => {
    const {manifest, blob} = fixture();
    const bundle = decodeScientificBundle(manifest, blob);
    expect(bundle.city.objects.get(1)).toEqual({
      sourceIndexes: [6, 7, 8],
      dtccIds: [
        '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-00000000000c',
        '00000000-0000-0000-0000-00000000000d',
      ],
    });
    // Split-added, no source building. Valid data, not an error.
    expect(bundle.city.objects.get(2)).toEqual({sourceIndexes: [], dtccIds: []});
    expect(bundle.city.objects.get(0)).toEqual({
      sourceIndexes: [5], dtccIds: ['00000000-0000-0000-0000-00000000000a'],
    });
  });

  test('throws on a marker with no entry at all (index >= objects.length): genuine corruption', () => {
    const {manifest, blob} = fixture();
    const corrupt = buildingsFixture({cellObjectIndex: [0, 1, 2, 99]});
    manifest.buildingsMesh = corrupt.json;
    blob.buildings = corrupt.bytes;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/marker 99/);
  });

  test('does not throw on an empty entry -- 103-of-206-style split-added markers are valid', () => {
    const {manifest, blob} = fixture();
    // Every triangle points at marker 2, the empty split-added entry.
    const allEmpty = buildingsFixture({cellObjectIndex: [2, 2, 2, 2]});
    manifest.buildingsMesh = allEmpty.json;
    blob.buildings = allEmpty.bytes;
    const bundle = decodeScientificBundle(manifest, blob);
    expect(bundle.city.objects.get(2)).toEqual({sourceIndexes: [], dtccIds: []});
  });

  test('uses regionMarkerCount, not conditionedRegionCount, to validate the objects table', () => {
    const {manifest, blob} = fixture();
    // conditionedRegionCount (9) + splitAddedMarkers (1) = 10 != objects.length (3):
    // if the loader used it, this fixture would wrongly throw.
    const bundle = decodeScientificBundle(manifest, blob);
    expect(bundle.city.objects.size).toBe(3);
  });

  test('rejects a table whose regionMarkerCount + splitAddedMarkers disagrees with objects.length', () => {
    const {manifest, blob} = fixture();
    manifest.buildingsMesh = {...manifest.buildingsMesh, regionMarkerCount: 5};
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/regionMarkerCount/);
  });

  test('rejects an entry whose sourceIndexes and dtccIds disagree in length', () => {
    const {manifest, blob} = fixture();
    manifest.buildingsMesh = clone(manifest.buildingsMesh);
    manifest.buildingsMesh.objects[0] = {sourceIndexes: [1, 2], dtccIds: ['only-one']};
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/sourceIndexes.*dtccIds/);
  });

  test('decodes both identity-stability verdicts', () => {
    const stable = fixture({identityStability: 'stable_observed_two_loads'});
    expect(decodeScientificBundle(stable.manifest, stable.blob).city.identityStability).toBe('stable_observed_two_loads');
    const unstable = fixture({identityStability: 'unstable_observed'});
    expect(decodeScientificBundle(unstable.manifest, unstable.blob).city.identityStability).toBe('unstable_observed');
  });

  test('rejects an unrecognized identityStability verdict', () => {
    const {manifest, blob} = fixture();
    manifest.buildingsMesh = {...manifest.buildingsMesh, identityStability: 'made_up' as never};
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/identityStability/);
  });
});

describe('decodeScientificBundle: association can be null and must not be substituted', () => {
  test('grid keeps its non-null association, slice/streamlines/heat keep null', () => {
    const {manifest, blob} = fixture();
    const bundle = decodeScientificBundle(manifest, blob);
    expect(bundle.smoke.grid.association).toBe('vertex');
    expect(bundle.smoke.slice.association).toBeNull();
    expect(bundle.smoke.streamlines.association).toBeNull();
    expect(bundle.heat.grid.association).toBeNull();
  });
});

describe('decodeScientificBundle: metadata validated before typed-array views', () => {
  test('rejects the wrong schema version', () => {
    const {manifest, blob} = fixture();
    manifest.scientific = {...manifest.scientific, schemaVersion: 2};
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/schemaVersion/);
  });

  test('rejects a mesh pair whose declared byteLength disagrees with the bytes on disk', () => {
    const {manifest, blob} = fixture();
    manifest.terrainMesh = {...manifest.terrainMesh, byteLength: manifest.terrainMesh.byteLength + 4};
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/byteLength/);
  });
});

describe('decodeScientificBundle: array range, overlap, and alignment', () => {
  test('rejects an array spec whose range runs past the end of the buffer', () => {
    const {manifest, blob} = fixture();
    manifest.terrainMesh = clone(manifest.terrainMesh);
    const spec = manifest.terrainMesh.arrays.find(a => a.name === 'indices')!;
    spec.length += 1000;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/exceeds buffer/);
  });

  test('rejects two array specs that overlap', () => {
    const {manifest, blob} = fixture();
    manifest.terrainMesh = clone(manifest.terrainMesh);
    const positions = manifest.terrainMesh.arrays.find(a => a.name === 'positions')!;
    const normals = manifest.terrainMesh.arrays.find(a => a.name === 'normals')!;
    normals.offset = positions.offset + 4; // deliberately inside positions' range
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/overlaps/);
  });

  test('rejects a non-4-byte-aligned offset for an f32/u32 array', () => {
    const {manifest, blob} = fixture();
    manifest.terrainMesh = clone(manifest.terrainMesh);
    const normals = manifest.terrainMesh.arrays.find(a => a.name === 'normals')!;
    normals.offset += 1;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/aligned/);
  });

  test('rejects a duplicate array name', () => {
    const {manifest, blob} = fixture();
    manifest.terrainMesh = clone(manifest.terrainMesh);
    manifest.terrainMesh.arrays.push({...manifest.terrainMesh.arrays[0]});
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/duplicate/);
  });
});

describe('decodeScientificBundle: numeric contracts', () => {
  test('rejects non-finite values in a smoke array', () => {
    const {manifest, blob} = fixture();
    const view = new Float32Array(blob.scientific.buffer, 0, 1);
    view[0] = NaN;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/non-finite/);
  });

  test('rejects a grid_speed array whose length is not resolution-cubed', () => {
    const {manifest, blob} = fixture();
    manifest.scientific = clone(manifest.scientific);
    manifest.scientific.cases.smoke.grid.arrays.find(a => a.name === 'grid_speed')!.length -= 1;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/grid_speed/);
  });

  test('rejects a slice array whose length is not resolution-squared', () => {
    const {manifest, blob} = fixture();
    manifest.scientific = clone(manifest.scientific);
    manifest.scientific.cases.smoke.slice.arrays.find(a => a.name === 'slice_speed')!.length -= 1;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/slice_speed/);
  });

  test('rejects a velocity array with the wrong component count', () => {
    const {manifest, blob} = fixture();
    manifest.scientific = clone(manifest.scientific);
    manifest.scientific.cases.smoke.grid.arrays.find(a => a.name === 'grid_velocity')!.components = 2;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/components/);
  });

  test('rejects streamline vertexOffsets that are not monotonic', () => {
    const {manifest, blob} = fixture();
    manifest.scientific = clone(manifest.scientific);
    manifest.scientific.cases.smoke.streamlines.vertexOffsets = [0, 3, 2];
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/monotonic/);
  });

  test('rejects a seed index outside its own line', () => {
    const {manifest, blob} = fixture();
    manifest.scientific = clone(manifest.scientific);
    manifest.scientific.cases.smoke.streamlines.seedIndices = [1, 5]; // line 1 has 2 points
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/seedIndices/);
  });

  test('decodes a valid streamline bundle with correct per-line vertex counts', () => {
    const {manifest, blob} = fixture();
    const bundle = decodeScientificBundle(manifest, blob);
    expect(bundle.smoke.streamlines.vertexOffsets).toEqual([0, 3, 5]);
    expect(bundle.smoke.streamlines.positions.length).toBe(5 * 3);
  });
});

describe('decodeScientificBundle: 5 cm coordinate-frame alignment', () => {
  test('accepts a heat grid and city meshes that align with coordinateFrame.localBounds', () => {
    const {manifest, blob} = fixture();
    expect(() => decodeScientificBundle(manifest, blob)).not.toThrow();
  });

  test('rejects a heat grid origin more than 5 cm off coordinateFrame.localBounds', () => {
    const {manifest, blob} = fixture();
    manifest.heatGrid = heatGridFixture({origin: [-10.2, -10, 0]});
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/5 cm|0\.05/);
  });

  test('accepts a heat grid within the 5 cm tolerance', () => {
    const {manifest, blob} = fixture();
    manifest.heatGrid = heatGridFixture({origin: [-10.02, -10, 0]});
    expect(() => decodeScientificBundle(manifest, blob)).not.toThrow();
  });

  test('rejects city geometry that falls outside coordinateFrame.localBounds by more than 5 cm', () => {
    const {manifest, blob} = fixture();
    const farTerrain = terrainFixture();
    farTerrain.json = clone(farTerrain.json);
    farTerrain.json.arrays.find(a => a.name === 'positions'); // no-op, keep bytes authoritative
    // Push one vertex well outside LOCAL_BOUNDS directly in the binary.
    const view = new Float32Array(farTerrain.bytes.buffer, 0, 3);
    view[0] = 500;
    manifest.terrainMesh = farTerrain.json;
    blob.terrain = farTerrain.bytes;
    expect(() => decodeScientificBundle(manifest, blob)).toThrow(/localBounds/);
  });
});

// ---------------------------------------------------------------------------

describe('loadMeshPair', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  function ok(bytes: Uint8Array): Response {
    return new Response(bytes as unknown as BodyInit, {status: 200});
  }

  test('fetches, verifies the hash, and decodes a mesh pair', async () => {
    const {json, bytes} = terrainFixture();
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonHash = Buffer.from(await crypto.subtle.digest('SHA-256', jsonBytes as unknown as BufferSource)).toString('hex');
    const binHash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)).toString('hex');
    globalThis.fetch = (async (url: string) => {
      if (url === 'https://x/ground.mesh.json') return ok(jsonBytes);
      if (url === 'https://x/ground.mesh.bin') return ok(bytes);
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const result = await loadMeshPair(
      'https://x/ground.mesh.json', 'https://x/ground.mesh.bin',
      {byteLength: jsonBytes.byteLength, sha256: jsonHash},
      {byteLength: bytes.byteLength, sha256: binHash},
    );
    expect(Array.from(result.mesh.positions.slice(0, 3))).toEqual([-5, -5, 0]);
  });

  test('a non-ok fetch throws with the URL and status', async () => {
    globalThis.fetch = (async () => new Response('nope', {status: 404})) as unknown as typeof fetch;
    await expect(loadMeshPair(
      'https://x/missing.mesh.json', 'https://x/missing.mesh.bin',
      {byteLength: 0, sha256: ''}, {byteLength: 0, sha256: ''},
    )).rejects.toThrow(/https:\/\/x\/missing\.mesh\.json.*404/);
  });

  test('a byteLength mismatch on the .bin is rejected before decoding', async () => {
    const {json, bytes} = terrainFixture();
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonHash = Buffer.from(await crypto.subtle.digest('SHA-256', jsonBytes as unknown as BufferSource)).toString('hex');
    globalThis.fetch = (async (url: string) => (url.endsWith('.json') ? ok(jsonBytes) : ok(bytes))) as unknown as typeof fetch;
    await expect(loadMeshPair(
      'https://x/ground.mesh.json', 'https://x/ground.mesh.bin',
      {byteLength: jsonBytes.byteLength, sha256: jsonHash},
      {byteLength: bytes.byteLength + 1, sha256: 'irrelevant'},
    )).rejects.toThrow(/byteLength mismatch/);
  });

  test('a sha256 mismatch on the .json is rejected before it is parsed', async () => {
    const {json} = terrainFixture();
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    globalThis.fetch = (async () => ok(jsonBytes)) as unknown as typeof fetch;
    await expect(loadMeshPair(
      'https://x/ground.mesh.json', 'https://x/ground.mesh.bin',
      {byteLength: jsonBytes.byteLength, sha256: '0'.repeat(64)},
      {byteLength: 0, sha256: ''},
    )).rejects.toThrow(/sha256 mismatch/);
  });
});

describe('loadScientificBundle', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => { originalFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = originalFetch; });

  async function sha256HexOf(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
    return Buffer.from(digest).toString('hex');
  }

  async function serveFullBundle(): Promise<void> {
    const terrain = terrainFixture();
    const buildings = buildingsFixture();
    const smoke = smokeFixture();
    const heatGridJson = heatGridFixture();
    const datasetJsonBytes = new TextEncoder().encode(JSON.stringify({crs: 'EPSG:3006'}));
    const fieldJsonBytes = new TextEncoder().encode(JSON.stringify({unit: 'degC'}));
    const fieldGridF32Bytes = new Uint8Array(new Float32Array([1, 2, 3, 4]).buffer);
    const terrainJsonBytes = new TextEncoder().encode(JSON.stringify(terrain.json));
    const buildingsJsonBytes = new TextEncoder().encode(JSON.stringify(buildings.json));
    const heatGridJsonBytes = new TextEncoder().encode(JSON.stringify(heatGridJson));

    const files = new Map<string, Uint8Array>([
      ['/data/real/dataset.json', datasetJsonBytes],
      ['/data/real/ground.mesh.json', terrainJsonBytes],
      ['/data/real/ground.mesh.bin', terrain.bytes],
      ['/data/real/buildings.mesh.json', buildingsJsonBytes],
      ['/data/real/buildings.mesh.bin', buildings.bytes],
      ['/data/real/field.json', fieldJsonBytes],
      ['/data/real/field.grid.json', heatGridJsonBytes],
      ['/data/real/field.grid.f32', fieldGridF32Bytes],
      ['/data/scientific/scientific.bin', smoke.bytes],
    ]);

    const dependencies = [
      {path: '../real/dataset.json', bytes: datasetJsonBytes},
      {path: '../real/ground.mesh.json', bytes: terrainJsonBytes},
      {path: '../real/ground.mesh.bin', bytes: terrain.bytes},
      {path: '../real/buildings.mesh.json', bytes: buildingsJsonBytes},
      {path: '../real/buildings.mesh.bin', bytes: buildings.bytes},
      {path: '../real/field.json', bytes: fieldJsonBytes},
      {path: '../real/field.grid.json', bytes: heatGridJsonBytes},
      {path: '../real/field.grid.f32', bytes: fieldGridF32Bytes},
    ];
    const dependencyRecords = await Promise.all(dependencies.map(async d => ({
      path: d.path, byteLength: d.bytes.byteLength, sha256: await sha256HexOf(d.bytes),
    })));

    const manifest = scientificManifest({
      dependencies: dependencyRecords,
      binary: {path: 'scientific.bin', byteLength: smoke.bytes.byteLength, sha256: await sha256HexOf(smoke.bytes)},
    });
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
    files.set('/data/scientific/scientific-manifest.json', manifestBytes);

    globalThis.fetch = (async (url: string) => {
      const bytes = files.get(url);
      if (!bytes) return new Response('not found', {status: 404});
      return new Response(bytes as unknown as BodyInit, {status: 200});
    }) as unknown as typeof fetch;
  }

  test('fetches, verifies, and decodes the whole bundle end to end', async () => {
    await serveFullBundle();
    const bundle = await loadScientificBundle();
    expect(bundle.city.objects.get(1)!.dtccIds.length).toBe(3);
    expect(bundle.smoke.grid.association).toBe('vertex');
    expect(bundle.heat.grid.dataUrl).toBe('/data/real/field.grid.f32');
  });

  test('a fetch error for the manifest itself surfaces the URL and status', async () => {
    globalThis.fetch = (async () => new Response('nope', {status: 500})) as unknown as typeof fetch;
    await expect(loadScientificBundle()).rejects.toThrow(/scientific-manifest\.json.*500/);
  });

  test('a fetch error for a dependency surfaces its URL and status', async () => {
    await serveFullBundle();
    const served = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (url === '/data/real/buildings.mesh.bin') return new Response('gone', {status: 503});
      return served(url);
    }) as unknown as typeof fetch;
    await expect(loadScientificBundle()).rejects.toThrow(/buildings\.mesh\.bin.*503/);
  });

  test('a corrupted dependency (sha256 mismatch) is rejected before decoding', async () => {
    await serveFullBundle();
    const served = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (url === '/data/real/buildings.mesh.bin') return new Response(new Uint8Array([9, 9, 9, 9]) as unknown as BodyInit, {status: 200});
      return served(url);
    }) as unknown as typeof fetch;
    await expect(loadScientificBundle()).rejects.toThrow(/byteLength mismatch|sha256 mismatch/);
  });
});

// ---------------------------------------------------------------------------
// Separate, clearly-named: reads the real committed bundle from disk (no
// fetch, no network) and decodes it directly. A failure here means the
// *shipped* Task 1/2 artifacts and this loader have drifted apart, not that
// the loader's own logic (covered above with fixtures) is broken.

describe('decodeScientificBundle against the real committed public/data bundle', () => {
  const REPO = resolve(import.meta.dir, '../..');
  const SCI_DIR = resolve(REPO, 'public/data/scientific');
  const REAL_DIR = resolve(REPO, 'public/data/real');

  function readJson(path: string) { return JSON.parse(readFileSync(path, 'utf8')); }
  function readBytes(path: string) { const b = readFileSync(path); return new Uint8Array(b.buffer, b.byteOffset, b.byteLength); }

  test('decodes the shipped tile end to end', () => {
    const manifest: ScientificRawManifest = {
      scientific: readJson(resolve(SCI_DIR, 'scientific-manifest.json')),
      terrainMesh: readJson(resolve(REAL_DIR, 'ground.mesh.json')),
      buildingsMesh: readJson(resolve(REAL_DIR, 'buildings.mesh.json')),
      heatGrid: readJson(resolve(REAL_DIR, 'field.grid.json')),
    };
    const blob: ScientificRawBlobs = {
      scientific: readBytes(resolve(SCI_DIR, 'scientific.bin')),
      terrain: readBytes(resolve(REAL_DIR, 'ground.mesh.bin')),
      buildings: readBytes(resolve(REAL_DIR, 'buildings.mesh.bin')),
    };

    const bundle = decodeScientificBundle(manifest, blob);

    // Measured facts from Tasks 1 and 2 (task-3-brief.md); a change here is a
    // finding about the shipped data, not a bug in this test.
    expect(bundle.city.identityStability).toBe('unstable_observed');
    expect(bundle.city.objects.size).toBe(206);
    expect(bundle.city.objects.get(150)).toEqual({sourceIndexes: [], dtccIds: []});
    const emptyCount = [...bundle.city.objects.values()].filter(o => o.sourceIndexes.length === 0).length;
    expect(emptyCount).toBe(103);
    const multiSource = [...bundle.city.objects.values()].filter(o => o.sourceIndexes.length > 1);
    expect(multiSource.length).toBeGreaterThan(0);

    expect(bundle.smoke.grid.association).toBe('vertex');
    expect(bundle.smoke.slice.association).toBeNull();
    expect(bundle.smoke.streamlines.association).toBeNull();
    expect(bundle.heat.grid.association).toBeNull();
  });
});
