/**
 * Browser-side loader for the shared scientific artifact bundle written by
 * scripts/scientific/generate.py (public/data/scientific/scientific-manifest.json
 * + scientific.bin) together with the Task 1 city meshes it depends on
 * (public/data/real/ground.mesh.json|bin, buildings.mesh.json|bin) and the real
 * heat grid (public/data/real/field.grid.json).
 *
 * This is the neutral, renderer-free contract every later task (vtk.js and
 * Three.js pages, probes) is built on -- it must never import three or vtk.js.
 *
 * Two layers, split because hashing is async and decoding should not be:
 *  - loadScientificBundle / loadMeshPair: fetch bytes, verify byteLength and
 *    SHA-256 (crypto.subtle.digest) against the manifest, *before* anything
 *    below constructs a typed-array view or a renderer-facing object.
 *  - decodeScientificBundle: pure and synchronous. Given already-fetched,
 *    already-verified bytes and parsed JSON, it validates structure (schema
 *    version, array range/overlap/alignment, finiteness, streamline offsets,
 *    the building-identity table) and assembles the ScientificBundle. No I/O,
 *    so it is exercised directly from small in-memory fixtures in tests.
 *
 * scripts/scientific/validate.ts is the same contract checked from the other
 * side (Node, build time, byteLength+sha256 only). This module does not
 * import it -- it is a build script, not part of the browser bundle -- but
 * error messages are phrased the same way on purpose: "<label>: byteLength
 * mismatch -- manifest says X, file is Y" / "<label>: sha256 mismatch --
 * manifest says X, file hashes to Y".
 */

import {assetUrl} from './dataset';

// ---------------------------------------------------------------------------
// On-disk shapes (as written by scripts/real/benchio.py and
// scripts/scientific/generate.py). These mirror the JSON exactly; the
// post-decode shapes below (MeshPair, ScientificGrid, SliceData, ...) carry
// real typed arrays instead of array specs.

export type ArraySpec = {name: string; type: 'f32' | 'u32' | 'u8'; components: number; offset: number; length: number};

export type MeshPairJson = {
  bin: string;
  vertexCount: number;
  indexCount: number;
  byteLength: number;
  arrays: ArraySpec[];
};

export type BuildingObjectEntry = {sourceIndexes: number[]; dtccIds: string[]};

/**
 * buildings.mesh.json. `regionMarkerCount` is the boundary between markers
 * backed by a conditioned mesher region and markers the split pass appended
 * -- `conditionedRegionCount` is the pre-clip count and is provenance only,
 * kept here verbatim but never used as a boundary (Contract Amendments A1;
 * task-3-brief.md fact 2).
 */
export type BuildingsMeshJson = MeshPairJson & {
  objects: BuildingObjectEntry[];
  objectIndexSpace: string;
  regionMarkerCount: number;
  conditionedRegionCount: number;
  splitAddedMarkers: number;
  sourceBuildingCount: number;
  identityStability: 'stable_observed_two_loads' | 'unstable_observed';
  firstLoadHash: string;
  secondLoadHash: string;
  auditedAt: string;
};

export type FieldGridJson = {
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  min: number;
  max: number;
  dataUrl: string;
};

type SmokeGridCase = {
  resolution: number;
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  association: string | null;
  arrays: ArraySpec[];
};

type SmokeSliceCase = {
  axis: string;
  position: number;
  resolution: number;
  localAxes: [number, number];
  fixedLocalAxis: number;
  fixedLocalCoordinate: number;
  domainLocalBounds: number[];
  association: string | null;
  arrays: ArraySpec[];
};

type SmokeStreamlineCase = {
  seedAxis: string;
  seedPosition: number;
  requestedCount: number;
  actualCount: number;
  steps: number;
  stepSize: number;
  domainLocalBounds: number[];
  vertexOffsets: number[];
  seedIndices: number[];
  association: string | null;
  arrays: ArraySpec[];
};

export type ScientificManifest = {
  schemaVersion: number;
  coordinateFrame: {
    crs: string;
    origin: [number, number];
    z0: number;
    bounds: [number, number, number, number];
    /** [xmin, ymin, zmin, xmax, ymax, zmax], local metres. */
    localBounds: [number, number, number, number, number, number];
  };
  fields: Record<string, {unit: string; dim: number}>;
  cases: {
    smoke: {
      dataCategory: string;
      dtccCoreRevision: string;
      grid: SmokeGridCase;
      slice: SmokeSliceCase;
      streamlines: SmokeStreamlineCase;
    };
    heat: {
      dataCategory: string;
      source: string | null;
      unit: string;
      tmin: number | null;
      tmax: number | null;
      association: string | null;
    };
  };
  dependencies: Array<{path: string; byteLength: number; sha256: string}>;
  binary: {path: string; byteLength: number; sha256: string};
};

// ---------------------------------------------------------------------------
// Post-decode shapes. Renderer-free: no three, no vtk.js types anywhere here.

export type MeshPair = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  temperature?: Float32Array;
  /** Buildings only: per-triangle face marker into the objects table. */
  cellObjectIndex?: Uint32Array;
};

export type ScientificGrid = {
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  /** Straight from Core's Field.association. Never fabricated; can be null. */
  association: string | null;
  speed: Float32Array;
  velocity: Float32Array;
  pressure: Float32Array;
};

export type SliceData = {
  axis: string;
  position: number;
  resolution: number;
  localAxes: [number, number];
  fixedLocalAxis: number;
  fixedLocalCoordinate: number;
  domainLocalBounds: number[];
  association: string | null;
  velocity: Float32Array;
  speed: Float32Array;
  pressure: Float32Array;
};

export type StreamlineData = {
  seedAxis: string;
  seedPosition: number;
  steps: number;
  stepSize: number;
  domainLocalBounds: number[];
  /** One more entry than the number of lines; offsets[i]..offsets[i+1] bound line i. */
  vertexOffsets: number[];
  /** Per line, the vertex index *within that line* where integration started. */
  seedIndices: number[];
  association: string | null;
  positions: Float32Array;
  velocity: Float32Array;
  speed: Float32Array;
  pressure: Float32Array;
};

/**
 * A reference to the real heat grid (public/data/real/field.grid.json|f32),
 * not the loaded array -- the array is the third artifact task-3 measures but
 * does not need to hold in memory just to validate provenance and alignment.
 */
export type ScientificGridRef = {
  dims: [number, number, number];
  origin: [number, number, number];
  spacing: [number, number, number];
  min: number;
  max: number;
  dataUrl: string;
  unit: string;
  source: string | null;
  association: string | null;
};

export type ScientificBundle = {
  manifest: ScientificManifest;
  city: {
    terrain: MeshPair;
    buildings: MeshPair;
    /**
     * Keyed by face marker (a conditioned mesher region, not a building --
     * Contract Amendments A1). Empty arrays mean a split-added marker with no
     * source building: valid, never fabricated. Never flatten a multi-source
     * entry to a single id.
     */
    objects: Map<number, BuildingObjectEntry>;
    identityStability: 'stable_observed_two_loads' | 'unstable_observed';
  };
  smoke: {grid: ScientificGrid; slice: SliceData; streamlines: StreamlineData};
  heat: {grid: ScientificGridRef};
};

/** What decodeScientificBundle needs, already fetched and JSON.parse'd. */
export type ScientificRawManifest = {
  scientific: ScientificManifest;
  terrainMesh: MeshPairJson;
  buildingsMesh: BuildingsMeshJson;
  heatGrid: FieldGridJson;
};

/** What decodeScientificBundle needs, already fetched as raw bytes. */
export type ScientificRawBlobs = {
  scientific: Uint8Array;
  terrain: Uint8Array;
  buildings: Uint8Array;
};

export type VerifiedFile = {byteLength: number; sha256: string};

// ---------------------------------------------------------------------------
// Byte-level helpers shared by mesh pairs and the scientific binary.

const ITEM_SIZE: Record<ArraySpec['type'], number> = {f32: 4, u32: 4, u8: 1};

/** Range, alignment, duplicate-name and overlap checks over one packed blob. */
function validateArraySpecs(specs: ArraySpec[], totalByteLength: number, context: string): void {
  const seen = new Set<string>();
  const ranges: Array<{start: number; end: number; name: string}> = [];
  for (const spec of specs) {
    if (seen.has(spec.name)) throw new Error(`${context}: duplicate array name ${spec.name}`);
    seen.add(spec.name);
    const itemSize = ITEM_SIZE[spec.type];
    if (!itemSize) throw new Error(`${context}: array ${spec.name} has unknown type ${spec.type}`);
    if (spec.offset < 0 || spec.length < 0) {
      throw new Error(`${context}: array ${spec.name} has a negative offset or length`);
    }
    if (itemSize > 1 && spec.offset % 4 !== 0) {
      throw new Error(`${context}: array ${spec.name} offset ${spec.offset} is not 4-byte aligned`);
    }
    const end = spec.offset + spec.length * itemSize;
    if (end > totalByteLength) {
      throw new Error(`${context}: array ${spec.name} range [${spec.offset}, ${end}) exceeds buffer of ${totalByteLength} bytes`);
    }
    ranges.push({start: spec.offset, end, name: spec.name});
  }
  ranges.sort((a, b) => a.start - b.start);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start < ranges[i - 1].end) {
      throw new Error(`${context}: array ${ranges[i].name} overlaps ${ranges[i - 1].name}`);
    }
  }
}

/**
 * A validated view over one array spec. Copies out of `bytes` first (as
 * scripts/mesh-io.ts does): a view straight over the caller's buffer would
 * alias it at a byte offset with no alignment guarantee, and Uint8Array#slice
 * always returns a fresh, tightly-sized buffer a Float32Array/Uint32Array can
 * safely wrap at offset 0.
 */
function readArraySpec(bytes: Uint8Array, spec: ArraySpec, context: string): Float32Array | Uint32Array | Uint8Array {
  const itemSize = ITEM_SIZE[spec.type];
  const end = spec.offset + spec.length * itemSize;
  const sliced = bytes.slice(spec.offset, end);
  if (spec.type === 'f32') return new Float32Array(sliced.buffer);
  if (spec.type === 'u32') return new Uint32Array(sliced.buffer);
  return sliced;
}

function specByName(specs: ArraySpec[], name: string, context: string): ArraySpec {
  const spec = specs.find(s => s.name === name);
  if (!spec) throw new Error(`${context}: missing array ${name}`);
  return spec;
}

function assertFinite(arr: Float32Array, label: string): void {
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) throw new Error(`${label}: contains a non-finite value at index ${i}`);
  }
}

function assertComponents(spec: ArraySpec, expected: number, context: string): void {
  if (spec.components !== expected) {
    throw new Error(`${context}: array ${spec.name} has ${spec.components} components, expected ${expected}`);
  }
}

function assertLength(spec: ArraySpec, expected: number, context: string): void {
  if (spec.length !== expected) {
    throw new Error(`${context}: array ${spec.name} has ${spec.length} values, expected ${expected}`);
  }
}

// ---------------------------------------------------------------------------
// Mesh pairs (terrain, buildings).

function decodeMeshPairBytes(json: MeshPairJson, bytes: Uint8Array, context: string): MeshPair {
  if (bytes.byteLength !== json.byteLength) {
    throw new Error(`${context}: byteLength ${json.byteLength} but ${bytes.byteLength} bytes on disk`);
  }
  validateArraySpecs(json.arrays, bytes.byteLength, context);
  const byName = new Map(json.arrays.map(a => [a.name, a]));
  const need = (name: string) => {
    const spec = byName.get(name);
    if (!spec) throw new Error(`${context}: no ${name} array`);
    return readArraySpec(bytes, spec, context);
  };

  const positions = need('positions') as Float32Array;
  const normals = need('normals') as Float32Array;
  const indices = need('indices') as Uint32Array;
  assertFinite(positions, `${context}.positions`);
  assertFinite(normals, `${context}.normals`);
  if (indices.length) {
    let maxIndex = 0;
    for (let i = 0; i < indices.length; i++) if (indices[i] > maxIndex) maxIndex = indices[i];
    const vertexCount = positions.length / 3;
    if (maxIndex >= vertexCount) {
      throw new Error(`${context}: index ${maxIndex} out of range for ${vertexCount} vertices`);
    }
  }

  const mesh: MeshPair = {positions, normals, indices};
  if (byName.has('temperature')) {
    const temperature = readArraySpec(bytes, byName.get('temperature')!, context) as Float32Array;
    assertFinite(temperature, `${context}.temperature`);
    mesh.temperature = temperature;
  }
  if (byName.has('cell_object_index')) {
    mesh.cellObjectIndex = readArraySpec(bytes, byName.get('cell_object_index')!, context) as Uint32Array;
  }
  return mesh;
}

/**
 * Build the marker -> {sourceIndexes, dtccIds} table from buildings.mesh.json.
 * Every marker 0..objects.length-1 gets an entry, including empty ones (103
 * of 206 on the shipped tile, appended by the mesher's split pass and never a
 * source building -- valid data, not corruption; task-3-brief.md fact 3).
 *
 * `regionMarkerCount` (not `conditionedRegionCount`, which is a pre-clip,
 * provenance-only count) is the boundary the split pass respects, so it is
 * checked here for self-consistency against the objects table it shipped
 * with (task-3-brief.md fact 2).
 */
function buildObjectsMap(meta: BuildingsMeshJson, context: string): Map<number, BuildingObjectEntry> {
  const expectedTotal = meta.regionMarkerCount + meta.splitAddedMarkers;
  if (expectedTotal !== meta.objects.length) {
    throw new Error(
      `${context}: regionMarkerCount (${meta.regionMarkerCount}) + splitAddedMarkers (${meta.splitAddedMarkers}) `
      + `= ${expectedTotal} but objects has ${meta.objects.length} entries`,
    );
  }
  const map = new Map<number, BuildingObjectEntry>();
  meta.objects.forEach((entry, i) => {
    if (entry.sourceIndexes.length !== entry.dtccIds.length) {
      throw new Error(`${context}[${i}]: ${entry.sourceIndexes.length} sourceIndexes but ${entry.dtccIds.length} dtccIds`);
    }
    map.set(i, {sourceIndexes: [...entry.sourceIndexes], dtccIds: [...entry.dtccIds]});
  });
  return map;
}

/**
 * Every triangle's face marker must resolve to a table entry. A marker with
 * no entry at all (index >= objects.length) is genuine corruption and
 * throws; a marker with an empty entry is valid (checked in buildObjectsMap
 * above -- by construction every index < objects.length is in the map).
 */
function validateCellObjectIndex(cellObjectIndex: Uint32Array, objects: Map<number, BuildingObjectEntry>, context: string): void {
  for (let i = 0; i < cellObjectIndex.length; i++) {
    const marker = cellObjectIndex[i];
    if (!objects.has(marker)) {
      throw new Error(`${context}: triangle ${i} references marker ${marker} with no entry in objects (objects has ${objects.size} entries) -- corruption`);
    }
  }
}

// ---------------------------------------------------------------------------
// Smoke cases (grid, slice, streamlines) over the shared scientific.bin.

function decodeGridCase(grid: SmokeGridCase, bytes: Uint8Array, context: string): ScientificGrid {
  const nodeCount = grid.dims[0] * grid.dims[1] * grid.dims[2];
  const velocitySpec = specByName(grid.arrays, 'grid_velocity', context);
  const speedSpec = specByName(grid.arrays, 'grid_speed', context);
  const pressureSpec = specByName(grid.arrays, 'grid_pressure', context);
  assertComponents(velocitySpec, 3, context);
  assertComponents(speedSpec, 1, context);
  assertComponents(pressureSpec, 1, context);
  assertLength(velocitySpec, nodeCount * 3, context);
  assertLength(speedSpec, nodeCount, context);
  assertLength(pressureSpec, nodeCount, context);

  const velocity = readArraySpec(bytes, velocitySpec, context) as Float32Array;
  const speed = readArraySpec(bytes, speedSpec, context) as Float32Array;
  const pressure = readArraySpec(bytes, pressureSpec, context) as Float32Array;
  assertFinite(velocity, `${context}.velocity`);
  assertFinite(speed, `${context}.speed`);
  assertFinite(pressure, `${context}.pressure`);

  return {dims: grid.dims, origin: grid.origin, spacing: grid.spacing, association: grid.association, speed, velocity, pressure};
}

function decodeSliceCase(slice: SmokeSliceCase, bytes: Uint8Array, context: string): SliceData {
  const nodeCount = slice.resolution * slice.resolution;
  const velocitySpec = specByName(slice.arrays, 'slice_velocity', context);
  const speedSpec = specByName(slice.arrays, 'slice_speed', context);
  const pressureSpec = specByName(slice.arrays, 'slice_pressure', context);
  assertComponents(velocitySpec, 3, context);
  assertComponents(speedSpec, 1, context);
  assertComponents(pressureSpec, 1, context);
  assertLength(velocitySpec, nodeCount * 3, context);
  assertLength(speedSpec, nodeCount, context);
  assertLength(pressureSpec, nodeCount, context);

  const velocity = readArraySpec(bytes, velocitySpec, context) as Float32Array;
  const speed = readArraySpec(bytes, speedSpec, context) as Float32Array;
  const pressure = readArraySpec(bytes, pressureSpec, context) as Float32Array;
  assertFinite(velocity, `${context}.velocity`);
  assertFinite(speed, `${context}.speed`);
  assertFinite(pressure, `${context}.pressure`);

  return {
    axis: slice.axis, position: slice.position, resolution: slice.resolution,
    localAxes: slice.localAxes, fixedLocalAxis: slice.fixedLocalAxis,
    fixedLocalCoordinate: slice.fixedLocalCoordinate, domainLocalBounds: slice.domainLocalBounds,
    association: slice.association, velocity, speed, pressure,
  };
}

function decodeStreamlineCase(sl: SmokeStreamlineCase, bytes: Uint8Array, context: string): StreamlineData {
  if (sl.vertexOffsets.length !== sl.actualCount + 1) {
    throw new Error(`${context}: vertexOffsets has ${sl.vertexOffsets.length} entries, expected actualCount+1 (${sl.actualCount + 1})`);
  }
  if (sl.vertexOffsets[0] !== 0) throw new Error(`${context}: vertexOffsets must start at 0`);
  for (let i = 1; i < sl.vertexOffsets.length; i++) {
    if (sl.vertexOffsets[i] < sl.vertexOffsets[i - 1]) {
      throw new Error(`${context}: vertexOffsets is not monotonically non-decreasing at index ${i}`);
    }
  }
  if (sl.seedIndices.length !== sl.actualCount) {
    throw new Error(`${context}: seedIndices has ${sl.seedIndices.length} entries, expected actualCount (${sl.actualCount})`);
  }
  for (let i = 0; i < sl.actualCount; i++) {
    const lineLength = sl.vertexOffsets[i + 1] - sl.vertexOffsets[i];
    const seed = sl.seedIndices[i];
    if (seed < 0 || seed >= lineLength) {
      throw new Error(`${context}: seedIndices[${i}] = ${seed} is out of range for a line of ${lineLength} vertices`);
    }
  }

  const totalPoints = sl.vertexOffsets[sl.vertexOffsets.length - 1];
  const positionsSpec = specByName(sl.arrays, 'streamline_positions', context);
  const velocitySpec = specByName(sl.arrays, 'streamline_velocity', context);
  const speedSpec = specByName(sl.arrays, 'streamline_speed', context);
  const pressureSpec = specByName(sl.arrays, 'streamline_pressure', context);
  assertComponents(positionsSpec, 3, context);
  assertComponents(velocitySpec, 3, context);
  assertComponents(speedSpec, 1, context);
  assertComponents(pressureSpec, 1, context);
  assertLength(positionsSpec, totalPoints * 3, context);
  assertLength(velocitySpec, totalPoints * 3, context);
  assertLength(speedSpec, totalPoints, context);
  assertLength(pressureSpec, totalPoints, context);

  const positions = readArraySpec(bytes, positionsSpec, context) as Float32Array;
  const velocity = readArraySpec(bytes, velocitySpec, context) as Float32Array;
  const speed = readArraySpec(bytes, speedSpec, context) as Float32Array;
  const pressure = readArraySpec(bytes, pressureSpec, context) as Float32Array;
  assertFinite(positions, `${context}.positions`);
  assertFinite(velocity, `${context}.velocity`);
  assertFinite(speed, `${context}.speed`);
  assertFinite(pressure, `${context}.pressure`);

  return {
    seedAxis: sl.seedAxis, seedPosition: sl.seedPosition, steps: sl.steps, stepSize: sl.stepSize,
    domainLocalBounds: sl.domainLocalBounds, vertexOffsets: sl.vertexOffsets, seedIndices: sl.seedIndices,
    association: sl.association, positions, velocity, speed, pressure,
  };
}

// ---------------------------------------------------------------------------
// 5 cm coordinate-frame alignment (Global Constraint: "Fixed alignment
// probes differ by no more than 5 cm after rebasing").

const ALIGNMENT_TOLERANCE_M = 0.05;

function assertAligned(a: readonly number[], b: readonly number[], label: string): void {
  for (let i = 0; i < a.length; i++) {
    const delta = Math.abs(a[i] - b[i]);
    if (delta > ALIGNMENT_TOLERANCE_M) {
      throw new Error(`${label}: component ${i} differs by ${delta.toFixed(4)} m, exceeds the ${ALIGNMENT_TOLERANCE_M} m contract`);
    }
  }
}

function assertMeshWithinBounds(positions: Float32Array, localBounds: readonly number[], label: string): void {
  const [xmin, ymin, zmin, xmax, ymax, zmax] = localBounds;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < xmin - ALIGNMENT_TOLERANCE_M || x > xmax + ALIGNMENT_TOLERANCE_M
      || y < ymin - ALIGNMENT_TOLERANCE_M || y > ymax + ALIGNMENT_TOLERANCE_M
      || z < zmin - ALIGNMENT_TOLERANCE_M || z > zmax + ALIGNMENT_TOLERANCE_M) {
      throw new Error(
        `${label}: vertex ${i / 3} at (${x}, ${y}, ${z}) falls outside coordinateFrame.localBounds `
        + `by more than the ${ALIGNMENT_TOLERANCE_M} m contract`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Pure decode: manifest + already-fetched, already-verified bytes -> bundle.

/**
 * Decode and fully validate a ScientificBundle from already-fetched,
 * already-hash-verified materials. Pure and synchronous -- no fetch, no
 * crypto.subtle -- so it runs directly against in-memory fixtures in tests.
 * Validates metadata (schema version, marker table self-consistency) before
 * any typed-array view is constructed, then every array's range/alignment/
 * overlap/finiteness, the building-identity table, and the 5 cm
 * coordinate-frame contract, in that order.
 */
export function decodeScientificBundle(manifest: ScientificRawManifest, blob: ScientificRawBlobs): ScientificBundle {
  const sci = manifest.scientific;
  if (sci.schemaVersion !== 1) {
    throw new Error(`scientific manifest: expected schemaVersion 1, got ${JSON.stringify(sci.schemaVersion)}`);
  }
  const bmeta = manifest.buildingsMesh;
  if (bmeta.identityStability !== 'stable_observed_two_loads' && bmeta.identityStability !== 'unstable_observed') {
    throw new Error(`buildings: unrecognized identityStability ${JSON.stringify(bmeta.identityStability)}`);
  }

  const terrain = decodeMeshPairBytes(manifest.terrainMesh, blob.terrain, 'terrain');
  const buildings = decodeMeshPairBytes(bmeta, blob.buildings, 'buildings');
  if (!buildings.cellObjectIndex) throw new Error('buildings: missing cell_object_index array');

  const objects = buildObjectsMap(bmeta, 'buildings.objects');
  validateCellObjectIndex(buildings.cellObjectIndex, objects, 'buildings.cell_object_index');

  const smokeArrays = [...sci.cases.smoke.grid.arrays, ...sci.cases.smoke.slice.arrays, ...sci.cases.smoke.streamlines.arrays];
  validateArraySpecs(smokeArrays, blob.scientific.byteLength, 'scientific.bin');

  const grid = decodeGridCase(sci.cases.smoke.grid, blob.scientific, 'smoke.grid');
  const slice = decodeSliceCase(sci.cases.smoke.slice, blob.scientific, 'smoke.slice');
  const streamlines = decodeStreamlineCase(sci.cases.smoke.streamlines, blob.scientific, 'smoke.streamlines');

  const heatGridJson = manifest.heatGrid;
  const heatCase = sci.cases.heat;
  const heatGrid: ScientificGridRef = {
    dims: heatGridJson.dims, origin: heatGridJson.origin, spacing: heatGridJson.spacing,
    min: heatGridJson.min, max: heatGridJson.max, dataUrl: heatGridJson.dataUrl,
    unit: heatCase.unit, source: heatCase.source, association: heatCase.association,
  };

  const localBounds = sci.coordinateFrame.localBounds;
  const heatGridFar: [number, number, number] = [
    heatGridJson.origin[0] + heatGridJson.spacing[0] * (heatGridJson.dims[0] - 1),
    heatGridJson.origin[1] + heatGridJson.spacing[1] * (heatGridJson.dims[1] - 1),
    heatGridJson.origin[2] + heatGridJson.spacing[2] * (heatGridJson.dims[2] - 1),
  ];
  assertAligned(heatGridJson.origin, [localBounds[0], localBounds[1], localBounds[2]], 'heat grid origin vs coordinateFrame.localBounds');
  assertAligned(heatGridFar, [localBounds[3], localBounds[4], localBounds[5]], 'heat grid far corner vs coordinateFrame.localBounds');
  assertMeshWithinBounds(terrain.positions, localBounds, 'terrain');
  assertMeshWithinBounds(buildings.positions, localBounds, 'buildings');

  return {
    manifest: sci,
    city: {terrain, buildings, objects, identityStability: bmeta.identityStability},
    smoke: {grid, slice, streamlines},
    heat: {grid: heatGrid},
  };
}

// ---------------------------------------------------------------------------
// I/O: fetch + verify (async), then hand off to the pure decoders above.

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // TS's lib.dom BufferSource wants an ArrayBuffer-backed view specifically; `bytes`
  // is typed as Uint8Array<ArrayBufferLike> because it may come from `.slice()`,
  // `fetch()`, or a Node Buffer. The underlying bytes are always a plain ArrayBuffer
  // at runtime here, so this cast reflects that rather than papering over a real gap.
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Same checks, same message shapes, as scripts/scientific/validate.ts's checkFile. */
async function verifyBytes(bytes: Uint8Array, expected: VerifiedFile, label: string): Promise<void> {
  if (bytes.byteLength !== expected.byteLength) {
    throw new Error(`${label}: byteLength mismatch -- manifest says ${expected.byteLength}, file is ${bytes.byteLength}`);
  }
  const hash = await sha256Hex(bytes);
  if (hash !== expected.sha256) {
    throw new Error(`${label}: sha256 mismatch -- manifest says ${expected.sha256}, file hashes to ${hash}`);
  }
}

/**
 * Fetch one <name>.mesh.json + its .bin, verify both against the caller's
 * expected byteLength/sha256 (from a manifest's dependency records) via
 * crypto.subtle.digest, and only then decode typed-array views. General
 * purpose -- used here for terrain and buildings, but not scientific-bundle
 * specific: any future page loading a bare mesh pair over the network can
 * reuse it directly.
 */
export async function loadMeshPair(
  jsonUrl: string,
  binUrl: string,
  expectedJson: VerifiedFile,
  expectedBin: VerifiedFile,
): Promise<{mesh: MeshPair; json: MeshPairJson}> {
  const jsonBytes = await fetchBytes(jsonUrl);
  await verifyBytes(jsonBytes, expectedJson, `mesh ${jsonUrl}`);
  const json = JSON.parse(new TextDecoder().decode(jsonBytes)) as MeshPairJson;
  const binBytes = await fetchBytes(binUrl);
  await verifyBytes(binBytes, expectedBin, `mesh ${binUrl}`);
  const mesh = decodeMeshPairBytes(json, binBytes, jsonUrl);
  return {mesh, json};
}

const DEPENDENCY_NAMES = [
  'dataset.json',
  'ground.mesh.json', 'ground.mesh.bin',
  'buildings.mesh.json', 'buildings.mesh.bin',
  'field.json', 'field.grid.json', 'field.grid.f32',
] as const;

/**
 * Resolve a manifest-relative dependency path (e.g. "../real/dataset.json")
 * against the manifest's own URL. `new URL` needs an absolute base, and
 * `manifestUrl` is root-relative (assetUrl never returns a scheme+host), so
 * a throwaway origin makes it absolute for the resolution and is stripped
 * back off -- the result is the same root-relative shape assetUrl produces,
 * with BASE_URL (dev vs. a Pages subpath build) already baked in because
 * `manifestUrl` carried it in.
 */
function resolveDependencyUrl(manifestUrl: string, relativePath: string): string {
  return new URL(relativePath, `https://engine-bench.invalid${manifestUrl}`).pathname;
}

/**
 * Fetch and fully verify the shared scientific bundle: the manifest, the
 * scientific binary, and every declared dependency (the Task 1 city meshes
 * and the real heat grid), each via crypto.subtle.digest against the
 * manifest's own byteLength/sha256 records -- before decodeScientificBundle
 * constructs a single typed-array view or renderer-facing object.
 */
export async function loadScientificBundle(): Promise<ScientificBundle> {
  const manifestUrl = assetUrl('data/scientific/scientific-manifest.json');
  const manifestBytes = await fetchBytes(manifestUrl);
  const sci = JSON.parse(new TextDecoder().decode(manifestBytes)) as ScientificManifest;
  if (sci.schemaVersion !== 1) {
    throw new Error(`scientific manifest: expected schemaVersion 1, got ${JSON.stringify(sci.schemaVersion)}`);
  }

  const binUrl = resolveDependencyUrl(manifestUrl, sci.binary.path);
  const scientificBytes = await fetchBytes(binUrl);
  await verifyBytes(scientificBytes, sci.binary, `scientific binary ${sci.binary.path}`);

  const byBaseName = new Map(sci.dependencies.map(d => [d.path.split('/').pop()!, d]));
  for (const name of DEPENDENCY_NAMES) {
    if (!byBaseName.has(name)) throw new Error(`scientific manifest: missing dependency record for ${name}`);
  }

  const fetchedDependencies = new Map<string, Uint8Array>();
  for (const name of DEPENDENCY_NAMES) {
    const record = byBaseName.get(name)!;
    const url = resolveDependencyUrl(manifestUrl, record.path);
    const bytes = await fetchBytes(url);
    await verifyBytes(bytes, record, `dependency ${record.path}`);
    fetchedDependencies.set(name, bytes);
  }

  const parseJson = (name: string) => JSON.parse(new TextDecoder().decode(fetchedDependencies.get(name)!));

  const rawManifest: ScientificRawManifest = {
    scientific: sci,
    terrainMesh: parseJson('ground.mesh.json'),
    buildingsMesh: parseJson('buildings.mesh.json'),
    heatGrid: parseJson('field.grid.json'),
  };
  const rawBlobs: ScientificRawBlobs = {
    scientific: scientificBytes,
    terrain: fetchedDependencies.get('ground.mesh.bin')!,
    buildings: fetchedDependencies.get('buildings.mesh.bin')!,
  };

  return decodeScientificBundle(rawManifest, rawBlobs);
}
