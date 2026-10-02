import {describe, expect, test} from 'bun:test';
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {PLAYBACK_FPS, benchmarkFrame, checkSeriesJson, runPlayback, seriesBox, seriesFromQuery, summarisePlayback, type FieldSeriesJson} from '@lib/flagship-fields';

const dir = resolve(import.meta.dirname, '../../public/data/fields');
const shipped = JSON.parse(readFileSync(resolve(dir, 'pressure.json'), 'utf8')) as FieldSeriesJson;
const frameBytes = shipped.dims[0] * shipped.dims[1] * shipped.dims[2] * 4;

describe('flagship fields (animation axis)', () => {
  test('stream and preloaded step one data frame per drawn frame and loop; static stays on 0', () => {
    expect([0, 1, 24, 25, 26].map(i => benchmarkFrame(i, 25, 'stream'))).toEqual([0, 1, 24, 0, 1]);
    expect([0, 1, 24, 25].map(i => benchmarkFrame(i, 25, 'preloaded'))).toEqual([0, 1, 24, 0]);
    expect([0, 7, 200].map(i => benchmarkFrame(i, 25, 'static'))).toEqual([0, 0, 0]);
  });

  test('?fields= picks only a known series, never a path', () => {
    expect(seriesFromQuery('')).toBe('shipped');
    expect(seriesFromQuery('?fields=large')).toBe('large');
    expect(seriesFromQuery('?fields=xl')).toBe('xl');
    expect(seriesFromQuery('?fields=../../secret')).toBe('shipped');
  });

  test('the shipped series passed its order and seam checks', () => {
    expect(shipped.order).toBe('x-fastest');
    expect(shipped.orderCheck.maxErrorOfPeak).toBeLessThan(1e-5);
    expect(shipped.orderCheck.maxErrorOfPeakIfXYSwapped).toBeGreaterThan(0.05);
    // The last source snapshot equals the first, so the shipped frames loop without a seam.
    expect(shipped.seamCheck.maxDifferenceOfPeakFromSnapshot0).toBeLessThan(1e-5);
    expect(shipped.seamCheck.snapshot % shipped.frameStride).toBe(0);
    expect(shipped.frames.at(-1)!.snapshot + shipped.frameStride).toBe(shipped.seamCheck.snapshot);
  });

  test('every shipped frame is one float32 per node', () => {
    for (const {file} of shipped.frames) expect(statSync(resolve(dir, file)).size).toBe(frameBytes);
  });

  test('a wrong byte length, order or association is refused before any view exists', () => {
    const lengths = shipped.frames.map(() => frameBytes);
    expect(() => checkSeriesJson(shipped, lengths)).not.toThrow();
    expect(() => checkSeriesJson(shipped, [...lengths.slice(1), frameBytes - 4])).toThrow(/needs/);
    expect(() => checkSeriesJson({...shipped, order: 'z-fastest' as 'x-fastest'}, lengths)).toThrow(/order/);
    expect(() => checkSeriesJson({...shipped, association: 'cell' as 'vertex'}, lengths)).toThrow(/association/);
  });

  test('the node box spans the flagship domain, values on the vertices', () => {
    const {min, max} = seriesBox(shipped);
    // 2 km square: the generator takes flagship's own bounds.
    expect(max[0] - min[0]).toBeCloseTo(2000, 3);
    expect(max[1] - min[1]).toBeCloseTo(2000, 3);
    expect(min).toEqual(shipped.origin);
  });

  test('playback swaps on the data clock and records one gap per displayed frame after the first', async () => {
    // A 60 Hz display with one 100 ms hitch after the 30th refresh.
    const times: number[] = [];
    for (let k = 0, t = 0; t <= 2000; k++) { times.push(t); t += k === 30 ? 100 : 1000 / 60; }
    let i = 0;
    const raf = (cb: (t: number) => void) => { const t = times[i++]; if (t !== undefined) queueMicrotask(() => cb(t)); };
    const shown: number[] = [];
    let draws = 0;
    const r = await runPlayback({seconds: 1, orbit: true, frameCount: 25, raf,
      showFrame: k => shown.push(k), draw: () => { draws++; }});
    expect(r.displayedFrames).toBe(draws);
    expect(r.gapsMs.length).toBe(draws - 1);
    // One swap per data frame that came due, in order, never two for the same frame.
    expect(shown).toEqual([...new Set(shown)]);
    expect(shown[0]).toBe(0);
    expect(shown.at(-1)!).toBeLessThan(PLAYBACK_FPS);
    const s = summarisePlayback(r.gapsMs, 1000 / 60);
    expect(s.missed).toBe(1);
    expect(s.worst).toBeCloseTo(100, 5);
  });
});
