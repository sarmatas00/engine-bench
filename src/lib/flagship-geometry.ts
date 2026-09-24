/**
 * The geometry axis: flagship's 10,356 building parts against the 215-footprint
 * Gothenburg tile pages 13 and 14 draw.
 *
 * WHAT THIS AXIS IS, AND WHAT IT IS NOT. It measures a semantically rich city
 * model -- 1.16M vertices, 694k triangles, a 10,356-entry object table -- on
 * both renderers. It does NOT measure volume rendering. flagship carries no
 * usable volume grid: the 256 MiB native format cannot hold a 2 km city and a
 * high-resolution VolumeGrid at once, and the largest that fits (100x100x28)
 * has FEWER z layers than the 32 the spike already measured. Nothing here may
 * be quoted as a volume result.
 *
 * NOT COMPARABLE TO PAGES 13/14's FRAME TIMES. Different scene, different
 * camera radius, different city. The comparison this axis supports is vtk.js
 * against Three.js *on this scene*, which is the same question the spike asked.
 */

import {assetUrl} from './dataset';
import {loadMeshPair, type MeshPair, type MeshPairJson, type VerifiedFile} from './scientific-data';
import {poseToEye, type CameraPose, type PlacedCameraPose} from './scientific-probes';

export type FlagshipDataset = {
  name: string;
  crs: string;
  bounds: [number, number, number, number];
  origin: [number, number];
  extent: number;
  anchor_lonlat: [number, number];
  z0: number;
  relief: {zmin: number; zmax: number; relief: number};
  axis: 'geometry';
  volume_field: null;
  volume_field_reason: string;
  source: {file: string; sha256: string; note: string};
  counts: {
    buildingParts: number; objectsInTable: number;
    vertices: number; triangles: number;
    skippedSurfaces: number; skippedSurfacesReason: string;
  };
};

export type FlagshipManifest = {
  axis: 'geometry';
  dataset: string;
  files: Record<string, VerifiedFile>;
};

export type FlagshipBuildingsJson = MeshPairJson & {objectTable: string[]};

export type FlagshipBundle = {
  mesh: MeshPair;
  json: FlagshipBuildingsJson;
  dataset: FlagshipDataset;
  orbit: FlagshipOrbit;
};

/**
 * orbit-flagship-v1. Same SHAPE as orbit-v1 (30 unrecorded warmup frames, 180
 * measured, one azimuth sweep at a fixed elevation) so the two renderers are
 * driven identically, but the radius and target height are derived from the
 * dataset instead of being the tile's literals.
 *
 * WHY DERIVED RATHER THAN COPIED. orbit-v1 is `target [0, 0, 40], radius 500`,
 * tuned to a tile whose extent is 250 m and whose local z spans 0..80. flagship's
 * extent is ~1000 m. Reusing those literals would put the camera INSIDE the city
 * and still return 180 plausible frame times -- a number that is wrong by
 * coincidence of scene rather than obviously broken. The two ratios below are
 * orbit-v1's own (500/250 and 40/80), applied to this dataset's real numbers.
 */
export const ORBIT_FLAGSHIP_V1 = {
  cameraPath: 'orbit-flagship-v1' as const,
  warmupFrames: 30,
  forcedFrames: 180 as const,
  elevationDeg: 30,
  /** orbit-v1: radius 500 over extent 250. */
  radiusPerExtent: 2,
  /** orbit-v1: target z 40 over a local z span of 80. */
  targetZFraction: 0.5,
};

/**
 * The field of view BOTH flagship pages must use, stated rather than inherited.
 *
 * vtk.js's camera defaults to viewAngle 30; Three.js's PerspectiveCamera
 * defaults to 50. Taking each renderer's default would have page 15 and page 16
 * drawing different amounts of the city at the same camera position, and their
 * frame times would then compare two different workloads while looking like a
 * renderer difference. Pages 13/14 solve this by passing 30 to Three.js to meet
 * vtk.js's default; here both pages set it explicitly from this constant, so a
 * future change to either library's default cannot silently split them.
 */
export const FLAGSHIP_FOV_DEG = 30;

export type FlagshipOrbit = {
  cameraPath: 'orbit-flagship-v1';
  target: [number, number, number];
  radius: number;
  elevationDeg: number;
  /** Recorded so a reader can check the camera against the scene it framed. */
  derivedFrom: {extent: number; localZMax: number};
};

export function flagshipOrbit(dataset: FlagshipDataset): FlagshipOrbit {
  const localZMax = dataset.relief.zmax - dataset.z0;
  return {
    cameraPath: ORBIT_FLAGSHIP_V1.cameraPath,
    target: [0, 0, localZMax * ORBIT_FLAGSHIP_V1.targetZFraction],
    radius: dataset.extent * ORBIT_FLAGSHIP_V1.radiusPerExtent,
    elevationDeg: ORBIT_FLAGSHIP_V1.elevationDeg,
    derivedFrom: {extent: dataset.extent, localZMax},
  };
}

/** Deterministic pose for frame `frameIndex` over the full warmup+measured span. */
export function flagshipPose(frameIndex: number, orbit: FlagshipOrbit): PlacedCameraPose {
  const total = ORBIT_FLAGSHIP_V1.warmupFrames + ORBIT_FLAGSHIP_V1.forcedFrames;
  const pose: CameraPose = {
    target: orbit.target,
    radius: orbit.radius,
    elevationDeg: orbit.elevationDeg,
    azimuthDeg: (360 * frameIndex) / total,
  };
  // Same reason orbitV1Pose ships `eye`: a page that recomputes the trig itself
  // can get the handedness wrong and the parity check would blame the renderer.
  return {...pose, eye: poseToEye(pose)};
}

export type GeometryProbe = {
  renderer: 'vtkjs' | 'threejs';
  status: 'ready' | 'context-lost' | 'failed';
  canvasCount: number;
  axis: 'geometry';
  /** Read back off the loaded mesh, never copied from dataset.json, so a
   *  manifest that disagreed with its own bytes is visible rather than quoted. */
  counts: {buildingParts: number; vertices: number; triangles: number; objectTable: number};
  camera: FlagshipOrbit;
  /** Published so the two pages' cameras can be compared, not assumed equal. */
  lens: {fovDeg: number; aspect: number; surface: [number, number]};
  volumeField: null;
  selectedObject?: {objectIndex: number; dtccId: string; triangle: number};
  /** Startup pick cross-check: where the page aimed, what it hit, and whether
   *  they are the same object. A mismatch is occlusion, not a failure. */
  pickCheck?: {
    expected: {objectIndex: number; dtccId: string; triangle: number};
    picked: {objectIndex: number; dtccId: string; triangle: number};
    sameObject: boolean;
    note: string;
  };
  benchmark?: {
    cpuFrameTimesMs: number[];
    gpuFrameTimesMs: number[] | null;
    cameraPath: 'orbit-flagship-v1';
    forcedFrames: 180;
  };
  resources: {
    buffers: number; textures: number; renderTargets: number;
    listeners: number; observers: number;
  };
  measurementValid: boolean;
};

const DATA = 'data/flagship';

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verified(bytes: Uint8Array, expected: VerifiedFile, what: string): Promise<void> {
  if (bytes.byteLength !== expected.byteLength) {
    throw new Error(`${what}: manifest says ${expected.byteLength} bytes, got ${bytes.byteLength}`);
  }
  const got = await sha256Hex(bytes);
  if (got !== expected.sha256) throw new Error(`${what}: sha256 ${got} != ${expected.sha256}`);
}

/**
 * Fetch and fully verify the flagship geometry bundle. Every file is checked
 * against the manifest's byteLength+sha256 before a typed-array view exists,
 * matching loadScientificBundle -- a geometry page that skipped verification
 * would be the one unverified loader in the suite.
 */
export async function loadFlagshipGeometry(): Promise<FlagshipBundle> {
  const manifestBytes = await fetchBytes(assetUrl(`${DATA}/manifest.json`));
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as FlagshipManifest;
  if (manifest.axis !== 'geometry') throw new Error(`flagship manifest: axis ${manifest.axis}`);

  const need = (name: string): VerifiedFile => {
    const entry = manifest.files[name];
    if (!entry) throw new Error(`flagship manifest: no record for ${name}`);
    return entry;
  };

  const datasetBytes = await fetchBytes(assetUrl(`${DATA}/${manifest.dataset}`));
  await verified(datasetBytes, need(manifest.dataset), `flagship ${manifest.dataset}`);
  const dataset = JSON.parse(new TextDecoder().decode(datasetBytes)) as FlagshipDataset;

  const {mesh, json} = await loadMeshPair(
    assetUrl(`${DATA}/buildings.mesh.json`),
    assetUrl(`${DATA}/buildings.mesh.bin`),
    need('buildings.mesh.json'),
    need('buildings.mesh.bin'),
  );
  if (!mesh.cellObjectIndex) throw new Error('flagship buildings mesh: no cell_object_index');

  return {mesh, json: json as FlagshipBuildingsJson, dataset, orbit: flagshipOrbit(dataset)};
}

/** Which object a picked triangle belongs to. Pure, so it is testable without a GPU. */
export function objectForTriangle(
  bundle: Pick<FlagshipBundle, 'mesh' | 'json'>, triangle: number,
): {objectIndex: number; dtccId: string; triangle: number} {
  const cells = bundle.mesh.cellObjectIndex!;
  if (!Number.isInteger(triangle) || triangle < 0 || triangle >= cells.length) {
    throw new RangeError(`triangle ${triangle} outside 0..${cells.length - 1}`);
  }
  const objectIndex = cells[triangle];
  const dtccId = bundle.json.objectTable[objectIndex];
  if (dtccId === undefined) {
    throw new Error(`cell_object_index ${objectIndex} outside objectTable of ${bundle.json.objectTable.length}`);
  }
  return {objectIndex, dtccId, triangle};
}

export type GlCounts = {buffers: number; textures: number; renderTargets: number; renderbuffers: number};

/**
 * Live GL object counts, by wrapping create/delete on the real context.
 *
 * Pages 13 and 14 each carry their own copy of this; the two new pages share
 * one. The WeakSet is not optional: decrementing on any truthy argument lets a
 * double delete, or a delete of an object created before the wrappers were
 * installed, drive the count below the truth, and a count that can go negative
 * is not a measurement.
 */
export function instrumentGlObjects(gl: WebGL2RenderingContext | WebGLRenderingContext): GlCounts {
  const counts: GlCounts = {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0};
  const target = gl as unknown as Record<string, (...args: unknown[]) => unknown>;
  const wrap = (createName: string, deleteName: string, key: keyof GlCounts) => {
    const create = target[createName].bind(gl);
    const destroy = target[deleteName].bind(gl);
    const live = new WeakSet<object>();
    target[createName] = (...args: unknown[]) => {
      const object = create(...args);
      if (object) { live.add(object as object); counts[key]++; }
      return object;
    };
    target[deleteName] = (...args: unknown[]) => {
      const object = args[0];
      if (object && live.has(object as object)) { live.delete(object as object); counts[key]--; }
      return destroy(...args);
    };
  };
  wrap('createBuffer', 'deleteBuffer', 'buffers');
  wrap('createTexture', 'deleteTexture', 'textures');
  wrap('createFramebuffer', 'deleteFramebuffer', 'renderTargets');
  wrap('createRenderbuffer', 'deleteRenderbuffer', 'renderbuffers');
  return counts;
}

/**
 * EXT_disjoint_timer_query_webgl2 wrapper matching the driver's GpuTimer shape.
 * Returns null where the extension is absent -- which the driver reports as
 * "no timer", distinct from "the timer ran and kept nothing".
 */
export function createGpuTimer(gl: WebGL2RenderingContext): {
  beginFrame(): void; endFrame(): void; readResult(): Promise<{ms: number; disjoint: boolean} | null>;
} | null {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as {
    TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number;
  } | null;
  if (!ext) return null;
  let query: WebGLQuery | null = null;
  return {
    beginFrame() {
      query = gl.createQuery();
      if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    },
    endFrame() {
      if (query) gl.endQuery(ext.TIME_ELAPSED_EXT);
    },
    async readResult() {
      const q = query;
      query = null;
      if (!q) return null;
      // One macrotask, so a not-yet-available result is polled rather than spun on.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const available = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) as boolean;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
      if (!available) { gl.deleteQuery(q); return null; }
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      gl.deleteQuery(q);
      return {ms: ns / 1e6, disjoint};
    },
  };
}

/**
 * The triangle a page's startup pick aims at: the first triangle of the
 * building part whose centroid is nearest the scene centre, chosen from the
 * mesh itself so it is deterministic and needs no hand-picked id.
 */
export function pickTargetTriangle(bundle: Pick<FlagshipBundle, 'mesh'>): number {
  const {positions, indices, cellObjectIndex} = bundle.mesh;
  const triangles = indices.length / 3;
  let best = 0;
  let bestDistance = Infinity;
  let currentObject = -1;
  for (let t = 0; t < triangles; t++) {
    const object = cellObjectIndex![t];
    if (object === currentObject) continue;   // one probe per object, its first triangle
    currentObject = object;
    const v = indices[t * 3] * 3;
    const distance = positions[v] ** 2 + positions[v + 1] ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = t; }
  }
  return best;
}

/** World-space centroid of one triangle, in the dataset's local frame. */
export function triangleCentroid(
  bundle: Pick<FlagshipBundle, 'mesh'>, triangle: number,
): [number, number, number] {
  const {positions, indices} = bundle.mesh;
  const out: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const v = indices[triangle * 3 + k] * 3;
    out[0] += positions[v] / 3;
    out[1] += positions[v + 1] / 3;
    out[2] += positions[v + 2] / 3;
  }
  return out;
}

/**
 * Forces the frame just submitted to COMPLETE, so the wall clock around
 * renderFrame measures a frame rather than command submission.
 *
 * MEASURED, NOT ASSUMED, in this order:
 *  - no sync at all: 0.2-0.4 ms per frame for 694k triangles (2500-5000 FPS).
 *    That is submission time; the GPU has not finished when the clock is read.
 *  - gl.finish(): identical numbers. chromium/ANGLE does not honour it.
 *  - a 1-pixel readPixels: forces the pipeline to drain because the result
 *    cannot be produced until the frame is done. This is the one that works.
 *
 * The readback costs the same on both pages, so the vtk.js/Three.js comparison
 * stays fair; it does mean these frame times include one pixel transfer and
 * are therefore an upper bound, which is stated rather than hidden.
 */
export function makeFrameSync(gl: WebGL2RenderingContext | null): () => void {
  if (!gl) return () => {};
  const pixel = new Uint8Array(4);
  return () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); };
}
