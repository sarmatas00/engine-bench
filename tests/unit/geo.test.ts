import {describe, expect, test} from 'bun:test';
import {localToLngLat, lngLatToLocal, tileToLngLat} from '../../src/lib/geo';
import {LON0, LAT0} from '../../src/lib/scene';

describe('geo', () => {
  test('round trip within a millimetre', () => {
    const [lng, lat] = localToLngLat(812.5, -333.25);
    const [x, y] = lngLatToLocal(lng, lat);
    expect(x).toBeCloseTo(812.5, 3);
    expect(y).toBeCloseTo(-333.25, 3);
  });
  test('origin maps to the anchor', () => {
    expect(localToLngLat(0, 0)).toEqual([LON0, LAT0]);
  });
  test('1000 m east is about 0.0168 degrees at 57.7N', () => {
    const [lng] = localToLngLat(1000, 0);
    expect(lng - LON0).toBeCloseTo(0.01681, 4);
  });
  test('tile pixel to lon/lat: top-left of tile 0/0/0 is -180, 85.05', () => {
    const [lng, lat] = tileToLngLat(0, 0, 0, 0, 0, 256);
    expect(lng).toBeCloseTo(-180, 6);
    expect(lat).toBeCloseTo(85.0511, 3);
  });
});
