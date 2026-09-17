import {describe, expect, test, mock} from 'bun:test';
import type {BuildingObjectEntry, ScientificGrid, ScientificGridRef} from '../../src/lib/scientific-data';
import {
  ALIGNMENT_TOLERANCE_M,
  alignmentDistance,
  attachContextLoss,
  createBenchmarkDriver,
  describeTraceability,
  diffResources,
  gridField,
  gridNodeIndex,
  heatGridField,
  interpolatedTolerance,
  objectRefForCell,
  orbitV1Pose,
  ORBIT_V1,
  poseToEye,
  probeGridNode,
  resourcesEqual,
  sampleGridTrilinear,
  type CameraPose,
  type GpuTimer,
  type GridField,
  type ResourceSnapshot,
  type ScientificProbe,
} from '../../src/lib/scientific-probes';

// ---------------------------------------------------------------------------
// Grid indexing. dims deliberately differ per axis (2, 3, 4): a transposed
// index formula (e.g. z-fastest/x-slowest, which is Core's *raw* order before
// generate.py reorders it -- see the plan's Contract Amendments) would read
// the wrong flat offset for almost every (i, j, k) here, not just some --
// on a cube it could accidentally line up. Every node gets a value that
// encodes its own (i, j, k) uniquely (i + j*10 + k*100), so a wrong index
// reads back a value belonging to a different node, not a subtly-off number.

function fixtureField(components: 1 | 3 = 1): GridField {
  const dims: [number, number, number] = [2, 3, 4];
  const [nx, ny, nz] = dims;
  const data = new Float32Array(nx * ny * nz * components);
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const node = i + nx * (j + ny * k); // reference x-fastest formula
        const value = i + j * 10 + k * 100;
        for (let c = 0; c < components; c++) data[node * components + c] = value + c * 1000;
      }
    }
  }
  return {dims, origin: [0, 0, 0], spacing: [1, 1, 1], data, components};
}

describe('gridNodeIndex / probeGridNode (x-fastest grid indexing)', () => {
  test('reads the unique value encoded at every (i, j, k) on a non-cube grid', () => {
    const field = fixtureField();
    const [nx, ny, nz] = field.dims;
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          expect(probeGridNode(field, i, j, k)).toEqual([i + j * 10 + k * 100]);
        }
      }
    }
  });

  test('gridNodeIndex matches the contract formula x + nx * (y + ny * z), not the reverse', () => {
    const dims: [number, number, number] = [2, 3, 4];
    // x + nx*(y + ny*z) = 1 + 2*(2 + 3*3) = 1 + 2*11 = 23.
    // The transposed (z-fastest) formula z + nz*(y + ny*x) for the same
    // inputs is 3 + 4*(2 + 3*1) = 3 + 20 = 23 as well for this particular
    // triple by coincidence of the chosen numbers, so the exhaustive
    // per-node fixture test above -- not this one -- is what actually
    // distinguishes the two formulas across the whole non-cube grid.
    expect(gridNodeIndex(dims, 1, 2, 3)).toBe(1 + dims[0] * (2 + dims[1] * 3));
    expect(gridNodeIndex(dims, 1, 2, 3)).toBe(23);
  });

  test('reads per-node components contiguously (AoS: node0.c0, node0.c1, node0.c2, node1.c0, ...)', () => {
    const field = fixtureField(3);
    expect(probeGridNode(field, 1, 2, 3)).toEqual([1 + 20 + 300, 1 + 20 + 300 + 1000, 1 + 20 + 300 + 2000]);
  });

  test('throws (never wraps or clamps) on an out-of-range index in any axis', () => {
    const field = fixtureField();
    expect(() => probeGridNode(field, -1, 0, 0)).toThrow();
    expect(() => probeGridNode(field, 2, 0, 0)).toThrow(); // nx = 2, valid i is 0..1
    expect(() => probeGridNode(field, 0, 3, 0)).toThrow(); // ny = 3
    expect(() => probeGridNode(field, 0, 0, 4)).toThrow(); // nz = 4
  });

  test('rejects non-integer indices rather than silently flooring them', () => {
    expect(() => gridNodeIndex([2, 3, 4], 0.5, 0, 0)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Trilinear sampling: exact on a linear ramp (so the expected value at any
// fractional point is computable independently of the implementation), and
// boundary-clamped rather than extrapolating or throwing outside the grid.

function rampField(): GridField {
  // f(x, y, z) = x, sampled on a 3x2x2 grid spaced 1 m apart. Trilinear
  // interpolation of a function that is already linear in x must reproduce x
  // exactly everywhere, including outside [0, 2] where clamping applies.
  const dims: [number, number, number] = [3, 2, 2];
  const [nx, ny, nz] = dims;
  const data = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    data[i + nx * (j + ny * k)] = i;
  }
  return {dims, origin: [0, 0, 0], spacing: [1, 1, 1], data, components: 1};
}

describe('sampleGridTrilinear', () => {
  test('is exact at grid nodes and at fractional interior points on a linear ramp', () => {
    const field = rampField();
    expect(sampleGridTrilinear(field, [0, 0, 0])).toEqual([0]);
    expect(sampleGridTrilinear(field, [2, 1, 1])).toEqual([2]);
    expect(sampleGridTrilinear(field, [1.5, 0.5, 0.5])[0]).toBeCloseTo(1.5, 6);
    expect(sampleGridTrilinear(field, [0.25, 1, 0])[0]).toBeCloseTo(0.25, 6);
  });

  test('clamps to the boundary instead of extrapolating past it', () => {
    const field = rampField();
    expect(sampleGridTrilinear(field, [-5, 0, 0])).toEqual([0]);
    expect(sampleGridTrilinear(field, [50, 1, 1])).toEqual([2]);
    // Off-grid in y/z too: still clamps per axis rather than throwing.
    expect(sampleGridTrilinear(field, [1, -5, 50])[0]).toBeCloseTo(1, 6);
  });

  test('a degenerate (length-1) axis contributes no interpolation', () => {
    const dims: [number, number, number] = [1, 2, 2];
    // node = i + nx*(j + ny*k) = j + 2*k (nx=1, ny=2): (j=0,k=0)->0, (j=1,k=0)->1,
    // (j=0,k=1)->2, (j=1,k=1)->3. Only y (j) varies: y=0 -> 0, y=1 -> 5.
    const data = new Float32Array([0, 5, 0, 5]);
    const field: GridField = {dims, origin: [0, 0, 0], spacing: [1, 1, 1], data, components: 1};
    expect(sampleGridTrilinear(field, [999, 0.5, 0])[0]).toBeCloseTo(2.5, 6);
  });

  test('interpolates a multi-component field per component', () => {
    const dims: [number, number, number] = [2, 1, 1];
    const data = new Float32Array([0, 100, 200, 10, 110, 210]); // node0=[0,100,200], node1=[10,110,210]
    const field: GridField = {dims, origin: [0, 0, 0], spacing: [1, 1, 1], data, components: 3};
    const sample = sampleGridTrilinear(field, [0.5, 0, 0]);
    expect(sample[0]).toBeCloseTo(5, 6);
    expect(sample[1]).toBeCloseTo(105, 6);
    expect(sample[2]).toBeCloseTo(205, 6);
  });

  test('a zero spacing on a non-degenerate axis throws naming the axis, instead of silently producing NaN', () => {
    const dims: [number, number, number] = [1, 3, 1]; // y is the only non-degenerate axis
    const data = new Float32Array([0, 1, 2]);
    const field: GridField = {dims, origin: [0, 0, 0], spacing: [1, 0, 1], data, components: 1};
    expect(() => sampleGridTrilinear(field, [0, 1, 0])).toThrow(/spacing\[1\] is 0/);
  });

  test('a zero spacing on a genuinely degenerate axis (dims === 1) is fine -- no divide happens there', () => {
    const dims: [number, number, number] = [1, 2, 1];
    const data = new Float32Array([0, 5]);
    const field: GridField = {dims, origin: [0, 0, 0], spacing: [0, 1, 0], data, components: 1};
    expect(() => sampleGridTrilinear(field, [999, 0.5, 999])).not.toThrow();
    expect(sampleGridTrilinear(field, [999, 0.5, 999])[0]).toBeCloseTo(2.5, 6);
  });
});

describe('gridField (ScientificGrid adapter)', () => {
  test('adapts a decoded ScientificGrid field by name, with the right component count', () => {
    const grid: ScientificGrid = {
      dims: [2, 2, 2], origin: [0, 0, 0], spacing: [1, 1, 1], association: 'vertex',
      speed: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]),
      pressure: new Float32Array([10, 20, 30, 40, 50, 60, 70, 80]),
      velocity: new Float32Array(24).fill(9),
    };
    expect(gridField(grid, 'speed').components).toBe(1);
    expect(gridField(grid, 'speed').data).toBe(grid.speed);
    expect(gridField(grid, 'velocity').components).toBe(3);
    expect(gridField(grid, 'velocity').data).toBe(grid.velocity);
  });
});

describe('heatGridField (ScientificGridRef adapter)', () => {
  test('adapts a heat grid reference plus caller-fetched bytes into a scalar GridField', () => {
    const ref: ScientificGridRef = {
      dims: [2, 2, 2], origin: [-10, -10, 0], spacing: [10, 10, 5], min: 18, max: 32,
      dataUrl: '/data/real/field.grid.f32', unit: 'degC', source: 'test-sim', association: null,
    };
    const data = new Float32Array([18, 20, 22, 24, 26, 28, 30, 32]);
    const field = heatGridField(ref, data);
    expect(field.components).toBe(1);
    expect(field.data).toBe(data);
    expect(field.dims).toEqual(ref.dims);
    expect(field.origin).toEqual(ref.origin);
    expect(field.spacing).toEqual(ref.spacing);
    // Usable with the same probing functions as any other GridField.
    expect(probeGridNode(field, 1, 0, 0)).toEqual([20]);
  });
});

// ---------------------------------------------------------------------------
// Identity lookup. The shipped tile only ever measures identityStability as
// 'unstable_observed' -- a check that only ever ran that branch would pass
// for the wrong reason, so 'stable_observed_two_loads' is exercised here too,
// on a synthetic fixture (task-4-brief.md: "Both verdicts must still work").

function objectsFixture(): Map<number, BuildingObjectEntry> {
  return new Map([
    [0, {sourceIndexes: [59], dtccIds: ['ba4869b6-cb48-4943-b981-b59b62d77a05']}], // single source, the common case
    [1, {sourceIndexes: [129, 131, 132], dtccIds: ['a', 'b', 'c']}], // merged fan-out
    [2, {sourceIndexes: [], dtccIds: []}], // split-added, no source building
  ]);
}

describe('objectRefForCell (identity lookup, both stability verdicts)', () => {
  test('unstable_observed (the tile\'s measured verdict): an attributed marker traces run-local', () => {
    const ref = objectRefForCell(objectsFixture(), 'unstable_observed', 0);
    expect(ref).toEqual({marker: 0, sourceIndexes: [59], dtccIds: ['ba4869b6-cb48-4943-b981-b59b62d77a05'], traceability: 'run-local'});
  });

  test('unstable_observed: a fan-out marker carries every sourceIndex/dtccId, never collapsed to one', () => {
    const ref = objectRefForCell(objectsFixture(), 'unstable_observed', 1);
    expect(ref.sourceIndexes).toEqual([129, 131, 132]);
    expect(ref.dtccIds).toEqual(['a', 'b', 'c']);
    expect(ref.traceability).toBe('run-local');
  });

  test('a split-added marker with no source building traces "none" -- plainly, under either verdict', () => {
    expect(objectRefForCell(objectsFixture(), 'unstable_observed', 2).traceability).toBe('none');
    expect(objectRefForCell(objectsFixture(), 'stable_observed_two_loads', 2).traceability).toBe('none');
  });

  test('stable_observed_two_loads: an attributed marker traces stable -- the branch is real, not dead code', () => {
    const ref = objectRefForCell(objectsFixture(), 'stable_observed_two_loads', 0);
    expect(ref.traceability).toBe('stable');
  });

  test('never fabricates or substitutes: an unknown marker throws rather than returning a neighbour', () => {
    expect(() => objectRefForCell(objectsFixture(), 'unstable_observed', 99)).toThrow();
  });

  test('returns copies, not shared references -- mutating the result cannot corrupt the map', () => {
    const objects = objectsFixture();
    const ref = objectRefForCell(objects, 'unstable_observed', 1);
    ref.sourceIndexes.push(999);
    ref.dtccIds.push('tampered');
    expect(objects.get(1)!.sourceIndexes).toEqual([129, 131, 132]);
    expect(objects.get(1)!.dtccIds).toEqual(['a', 'b', 'c']);
  });
});

describe('describeTraceability (state plainly, never blank)', () => {
  test('every verdict gets non-empty, distinct human text', () => {
    const stable = describeTraceability('stable');
    const runLocal = describeTraceability('run-local');
    const none = describeTraceability('none');
    for (const s of [stable, runLocal, none]) expect(s.length).toBeGreaterThan(0);
    expect(new Set([stable, runLocal, none]).size).toBe(3);
    // The two contract-critical cases: a visible warning for run-local, and an
    // explicit statement (not blank) for a marker with no source building.
    expect(none.toLowerCase()).toContain('no source building');
    expect(runLocal.toLowerCase()).toMatch(/run-local|not stable|regenerated/);
  });
});

// ---------------------------------------------------------------------------
// Alignment probes.

describe('alignmentDistance', () => {
  test('is Euclidean, not Manhattan, distance', () => {
    expect(alignmentDistance([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 9); // 3-4-5 triangle
  });

  test('the 5 cm contract boundary is exact', () => {
    expect(ALIGNMENT_TOLERANCE_M).toBe(0.05);
    expect(alignmentDistance([0, 0, 0], [0.03, 0.04, 0])).toBeCloseTo(0.05, 9);
    expect(alignmentDistance([0, 0, 0], [0.03, 0.04, 0]) <= ALIGNMENT_TOLERANCE_M).toBe(true);
    expect(alignmentDistance([0, 0, 0], [0.03, 0.04, 0.001]) > ALIGNMENT_TOLERANCE_M).toBe(true);
  });

  test('every axis contributes -- not just a subset', () => {
    expect(alignmentDistance([0, 0, 0], [0, 0, 1])).toBeCloseTo(1, 9);
    expect(alignmentDistance([0, 0, 0], [0, 1, 0])).toBeCloseTo(1, 9);
    expect(alignmentDistance([0, 0, 0], [1, 0, 0])).toBeCloseTo(1, 9);
  });
});

describe('interpolatedTolerance', () => {
  test('matches the Global Constraint formula: 1e-5 * max(fieldSpan, 1)', () => {
    expect(interpolatedTolerance(100)).toBeCloseTo(1e-3, 12);
    expect(interpolatedTolerance(0)).toBeCloseTo(1e-5, 12); // floored to max(0, 1) = 1
    expect(interpolatedTolerance(0.001)).toBeCloseTo(1e-5, 12); // floored, not 1e-5 * 0.001
    expect(interpolatedTolerance(2)).toBeCloseTo(2e-5, 12);
  });
});

// ---------------------------------------------------------------------------
// Deterministic camera interpolation (orbit-v1).

describe('orbitV1Pose', () => {
  test('is deterministic: the same frame index always yields the same pose', () => {
    expect(orbitV1Pose(57)).toEqual(orbitV1Pose(57));
  });

  test('starts at azimuth 0 and advances monotonically over the full run', () => {
    const total = ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames;
    expect(orbitV1Pose(0).azimuthDeg).toBe(0);
    let prev = -1;
    for (let f = 0; f < total; f++) {
      const pose = orbitV1Pose(f);
      expect(pose.azimuthDeg).toBeGreaterThan(prev);
      prev = pose.azimuthDeg;
    }
    expect(orbitV1Pose(total - 1).azimuthDeg).toBeLessThan(360);
  });

  test('target, radius and elevation are fixed across the whole run', () => {
    const a = orbitV1Pose(0);
    const b = orbitV1Pose(200);
    expect(b.target).toEqual(a.target);
    expect(b.radius).toBe(a.radius);
    expect(b.elevationDeg).toBe(a.elevationDeg);
  });
});

describe('poseToEye (z-up, azimuth from +x toward +y)', () => {
  test('azimuth 0, elevation 0 puts the eye at target + [radius, 0, 0]', () => {
    const pose: CameraPose = {target: [10, 20, 30], radius: 100, elevationDeg: 0, azimuthDeg: 0};
    const eye = poseToEye(pose);
    expect(eye[0]).toBeCloseTo(110, 9);
    expect(eye[1]).toBeCloseTo(20, 9);
    expect(eye[2]).toBeCloseTo(30, 9);
  });

  test('azimuth 90, elevation 0 puts the eye at target + [0, radius, 0] -- +x toward +y, not +x toward +z', () => {
    const pose: CameraPose = {target: [0, 0, 0], radius: 10, elevationDeg: 0, azimuthDeg: 90};
    const eye = poseToEye(pose);
    expect(eye[0]).toBeCloseTo(0, 9);
    expect(eye[1]).toBeCloseTo(10, 9);
    expect(eye[2]).toBeCloseTo(0, 9);
  });

  test('elevation 90 puts the eye directly above the target along +z, regardless of azimuth', () => {
    const straightUp = poseToEye({target: [0, 0, 0], radius: 10, elevationDeg: 90, azimuthDeg: 0});
    const straightUpOtherAzimuth = poseToEye({target: [0, 0, 0], radius: 10, elevationDeg: 90, azimuthDeg: 200});
    expect(straightUp[0]).toBeCloseTo(0, 9);
    expect(straightUp[1]).toBeCloseTo(0, 9);
    expect(straightUp[2]).toBeCloseTo(10, 9);
    for (let c = 0; c < 3; c++) expect(straightUpOtherAzimuth[c]).toBeCloseTo(straightUp[c], 9);
  });

  test('the eye is always exactly `radius` metres from `target`, at any pose', () => {
    for (const pose of [orbitV1Pose(0), orbitV1Pose(45), orbitV1Pose(120), orbitV1Pose(200)]) {
      const eye = poseToEye(pose);
      expect(alignmentDistance(eye, pose.target)).toBeCloseTo(pose.radius, 6);
    }
  });
});

// ---------------------------------------------------------------------------
// BenchmarkDriver: forced-frame sampling and disjoint GPU sample rejection.
// No requestAnimationFrame anywhere in this module (confirmed: Bun's test
// environment has no `requestAnimationFrame` global at all, so a driver that
// depended on one could not even load here) -- every measured frame is this
// loop calling `renderFrame` directly, never an idle rAF tick.

describe('createBenchmarkDriver: forced-frame sampling', () => {
  test('calls renderFrame exactly warmup + forcedFrames times, with cpuFrameTimesMs sized to the measured phase only', async () => {
    const poses: CameraPose[] = [];
    let clock = 0;
    const driver = createBenchmarkDriver({
      renderFrame: (pose) => { poses.push(pose); clock += 2; },
      now: () => clock,
    });
    const result = await driver.runBenchmark();
    expect(poses.length).toBe(ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames);
    expect(result.cpuFrameTimesMs.length).toBe(180);
    expect(result.forcedFrames).toBe(180);
    expect(result.cameraPath).toBe('orbit-v1');
    // Deterministic clock (+2ms per call) -> every measured frame timed at exactly 2ms.
    expect(result.cpuFrameTimesMs.every(t => t === 2)).toBe(true);
  });

  test('publishes gpuFrameTimesMs as null when no GPU timer is available', async () => {
    const driver = createBenchmarkDriver({renderFrame: () => {}, now: () => 0});
    const result = await driver.runBenchmark();
    expect(result.gpuFrameTimesMs).toBeNull();
  });

  test('measured camera poses are the tail of the orbit-v1 sequence (warmup frames precede them)', async () => {
    const poses: CameraPose[] = [];
    const driver = createBenchmarkDriver({renderFrame: (pose) => { poses.push(pose); }, now: () => 0});
    await driver.runBenchmark();
    const measured = poses.slice(ORBIT_V1.warmupFrames);
    expect(measured.length).toBe(180);
    expect(measured[0]).toEqual(orbitV1Pose(ORBIT_V1.warmupFrames));
    expect(measured[measured.length - 1]).toEqual(orbitV1Pose(ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames - 1));
  });

  test('stop() ends a run early and RESOLVES cleanly, with a short partial result -- never an unhandled rejection', async () => {
    let calls = 0;
    const driver = createBenchmarkDriver({
      renderFrame: () => {
        calls++;
        if (calls === 5) driver.stop();
      },
      now: () => 0,
    });
    const result = await driver.runBenchmark(); // must not throw/reject
    expect(calls).toBeLessThan(ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames);
    // stop() lands during warmup (call 5 of 30 warmup frames), so no
    // measured frame ever ran -- the partial result is empty, not thrown.
    expect(result.cpuFrameTimesMs).toEqual([]);
    expect(result.forcedFrames).toBe(180); // contract literal, independent of how many frames actually ran
    expect(result.cameraPath).toBe('orbit-v1');
  });

  test('stop() during the measured phase keeps everything collected before it', async () => {
    let calls = 0;
    const driver = createBenchmarkDriver({
      renderFrame: () => {
        calls++;
        if (calls === ORBIT_V1.warmupFrames + 10) driver.stop(); // 10 measured frames in
      },
      now: (() => { let t = 0; return () => (t += 1); })(),
    });
    const result = await driver.runBenchmark();
    expect(result.cpuFrameTimesMs.length).toBe(10);
    expect(result.cpuFrameTimesMs.length).toBeLessThan(180);
  });

  test('rejects a concurrent call while a run is already in progress, without disturbing the first run', async () => {
    let resolveFrame: () => void = () => {};
    const driver = createBenchmarkDriver({
      renderFrame: () => new Promise<void>((resolve) => { resolveFrame = resolve; }),
      now: () => 0,
    });
    const first = driver.runBenchmark(); // suspends inside its first renderFrame call
    await expect(driver.runBenchmark()).rejects.toThrow(/already in progress/);
    driver.stop();
    resolveFrame();
    await expect(first).resolves.toBeDefined();
  });

  test('a fresh runBenchmark() after a prior run finished is allowed (the guard is not permanent)', async () => {
    const driver = createBenchmarkDriver({renderFrame: () => {}, now: () => 0});
    await driver.runBenchmark();
    await expect(driver.runBenchmark()).resolves.toBeDefined();
  });
});

describe('createBenchmarkDriver: disjoint GPU sample rejection', () => {
  function scriptedGpuTimer(results: Array<{ms: number; disjoint: boolean} | null>): GpuTimer {
    let i = 0;
    return {
      beginFrame: () => {},
      endFrame: () => {},
      readResult: async () => results[i++] ?? null,
    };
  }

  test('rejects disjoint samples: they are dropped, not zero-filled or averaged in', async () => {
    const results: Array<{ms: number; disjoint: boolean} | null> = [];
    for (let i = 0; i < 180; i++) {
      results.push(i % 3 === 0 ? {ms: 999, disjoint: true} : {ms: 4, disjoint: false});
    }
    const driver = createBenchmarkDriver({renderFrame: () => {}, gpuTimer: scriptedGpuTimer(results), now: () => 0});
    const result = await driver.runBenchmark();
    expect(result.gpuFrameTimesMs).not.toBeNull();
    expect(result.gpuFrameTimesMs!.length).toBe(120); // 180 - 60 disjoint (every 3rd)
    expect(result.gpuFrameTimesMs!.every(ms => ms === 4)).toBe(true);
    // CPU timing is unaffected by GPU rejection -- still every measured frame.
    expect(result.cpuFrameTimesMs.length).toBe(180);
  });

  test('a null (not-yet-available) sample is also rejected, not treated as zero', async () => {
    const results = Array.from({length: 180}, (_, i) => (i === 10 ? null : {ms: 3, disjoint: false}));
    const driver = createBenchmarkDriver({renderFrame: () => {}, gpuTimer: scriptedGpuTimer(results), now: () => 0});
    const result = await driver.runBenchmark();
    expect(result.gpuFrameTimesMs!.length).toBe(179);
    expect(result.gpuFrameTimesMs!.every(ms => ms === 3)).toBe(true);
  });

  test('all-disjoint still reports an empty array, not null -- the timer was available, it just found nothing usable', async () => {
    const results = Array.from({length: 180}, () => ({ms: 1, disjoint: true}));
    const driver = createBenchmarkDriver({renderFrame: () => {}, gpuTimer: scriptedGpuTimer(results), now: () => 0});
    const result = await driver.runBenchmark();
    expect(result.gpuFrameTimesMs).toEqual([]);
  });
});

describe('createBenchmarkDriver: lastGpuSampleStats (kept vs rejected, distinct from an empty array)', () => {
  function scriptedGpuTimer(results: Array<{ms: number; disjoint: boolean} | null>): GpuTimer {
    let i = 0;
    return {beginFrame: () => {}, endFrame: () => {}, readResult: async () => results[i++] ?? null};
  }

  test('is null before any run, and null when no gpuTimer was supplied', async () => {
    const driver = createBenchmarkDriver({renderFrame: () => {}, now: () => 0});
    expect(driver.lastGpuSampleStats()).toBeNull();
    await driver.runBenchmark();
    expect(driver.lastGpuSampleStats()).toBeNull();
  });

  test('counts kept and rejected separately -- an all-disjoint run is distinguishable from "never ran"', async () => {
    const results = Array.from({length: 180}, () => ({ms: 1, disjoint: true}));
    const driver = createBenchmarkDriver({renderFrame: () => {}, gpuTimer: scriptedGpuTimer(results), now: () => 0});
    await driver.runBenchmark();
    expect(driver.lastGpuSampleStats()).toEqual({kept: 0, rejected: 180});
  });

  test('a mix of kept and rejected samples is tallied correctly', async () => {
    const results = Array.from({length: 180}, (_, i) => (i % 3 === 0 ? {ms: 1, disjoint: true} : {ms: 2, disjoint: false}));
    const driver = createBenchmarkDriver({renderFrame: () => {}, gpuTimer: scriptedGpuTimer(results), now: () => 0});
    await driver.runBenchmark();
    expect(driver.lastGpuSampleStats()).toEqual({kept: 120, rejected: 60});
  });
});

// ---------------------------------------------------------------------------
// Resource snapshots.

describe('resourcesEqual / diffResources', () => {
  function snap(overrides: Partial<ResourceSnapshot> = {}): ResourceSnapshot {
    return {buffers: 4, textures: 2, renderTargets: 1, listeners: 3, observers: 1, ...overrides};
  }

  test('identical snapshots are equal with an empty diff', () => {
    expect(resourcesEqual(snap(), snap())).toBe(true);
    expect(diffResources(snap(), snap())).toEqual({});
  });

  test('a leaked buffer is unequal and shows up in the diff with the right sign', () => {
    const before = snap();
    const after = snap({buffers: 5});
    expect(resourcesEqual(before, after)).toBe(false);
    expect(diffResources(before, after)).toEqual({buffers: 1});
  });

  test('a freed listener shows a negative delta, and only the changed key appears', () => {
    const before = snap({listeners: 3});
    const after = snap({listeners: 2});
    expect(diffResources(before, after)).toEqual({listeners: -1});
  });
});

// ---------------------------------------------------------------------------
// Context loss. Uses a plain EventTarget in place of a canvas -- attachContextLoss
// only needs addEventListener/removeEventListener, so this proves the contract
// without any DOM.

describe('attachContextLoss', () => {
  function setup() {
    const canvas = new EventTarget();
    const probe: {status: ScientificProbe['status']; measurementValid: boolean} = {status: 'ready', measurementValid: true};
    const stopBenchmark = mock(() => {});
    const disposeGpuResources = mock(() => {});
    const onLost = mock(() => {});
    const handle = attachContextLoss(canvas, {probe, stopBenchmark, disposeGpuResources, onLost});
    return {canvas, probe, stopBenchmark, disposeGpuResources, onLost, handle};
  }

  test('prevents the browser default, stops the benchmark, disposes GPU resources, and marks the probe lost/invalid', () => {
    const {canvas, probe, stopBenchmark, disposeGpuResources, onLost} = setup();
    const event = new Event('webglcontextlost', {cancelable: true});
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(stopBenchmark).toHaveBeenCalledTimes(1);
    expect(disposeGpuResources).toHaveBeenCalledTimes(1);
    expect(probe.status).toBe('context-lost');
    expect(probe.measurementValid).toBe(false);
    expect(onLost).toHaveBeenCalledTimes(1);
  });

  test('does not reconstruct GPU state: no restore/rebuild handler is invoked or implied', () => {
    // attachContextLoss's handlers have no "restore" or "rebuild" hook at
    // all -- webglcontextrestored is not wired here. This test documents
    // that absence: dispatching restore-ish events is simply a no-op.
    const {canvas, disposeGpuResources} = setup();
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(disposeGpuResources).not.toHaveBeenCalled();
  });

  test('detach() stops future context-lost events from being handled', () => {
    const {canvas, stopBenchmark, handle} = setup();
    handle.detach();
    canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}));
    expect(stopBenchmark).not.toHaveBeenCalled();
  });
});
