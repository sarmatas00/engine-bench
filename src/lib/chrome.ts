import './chrome.css';
import {assetUrl} from './dataset';

export type Control =
  | {kind: 'toggle'; id: string; label: string; value: boolean; onChange: (v: boolean) => void}
  | {kind: 'range'; id: string; label: string; min: number; max: number; step: number; value: number; disabled?: boolean; onChange: (v: number) => void}
  | {kind: 'select'; id: string; label: string; options: string[]; value: string; onChange: (v: string) => void};

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
  host.appendChild(probeEl);
  document.body.replaceChildren(header, host);

  return {
    canvasHost: host,
    probe: (text: string) => { probeEl.textContent += text + '\n'; },
    setProbe: (key: string, value: unknown) => { window.__bench.probe[key] = value; },
    ready: () => { window.__bench.ready = true; }
  };
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
  const label = document.createElement('label');
  label.htmlFor = c.id;
  label.textContent = c.label + ' ';
  let input: HTMLElement;
  if (c.kind === 'toggle') {
    const el = document.createElement('input'); el.type = 'checkbox'; el.id = c.id; el.checked = c.value;
    el.onchange = () => c.onChange(el.checked); input = el;
  } else if (c.kind === 'range') {
    const el = document.createElement('input'); el.type = 'range'; el.id = c.id;
    el.min = String(c.min); el.max = String(c.max); el.step = String(c.step); el.value = String(c.value);
    el.disabled = !!c.disabled;
    const out = document.createElement('output'); out.textContent = readout(c.value);
    el.oninput = () => { out.textContent = readout(el.value); c.onChange(Number(el.value)); };
    label.appendChild(el); input = out;
  } else {
    const el = document.createElement('select'); el.id = c.id;
    for (const o of c.options) { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; opt.selected = o === c.value; el.appendChild(opt); }
    el.onchange = () => c.onChange(el.value); input = el;
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
