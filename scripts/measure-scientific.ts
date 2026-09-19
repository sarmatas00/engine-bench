/**
 * Task 8 -- the repeatable measurement behind
 * docs/scientific-visualization-measurements.md.
 *
 * This script does NOT discover the spike's answers. They are already recorded
 * in NOTES.md ("vtk.js vs Three.js: the measured comparison"). It makes them
 * repeatable, and it refuses to publish a number from a run it cannot vouch
 * for.
 *
 * TWO HALVES, ON PURPOSE:
 *
 *  - Everything above `main()` is PURE. No browser, no filesystem, no network,
 *    no top-level side effect at all -- tests/unit/scientific-probes.test.ts
 *    imports it and nothing runs. `main()` dynamically imports playwright and
 *    node:fs so that importing this module does not even load them.
 *  - `main()` drives the built pages under dist/ and hands each observation to
 *    `judgeRun`, which is the only place a run is accepted or rejected.
 *
 * WHAT THE PURE HALF OWNS, AND WHAT IT DELIBERATELY DOES NOT:
 *
 *   The 30 warmup frames are dropped by createBenchmarkDriver (src/lib), not
 *   here -- its measured loop starts at ORBIT_V1.warmupFrames, so
 *   `cpuFrameTimesMs` arrives 180 long and an "assert warmup exclusion" check
 *   at this layer would be testing src/lib with a constant. What this layer
 *   owns is a VALIDITY GATE, labelled as one: a CPU array whose length is not
 *   exactly ORBIT_V1.forcedFrames rejects the run rather than being
 *   aggregated. Likewise, disjoint GPU samples are dropped by the driver; what
 *   this layer owns is the decision about the SHORT array that comes out --
 *   how many survived, at what rejection rate a GPU p50 stops being quotable,
 *   and the difference between "this browser has no timer" and "the timer ran
 *   and kept nothing". That last distinction is invisible without
 *   `BenchmarkDriver.lastGpuSampleStats()`, which is why both pages publish it
 *   as `window.__bench.probe.gpuSampleStats`.
 *
 * Run it with `bun run measure:scientific`.
 */

// ---------------------------------------------------------------------------
// The pure aggregation layer.

/**
 * ORBIT_V1.forcedFrames, written out rather than imported.
 *
 * Importing it would make the gate below true by construction and its test a
 * tautology. As a literal, the unit test's comparison against the real
 * ORBIT_V1.forcedFrames is a genuine drift guard: change the driver's contract
 * and this script's gate is reported as out of date instead of silently
 * following it.
 */
export const REQUIRED_CPU_SAMPLES = 180;

/** spec.md:176-177 -- at least 30 FPS is the target. */
export const FPS_TARGET_MIN = 30;
/** spec.md:176-177 -- sustained below 20 FPS fails the interactive-MVP requirement. */
export const FPS_FAIL_BELOW = 20;

/**
 * The share of GPU samples that may be dropped before the GPU p50 stops being
 * quotable. CHOSEN, NOT MEASURED, and stated as such: above it the percentile
 * is taken over a sub-sample whose bias is unknown (a disjoint sample is not a
 * random one -- it is the frame the driver preempted), and a "GPU p50" over
 * half a run would read in the document exactly like one over a whole run.
 * The JSON records the rate actually observed on every run, so a future reader
 * can see how near this threshold the real measurement sat.
 */
export const GPU_MAX_REJECTION_RATE = 0.1;

/** The drawing buffer every frame time of record was measured at. */
export const BENCHMARK_SURFACE = {width: 1280, height: 720} as const;

export type FpsVerdict = 'fails-interactive-mvp' | 'qualified' | 'meets-target';

/**
 * Nearest-rank percentile: sorted ascending, rank = ceil(p/100 * n), clamped.
 * Always returns an observed sample, never an interpolated value between two
 * of them -- under a software rasterizer the distribution is lumpy and an
 * interpolated p50 is a number no frame actually took.
 *
 * Copies before sorting: the caller's array is written into the JSON record
 * as the per-frame series after this runs, and an in-place sort would publish
 * a sorted "per-frame" series, which is a true number beside a false shape.
 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error('percentile: no samples');
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

/** The spec's three bands. Both boundaries are inclusive-upward: exactly 30 is
 *  the target, exactly 20 is qualified (the spec fails runs BELOW 20). */
export function classifyFps(fps: number): FpsVerdict {
  if (fps < FPS_FAIL_BELOW) return 'fails-interactive-mvp';
  if (fps < FPS_TARGET_MIN) return 'qualified';
  return 'meets-target';
}

export type CpuAggregate = {
  n: number;
  min: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
  /**
   * 1000 / p95: the frame rate the run holds for 95% of its frames.
   *
   * NOT 1000/max. On a contended machine one 400 ms frame is a scheduler
   * artifact, and a "minimum sustained FPS" that any single outlier can drive
   * below 20 would classify a healthy run as failing the interactive-MVP
   * requirement. `max` is published beside it so the outlier is still visible.
   */
  minSustainedFps: number;
  fpsVerdict: FpsVerdict;
};

export function aggregateCpuFrames(samples: readonly number[]): CpuAggregate {
  if (samples.length === 0) throw new Error('aggregateCpuFrames: no CPU samples');
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);
  const minSustainedFps = 1000 / p95;
  return {
    n: samples.length,
    min: Math.min(...samples),
    p50,
    p95,
    max: Math.max(...samples),
    mean: samples.reduce((a, b) => a + b, 0) / samples.length,
    minSustainedFps,
    fpsVerdict: classifyFps(minSustainedFps),
  };
}

export type GpuAggregate = {
  /** Was there a GPU timer at all? False means the browser does not expose
   *  EXT_disjoint_timer_query_webgl2 -- an absent measurement, never a zero. */
  available: boolean;
  /** May the p50/p95 below be quoted? False whenever they are null. */
  quotable: boolean;
  kept: number;
  rejected: number;
  /** null when there was no timer: a rate over zero samples is not 0, it is
   *  undefined, and 0 would read as "nothing was rejected". */
  rejectionRate: number | null;
  p50: number | null;
  p95: number | null;
  /** Why the numbers are absent, or null when they are present. */
  reason: string | null;
};

/**
 * `samples` is BenchmarkResult.gpuFrameTimesMs (null when the page had no
 * timer) and `stats` is BenchmarkDriver.lastGpuSampleStats() as the page
 * publishes it. Both are needed: `samples` alone cannot tell an empty array
 * apart from a missing timer, which is the whole reason the pages publish the
 * stats.
 */
export function aggregateGpuFrames(
  samples: readonly number[] | null,
  stats: {kept: number; rejected: number} | null,
): GpuAggregate {
  if (stats === null) {
    return {
      available: false, quotable: false, kept: 0, rejected: 0, rejectionRate: null,
      p50: null, p95: null,
      reason: 'no GPU timer: this browser does not expose EXT_disjoint_timer_query_webgl2',
    };
  }
  const total = stats.kept + stats.rejected;
  const rejectionRate = total === 0 ? 1 : stats.rejected / total;
  const base = {available: true, kept: stats.kept, rejected: stats.rejected, rejectionRate};
  const unquotable = (reason: string): GpuAggregate => ({...base, quotable: false, p50: null, p95: null, reason});

  // The two halves of the page's own publish() snapshot must agree. They come
  // from the same driver and the same publish(), so a disagreement means the
  // stats were captured at a different moment from the array -- exactly the
  // way one page's `gpuSampleStats` could quietly stop describing the run it
  // sits beside.
  if ((samples?.length ?? 0) !== stats.kept) {
    return unquotable(
      `gpuSampleStats reports kept=${stats.kept} but gpuFrameTimesMs carries ${samples?.length ?? 'null'} entries; `
      + 'the two do not describe the same run');
  }
  if (stats.kept === 0) {
    return unquotable(`the GPU timer ran and kept no samples (${stats.rejected} disjoint or never available)`);
  }
  if (rejectionRate > GPU_MAX_REJECTION_RATE) {
    return unquotable(
      `GPU sample rejection rate ${(rejectionRate * 100).toFixed(1)}% exceeds the quotable threshold `
      + `${(GPU_MAX_REJECTION_RATE * 100).toFixed(0)}%`);
  }
  return {
    ...base, quotable: true,
    p50: percentile(samples!, 50), p95: percentile(samples!, 95), reason: null,
  };
}

export type RenderSurfaceRecord = {
  phase?: string;
  drawingBufferWidth?: number | null;
  drawingBufferHeight?: number | null;
} | null;

export type RunObservation = {
  renderer: 'vtkjs' | 'threejs';
  status: string;
  measurementValid: boolean;
  cpuFrameTimesMs: number[];
  gpuFrameTimesMs: number[] | null;
  gpuSampleStats: {kept: number; rejected: number} | null;
  /** `window.__bench.probe.renderSurfaceBenchmark` -- the phase-specific key,
   *  never the rolling `renderSurface` one, which runBenchmark's finally block
   *  overwrites with the interactive record moments after the run. */
  renderSurfaceBenchmark: RenderSurfaceRecord;
  /** Per-key GL/DOM object growth across the stability cycles. NO RESIZE is in
   *  those cycles: vtk.js's measured one-texture-per-resize leak is a RESULT
   *  of this spike, recorded separately, not a reason to reject its runs. */
  resourceGrowth: Record<string, number>;
};

export type RunVerdict = {
  accepted: boolean;
  /** Every reason, not the first one found. */
  rejections: string[];
  /** Null on a rejected run: statistics are computed only after the gate
   *  passes, so a p50 over a partial run can never reach the JSON. */
  cpu: CpuAggregate | null;
  gpu: GpuAggregate;
};

export function judgeRun(obs: RunObservation): RunVerdict {
  const rejections: string[] = [];

  if (obs.status !== 'ready') rejections.push(`status is "${obs.status}", not "ready"`);
  if (!obs.measurementValid) rejections.push('measurementValid is false');

  // THE VALIDITY GATE (see the header): the driver already excluded the warmup
  // frames, so this is a gate on the shape of what it returned, not an
  // exclusion this script performs.
  const n = obs.cpuFrameTimesMs.length;
  if (n !== REQUIRED_CPU_SAMPLES) {
    rejections.push(`${n} CPU samples, not the ${REQUIRED_CPU_SAMPLES} orbit-v1 records (validity gate)`);
  }

  const s = obs.renderSurfaceBenchmark;
  if (!s || s.phase !== 'benchmark') {
    rejections.push(`no benchmark-phase render surface record (got ${s ? `phase "${s.phase}"` : 'nothing'})`);
  } else if (s.drawingBufferWidth !== BENCHMARK_SURFACE.width || s.drawingBufferHeight !== BENCHMARK_SURFACE.height) {
    rejections.push(
      `benchmarked at ${s.drawingBufferWidth}x${s.drawingBufferHeight}, not the pinned `
      + `${BENCHMARK_SURFACE.width}x${BENCHMARK_SURFACE.height}`);
  }

  const grown = Object.entries(obs.resourceGrowth).filter(([, d]) => d !== 0);
  if (grown.length > 0) {
    rejections.push(`resource counters moved over the no-resize stability cycles: `
      + grown.map(([k, d]) => `${k} ${d > 0 ? '+' : ''}${d}`).join(', '));
  }

  const gpu = aggregateGpuFrames(obs.gpuFrameTimesMs, obs.gpuSampleStats);
  // An absent timer is not a rejection -- unsupported is null, never a
  // failure. A timer that ran and produced too little IS one: the run cannot
  // answer the question it was asked to answer.
  if (gpu.available && !gpu.quotable) rejections.push(`GPU samples unusable: ${gpu.reason}`);

  return {
    accepted: rejections.length === 0,
    rejections,
    cpu: rejections.length === 0 ? aggregateCpuFrames(obs.cpuFrameTimesMs) : null,
    gpu,
  };
}

/** Median across runs, for the per-page summary. Nearest-rank, same as above. */
export function medianOf(values: readonly number[]): number | null {
  return values.length === 0 ? null : percentile(values, 50);
}

// ---------------------------------------------------------------------------
// The measurement harness. Nothing below here runs on import.

/** A,B,A,B,A,B in one session. Task 7 measured a sequential three-then-three
 *  run showing a 15% p50 drop that turned out to be machine drift; only an
 *  interleaved re-run caught it. The order is written into the JSON. */
const RUN_ORDER = ['vtkjs', 'threejs', 'vtkjs', 'threejs', 'vtkjs', 'threejs'] as const;

const SLUG: Record<'vtkjs' | 'threejs', string> = {
  vtkjs: '13-vtkjs-scientific',
  threejs: '14-threejs-scientific',
};

/** Control cycles run for the stability check. No resize in them, on purpose. */
const STABILITY_CYCLES = 100;
/** Drawing-buffer resizes measured for the growth comparison. */
const RESIZE_SWEEP = 8;

async function main(): Promise<void> {
  const {chromium} = await import('@playwright/test');
  const {readFileSync, writeFileSync, mkdirSync, existsSync, statSync} = await import('node:fs');
  const {resolve, join} = await import('node:path');

  const repo = resolve(import.meta.dir, '..');
  const dist = join(repo, 'dist');
  if (!existsSync(join(dist, `${SLUG.vtkjs}/index.html`))) {
    throw new Error(`dist/${SLUG.vtkjs} is missing -- run \`bun run build:pages\` first`);
  }

  // dist is built with base=/ by `bun run build` and base=/engine-bench/ by
  // `bun run build:pages`. Serving both spellings means the script measures
  // whichever build is on disk rather than 404-ing on the wrong one.
  const mime: Record<string, string> = {
    html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json',
    wasm: 'application/wasm', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml',
    glb: 'model/gltf-binary', bin: 'application/octet-stream', f32: 'application/octet-stream',
  };
  const server = Bun.serve({
    port: 0,
    fetch(req) {
      let path = decodeURIComponent(new URL(req.url).pathname);
      if (path.startsWith('/engine-bench/')) path = path.slice('/engine-bench'.length);
      if (path.endsWith('/')) path += 'index.html';
      const file = join(dist, path);
      if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) {
        return new Response('not found', {status: 404});
      }
      const ext = file.split('.').pop() ?? '';
      return new Response(Bun.file(file), {headers: {'content-type': mime[ext] ?? 'application/octet-stream'}});
    },
  });
  const origin = `http://localhost:${server.port}`;
  console.log(`serving dist/ at ${origin} (and ${origin}/engine-bench/)`);

  // The same launch flags the Playwright chromium project uses. The p50s of
  // record were taken on ANGLE/SwiftShader; a run on a real GPU would be a
  // different measurement wearing the same name.
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const runs: any[] = [];
  try {
    for (let i = 0; i < RUN_ORDER.length; i++) {
      const renderer = RUN_ORDER[i];
      console.log(`\n[${i + 1}/${RUN_ORDER.length}] cold context: ${renderer}`);
      runs.push(await measureOne(browser, origin, renderer, i));
    }
  } finally {
    await browser.close();
    server.stop(true);
  }

  // ---- code burden, counted from the page sources ------------------------
  const burden: Record<string, any> = {};
  for (const renderer of ['vtkjs', 'threejs'] as const) {
    const src = readFileSync(join(repo, 'pages', SLUG[renderer], 'main.ts'), 'utf8');
    // Every GLSL literal on either page is tagged `/* glsl */` before its
    // template literal, so the split is a documented marker rather than a
    // guess about which lines look like shader code.
    const glslBlocks = [...src.matchAll(/\/\* glsl \*\/ `([\s\S]*?)`/g)].map(m => m[1]);
    const glslLines = glslBlocks.flatMap(b => b.split('\n')).map(l => l.trim()).filter(l => l.length > 0);
    const glslSet = new Set(glslLines);
    const withoutGlsl = src.replace(/\/\* glsl \*\/ `([\s\S]*?)`/g, '/* glsl */ ``');
    const tsLines = withoutGlsl.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    burden[renderer] = {
      file: `pages/${SLUG[renderer]}/main.ts`,
      totalLines: src.split('\n').length,
      tsNonBlankLines: tsLines.length,
      tsNonBlankUniqueLines: new Set(tsLines).size,
      glslBlocks: glslBlocks.length,
      glslNonBlankLines: glslLines.length,
      glslNonBlankUniqueLines: glslSet.size,
      imports: [...src.matchAll(/^import .*?from '([^']+)';/gm)].map(m => m[1])
        .concat([...src.matchAll(/^import '([^']+)';/gm)].map(m => m[1])),
    };
  }

  // ---- report -------------------------------------------------------------
  const accepted: Record<string, any[]> = {vtkjs: [], threejs: []};
  const rejected: any[] = [];
  for (const run of runs) {
    if (run.verdict.accepted) accepted[run.renderer].push(run);
    else rejected.push({renderer: run.renderer, index: run.index, rejections: run.verdict.rejections});
  }

  const summary: Record<string, any> = {};
  for (const renderer of ['vtkjs', 'threejs'] as const) {
    const ok = accepted[renderer];
    summary[renderer] = {
      acceptedRuns: ok.length,
      rejectedRuns: runs.filter(r => r.renderer === renderer).length - ok.length,
      cpuP50Ms: ok.map(r => r.verdict.cpu.p50),
      cpuP95Ms: ok.map(r => r.verdict.cpu.p95),
      cpuMinMs: ok.map(r => r.verdict.cpu.min),
      cpuMaxMs: ok.map(r => r.verdict.cpu.max),
      minSustainedFps: ok.map(r => r.verdict.cpu.minSustainedFps),
      fpsVerdicts: ok.map(r => r.verdict.cpu.fpsVerdict),
      medianCpuP50Ms: medianOf(ok.map(r => r.verdict.cpu.p50)),
      medianCpuP95Ms: medianOf(ok.map(r => r.verdict.cpu.p95)),
      medianCpuMinMs: medianOf(ok.map(r => r.verdict.cpu.min)),
      // Within-condition spread: the statistic that decides whether the
      // cross-renderer gap means anything at all.
      cpuP50SpreadPct: spreadPct(ok.map(r => r.verdict.cpu.p50)),
      gpu: ok.map(r => r.verdict.gpu),
      navToReadyMs: ok.map(r => r.navToReadyMs),
      medianNavToReadyMs: medianOf(ok.map(r => r.navToReadyMs)),
      transferBytesTotal: ok.map(r => r.load.transferBytesTotal),
      decodedBytesTotal: ok.map(r => r.load.decodedBytesTotal),
      requests: ok.map(r => r.load.requests),
      heapAfterBenchmarkBytes: ok.map(r => r.heapAfterBenchmarkBytes),
      // Growth across RESIZE_SWEEP drawing-buffer resizes. Reported, never
      // gated: this difference is one of the spike's three results.
      resizeGrowth: ok.map(r => r.resize.growth),
      resizeWaitMs: ok.map(r => r.resize.waitMs),
      stabilityGrowth: ok.map(r => r.stability.growth),
    };
  }

  const record = {
    generatedAt: new Date().toISOString(),
    harness: {
      browser: 'chromium (playwright) on ANGLE/SwiftShader',
      browserVersion: null as string | null,
      viewport: {width: 1280, height: 800, deviceScaleFactor: 1},
      benchmarkSurface: BENCHMARK_SURFACE,
      cameraPath: 'orbit-v1',
      warmupFrames: 30,
      forcedFrames: REQUIRED_CPU_SAMPLES,
      interleavedOrder: [...RUN_ORDER],
      stabilityCycles: STABILITY_CYCLES,
      resizeSweep: RESIZE_SWEEP,
      gpuMaxRejectionRate: GPU_MAX_REJECTION_RATE,
      fpsBands: {failsBelow: FPS_FAIL_BELOW, targetAtLeast: FPS_TARGET_MIN},
      untestedBrowsers: ['webkit -- out of scope for this spike, see playwright.config.ts'],
    },
    summary,
    codeBurden: burden,
    rejectedRuns: rejected,
    runs,
  };

  // `.cache`, not `test-results`. MEASURED, not assumed: Playwright's default
  // outputDir IS `test-results` and it empties the directory at the start of
  // every run, so a record written there is deleted by the next `bun run
  // test`. Both directories are gitignored -- the JSON is a build output, and
  // every number a reader needs is in
  // docs/scientific-visualization-measurements.md, which is committed.
  const outDir = join(repo, '.cache');
  mkdirSync(outDir, {recursive: true});
  const out = join(outDir, 'scientific-measurements.json');
  writeFileSync(out, JSON.stringify(record, null, 2));

  console.log('\n' + '='.repeat(78));
  for (const renderer of ['vtkjs', 'threejs'] as const) {
    const s = summary[renderer];
    console.log(`${renderer}: ${s.acceptedRuns} accepted / ${s.rejectedRuns} rejected`);
    if (s.acceptedRuns > 0) {
      console.log(`  cpu p50 ${s.cpuP50Ms.map((x: number) => x.toFixed(1)).join(' / ')} ms `
        + `(median ${s.medianCpuP50Ms.toFixed(1)}, within-condition spread ${s.cpuP50SpreadPct!.toFixed(1)}%)`);
      console.log(`  cpu p95 ${s.cpuP95Ms.map((x: number) => x.toFixed(1)).join(' / ')} ms`);
      console.log(`  cpu min ${s.cpuMinMs.map((x: number) => x.toFixed(1)).join(' / ')} ms`);
      console.log(`  min sustained fps ${s.minSustainedFps.map((x: number) => x.toFixed(1)).join(' / ')} `
        + `-> ${s.fpsVerdicts.join(' / ')}`);
      console.log(`  gpu ${s.gpu.map((g: GpuAggregate) => g.quotable ? `${g.p50!.toFixed(2)} ms p50` : g.reason).join(' | ')}`);
      console.log(`  nav->ready ${s.navToReadyMs.map((x: number) => x.toFixed(0)).join(' / ')} ms`);
      console.log(`  transfer ${s.transferBytesTotal.map((x: number) => (x / 1024).toFixed(0) + ' KiB').join(' / ')} `
        + `over ${s.requests.join('/')} requests`);
      console.log(`  growth over ${RESIZE_SWEEP} resizes: ${s.resizeGrowth.map((g: any) => JSON.stringify(g)).join(' ')}`);
      console.log(`  growth over ${STABILITY_CYCLES} no-resize cycles: `
        + `${s.stabilityGrowth.map((g: any) => JSON.stringify(g)).join(' ')}`);
    }
  }
  if (rejected.length > 0) {
    console.log('\nREJECTED RUNS (reported, never retried into a passing one):');
    for (const r of rejected) console.log(`  ${r.renderer} #${r.index}: ${r.rejections.join('; ')}`);
  }
  console.log(`\nwrote ${out}`);
  console.log('='.repeat(78));

  // The script exits non-zero when NOTHING is publishable for a page. A single
  // rejected run is reported and the other two still stand; zero accepted runs
  // means the document cannot be written from this session at all.
  const barren = (['vtkjs', 'threejs'] as const).filter(r => summary[r].acceptedRuns === 0);
  if (barren.length > 0) {
    console.error(`\nNO USABLE RUN for: ${barren.join(', ')}`);
    process.exit(1);
  }
}

/** Max/min - 1, as a percentage. Null for fewer than two values. */
function spreadPct(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  return (Math.max(...values) / Math.min(...values) - 1) * 100;
}

async function measureOne(
  browser: import('@playwright/test').Browser,
  origin: string,
  renderer: 'vtkjs' | 'threejs',
  index: number,
): Promise<any> {
  // A fresh BrowserContext per run: cold JS heap, cold HTTP cache, cold GL
  // context. Three runs in one context would measure a warmed browser.
  const context = await browser.newContext({
    viewport: {width: 1280, height: 800},
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`); });

  try {
    const t0 = Date.now();
    await page.goto(`${origin}/${SLUG[renderer]}/`, {waitUntil: 'commit'});
    await page.waitForFunction(() => (window as any).__bench?.ready === true, null, {timeout: 120_000});
    const navToReadyMs = Date.now() - t0;

    // Read BEFORE the benchmark: a resource list taken afterwards would still
    // be correct, but the heap number would carry the benchmark's allocations.
    const load = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const bucket = (name: string) => name.endsWith('.js') ? 'js'
        : name.endsWith('.css') ? 'css'
        : /\/data\//.test(name) ? 'data' : 'other';
      const totals: Record<string, {count: number; transferBytes: number; decodedBytes: number}> = {};
      for (const e of entries) {
        const b = bucket(e.name);
        totals[b] ??= {count: 0, transferBytes: 0, decodedBytes: 0};
        totals[b].count++;
        totals[b].transferBytes += e.transferSize;
        totals[b].decodedBytes += e.decodedBodySize;
      }
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return {
        byKind: totals,
        requests: entries.length,
        transferBytesTotal: entries.reduce((a, e) => a + e.transferSize, 0),
        decodedBytesTotal: entries.reduce((a, e) => a + e.decodedBodySize, 0),
        domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : null,
        // Chromium exposes performance.memory; firefox does not. Recorded when
        // present, NEVER a reason to fail a browser, and null rather than 0
        // when absent.
        heapBytes: (performance as any).memory?.usedJSHeapSize ?? null,
      };
    });

    // ---- the benchmark, first thing after ready --------------------------
    await page.evaluate(() => (window as any).__bench.runBenchmark());
    const bench = await page.evaluate(() => {
      const b = (window as any).__bench;
      return {
        status: b.probe.scientific.status,
        measurementValid: b.probe.scientific.measurementValid,
        cpuFrameTimesMs: b.probe.scientific.benchmark?.cpuFrameTimesMs ?? [],
        gpuFrameTimesMs: b.probe.scientific.benchmark?.gpuFrameTimesMs ?? null,
        cameraPath: b.probe.scientific.benchmark?.cameraPath ?? null,
        // Deviation 2's field, read from the same publish() snapshot as
        // everything else on this object.
        gpuSampleStats: b.probe.gpuSampleStats ?? null,
        renderSurfaceBenchmark: b.probe.renderSurfaceBenchmark ?? null,
        renderSurfaceInteractive: b.probe.renderSurfaceInteractive ?? null,
        glslBurden: b.probe.glslBurden ?? null,
        apis: b.probe.apis ?? null,
        heapAfterBenchmarkBytes: (performance as any).memory?.usedJSHeapSize ?? null,
      };
    });

    // ---- the resize sweep: a RESULT, not a gate --------------------------
    // vtk.js 36.12.1 was measured to leak one texture, one framebuffer and one
    // renderbuffer per drawing-buffer resize and Three.js 0.185.1 none. This
    // reproduces that number; it never rejects a run.
    //
    // RUN BEFORE THE CONTROL CYCLES, for a measured reason. Taken after them,
    // the FIRST resize took 61 SECONDS to reach the page's ResizeObserver on
    // page 13 while every later one took 0.25 s: 100 cycles return in under
    // two seconds of JavaScript time but leave ~600 renders queued in
    // SwiftShader, and the resize waits behind the queue. That is the same
    // property NOTES.md:534 records for gl.finish() -- work is submitted, not
    // completed -- and it is why `waitMs` is recorded here rather than
    // assumed small. The timeout is generous for the same reason.
    const beforeResize = await glObjects(page);
    const resizeWaitMs: number[] = [];
    for (let i = 0; i < RESIZE_SWEEP; i++) {
      const size = i % 2 === 0 ? {width: 1100, height: 700} : {width: 1280, height: 800};
      const was = await page.evaluate(() => (window as any).__bench.probe.parity.surface.drawingBufferWidth);
      const t = Date.now();
      await page.setViewportSize(size);
      // Interval polling, not the default requestAnimationFrame polling:
      // neither page runs an animation loop, so rAF delivery is not something
      // this script should depend on.
      await page.waitForFunction(
        w => (window as any).__bench.probe.parity.surface.drawingBufferWidth !== w, was,
        {timeout: 180_000, polling: 250});
      resizeWaitMs.push(Date.now() - t);
    }
    const afterResize = await glObjects(page);
    const resizeGrowth: Record<string, number> = {};
    for (const k of Object.keys(beforeResize)) {
      resizeGrowth[k] = (afterResize as any)[k] - (beforeResize as any)[k];
    }

    // ---- resource stability: control cycles, NO resize -------------------
    // One warm cycle first, then the baseline: Three.js uploads a geometry's
    // attribute buffers lazily on first use and page 13's transfer functions
    // allocate on first use, so a baseline taken at ready would show that
    // first-use allocation as growth.
    await runCycles(page, 1, 0);
    const beforeStability = await glObjects(page);
    await runCycles(page, STABILITY_CYCLES, 1);
    const afterStability = await glObjects(page);
    const resourceGrowth: Record<string, number> = {};
    for (const k of Object.keys(beforeStability)) {
      resourceGrowth[k] = (afterStability as any)[k] - (beforeStability as any)[k];
    }

    const observation: RunObservation = {
      renderer,
      status: bench.status,
      measurementValid: bench.measurementValid,
      cpuFrameTimesMs: bench.cpuFrameTimesMs,
      gpuFrameTimesMs: bench.gpuFrameTimesMs,
      gpuSampleStats: bench.gpuSampleStats,
      renderSurfaceBenchmark: bench.renderSurfaceBenchmark,
      resourceGrowth,
    };
    const verdict = judgeRun(observation);

    console.log(`  ${verdict.accepted ? 'accepted' : 'REJECTED: ' + verdict.rejections.join('; ')}`
      + (verdict.cpu ? ` -- cpu p50 ${verdict.cpu.p50.toFixed(1)} ms, p95 ${verdict.cpu.p95.toFixed(1)}, `
        + `min ${verdict.cpu.min.toFixed(1)}, ${verdict.cpu.minSustainedFps.toFixed(1)} fps sustained` : ''));

    return {
      index, renderer,
      orderPosition: index + 1,
      navToReadyMs,
      load,
      cameraPath: bench.cameraPath,
      renderSurfaceBenchmark: bench.renderSurfaceBenchmark,
      renderSurfaceInteractive: bench.renderSurfaceInteractive,
      gpuSampleStats: bench.gpuSampleStats,
      glslBurden: bench.glslBurden,
      apis: bench.apis,
      heapAfterBenchmarkBytes: bench.heapAfterBenchmarkBytes,
      stability: {before: beforeStability, after: afterStability, growth: resourceGrowth, cycles: STABILITY_CYCLES},
      resize: {before: beforeResize, after: afterResize, growth: resizeGrowth, resizes: RESIZE_SWEEP, waitMs: resizeWaitMs},
      consoleErrors,
      cpuFrameTimesMs: bench.cpuFrameTimesMs,
      gpuFrameTimesMs: bench.gpuFrameTimesMs,
      verdict,
    };
  } finally {
    await context.close();
  }
}

function glObjects(page: import('@playwright/test').Page): Promise<Record<string, number>> {
  return page.evaluate(() => (window as any).__bench.probe.glObjects);
}

/** The parity suite's own deterministic control cycle, so the stability result
 *  here and the one in tests/scientific.spec.ts are the same measurement. */
async function runCycles(page: import('@playwright/test').Page, count: number, seed: number): Promise<void> {
  await page.evaluate(args => {
    const cases = [...document.querySelectorAll('#data-case option')].map(o => (o as HTMLOptionElement).value);
    const fire = (id: string, value: string, event: string) => {
      const el = document.querySelector(id) as HTMLInputElement | HTMLSelectElement;
      (el as HTMLInputElement).value = value;
      el.dispatchEvent(new Event(event));
    };
    for (let c = 0; c < args.count; c++) {
      const i = args.seed + c;
      fire('#slice-z', String(4 + (i * 7) % 72), 'input');
      fire('#range-low', String(((i * 13) % 40) / 100), 'input');
      fire('#range-high', String(0.6 + ((i * 17) % 40) / 100), 'input');
      fire('#opacity', String(((i * 11) % 100) / 100), 'input');
      const toggle = document.querySelector('#streamlines') as HTMLInputElement;
      toggle.checked = i % 2 === 0;
      toggle.dispatchEvent(new Event('change'));
      fire('#data-case', cases[i % cases.length], 'change');
    }
  }, {count, seed});
}

if (import.meta.main) await main();
