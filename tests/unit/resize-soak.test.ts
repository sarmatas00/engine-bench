import {describe, expect, test} from 'bun:test';
import {dragWidths, leakedBytes} from '../../scripts/resize-soak';

describe('resize soak', () => {
  test('a drag sweeps 600..1280 px and back, and every step is a real resize', () => {
    const w = dragWidths(200);
    expect(w.length).toBe(200);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(600);
    expect(Math.max(...w)).toBeLessThanOrEqual(1280);
    // Both turning points are reached, so the soak shrinks as well as grows.
    expect(w).toContain(1280);
    expect(w.slice(80)).toContain(600);
    // FAILS IF: two consecutive widths are equal, which would be a step with no
    // resize and would understate a per-resize leak.
    for (let k = 1; k < w.length; k++) expect(w[k]).not.toBe(w[k - 1]);
  });

  test('leaked bytes: RGBA8 colour plus 16-bit depth per drawing-buffer pixel', () => {
    expect(leakedBytes(1, 1280 * 720)).toBe(1280 * 720 * 6);
    expect(leakedBytes(0, 1e6)).toBe(0);
  });
});
