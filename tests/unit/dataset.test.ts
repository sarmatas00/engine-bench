import {describe, expect, test} from 'bun:test';
import {decodeTerrainRgb, sampleBilinear, encodeTerrainRgbPixel} from '../../src/lib/dataset';

/** 4x4 Terrain-RGB fixture: height = 10 * column, rows identical, row 0 = north. */
function fixture(): {data: Uint8ClampedArray; width: number; height: number} {
  const width = 4, height = 4;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b] = encodeTerrainRgbPixel(10 * x);
    const o = (y * width + x) * 4;
    data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
  }
  return {data, width, height};
}

describe('dataset terrain decoding', () => {
  test('decodes the fixture to the heights it was built from', () => {
    const {data, width, height} = fixture();
    const field = decodeTerrainRgb(data, width, height);
    expect(field.length).toBe(16);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      expect(field[y * 4 + x]).toBeCloseTo(10 * x, 4);
    }
  });

  test('encode/decode agree with the Python side at zero', () => {
    expect(encodeTerrainRgbPixel(0)).toEqual([1, 134, 160]); // (0 + 10000) / 0.1 = 100000
  });

  test('bilinear sampling is exact on a linear ramp and clamps outside', () => {
    const {data, width, height} = fixture();
    const field = decodeTerrainRgb(data, width, height);
    const extent = 150; // 4 columns across 300 m, sample centres 100 m apart
    expect(sampleBilinear(field, width, height, extent, -150, 0)).toBeCloseTo(0, 4);
    expect(sampleBilinear(field, width, height, extent, 150, 0)).toBeCloseTo(30, 4);
    expect(sampleBilinear(field, width, height, extent, 0, 0)).toBeCloseTo(15, 4);
    expect(sampleBilinear(field, width, height, extent, -1e6, 0)).toBeCloseTo(0, 4);
    expect(sampleBilinear(field, width, height, extent, 1e6, 1e6)).toBeCloseTo(30, 4);
  });

  test('loadScene resolves the synthetic dataset and sets the geo anchor', async () => {
    const {loadScene, currentDataset, dataUrl} = await import('../../src/lib/dataset');
    const {anchor} = await import('../../src/lib/geo');
    expect(currentDataset()).toBe('synthetic');          // no `location` under bun
    expect(dataUrl('blocks.glb')).toBe('/data/synthetic/blocks.glb');
    expect(dataUrl('blocks.glb', 'real')).toBe('/data/real/blocks.glb');
    const scene = await loadScene();
    expect(scene.dataset).toBe('synthetic');
    expect(scene.extent).toBe(1000);
    expect(scene.hasField).toBe(true);
    expect(scene.files.field).toBe('/data/synthetic/field.glb');
    expect(scene.elevation(0, 0)).toBeGreaterThan(scene.elevation(900, 0));
    expect(anchor()).toEqual(scene.anchor);
    // The real backend needs fetch + createImageBitmap, so it is covered by the
    // Playwright matrix in tests/smoke.spec.ts, not here.
  });

  test('row 0 is north: +y samples the first row', () => {
    const width = 2, height = 2;
    const data = new Uint8ClampedArray(width * height * 4);
    const heights = [[100, 100], [0, 0]]; // north row is 100
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const [r, g, b] = encodeTerrainRgbPixel(heights[y][x]);
      const o = (y * 2 + x) * 4;
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
    const field = decodeTerrainRgb(data, width, height);
    expect(sampleBilinear(field, width, height, 100, 0, 100)).toBeCloseTo(100, 3);
    expect(sampleBilinear(field, width, height, 100, 0, -100)).toBeCloseTo(0, 3);
  });
});
