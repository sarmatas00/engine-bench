import {describe, expect, test, mock} from 'bun:test';
import type {Control} from '../../src/lib/chrome';

// chrome.ts installs `window.__bench` at module scope, so it needs a `window` to exist before it
// is imported at all. Shim it and import dynamically: a static import would be hoisted above the
// assignment. Nothing here touches the DOM beyond that.
(globalThis as any).window ??= globalThis;
const {readout, formatReadout, controlHandler} = await import('../../src/lib/chrome');

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

describe('formatReadout (textContent-only safe readouts)', () => {
  test('numbers go through readout()\'s two-decimal trim', () => {
    expect(formatReadout('speed', 17.99999987228115)).toBe('speed: 18');
    expect(formatReadout('speed', 18.5)).toBe('speed: 18.5');
  });

  test('strings print verbatim -- textContent semantics, never HTML-escaped or parsed', () => {
    // If this ever routed through innerHTML the "<" would need escaping to
    // survive; asserting it comes back untouched is the contract that
    // setReadout must assign through textContent, not innerHTML.
    expect(formatReadout('marker', '<img onerror=alert(1)>')).toBe('marker: <img onerror=alert(1)>');
    expect(formatReadout('identity', 'run-local id (regenerated per session -- not a stable database key)'))
      .toBe('identity: run-local id (regenerated per session -- not a stable database key)');
    expect(formatReadout('unit', 'm/s')).toBe('unit: m/s');
  });

  test('an empty string readout is not silently dropped -- the label still shows', () => {
    expect(formatReadout('note', '')).toBe('note: ');
  });
});

describe('controlHandler (one callback per control, DOM-free)', () => {
  test('button: invokes onClick with no arguments, exactly once per call', () => {
    const onClick = mock(() => {});
    const c: Control = {kind: 'button', id: 'run', label: 'Run benchmark', onClick};
    const handler = controlHandler(c);
    handler();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith();
  });

  test('toggle: converts the raw checked value to boolean before calling onChange', () => {
    const onChange = mock((_v: boolean) => {});
    const c: Control = {kind: 'toggle', id: 't', label: 'T', value: false, onChange};
    controlHandler(c)(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('range: converts the raw string input value to a number before calling onChange', () => {
    const onChange = mock((_v: number) => {});
    const c: Control = {kind: 'range', id: 'r', label: 'R', min: 0, max: 10, step: 1, value: 0, onChange};
    controlHandler(c)('7.5');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(7.5);
  });

  test('select: converts the raw value to a string before calling onChange', () => {
    const onChange = mock((_v: string) => {});
    const c: Control = {kind: 'select', id: 's', label: 'S', options: ['a', 'b'], value: 'a', onChange};
    controlHandler(c)('b');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('each control kind reaches only its own callback -- no cross-firing', () => {
    const onClick = mock(() => {});
    const onChange = mock((_v: boolean) => {});
    const button: Control = {kind: 'button', id: 'b', label: 'B', onClick};
    const toggle: Control = {kind: 'toggle', id: 't', label: 'T', value: false, onChange};
    controlHandler(button)();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    controlHandler(toggle)(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1); // unchanged
  });
});
