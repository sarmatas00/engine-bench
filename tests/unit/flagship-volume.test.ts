import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  VOLUME_MAX_SAMPLES, VOLUME_STEP_M, cellIndex, checkVolumeJson, opacityNodes, volumeBox,
  type FlagshipVolumeJson,
} from '@lib/flagship-volume';

const shipped = JSON.parse(readFileSync(
  resolve(import.meta.dirname, '../../public/data/flagship/volume/speed.grid.json'), 'utf8',
)) as FlagshipVolumeJson;

describe('flagship volume', () => {
  test('opacity nodes are pages 13/14 own shape, scaled by the control', () => {
    expect(opacityNodes(0, 10, 0.3)).toEqual([[0, 0], [5, 0.05 * 0.3], [10, 0.6 * 0.3]]);
  });

  test('cells are x-fastest, then y, then z', () => {
    const dims = [250, 250, 139] as const;
    expect(cellIndex(dims, 1, 0, 0)).toBe(1);
    expect(cellIndex(dims, 0, 1, 0)).toBe(250);
    expect(cellIndex(dims, 0, 0, 1)).toBe(250 * 250);
    expect(cellIndex(dims, 249, 249, 138)).toBe(250 * 250 * 139 - 1);
  });

  test('the step cap covers a grazing ray across the shipped box', () => {
    const {min, max} = volumeBox(shipped);
    const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    expect(Math.ceil(diagonal / VOLUME_STEP_M)).toBeLessThanOrEqual(VOLUME_MAX_SAMPLES);
    // ...and vtk.js's default of 1,000 would not, which is why both pages set it.
    expect(Math.ceil(diagonal / VOLUME_STEP_M)).toBeGreaterThan(1000);
  });

  test('the shipped grid passed its order check against the city', () => {
    expect(shipped.order).toBe('x-fastest');
    expect(shipped.orderCheck.bottomLayerSolid).toBeGreaterThan(0.95);
    expect(shipped.orderCheck.topLayerSolid).toBe(0);
    expect(shipped.orderCheck.buildingProbesSolid - shipped.orderCheck.buildingProbesSolidIfXYSwapped)
      .toBeGreaterThan(0.3);
  });

  test('a byte length that does not match the dims is refused before any view exists', () => {
    const bytes = shipped.dims[0] * shipped.dims[1] * shipped.dims[2] * 4;
    expect(() => checkVolumeJson(shipped, bytes)).not.toThrow();
    expect(() => checkVolumeJson(shipped, bytes - 4)).toThrow(/needs/);
    expect(() => checkVolumeJson({...shipped, order: 'z-fastest' as 'x-fastest'}, bytes)).toThrow(/order/);
  });
});
