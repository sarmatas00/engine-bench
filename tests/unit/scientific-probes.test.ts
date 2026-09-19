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

describe('orbitV1Pose ships the eye position with the pose', () => {
  // The review found that exporting poseToEye alone left "both paths use
  // identical cameras" enforceable only by convention. A page that takes `eye`
  // cannot pick the wrong up axis; a page that recomputes it is visibly
  // discarding a value it was handed.
  test('every frame carries an eye that matches poseToEye exactly', () => {
    for (const frame of [0, 1, 29, 30, 104, 209]) {
      const pose = orbitV1Pose(frame);
      expect(pose.eye).toEqual(poseToEye(pose));
    }
  });

  test('the eye orbits the z axis, not the y axis', () => {
    // z-up: elevation fixes the height, so z is constant across the orbit while
    // x and y sweep. Under a y-up reading these roles swap, which is exactly
    // the divergence Task 7 would otherwise blame on the renderers.
    const quarter = [0, 52, 104, 157].map((f) => orbitV1Pose(f).eye);
    const zs = quarter.map((e) => e[2]);
    for (const z of zs) expect(Math.abs(z - zs[0])).toBeLessThan(1e-9);
    const xs = quarter.map((e) => e[0]);
    const ys = quarter.map((e) => e[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1);
  });

  test('azimuth 0 points along +x from the target', () => {
    const pose = orbitV1Pose(0);
    expect(pose.azimuthDeg).toBe(0);
    expect(pose.eye[0]).toBeGreaterThan(pose.target[0]);
    expect(Math.abs(pose.eye[1] - pose.target[1])).toBeLessThan(1e-9);
  });
});

// ---------------------------------------------------------------------------
// Task 8: the pure aggregation layer in scripts/measure-scientific.ts.
//
// READ THE TWO RESOLUTIONS BEFORE ADDING AN ASSERTION HERE.
//
// (a) WARMUP EXCLUSION IS NOT TESTED AT THIS LAYER, BECAUSE IT CANNOT BE.
//     createBenchmarkDriver already drops the 30 warmup frames -- its second
//     loop starts at ORBIT_V1.warmupFrames -- so `cpuFrameTimesMs` arrives 180
//     long and an aggregator that asserted "180 came out" would be testing the
//     driver, not itself. The brief offered two honest resolutions; this file
//     takes the SECOND. What the aggregator owns is a VALIDITY GATE, and it is
//     labelled one: a CPU sample array whose length is not exactly
//     ORBIT_V1.forcedFrames REJECTS THE RUN instead of being aggregated. That
//     is a real decision with a real caller -- a stopped or context-lost run
//     really does return a short array (see the driver's own stop() tests
//     above) -- and the tests below have power over it: delete the gate, widen
//     it to `>= 1`, or let it aggregate a short array and they fail.
//     The first resolution (hand the aggregator all 210 samples plus a warmup
//     count) was rejected on measurement, not taste: nothing in this repo can
//     produce a 210-sample array. The driver never returns one and neither page
//     publishes one, so that interface would exist only for its own test.
//
// (b) DISJOINT REJECTION IS LIKEWISE THE DRIVER'S, so it is not re-tested here.
//     What the aggregator owns is the decision ABOUT a short GPU array: how
//     many samples survived, at what rejection rate the GPU p50 stops being
//     quotable, and the difference between "no timer on this browser" (null)
//     and "the timer ran and every sample was disjoint" (present, empty). That
//     needs the driver's lastGpuSampleStats(), which is why both pages now
//     publish it.
//
// Every test states what could make it fail. None of them can be satisfied by
// editing src/lib alone -- test 1 is the single deliberate exception, and it
// exists precisely to fail when src/lib changes under the script.

import {
  aggregateCpuFrames,
  aggregateGpuFrames,
  classifyFps,
  FPS_FAIL_BELOW,
  FPS_TARGET_MIN,
  GPU_MAX_REJECTION_RATE,
  judgeRun,
  percentile,
  REQUIRED_CPU_SAMPLES,
  type RunObservation,
} from '../../scripts/measure-scientific';

/** A run that passes every gate, so each test below can break exactly one thing. */
function goodRun(over: Partial<RunObservation> = {}): RunObservation {
  return {
    renderer: 'threejs',
    status: 'ready',
    measurementValid: true,
    // 180 samples, deliberately NOT all equal: an aggregator that returned
    // samples[0] for every statistic would pass on a constant array.
    cpuFrameTimesMs: Array.from({length: REQUIRED_CPU_SAMPLES}, (_, i) => 100 + i),
    gpuFrameTimesMs: Array.from({length: REQUIRED_CPU_SAMPLES}, () => 5),
    gpuSampleStats: {kept: REQUIRED_CPU_SAMPLES, rejected: 0},
    gpuSampleStatsPublished: true,
    renderSurfaceBenchmark: {phase: 'benchmark', drawingBufferWidth: 1280, drawingBufferHeight: 720},
    // ALL SIX COUNTERS, not `{}`. The empty map used to sit here and be
    // asserted as accepted, which enshrined a vacuous gate: filtering an empty
    // object for non-zero entries finds none, so a harness that read the wrong
    // key or a page that stopped publishing glObjects would have passed the
    // leak gate by having no counters to move.
    resourceGrowth: {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0, listeners: 0, observers: 0},
    ...over,
  };
}

/** goodRun's growth map with one counter overridden, so a test changing one
 *  number cannot accidentally drop the other five and pass the key check. */
function growth(over: Partial<Record<string, number>> = {}): Record<string, number> {
  return {buffers: 0, textures: 0, renderTargets: 0, renderbuffers: 0, listeners: 0, observers: 0, ...over};
}

describe('measure-scientific: the driver contract this script is pinned to', () => {
  test('REQUIRED_CPU_SAMPLES is the driver\'s own forcedFrames, not a copy that can drift', () => {
    // WHAT COULD MAKE THIS FAIL: ORBIT_V1.forcedFrames changing in src/lib
    // without the script's gate following it. That is the ONE thing this file
    // wants to hear about from src/lib, which is why the constant is written
    // out as a literal in the script and compared here rather than imported.
    expect(REQUIRED_CPU_SAMPLES).toBe(ORBIT_V1.forcedFrames);
    expect(REQUIRED_CPU_SAMPLES).toBe(180);
  });
});

describe('measure-scientific: percentile (nearest-rank, numeric, non-mutating)', () => {
  test('p50 and p95 of 1..100 are exactly 50 and 95', () => {
    // WHAT COULD MAKE THIS FAIL: an off-by-one in the nearest-rank index, or a
    // default Array.prototype.sort (lexicographic: 1, 10, 100, 11, ... would
    // put 55 at rank 50 and 91 at rank 95, not 50 and 95).
    const values = Array.from({length: 100}, (_, i) => i + 1);
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(95);
    expect(percentile(values, 100)).toBe(100);
  });

  test('order of the input does not matter, and the caller\'s array is not reordered', () => {
    // WHAT COULD MAKE THIS FAIL: sorting in place. The script writes the raw
    // cpuFrameTimesMs into the JSON record AFTER aggregating it, so an
    // in-place sort would publish a sorted "per-frame" series -- a number that
    // is right and a series that is a lie.
    const values = [30, 10, 20, 50, 40];
    expect(percentile(values, 50)).toBe(30);
    expect(values).toEqual([30, 10, 20, 50, 40]);
  });

  test('a single sample is its own every percentile', () => {
    // WHAT COULD MAKE THIS FAIL: a nearest-rank index that goes negative or
    // past the end on n === 1.
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 95)).toBe(7);
  });
});

describe('measure-scientific: classifyFps (the spec\'s two boundaries, tested ON them)', () => {
  test('the boundaries are the spec\'s 20 and 30, not a rounded pair', () => {
    // WHAT COULD MAKE THIS FAIL: someone retuning the thresholds to fit a
    // measurement instead of the spec.
    expect(FPS_FAIL_BELOW).toBe(20);
    expect(FPS_TARGET_MIN).toBe(30);
  });

  test('exactly 30.0 meets the target; exactly 20.0 is qualified, not a failure', () => {
    // WHAT COULD MAKE THIS FAIL: `> 30` instead of `>= 30`, or `<= 20` instead
    // of `< 20`. Both are one character and both move a published verdict.
    expect(classifyFps(30.0)).toBe('meets-target');
    expect(classifyFps(20.0)).toBe('qualified');
  });

  test('either side of each boundary lands in the neighbouring band', () => {
    // WHAT COULD MAKE THIS FAIL: the bands being ordered wrongly, or the
    // middle band collapsing so that anything under 30 reads as a failure.
    expect(classifyFps(19.999)).toBe('fails-interactive-mvp');
    expect(classifyFps(20.001)).toBe('qualified');
    expect(classifyFps(29.999)).toBe('qualified');
    expect(classifyFps(30.001)).toBe('meets-target');
  });
});

describe('measure-scientific: aggregateCpuFrames', () => {
  test('p50, p95, min, max and mean are each read from the right place', () => {
    // WHAT COULD MAKE THIS FAIL: any two of these wired to the same
    // expression. 1..180 makes every one of them a different number, so a
    // min/p50 or p95/max mix-up cannot hide.
    const cpu = aggregateCpuFrames(Array.from({length: 180}, (_, i) => i + 1));
    expect(cpu.n).toBe(180);
    expect(cpu.min).toBe(1);
    expect(cpu.max).toBe(180);
    expect(cpu.p50).toBe(90);
    expect(cpu.p95).toBe(171);
    expect(cpu.mean).toBeCloseTo(90.5, 9);
    // Second guard on the same mutation as the test below: 1..180 makes
    // 1000/p50, 1000/p95 and 1000/max three different numbers.
    expect(cpu.minSustainedFps).toBeCloseTo(1000 / 171, 9);
  });

  test('minSustainedFps is 1000/p95 -- the rate held for 95% of frames, not the typical frame', () => {
    // WHAT COULD MAKE THIS FAIL: minSustainedFps computed from p50, from the
    // mean, or from max.
    //
    // THIS FIXTURE WAS WRONG AND THE MUTATION SURVIVED IT. It used to be
    // [171 x 50 ms, 9 x 100 ms], whose p50 AND p95 are both 50 -- so swapping
    // p95 for p50 in the implementation changed nothing and the test that
    // exists to prove the p95 choice passed a build that had abandoned it.
    // Measured: with 1000/p50 substituted, the whole file still went 79 pass /
    // 0 fail. 170/10 puts the p95 rank (index 170 of 180) inside the tail, so
    // the three candidates are now 20 (p50), 5 (p95) and 5 (max) -- and max is
    // separated by the next test.
    const cpu = aggregateCpuFrames([...Array(170).fill(50), ...Array(10).fill(200)]);
    expect(cpu.p50).toBe(50);
    expect(cpu.p95).toBe(200);
    expect(1000 / cpu.p50).toBeCloseTo(20, 9);   // what a p50-based FPS would say
    expect(cpu.minSustainedFps).toBeCloseTo(5, 9); // what it must actually say
  });

  test('minSustainedFps is not 1000/max either -- one stalled frame does not set the verdict', () => {
    // WHAT COULD MAKE THIS FAIL: minSustainedFps computed from max. This is
    // not hypothetical on this tile: a real vtk.js run in the record has a p95
    // of 247 ms against a max of 697 ms, so the two differ by a factor of
    // nearly three on measured data. 8 samples in the tail keeps the p95 rank
    // (index 170) below them while max sits at 1000.
    const cpu = aggregateCpuFrames([...Array(172).fill(50), ...Array(8).fill(1000)]);
    expect(cpu.p95).toBe(50);
    expect(cpu.max).toBe(1000);
    expect(cpu.minSustainedFps).toBeCloseTo(20, 9);
    expect(1000 / cpu.max).toBeCloseTo(1, 9);
  });

  test('a 50 ms p95 is exactly 20.0 FPS and lands on the qualified side of the boundary', () => {
    // WHAT COULD MAKE THIS FAIL: a millisecond/second conversion error (1/50
    // rather than 1000/50), which would report 0.02 FPS and classify every run
    // as a failure. 50 ms is chosen because 1000/50 is exact in binary
    // floating point, so this sits ON the boundary rather than near it.
    const cpu = aggregateCpuFrames(Array(180).fill(50));
    expect(cpu.minSustainedFps).toBe(20);
    expect(cpu.fpsVerdict).toBe('qualified');
  });

  test('a 33 ms p95 clears 30 FPS and a 60 ms p95 fails the interactive-MVP floor', () => {
    // WHAT COULD MAKE THIS FAIL: the verdict being computed from something
    // other than minSustainedFps, or the classification being inverted.
    expect(aggregateCpuFrames(Array(180).fill(33)).fpsVerdict).toBe('meets-target');
    expect(aggregateCpuFrames(Array(180).fill(60)).fpsVerdict).toBe('fails-interactive-mvp');
  });

  test('refuses an empty sample array instead of publishing NaN', () => {
    // WHAT COULD MAKE THIS FAIL: percentile of nothing returning undefined and
    // 1000/undefined reaching the document as NaN FPS.
    expect(() => aggregateCpuFrames([])).toThrow();
  });
});

describe('measure-scientific: aggregateGpuFrames (what the aggregator genuinely owns)', () => {
  test('no GPU timer at all is null-and-unavailable, never zero', () => {
    // WHAT COULD MAKE THIS FAIL: a `?? 0` anywhere on this path. A browser
    // without EXT_disjoint_timer_query_webgl2 must produce an absent number,
    // not a 0 ms GPU frame time that would read as the fastest result in the
    // table.
    const gpu = aggregateGpuFrames(null, null, true);
    expect(gpu.available).toBe(false);
    expect(gpu.quotable).toBe(false);
    expect(gpu.p50).toBeNull();
    expect(gpu.p95).toBeNull();
    expect(gpu.kept).toBe(0);
    expect(gpu.reason).toBeTruthy();
  });

  test('A MISSING FIELD IS NOT A BROWSER VERDICT: an unpublished gpuSampleStats says so', () => {
    // WHAT COULD MAKE THIS FAIL: `published` collapsing back into
    // `stats === null`, or acquiring a default.
    //
    // MEASURED DAMAGE, which is why this test exists: with the field deleted
    // from both BUILT pages -- exactly how a page that never published it
    // looks -- a run that had just returned 180 GPU samples was ACCEPTED and
    // reported as "this browser does not expose
    // EXT_disjoint_timer_query_webgl2". A false statement about the browser,
    // emitted by the check whose entire purpose is to catch that page defect,
    // and the old version of this file enshrined it: aggregateGpuFrames(null,
    // null) meant "no timer" and a caller had no way to say "the field was
    // absent".
    const missing = aggregateGpuFrames(null, null, false);
    const noTimer = aggregateGpuFrames(null, null, true);
    expect(missing.published).toBe(false);
    expect(noTimer.published).toBe(true);
    expect(missing.reason).not.toBe(noTimer.reason);
    expect(missing.reason).toMatch(/does not publish/);
    // And it must never read as a statement about the browser's capabilities.
    expect(missing.reason).not.toMatch(/EXT_disjoint_timer_query_webgl2/);
  });

  test('a null tally beside a non-null GPU array is a contradiction, not an absence', () => {
    // WHAT COULD MAKE THIS FAIL: the kept/array agreement check staying BELOW
    // the `stats === null` early return, where it cannot run. The driver
    // publishes gpuFrameTimesMs as null in exactly the no-timer case and in no
    // other, so 180 samples beside a null tally means the two halves of the
    // page's snapshot describe different runs.
    const contradiction = aggregateGpuFrames(Array(180).fill(4), null, true);
    expect(contradiction.quotable).toBe(false);
    expect(contradiction.p50).toBeNull();
    expect(contradiction.reason).toMatch(/do not describe the same run/);
  });

  test('"the timer ran and kept nothing" is a DIFFERENT verdict from "there was no timer"', () => {
    // WHAT COULD MAKE THIS FAIL: keying the availability decision on
    // `samples.length === 0` instead of on gpuSampleStats. That is the exact
    // conflation Deviation 2 exists to remove, and before gpuSampleStats was
    // published a caller outside the page could not tell these two apart at
    // all. Both cases yield a null p50; only the reason and `available`
    // separate them.
    const noTimer = aggregateGpuFrames(null, null, true);
    const allDisjoint = aggregateGpuFrames([], {kept: 0, rejected: 180}, true);
    expect(allDisjoint.available).toBe(true);
    expect(allDisjoint.quotable).toBe(false);
    expect(allDisjoint.rejected).toBe(180);
    expect(allDisjoint.rejectionRate).toBe(1);
    expect(noTimer.available).toBe(false);
    expect(noTimer.rejectionRate).toBeNull();
    expect(allDisjoint.reason).not.toBe(noTimer.reason);
  });

  test('a clean run quotes p50 and p95 off the kept samples only', () => {
    // WHAT COULD MAKE THIS FAIL: the rejected samples being zero-filled back
    // into the series (the p50 would fall) or the percentile being taken over
    // the CPU array by mistake.
    const gpu = aggregateGpuFrames(Array.from({length: 100}, (_, i) => i + 1), {kept: 100, rejected: 0}, true);
    expect(gpu.available).toBe(true);
    expect(gpu.quotable).toBe(true);
    expect(gpu.p50).toBe(50);
    expect(gpu.p95).toBe(95);
    expect(gpu.rejectionRate).toBe(0);
  });

  test('the quotable threshold is a boundary, and it is tested ON it', () => {
    // WHAT COULD MAKE THIS FAIL: `>=` where `>` belongs, which would throw
    // away a run sitting exactly at the documented rate. 162/18 of 180 is
    // exactly 0.1, so this is the boundary itself and not a value near it.
    expect(GPU_MAX_REJECTION_RATE).toBe(0.1);
    const atThreshold = aggregateGpuFrames(Array(162).fill(4), {kept: 162, rejected: 18}, true);
    expect(atThreshold.rejectionRate).toBeCloseTo(0.1, 12);
    expect(atThreshold.quotable).toBe(true);
    const overThreshold = aggregateGpuFrames(Array(161).fill(4), {kept: 161, rejected: 19}, true);
    expect(overThreshold.rejectionRate).toBeGreaterThan(GPU_MAX_REJECTION_RATE);
    expect(overThreshold.quotable).toBe(false);
    expect(overThreshold.p50).toBeNull();
  });

  test('stats and samples that disagree are a defect, not a number to publish', () => {
    // WHAT COULD MAKE THIS FAIL: a page publishing gpuSampleStats from a
    // different snapshot than the benchmark array it publishes beside it --
    // the precise way Deviation 2 could go wrong on one page and not the
    // other. The aggregator refuses rather than quoting a p50 over samples
    // whose provenance it cannot confirm.
    const mismatched = aggregateGpuFrames(Array(100).fill(4), {kept: 120, rejected: 60}, true);
    expect(mismatched.quotable).toBe(false);
    expect(mismatched.p50).toBeNull();
    expect(mismatched.reason).toMatch(/kept/);
  });
});

describe('measure-scientific: judgeRun (the validity gate and the run-rejection rules)', () => {
  test('a clean run is accepted, with no rejections and a real CPU aggregate', () => {
    // WHAT COULD MAKE THIS FAIL: any gate firing on a good run, which would
    // make `measure:scientific` reject everything and publish nothing.
    const verdict = judgeRun(goodRun());
    expect(verdict.rejections).toEqual([]);
    expect(verdict.accepted).toBe(true);
    expect(verdict.cpu!.n).toBe(180);
    expect(verdict.cpu!.min).toBe(100);
  });

  test('THE VALIDITY GATE: a CPU array that is not exactly forcedFrames long rejects the run', () => {
    // WHAT COULD MAKE THIS FAIL: the gate being deleted, or widened to a
    // minimum. This is a gate and not "warmup exclusion" -- the driver already
    // did the exclusion. It has a real caller: a run interrupted by context
    // loss resolves with a SHORT array and measurementValid false, and a run
    // whose driver contract changed would arrive long.
    const short = judgeRun(goodRun({cpuFrameTimesMs: Array(179).fill(150)}));
    expect(short.accepted).toBe(false);
    expect(short.rejections.join(' ')).toMatch(/179/);
    expect(short.cpu).toBeNull();
    const long = judgeRun(goodRun({cpuFrameTimesMs: Array(181).fill(150)}));
    expect(long.accepted).toBe(false);
    expect(long.rejections.join(' ')).toMatch(/181/);
  });

  test('THE GATE HAS A FLOOR: 180 samples that were never timed are rejected, not published', () => {
    // WHAT COULD MAKE THIS FAIL: the gate counting samples and nothing else.
    // MEASURED, all four against the count-only gate: 180 samples of 0 ms was
    // ACCEPTED and published a p50 of 0 with an INFINITE minimum sustained FPS
    // and a "meets-target" verdict; 180 of -5 ms was accepted at -200 FPS; 179
    // good plus one NaN was accepted; and one Infinity likewise. A run that
    // never timed anything is not a fast run.
    const zeros = judgeRun(goodRun({cpuFrameTimesMs: Array(180).fill(0)}));
    expect(zeros.accepted).toBe(false);
    expect(zeros.cpu).toBeNull();
    expect(zeros.rejections.join(' ')).toMatch(/p50 is 0/);

    const negative = judgeRun(goodRun({cpuFrameTimesMs: Array(180).fill(-5)}));
    expect(negative.accepted).toBe(false);
    expect(negative.rejections.join(' ')).toMatch(/negative/);

    const oneNaN = judgeRun(goodRun({cpuFrameTimesMs: [...Array(179).fill(150), NaN]}));
    expect(oneNaN.accepted).toBe(false);
    expect(oneNaN.rejections.join(' ')).toMatch(/not finite/);

    const oneInfinity = judgeRun(goodRun({cpuFrameTimesMs: [...Array(179).fill(150), Infinity]}));
    expect(oneInfinity.accepted).toBe(false);
    expect(oneInfinity.rejections.join(' ')).toMatch(/not finite/);

    // And the floor must not reject a real run: the record's own slowest
    // measured page sits around 150 ms a frame with one 697 ms stall.
    const real = judgeRun(goodRun({cpuFrameTimesMs: [...Array(179).fill(150), 697]}));
    expect(real.accepted).toBe(true);
  });

  test('THE GROWTH GATE IS NOT VACUOUS: a record with no counters in it is rejected', () => {
    // WHAT COULD MAKE THIS FAIL: filtering an object for non-zero entries and
    // calling an empty result "nothing grew". MEASURED: `{}` was accepted, and
    // the old goodRun fixture used `{}` and asserted accepted -- so the gate
    // was tested exclusively against the one input that cannot exercise it. A
    // harness reading the wrong probe key, or a page that stopped publishing
    // glObjects, would have passed the leak gate by having no counters at all.
    const empty = judgeRun(goodRun({resourceGrowth: {}}));
    expect(empty.accepted).toBe(false);
    expect(empty.rejections.join(' ')).toMatch(/missing counters/);

    // Renderbuffers in particular: they are NOT among the five keys
    // ScientificProbe.resources declares, and they are one of the three types
    // vtk.js was measured to leak per resize. A record that quietly dropped
    // them would blind the very gate that watches for it.
    const noRenderbuffers = judgeRun(goodRun({
      resourceGrowth: {buffers: 0, textures: 0, renderTargets: 0, listeners: 0, observers: 0},
    }));
    expect(noRenderbuffers.accepted).toBe(false);
    expect(noRenderbuffers.rejections.join(' ')).toMatch(/renderbuffers/);
  });

  test('a short run is never aggregated on the way to being rejected', () => {
    // WHAT COULD MAKE THIS FAIL: computing the statistics first and gating
    // afterwards. A p50 over 12 frames that reaches the JSON is a number the
    // document could quote even though the run was rejected.
    expect(judgeRun(goodRun({cpuFrameTimesMs: [150, 151, 152]})).cpu).toBeNull();
  });

  test('status and measurementValid are each independently fatal', () => {
    // WHAT COULD MAKE THIS FAIL: only one of the two being checked. They are
    // NOT redundant: attachContextLoss sets both, but a page that failed to
    // reach ready never sets measurementValid false at all.
    expect(judgeRun(goodRun({status: 'context-lost'})).accepted).toBe(false);
    expect(judgeRun(goodRun({status: 'failed'})).accepted).toBe(false);
    expect(judgeRun(goodRun({measurementValid: false})).accepted).toBe(false);
  });

  test('THE SURFACE IS ASSERTED, NOT TRUSTED: anything but the pinned 1280x720 rejects', () => {
    // WHAT COULD MAKE THIS FAIL: the surface being footnoted instead of
    // gated. 1280x800 is the realistic wrong value -- it is the harness's own
    // viewport, which is what a page that never pinned the benchmark surface
    // would report -- so this is the failure that would actually happen.
    const wrongHeight = judgeRun(goodRun({
      renderSurfaceBenchmark: {phase: 'benchmark', drawingBufferWidth: 1280, drawingBufferHeight: 800},
    }));
    expect(wrongHeight.accepted).toBe(false);
    expect(wrongHeight.rejections.join(' ')).toMatch(/1280x800/);
    // BOTH DIMENSIONS, and the width case was missing. Every fixture here used
    // to carry a correct 1280 width, so deleting the width comparison from
    // judgeRun left the file at 79 pass / 0 fail -- a surface check that could
    // only see half the surface. 640x720 is a plausible wrong value: the right
    // height with a canvas at half width.
    const wrongWidth = judgeRun(goodRun({
      renderSurfaceBenchmark: {phase: 'benchmark', drawingBufferWidth: 640, drawingBufferHeight: 720},
    }));
    expect(wrongWidth.accepted).toBe(false);
    expect(wrongWidth.rejections.join(' ')).toMatch(/640x720/);
  });

  test('a missing record, or one from the interactive phase, is not a surface proof', () => {
    // WHAT COULD MAKE THIS FAIL: reading the rolling `renderSurface` key,
    // which runBenchmark's finally block overwrites with the interactive
    // record moments after the run -- so a page could pass this check while
    // its 1280x720 evidence had already been clobbered.
    expect(judgeRun(goodRun({renderSurfaceBenchmark: null})).accepted).toBe(false);
    expect(judgeRun(goodRun({
      renderSurfaceBenchmark: {phase: 'interactive', drawingBufferWidth: 1280, drawingBufferHeight: 720},
    })).accepted).toBe(false);
  });

  test('resource growth over the no-resize stability cycles rejects the run', () => {
    // WHAT COULD MAKE THIS FAIL: the growth check being dropped. Note the
    // input is growth across CONTROL cycles with no resize in them -- vtk.js's
    // measured per-resize leak is a RESULT and is recorded separately, so
    // feeding resize growth in here would reject every vtk.js run and turn a
    // finding into an outage.
    const grew = judgeRun(goodRun({resourceGrowth: growth({textures: 1})}));
    expect(grew.accepted).toBe(false);
    expect(grew.rejections.join(' ')).toMatch(/textures/);
    expect(judgeRun(goodRun({resourceGrowth: growth({textures: 0})})).accepted).toBe(true);
  });

  test('a GPU rejection rate past the threshold rejects the run; no timer at all does not', () => {
    // WHAT COULD MAKE THIS FAIL: treating an absent timer as a 100% rejection
    // rate, which would reject every run on a browser that simply does not
    // expose EXT_disjoint_timer_query_webgl2 and leave the script with nothing
    // to publish.
    const noisy = judgeRun(goodRun({gpuFrameTimesMs: Array(100).fill(4), gpuSampleStats: {kept: 100, rejected: 80}}));
    expect(noisy.accepted).toBe(false);
    expect(noisy.rejections.join(' ')).toMatch(/rejection rate/i);
    const noTimer = judgeRun(goodRun({gpuFrameTimesMs: null, gpuSampleStats: null}));
    expect(noTimer.accepted).toBe(true);
    expect(noTimer.gpu.available).toBe(false);
  });

  test('a page that does not publish gpuSampleStats REJECTS the run, rather than being excused', () => {
    // WHAT COULD MAKE THIS FAIL: treating an unpublished field like an absent
    // timer. Deviation 2 put this field on both pages in one commit precisely
    // so that a comparison could never read one page's stats against the
    // other's silence; if the field goes missing the run is unusable, and
    // saying so loudly is the only thing that keeps the other half honest.
    const unpublished = judgeRun(goodRun({gpuSampleStatsPublished: false, gpuSampleStats: null}));
    expect(unpublished.accepted).toBe(false);
    expect(unpublished.rejections.join(' ')).toMatch(/does not publish gpuSampleStats/);
    expect(unpublished.cpu).toBeNull();
  });

  test('every reason a run was rejected is reported, not just the first one found', () => {
    // WHAT COULD MAKE THIS FAIL: an early return. A run that is short AND at
    // the wrong surface would otherwise be reported as one problem, and the
    // second would be rediscovered only after the first was fixed.
    const verdict = judgeRun(goodRun({
      status: 'failed',
      measurementValid: false,
      cpuFrameTimesMs: Array(12).fill(150),
      renderSurfaceBenchmark: {phase: 'benchmark', drawingBufferWidth: 900, drawingBufferHeight: 198},
      resourceGrowth: growth({textures: 3}),
    }));
    expect(verdict.accepted).toBe(false);
    expect(verdict.rejections.length).toBeGreaterThanOrEqual(5);
  });
});
