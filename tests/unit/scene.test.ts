import {describe, expect, test} from 'bun:test';
import {h, T, blocks, blocksMesh, fieldSurface, fieldGrid, blockFootprintsGeoJSON} from '../../src/lib/scene';

describe('scene', () => {
  test('ridge peaks near x=0 and is >100 m above the flanks', () => {
    expect(h(0, 0)).toBeGreaterThan(120);
    expect(h(900, 0)).toBeLessThan(10);
    expect(h(0, 0) - h(900, 0)).toBeGreaterThan(100);
  });
  test('temperature is hottest at the hot spot and cools with height', () => {
    expect(T(100, -150, 0)).toBeCloseTo(35, 0);
    expect(T(-900, 900, 0)).toBeCloseTo(10, 0);
    expect(T(100, -150, 150)).toBeLessThan(T(100, -150, 0));
  });
  test('six blocks with the specified centres', () => {
    const b = blocks();
    expect(b.length).toBe(6);
    expect(b.map(x => x.cx)).toEqual([-450, -300, -150, 0, 150, 300]);
    expect(b[0].cy).toBe(-150);
    expect(b[5].cy).toBe(150);
  });
  test('blocksMesh has 8 vertices per block face set and bases at baseZ', () => {
    const m = blocksMesh(() => 7);
    expect(m.positions.length / 3).toBe(6 * 24); // 6 faces × 4 verts per block
    expect(m.indices.length).toBe(6 * 36);
    const zs = Array.from({length: m.positions.length / 3}, (_, i) => m.positions[i * 3 + 2]);
    expect(Math.min(...zs)).toBe(7);
    expect(Math.max(...zs)).toBe(37);
  });
  test('fieldSurface is a 41x41 grid with a temperature per vertex', () => {
    const s = fieldSurface();
    expect(s.positions.length / 3).toBe(41 * 41);
    expect(s.temperature!.length).toBe(41 * 41);
    expect(s.indices.length).toBe(40 * 40 * 6);
  });
  test('fieldGrid dims, spacing and range', () => {
    const g = fieldGrid();
    expect(g.dims).toEqual([64, 64, 32]);
    expect(g.data.length).toBe(64 * 64 * 32);
    expect(g.spacing[0]).toBeCloseTo(2000 / 63, 3);
    expect(g.min).toBeGreaterThanOrEqual(10);
    expect(g.max).toBeLessThanOrEqual(35);
  });
  test('footprints are lon/lat polygons with a height', () => {
    const fc = blockFootprintsGeoJSON();
    expect(fc.features.length).toBe(6);
    expect(fc.features[0].properties!.height).toBe(30);
    const ring = (fc.features[0].geometry as any).coordinates[0];
    expect(ring.length).toBe(5);
    expect(ring[0][0]).toBeCloseTo(11.97, 1);
  });
});
