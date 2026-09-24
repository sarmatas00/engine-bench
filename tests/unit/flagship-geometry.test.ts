import {describe, expect, test} from 'bun:test';
import {
  ORBIT_FLAGSHIP_V1, flagshipOrbit, flagshipPose, objectForTriangle,
  type FlagshipDataset,
} from '@lib/flagship-geometry';
import {
  ORBIT_V1, ORBIT_V1_PATH, createBenchmarkDriver, orbitV1Pose,
} from '@lib/scientific-probes';

const dataset = {
  extent: 999.7777500000084,
  z0: -12.65049923706055,
  relief: {zmin: -12.65049923706055, zmax: 94.92550076293946, relief: 107.576},
} as unknown as FlagshipDataset;

describe('orbit-flagship-v1', () => {
  test('derives radius and target from the dataset, not from the tile literals', () => {
    const orbit = flagshipOrbit(dataset);
    expect(orbit.radius).toBeCloseTo(1999.5555, 3);
    expect(orbit.target[2]).toBeCloseTo(53.788, 3);
    // The whole point: reusing orbit-v1's literals would put the camera inside
    // the city and still return 180 plausible frame times.
    expect(orbit.radius).toBeGreaterThan(ORBIT_V1.radius);
    expect(orbit.derivedFrom.extent).toBe(dataset.extent);
  });

  test('applies orbit-v1 own ratios', () => {
    expect(ORBIT_FLAGSHIP_V1.radiusPerExtent).toBe(ORBIT_V1.radius / 250);
    expect(ORBIT_FLAGSHIP_V1.warmupFrames).toBe(ORBIT_V1.warmupFrames);
    expect(ORBIT_FLAGSHIP_V1.forcedFrames).toBe(ORBIT_V1.forcedFrames);
  });

  test('sweeps a full turn over warmup+measured, like orbit-v1', () => {
    const orbit = flagshipOrbit(dataset);
    const total = ORBIT_FLAGSHIP_V1.warmupFrames + ORBIT_FLAGSHIP_V1.forcedFrames;
    expect(flagshipPose(0, orbit).azimuthDeg).toBe(0);
    expect(flagshipPose(total, orbit).azimuthDeg).toBe(360);
    // eye ships with the pose so a page cannot redo the trig wrongly
    expect(flagshipPose(7, orbit).eye).toHaveLength(3);
  });
});

describe('createBenchmarkDriver honours a custom path', () => {
  const path = {
    cameraPath: 'orbit-flagship-v1' as const,
    warmupFrames: 2,
    forcedFrames: 3 as const,
    pose: (i: number) => flagshipPose(i, flagshipOrbit(dataset)),
  };

  test('drops warmup frames and labels the result with the custom path', async () => {
    const seen: number[] = [];
    let clock = 0;
    const driver = createBenchmarkDriver({
      renderFrame: pose => { seen.push(pose.azimuthDeg); },
      now: () => (clock += 1),
      path,
    });
    const result = await driver.runBenchmark();
    expect(seen).toHaveLength(5);                    // 2 warmup + 3 measured
    expect(result.cpuFrameTimesMs).toHaveLength(3);  // warmup excluded
    expect(result.cameraPath).toBe('orbit-flagship-v1');
    expect(result.forcedFrames).toBe(3);
  });

  test('omitting path still runs orbit-v1 unchanged', async () => {
    const seen: number[] = [];
    let clock = 0;
    const driver = createBenchmarkDriver({
      renderFrame: pose => { seen.push(pose.azimuthDeg); },
      now: () => (clock += 1),
    });
    const result = await driver.runBenchmark();
    expect(seen).toHaveLength(ORBIT_V1.warmupFrames + ORBIT_V1.forcedFrames);
    expect(result.cameraPath).toBe('orbit-v1');
    expect(result.forcedFrames).toBe(ORBIT_V1.forcedFrames);
    // and it drove the same poses orbitV1Pose produces
    expect(seen[0]).toBe(orbitV1Pose(0).azimuthDeg);
    expect(ORBIT_V1_PATH.pose).toBe(orbitV1Pose);
  });
});

describe('objectForTriangle', () => {
  const bundle = {
    mesh: {cellObjectIndex: new Uint32Array([0, 0, 2, 1])} as any,
    json: {objectTable: ['part-a', 'part-b', 'part-c']} as any,
  };
  test('maps a triangle to its building part', () => {
    expect(objectForTriangle(bundle, 2)).toEqual({objectIndex: 2, dtccId: 'part-c', triangle: 2});
  });
  test('refuses a triangle outside the mesh', () => {
    expect(() => objectForTriangle(bundle, 4)).toThrow(/outside 0\.\.3/);
  });
  test('refuses an object index outside the table', () => {
    const broken = {mesh: {cellObjectIndex: new Uint32Array([9])} as any, json: {objectTable: ['only']} as any};
    expect(() => objectForTriangle(broken, 0)).toThrow(/outside objectTable/);
  });
});
