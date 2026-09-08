import {describe, expect, test} from 'bun:test';

// chrome.ts installs `window.__bench` at module scope, so it needs a `window` to exist before it
// is imported at all. Shim it and import dynamically: a static import would be hoisted above the
// assignment. Nothing here touches the DOM beyond that.
(globalThis as any).window ??= globalThis;
const {readout} = await import('../../src/lib/chrome');

describe('readout (slider value printing)', () => {
  test('is an exact no-op on the synthetic scene\'s whole numbers', () => {
    // src/lib/dataset.ts syntheticScene(): colourRange [10, 35]; page 06 starts exaggeration at 1.
    expect(readout(10)).toBe('10');
    expect(readout(35)).toBe('35');
    expect(readout(1)).toBe('1');
    expect(readout(0)).toBe('0');
    expect(readout(20)).toBe('20');
    expect(readout(50)).toBe('50');
    for (const v of [0, 1, 10, 18, 20, 32, 35, 50]) expect(readout(v)).toBe(String(v));
  });

  test('prints the real dataset\'s solver values to two decimals instead of a float artefact', () => {
    // The exact values in public/data/real/dataset.json -> stage2.field.
    expect(readout(17.99999987228115)).toBe('18');
    expect(readout(18.746469572546268)).toBe('18.75');
    // The volume grid's own range, which pages 10 and 11 scale to.
    expect(readout(32.49)).toBe('32.49');
  });

  test('drops trailing zeros rather than padding to two decimals', () => {
    expect(readout(18.5)).toBe('18.5');
    expect(readout(18.1)).toBe('18.1');
    expect(readout(18.0)).toBe('18');
  });

  test('rounds, and never returns an exponent or a 17-digit tail', () => {
    expect(readout(18.006)).toBe('18.01');
    // toFixed rounds the binary double, not the decimal literal: 18.005 is stored as
    // 18.00499999... and prints "18". Recorded as measured, not asserted as "18.01".
    expect(readout(18.005)).toBe('18');
    expect(readout(0.1 + 0.2)).toBe('0.3');
    for (const v of [17.99999987228115, 0.1 + 0.2, 1 / 3, 2 / 3, 1e-9]) {
      expect(readout(v)).not.toContain('e');
      expect(readout(v).length).toBeLessThanOrEqual(6);
    }
  });

  test('takes the string an <input type=range> actually hands it', () => {
    // renderControl wires `out.textContent = readout(el.value)`, and el.value is a string.
    expect(readout('18')).toBe('18');
    expect(readout('18.75')).toBe('18.75');
    expect(readout('-3.456')).toBe('-3.46');
  });

  test('passes a non-numeric string through untouched instead of printing NaN', () => {
    expect(readout('')).toBe('0');   // Number('') === 0, which is what the input would mean
    expect(readout('n/a')).toBe('n/a');
    expect(readout(NaN)).toBe('NaN');
    expect(readout(Infinity)).toBe('Infinity');
  });
});
