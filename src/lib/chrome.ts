import './chrome.css';
import {assetUrl} from './dataset';
import type {ScientificProbe} from './scientific-probes';

export type Control =
  | {kind: 'toggle'; id: string; label: string; value: boolean; onChange: (v: boolean) => void}
  | {kind: 'range'; id: string; label: string; min: number; max: number; step: number; value: number; disabled?: boolean; onChange: (v: number) => void}
  | {kind: 'select'; id: string; label: string; options: string[]; value: string; onChange: (v: string) => void}
  | {kind: 'button'; id: string; label: string; disabled?: boolean; onClick: () => void};

export type ChromeOptions = {
  num: string; title: string; expect: string; claim: string;
  /** What this page settles for the meeting: the decision it informs, or the knowledge it buys. */
  decision?: string;
  /** Only where the render disagrees with the briefing. The correction owed, with its numbers. */
  correction?: string;
  /** Everything else NOTES.md records about this page: measurements, traps, defects we found and
   *  fixed. Collapsed by default — the render is the point, but nothing is left only in a file. */
  findings?: string[];
  dataset?: {text: string; otherLabel: string; otherHref: string}; controls?: Control[]};

declare global { interface Window { __bench: {ready: boolean; probe: Record<string, unknown>} } }
window.__bench = {ready: false, probe: {}};

export function mountChrome(opts: ChromeOptions) {
  document.title = `${opts.num} · ${opts.title} · engine-bench`;
  const header = document.createElement('header');
  header.className = 'bench';
  header.innerHTML = `
    <h1><a href="${assetUrl('00-index/')}">engine-bench</a> · ${opts.num} · ${opts.title}</h1>
    <div class="expect">What you should see: ${opts.expect}</div>
    <div class="claim">Briefing: “${opts.claim}”</div>
    ${opts.decision ? `<div class="decision"><b>What this decides:</b> ${opts.decision}</div>` : ''}
    ${opts.correction ? `<div class="correction"><b>Correction owed to the briefing:</b> ${opts.correction}</div>` : ''}
    ${opts.findings?.length ? `<details class="findings"><summary>Findings recorded for this page (${opts.findings.length}) — also in NOTES.md</summary><ul>${opts.findings.map(f => `<li>${f}</li>`).join('')}</ul></details>` : ''}
    <div class="controls"></div>`;
  if (opts.dataset) {
    // Built as nodes, not markup: opts.dataset.text embeds the tile name from dataset.json,
    // and a data file must never be able to inject elements into the page chrome.
    const line = document.createElement('div');
    line.className = 'dataset';
    line.append(opts.dataset.text + ' · ');
    const link = document.createElement('a');
    link.href = opts.dataset.otherHref;
    link.textContent = `switch to ${opts.dataset.otherLabel}`;
    line.append(link);
    header.querySelector('.controls')!.before(line);
  }
  const controls = header.querySelector('.controls')!;
  for (const c of opts.controls ?? []) controls.appendChild(renderControl(c));

  const host = document.createElement('div');
  host.id = 'host';
  const probeEl = document.createElement('pre');
  probeEl.className = 'probe';
  const readoutsEl = document.createElement('div');
  readoutsEl.className = 'readouts';
  host.append(readoutsEl, probeEl);
  document.body.replaceChildren(header, host);

  const readoutRows = new Map<string, HTMLElement>();

  return {
    canvasHost: host,
    probe: (text: string) => { probeEl.textContent += text + '\n'; },
    setProbe: (key: string, value: unknown) => { window.__bench.probe[key] = value; },
    setScientificProbe,
    /**
     * A named, updatable readout row (identity, sampled value, ...) that
     * later calls overwrite in place rather than appending -- unlike
     * `probe`, which is an append-only log. Always assigned through
     * `textContent`, never `innerHTML`: a value sourced from the artifact
     * (a dtccId, a traceability note) must never be interpreted as markup.
     * See formatReadout below, and tests/unit/chrome.test.ts.
     */
    setReadout: (label: string, value: number | string) => {
      let row = readoutRows.get(label);
      if (!row) {
        row = document.createElement('div');
        row.dataset.label = label;
        readoutsEl.appendChild(row);
        readoutRows.set(label, row);
      }
      row.textContent = formatReadout(label, value);
    },
    /**
     * Renders a visible failure panel over the canvas host, with a working
     * reload control, and marks the page ready (so a smoke test polling
     * `window.__bench.ready` is never left hanging on a page that has
     * already failed). This is what a page's `attachContextLoss` `onLost`
     * handler (src/lib/scientific-probes.ts) should call -- one shared
     * implementation instead of vtk.js's and Three.js's pages each building
     * their own. `message` is assigned through `textContent`, same
     * textContent-only rule as `setReadout`.
     */
    fail: (message: string) => {
      // Idempotent: context loss can fire more than once, and stacking
      // overlays would bury the reload button under its own duplicates.
      host.querySelector(':scope > .failure')?.remove();
      const el = document.createElement('div');
      el.className = 'failure';
      const p = document.createElement('p');
      p.textContent = message;
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.textContent = 'Reload';
      reload.onclick = () => location.reload();
      el.append(p, reload);
      host.appendChild(el);
      window.__bench.ready = true;
    },
    ready: () => { window.__bench.ready = true; }
  };
}

/**
 * The one typed publish seam for the scientific probe both pages assemble
 * (src/lib/scientific-probes.ts's ScientificProbe): writes it to
 * `window.__bench.probe.scientific`. A page that instead called the generic
 * `setProbe('scientific', myProbe)` would get no type checking at all on
 * `myProbe`'s shape, and Task 7's parity suite would then compare two
 * independently, un-checked-shaped objects. Exported as a standalone
 * function (not only reachable through `mountChrome`'s returned `ui`, which
 * needs a DOM to construct) so tests/unit/chrome.test.ts can verify it
 * without one.
 */
export function setScientificProbe(p: ScientificProbe): void {
  window.__bench.probe.scientific = p;
}

/**
 * Pure formatter behind `setReadout`. Numbers go through `readout()`'s
 * two-decimal trim; strings (a dtccId, a traceability note) print verbatim --
 * never HTML-escaped, never parsed -- because `setReadout` always assigns the
 * result through `textContent`. Exported so tests/unit/chrome.test.ts can
 * prove a value carrying "<" or "&" reaches the label unchanged instead of
 * turning into markup or an entity, without needing a DOM to do it.
 */
export function formatReadout(label: string, value: number | string): string {
  const shown = typeof value === 'number' ? readout(value) : value;
  return `${label}: ${shown}`;
}

/**
 * The zero/one-argument function a Control's native DOM event wires straight
 * to -- button click, toggle/select change, range input -- with the raw DOM
 * value already converted to the type the control's own callback expects.
 * Pure and DOM-free so tests/unit/chrome.test.ts can prove each kind invokes
 * only its own callback, exactly once, with the right argument, without
 * constructing a real element; renderControl below is the only caller.
 */
export function controlHandler(c: Control): (raw?: unknown) => void {
  if (c.kind === 'button') return () => c.onClick();
  if (c.kind === 'toggle') return (raw) => c.onChange(Boolean(raw));
  if (c.kind === 'range') return (raw) => c.onChange(Number(raw));
  return (raw) => c.onChange(String(raw));
}

/**
 * Slider readout. The synthetic scene's values are whole numbers and print unchanged; the real
 * dataset's colour range comes from a solver, so `String(value)` printed the 2nd percentile as
 * "17.99999987228115". Two decimals, trailing zeros dropped — the same string as before wherever
 * the value was already round.
 *
 * Exported for tests/unit/chrome.test.ts; nothing else imports it.
 */
export function readout(value: number | string): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : String(value);
}

function renderControl(c: Control): HTMLElement {
  if (c.kind === 'button') {
    // No wrapping <label>: a button's own text is its accessible name, and
    // <label for> only ever associates with a form control.
    const el = document.createElement('button'); el.type = 'button'; el.id = c.id;
    el.textContent = c.label; el.disabled = !!c.disabled;
    el.onclick = () => controlHandler(c)();
    return el;
  }
  const label = document.createElement('label');
  label.htmlFor = c.id;
  label.textContent = c.label + ' ';
  let input: HTMLElement;
  if (c.kind === 'toggle') {
    const el = document.createElement('input'); el.type = 'checkbox'; el.id = c.id; el.checked = c.value;
    el.onchange = () => controlHandler(c)(el.checked); input = el;
  } else if (c.kind === 'range') {
    const el = document.createElement('input'); el.type = 'range'; el.id = c.id;
    el.min = String(c.min); el.max = String(c.max); el.step = String(c.step); el.value = String(c.value);
    el.disabled = !!c.disabled;
    const out = document.createElement('output'); out.textContent = readout(c.value);
    el.oninput = () => { out.textContent = readout(el.value); controlHandler(c)(el.value); };
    label.appendChild(el); input = out;
  } else {
    const el = document.createElement('select'); el.id = c.id;
    for (const o of c.options) { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; opt.selected = o === c.value; el.appendChild(opt); }
    el.onchange = () => controlHandler(c)(el.value); input = el;
  }
  label.appendChild(input);
  return label;
}

/** Returns false (and marks the page ready with probe.webgl=false) when WebGL2 is unavailable. */
export function requireWebGL2(): boolean {
  const ok = !!document.createElement('canvas').getContext('webgl2');
  window.__bench.probe.webgl = ok;
  if (!ok) {
    document.body.insertAdjacentHTML('beforeend', '<p style="padding:1em">This page needs WebGL2.</p>');
    window.__bench.ready = true;
  }
  return ok;
}

type Ui = ReturnType<typeof mountChrome>;

/**
 * Called by the four pages that need a temperature field when the active
 * dataset has none. Says so on the page, records it for the smoke test and
 * marks the page ready. Never substitutes another dataset's values.
 */
export function noFieldForThisDataset(ui: Ui, datasetName: string): false {
  ui.probe(`no field for this dataset (${datasetName}) — stage 2 has not run, so there is nothing to draw here.`);
  ui.probe('run: scripts/real/stage2_sim.sh && .venv/bin/python scripts/real/sample_field.py && bun run generate:real');
  ui.setProbe('field', false);
  ui.ready();
  return false;
}
