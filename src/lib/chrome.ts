import './chrome.css';

export type Control =
  | {kind: 'toggle'; id: string; label: string; value: boolean; onChange: (v: boolean) => void}
  | {kind: 'range'; id: string; label: string; min: number; max: number; step: number; value: number; disabled?: boolean; onChange: (v: number) => void}
  | {kind: 'select'; id: string; label: string; options: string[]; value: string; onChange: (v: string) => void};

export type ChromeOptions = {num: string; title: string; expect: string; claim: string; controls?: Control[]};

declare global { interface Window { __bench: {ready: boolean; probe: Record<string, unknown>} } }
window.__bench = {ready: false, probe: {}};

export function mountChrome(opts: ChromeOptions) {
  document.title = `${opts.num} · ${opts.title} · engine-bench`;
  const header = document.createElement('header');
  header.className = 'bench';
  header.innerHTML = `
    <h1><a href="/00-index/">engine-bench</a> · ${opts.num} · ${opts.title}</h1>
    <div class="expect">What you should see: ${opts.expect}</div>
    <div class="claim">Briefing: “${opts.claim}”</div>
    <div class="controls"></div>`;
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
    const out = document.createElement('output'); out.textContent = String(c.value);
    el.oninput = () => { out.textContent = el.value; c.onChange(Number(el.value)); };
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
