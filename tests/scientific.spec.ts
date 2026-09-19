/**
 * Task 7 — the cross-renderer suite: page 13 (vtk.js) against page 14 (Three.js).
 *
 * READ THIS BEFORE ADDING AN ASSERTION.
 *
 * A parity assertion between two pages that both call the same `src/lib`
 * function is a TAUTOLOGY. It compares src/lib with itself, passes by
 * construction on every input, and proves nothing about either renderer. This
 * spike has produced that defect six times, twice as the proposed FIX for a
 * previous instance. This file is where it would do the most damage, because a
 * green run here is what Tasks 8 and 9 will cite as evidence the two renderers
 * agree.
 *
 * So every assertion below carries a comment naming WHAT COULD MAKE IT FAIL. If
 * the only honest answer is "someone edits src/lib", it is labelled an
 * INVARIANT and is barred from being quoted as parity evidence.
 *
 * The five comparisons that genuinely test the renderers, and which this file
 * exists for:
 *   1. PICKING  — vtkCellPicker over the polydata's cell data vs
 *      Raycaster.faceIndex over the shipped cellObjectIndex. Two independent
 *      intersection implementations, one index space, and a REAL ray cast at
 *      the same fraction of the same pinned surface under the same camera.
 *   2. GPU-SAMPLED VALUES — what each renderer's own shader read out of its own
 *      texture upload and wrote into its own drawing buffer, against CPU truth.
 *   3. OCCLUSION — the same ray with and without an opaque building in it.
 *      vtk.js composites inside one pass; page 14 runs a depth-texture prepass.
 *      Different mechanisms, comparable outcome.
 *   4. RESOURCE BEHAVIOUR over 100 deterministic cycles, already measured to
 *      differ (vtk.js leaks per drawing-buffer resize, Three.js does not).
 *   5. CONTEXT-LOSS teardown, where the two libraries differ.
 *
 * Anything that must hold on BOTH pages independently belongs in
 * `scientificPageChecks` in tests/smoke.spec.ts, not here. This file only ever
 * compares the two.
 *
 * BROWSER MATRIX: chromium and firefox. WebKit is OUT OF SCOPE and untested —
 * WebGL2 3D textures under WebKit's software rasterizer are the most likely
 * thing to fail for reasons that have nothing to do with either renderer, and
 * this spike decides vtk.js versus Three.js, not browser support. Task 9's
 * conclusion must be qualified accordingly rather than quietly narrowed.
 */

import {test, expect, type Browser, type Page} from '@playwright/test';

type Renderer = 'vtkjs' | 'threejs';
const SLUG: Record<Renderer, string> = {
  vtkjs: '13-vtkjs-scientific',
  threejs: '14-threejs-scientific',
};

/** The surface both pages pin for every parity measurement. Declared in the
 *  pages as PARITY_SURFACE and asserted here, so a page that quietly changed
 *  it would fail rather than silently compare two different aspect ratios. */
const PARITY_SURFACE = {width: 1280, height: 720};

/** The surface both pages pin for a benchmark run (BENCHMARK_SURFACE). */
const BENCHMARK_SURFACE = {width: 1280, height: 720};

/**
 * Every fixed ray, pose and threshold lives HERE, in one place, and is handed
 * to both pages. Declaring them twice — once per page — is how two pages drift
 * apart on the very inputs a parity suite compares them on.
 */

/** orbit-v1's own pose. The picking sweep runs under it. */
const PICK_POSE = {target: [0, 0, 40] as [number, number, number], radius: 500, elevationDeg: 30, azimuthDeg: 0};

/**
 * Fixed rays, as fractions of the pinned drawing surface with v measured from
 * the top. Chosen from a 6x17 sweep of the frame under PICK_POSE; the suite
 * asserts agreement, never a particular cell, so no cell id is written down.
 */
const PICK_RAYS: Array<[number, number]> = [
  [0.10, 0.25], [0.30, 0.25], [0.45, 0.25], [0.80, 0.25],
  [0.10, 0.333], [0.50, 0.333], [0.65, 0.333], [0.90, 0.333],
  [0.25, 0.417], [0.50, 0.417], [0.70, 0.417], [0.90, 0.417],
  [0.45, 0.50], [0.65, 0.50], [0.85, 0.50],
  [0.30, 0.583], [0.55, 0.583], [0.80, 0.583],
  [0.50, 0.667], [0.85, 0.667],
];

/**
 * The GPU-value probes. Each is a world point ON the slice plane; the pose
 * targets it, so the ray through the centre pixel of the pinned surface hits
 * the plane exactly there and the world point is known without asking either
 * page for it. Offsets are fractions of the grid's own x/y span, filled in
 * from the page's published volumeBounds.
 */
const SLICE_PROBES: Array<[number, number]> = [[0, 0], [0.25, -0.2], [-0.3, 0.3]];
const SLICE_POSE = {radius: 420, elevationDeg: 75, azimuthDeg: 35};

/**
 * The occlusion pose and rays. Every ray was selected by measurement against
 * three stated criteria, not by looking for ones that pass:
 *   (a) both pages' pickers report a building hit at the same distance;
 *   (b) with the buildings hidden the pixel is the CLEAR BACKGROUND on both
 *       pages — so the building is the ray's only opaque occluder, and hiding
 *       it lengthens the volume path all the way to the far wall of the box;
 *   (c) the lit building face is not near-black, because the measure is a
 *       colour difference and a near-black background inflates it (measured:
 *       one candidate ray sits on a face vtk.js renders at rgb 3,3,3 and its
 *       ratio inverts).
 * Two adjacent rays — one hitting a building, one missing it — were tried
 * first and rejected by measurement: in a dense city the neighbouring ray hits
 * terrain at almost the same depth, and the two gave IDENTICAL deltas.
 */
const OCCLUSION_POSE = {target: [0, 0, 40] as [number, number, number], radius: 520, elevationDeg: 12, azimuthDeg: 20};
const OCCLUSION_RAYS: Array<[number, number]> = [[0.11, 0.84], [0.14, 0.90], [0.17, 0.86], [0.32, 0.90]];

/**
 * Floors on (volume accumulated with the building hidden) / (volume
 * accumulated with it there), measured against a black background so the
 * number is the volume's own contribution and not partly the background's.
 * Measured: vtk.js 1.31-1.72 per ray (mean 1.50), Three.js 1.43-2.22 (mean
 * 1.77). A renderer that ignored opaque depth returns exactly 1.00, which is
 * what the negative control produces, so the margin here is to the FLOOR of
 * the measured range and not to the ceiling of the broken one.
 */
const OCCLUSION_MIN_RATIO = 1.15;
const OCCLUSION_MEAN_RATIO = 1.3;

/** 100 deterministic control cycles, in ten blocks of ten, with a viewport
 *  flip between blocks. */
const CYCLE_BLOCKS = 10;
const CYCLES_PER_BLOCK = 10;
const VIEWPORTS = [{width: 1280, height: 800}, {width: 1100, height: 700}];

// ---------------------------------------------------------------------------

type Opened = {page: Page; errors: string[]};

async function openScientific(browser: Browser, renderer: Renderer): Promise<Opened> {
  const page = await browser.newPage({viewport: VIEWPORTS[0]});
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto(`/${SLUG[renderer]}/`);
  await page.waitForFunction(() => (window as any).__bench?.ready === true, null, {timeout: 60_000});
  expect(errors, `${SLUG[renderer]} logged errors before ready:\n${errors.join('\n')}`).toEqual([]);
  return {page, errors};
}

/** Opens both scientific pages, runs `body`, and always closes them. */
async function withBothPages(
  browser: Browser, body: (pages: Record<Renderer, Opened>) => Promise<void>,
): Promise<void> {
  const vtkjs = await openScientific(browser, 'vtkjs');
  const threejs = await openScientific(browser, 'threejs');
  try {
    await body({vtkjs, threejs});
  } finally {
    await vtkjs.page.close();
    await threejs.page.close();
  }
}

const parityOf = (page: Page) => page.evaluate(() => (window as any).__bench.probe.parity as any);
const glObjectsOf = (page: Page) => page.evaluate(() => (window as any).__bench.probe.glObjects as Record<string, number>);
const scientificOf = (page: Page) => page.evaluate(() => (window as any).__bench.probe.scientific as any);

const RENDERERS: Renderer[] = ['vtkjs', 'threejs'];

// ---------------------------------------------------------------------------

test.describe('cross-renderer', () => {
  test.slow();

  test('the parity surface has the same shape on both pages', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const p: Record<Renderer, any> = {
        vtkjs: await parityOf(pages.vtkjs.page),
        threejs: await parityOf(pages.threejs.page),
      };
      // FAILS IF: either page stops publishing probe.parity, or the two pages'
      // objects stop being the same shape -- which is the whole point of the
      // field-by-field comparisons below. A field present on one page only
      // makes this suite look thorough while testing nothing, so the shape is
      // asserted before any value is.
      const keys = (o: any) => Object.keys(o).sort();
      expect(keys(p.vtkjs)).toEqual(keys(p.threejs));
      expect(keys(p.vtkjs.invariants)).toEqual(keys(p.threejs.invariants));
      expect(keys(p.vtkjs.camera)).toEqual(keys(p.threejs.camera));
      expect(keys(p.vtkjs.surface)).toEqual(keys(p.threejs.surface));
      expect(p.vtkjs.renderer).toBe('vtkjs');
      expect(p.threejs.renderer).toBe('threejs');

      // FAILS IF: a parity primitive is added to one page and not the other.
      // Every measurement in this file is composed out of these, so one
      // missing on one side would not fail loudly -- it would throw inside a
      // single test and leave the rest looking healthy.
      const primitives = async (r: Renderer) => pages[r].page.evaluate(
        () => Object.keys((window as any).__bench.parity).sort());
      const names = await primitives('vtkjs');
      expect(names).toEqual(await primitives('threejs'));
      expect(names.length).toBeGreaterThanOrEqual(11);

      // FAILS IF: a page adds a null-valued parity field without saying why.
      // Every null is a renderer difference that has to be stated, or it is
      // just a missing measurement wearing a parity field's clothes.
      for (const r of RENDERERS) {
        const nulls = Object.entries(p[r]).filter(([, v]) => v === null).map(([k]) => k);
        expect(Array.isArray(p[r].parityNotes)).toBe(true);
        for (const key of nulls) {
          expect(p[r].parityNotes.join('\n'), `${r} publishes ${key}: null with no parityNotes entry explaining it`)
            .toContain(key);
        }
      }

      // FAILS IF: vtk.js grows a page-visible depth target, or page 14 stops
      // using a depth prepass. This asymmetry is a MEASURED RENDERER
      // DIFFERENCE -- vtk.js composites its volume against opaque geometry
      // inside one pass; Three.js has no volume renderer and needs a depth
      // texture to do the same thing -- so the null is asserted, not skipped.
      expect(p.vtkjs.depthTarget).toBeNull();
      expect(p.threejs.depthTarget).toMatchObject({hasDepthTexture: true});
      expect(p.threejs.depthTarget.width).toBe(p.threejs.surface.drawingBufferWidth);
      expect(p.threejs.depthTarget.height).toBe(p.threejs.surface.drawingBufferHeight);

      // FAILS IF: either library's second world->value implementation stops
      // being available. vtkImageData.getScalarValueFromWorld exists; Three.js
      // ships nothing of the kind, which is why page 14 answers axis order
      // with a GPU round trip instead. Both nulls asserted.
      expect(p.threejs.librarySample).toBeNull();
      expect(p.vtkjs.gpuSampleFloat).toBeNull();

      // FAILS IF: vtk.js's own world->value path disagrees with the shared
      // module's. Genuinely independent of gridNodeIndex (a world->index
      // matrix plus vtk.js's own computeOffsetIndex), so this is a real check
      // on page 13 -- measured delta 0.
      expect(p.vtkjs.librarySample.delta).toBeLessThanOrEqual(0);
      // FAILS IF: what page 14's own sampler GLSL reads out of its own
      // uploaded 3D texture stops matching the shared module's CPU value at
      // the same world point. Measured delta 0.
      expect(p.threejs.gpuSampleFloat.delta).toBeLessThanOrEqual(1e-5 * Math.max(p.threejs.invariants.fieldSpan, 1));
    });
  });

  test('INVARIANT (not parity evidence): both pages read the shared grid identically', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const a = await parityOf(pages.vtkjs.page);
      const b = await parityOf(pages.threejs.page);
      // FAILS IF: someone edits src/lib, or a page stops feeding the shared
      // functions the shipped arrays. NOTHING ELSE. Both pages call
      // probeGridNode and sampleGridTrilinear on the same Float32Array in the
      // same bundle, so these are bit-identical BY CONSTRUCTION -- this is the
      // plan's own Step 1 snippet, kept because it is nearly free and a
      // divergence would be alarming, and LABELLED because it is not evidence
      // that the two RENDERERS agree about anything. Task 8 must not quote it
      // as such.
      expect(a.invariants.fixedGridNode.bits).toBe(b.invariants.fixedGridNode.bits);
      expect(a.invariants.fixedGridNode.value).toBe(b.invariants.fixedGridNode.value);
      expect(a.invariants.fixedGridNode.world).toEqual(b.invariants.fixedGridNode.world);
      expect(a.invariants.interpolated.value).toBe(b.invariants.interpolated.value);
      expect(a.invariants.fieldSpan).toBe(b.invariants.fieldSpan);
      expect(a.caseId).toBe(b.caseId);
      expect(a.colourRange).toEqual(b.colourRange);
      expect(a.sliceRequestedZ).toBe(b.sliceRequestedZ);
    });
  });

  test('camera and volume placement agree between the renderers', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const pinned: Record<string, any> = {};
      for (const r of RENDERERS) {
        await pages[r].page.evaluate(pose => (window as any).__bench.parity.begin(pose), PICK_POSE);
        pinned[r] = await parityOf(pages[r].page);
      }
      const [a, b] = [pinned.vtkjs, pinned.threejs];

      // FAILS IF: either page stops pinning the parity surface, or pins a
      // different one. Every ray in this file is a FRACTION of this surface,
      // so a mismatch would silently compare two different rays.
      for (const r of RENDERERS) {
        expect(pinned[r].surface.drawingBufferWidth, `${r} did not pin the parity surface`).toBe(PARITY_SURFACE.width);
        expect(pinned[r].surface.drawingBufferHeight, `${r} did not pin the parity surface`).toBe(PARITY_SURFACE.height);
      }

      // FAILS IF: one renderer interprets the shared CameraPose differently --
      // a horizontal instead of a vertical field of view, a different aspect,
      // or (the trap this exists for) a y-up orbit against a z-up one. Three.js
      // defaults to y-up and vtk.js to its own frame; both must land on the
      // pose's z-up eye.
      expect(a.camera.fovDeg).toBe(b.camera.fovDeg);
      expect(a.camera.aspect).toBeCloseTo(b.camera.aspect, 6);
      expect(a.camera.eye[0]).toBeCloseTo(b.camera.eye[0], 6);
      expect(a.camera.eye[1]).toBeCloseTo(b.camera.eye[1], 6);
      expect(a.camera.eye[2]).toBeCloseTo(b.camera.eye[2], 6);
      expect(a.camera.target).toEqual(b.camera.target);
      expect(a.camera.up).toEqual(b.camera.up);

      // FAILS IF: a renderer's projection stops matching the fov and aspect it
      // reports -- e.g. a page setting a horizontal view angle, or an aspect
      // taken from the CSS box instead of the drawing buffer. Only the RATIO
      // is compared: measured, vtk.js's getProjectionMatrix is unnormalised
      // (396.5 / 1031.6) where three's is (1.43 / 3.73) for the same 30 degree
      // vertical fov, so the absolute entries are not comparable and are not
      // compared.
      for (const r of RENDERERS) {
        const p = pinned[r];
        expect(p.camera.projScaleY / p.camera.projScaleX, `${r} projection does not match its own aspect`)
          .toBeCloseTo(p.camera.aspect, 5);
      }

      // FAILS IF: either renderer places the volume or the slice somewhere
      // other than where the shipped grid says. Read off each renderer's OWN
      // objects -- vtk.js's stored image geometry, Three.js's box and plane
      // vertex bounding boxes -- so a page that translated its box, or built
      // it from the wrong span, fails here and the sampler checks would not.
      // Held to ALIGNMENT_TOLERANCE_M, the spike's own 5 cm fixed-alignment
      // bound (Global Constraints).
      const ALIGNMENT_TOLERANCE_M = 0.05;
      for (const which of ['volumeBounds', 'sliceBounds'] as const) {
        for (const corner of ['min', 'max'] as const) {
          const d = Math.hypot(
            a[which][corner][0] - b[which][corner][0],
            a[which][corner][1] - b[which][corner][1],
            a[which][corner][2] - b[which][corner][2]);
          expect(d, `${which}.${corner} is ${d} m apart between the renderers`).toBeLessThanOrEqual(ALIGNMENT_TOLERANCE_M);
        }
      }

      // FAILS IF: one page rasterises the opaque scene at a different sample
      // count from the other. This is the line the whole frame-time comparison
      // rests on: page 14 once shipped a single-sampled opaque target against
      // page 13's 4x canvas and manufactured a 12% "Three.js is faster"
      // result that did not exist.
      expect(a.surface.samples, 'a canvas reporting 0 samples would make this comparison vacuous')
        .toBeGreaterThan(0);
      expect(a.surface.samples).toBe(b.surface.samples);
      expect(b.depthTarget.samples).toBe(b.surface.samples);

      for (const r of RENDERERS) await pages[r].page.evaluate(() => (window as any).__bench.parity.end());
    });
  });

  test('picking: two independent ray casts resolve the same cell', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const picks: Record<string, any[]> = {};
      for (const r of RENDERERS) {
        picks[r] = await pages[r].page.evaluate(args => {
          const b = (window as any).__bench;
          b.parity.begin(args.pose);
          const out = args.rays.map((ray: number[]) => b.parity.pickAt(ray[0], ray[1]));
          b.parity.end();
          return out;
        }, {pose: PICK_POSE, rays: PICK_RAYS});
      }

      // Non-vacuity first: a suite where every ray missed would agree
      // perfectly and prove nothing.
      const hits = picks.vtkjs.filter(p => p.hit).length;
      expect(hits, 'no ray hit a building -- this comparison would pass vacuously').toBeGreaterThanOrEqual(10);
      expect(picks.vtkjs.filter(p => !p.hit).length, 'no ray missed -- the miss path is untested').toBeGreaterThanOrEqual(1);

      for (let i = 0; i < PICK_RAYS.length; i++) {
        const [u, v] = PICK_RAYS[i];
        const a = picks.vtkjs[i], b = picks.threejs[i];
        const where = `ray (${u}, ${v})`;
        // FAILS IF: vtkCellPicker and Raycaster disagree about which triangle
        // a ray hits, or about whether it hits anything. Two entirely separate
        // intersection implementations over two separate copies of the same
        // index space: vtk.js walks the polydata's cells and reads the marker
        // off the polydata's own cell data; Three.js returns a faceIndex and
        // the page reads the marker off the shipped cellObjectIndex. Nothing
        // shared decides the answer. This DID fail before page 13's picker
        // tolerance was normalised: at vtk.js's default tolerance the two
        // disagreed on 18 of 77 rays, including rays that hit no triangle at
        // all.
        expect(b.hit, `${where}: hit disagrees`).toBe(a.hit);
        if (!a.hit) continue;
        expect(b.cellId, `${where}: cell id disagrees`).toBe(a.cellId);
        expect(b.marker, `${where}: marker disagrees`).toBe(a.marker);
        // FAILS IF: the two pages resolve the same marker to different
        // identity. Note honestly: given the same marker this is
        // objectRefForCell compared with itself, so it is an INVARIANT --
        // what has power above is that the two pickers agreed on the marker.
        expect(b.sourceIndexes, `${where}: sourceIndexes disagree`).toEqual(a.sourceIndexes);
        expect(b.dtccIds, `${where}: dtccIds disagree`).toEqual(a.dtccIds);
        expect(b.traceability, `${where}: traceability disagrees`).toEqual(a.traceability);
        // FAILS IF: the two intersection routines land on different points of
        // the same triangle, or the two cameras put the ray somewhere
        // different. 5 cm is the spike's fixed-alignment bound; measured
        // agreement is under 1 cm.
        const d = Math.hypot(a.world[0] - b.world[0], a.world[1] - b.world[1], a.world[2] - b.world[2]);
        expect(d, `${where}: intersection points are ${d} m apart`).toBeLessThanOrEqual(0.05);
        expect(Math.abs(a.distanceM - b.distanceM), `${where}: hit distances disagree`).toBeLessThanOrEqual(0.05);
      }
    });
  });

  test('GPU-sampled values: each renderer\'s own shader against CPU truth', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const measure = async (r: Renderer) => pages[r].page.evaluate(args => {
        const b = (window as any).__bench;
        const p = b.probe.parity;
        const spanX = p.volumeBounds.max[0] - p.volumeBounds.min[0];
        const spanY = p.volumeBounds.max[1] - p.volumeBounds.min[1];
        const cx = (p.volumeBounds.max[0] + p.volumeBounds.min[0]) / 2;
        const cy = (p.volumeBounds.max[1] + p.volumeBounds.min[1]) / 2;
        const out: any[] = [];
        for (const [fx, fy] of args.probes as Array<[number, number]>) {
          const target: [number, number, number] = [cx + fx * spanX, cy + fy * spanY, p.sliceRequestedZ];
          b.parity.begin({target, radius: args.pose.radius,
            elevationDeg: args.pose.elevationDeg, azimuthDeg: args.pose.azimuthDeg});
          // Only the slice may contribute to this pixel: the volume would
          // composite over it, the streamlines could cross it, and a
          // translucent plane would be blended over terrain lit by each
          // renderer's own lights -- which would make this a comparison of
          // lighting, not of texture sampling.
          b.parity.setVolumeVisible(false);
          b.parity.setStreamlinesVisible(false);
          b.parity.setSliceOpaque(true);
          out.push({target, gpu: b.parity.pixelAt(0.5, 0.5), cpu: b.parity.sampleCpu(target)});
        }
        b.parity.end();
        return out;
      }, {probes: args_probes(), pose: SLICE_POSE});

      const a = await measure('vtkjs');
      const b = await measure('threejs');

      for (let i = 0; i < SLICE_PROBES.length; i++) {
        const where = `slice probe ${JSON.stringify(SLICE_PROBES[i])}`;
        // Non-vacuity: the three probes must actually span the colour ramp, or
        // three identical blues would agree for no reason.
        expect(a[i].target, `${where}: the two pages probed different world points`).toEqual(b[i].target);
        for (const [r, m] of [['vtkjs', a[i]], ['threejs', b[i]]] as const) {
          // FAILS IF: that renderer's own texture upload, its own sampler, its
          // own colour mapping or its own plane placement is wrong. This is
          // the GPU half of the comparison and it is entirely renderer-owned:
          // page 13 uploads a vtkImageData through vtkImageMapper and colours
          // it through a vtkColorTransferFunction; page 14 uploads a
          // DataTexture and colours it in its own GLSL. Only the CPU truth is
          // shared. IT DID FAIL: page 13 drew rgb 35,109,175 where the
          // colormap says 97,200,140, because vtkImageProperty maps scalars
          // over colorWindow/colorLevel (defaulting to 0..255) and not over
          // the transfer function's range -- so the colour-range control moved
          // the volume and left the slice almost untouched.
          for (const c of [0, 1, 2]) {
            expect(Math.abs(m.gpu[c] - m.cpu.rgb[c]),
              `${r} ${where}: drew rgb ${m.gpu.slice(0, 3)} where the shared colormap says ${m.cpu.rgb} `
              + `for value ${m.cpu.value}`).toBeLessThanOrEqual(2);
          }
        }
        // FAILS IF: the two renderers disagree about the colour of the same
        // world point on the same plane. Measured on chromium: bit-identical.
        for (const c of [0, 1, 2]) {
          expect(Math.abs(a[i].gpu[c] - b[i].gpu[c]),
            `${where}: vtk.js drew ${a[i].gpu.slice(0, 3)}, Three.js drew ${b[i].gpu.slice(0, 3)}`)
            .toBeLessThanOrEqual(2);
        }
      }
      // FAILS IF: the probes stop spanning the ramp, which would let three
      // identical colours pass the comparisons above for no reason.
      const spread = Math.max(...a.map(m => m.cpu.value)) - Math.min(...a.map(m => m.cpu.value));
      expect(spread, 'the three probes sample nearly the same value -- the colour comparison is vacuous')
        .toBeGreaterThan(1);
    });
  });

  test('occlusion: the volume stops at the opaque depth on both renderers', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const measure = async (r: Renderer) => pages[r].page.evaluate(args => {
        const b = (window as any).__bench;
        const lum = (p: number[]) => (p[0] + p[1] + p[2]) / 3;
        b.parity.begin(args.pose);
        const rays = args.rays as Array<[number, number]>;
        const picks = rays.map(([u, v]) => b.parity.pickAt(u, v));
        // Terrain, buildings and the background all go black and the slice and
        // streamlines are hidden, so each pixel below IS the volume's own
        // premultiplied contribution. See the note on parity.isolateVolume:
        // without this the measure is confounded by what is behind the ray,
        // and an earlier version of this very test passed with page 14's
        // opaque depth stop deleted.
        b.parity.isolateVolume(true);
        b.parity.setBuildingsVisible(true);
        b.parity.setVolumeVisible(false);
        const blackWith = rays.map(([u, v]) => b.parity.pixelAt(u, v));
        b.parity.setVolumeVisible(true);
        const withBuilding = rays.map(([u, v]) => b.parity.pixelAt(u, v));
        b.parity.setBuildingsVisible(false);
        const withoutBuilding = rays.map(([u, v]) => b.parity.pixelAt(u, v));
        b.parity.setVolumeVisible(false);
        const blackFree = rays.map(([u, v]) => b.parity.pixelAt(u, v));
        b.parity.end();
        return rays.map((ray, i) => ({
          ray, hit: picks[i].hit, distanceM: picks[i].distanceM,
          blackWith: blackWith[i].slice(0, 3), blackFree: blackFree[i].slice(0, 3),
          occluded: lum(withBuilding[i]), free: lum(withoutBuilding[i]),
        }));
      }, {pose: OCCLUSION_POSE, rays: OCCLUSION_RAYS});

      const a = await measure('vtkjs');
      const b = await measure('threejs');
      const ratios: Record<string, number[]> = {vtkjs: [], threejs: []};

      for (let i = 0; i < OCCLUSION_RAYS.length; i++) {
        const where = `ray ${JSON.stringify(OCCLUSION_RAYS[i])}`;
        for (const [r, m] of [['vtkjs', a[i]], ['threejs', b[i]]] as const) {
          // The ray's premise, re-measured every run rather than assumed.
          // FAILS IF: the scene, the tile or the camera changes so that these
          // rays no longer straddle a building -- which would leave the
          // comparison below measuring two identical conditions and passing
          // for nothing.
          expect(m.hit, `${r} ${where}: no building in this ray any more`).toBe(true);
          // FAILS IF: anything but the volume reaches the pixel. With the
          // volume off, an isolated frame must be EXACTLY black in both
          // conditions -- otherwise the numbers below are part background and
          // the whole measure is confounded again.
          expect(m.blackWith, `${r} ${where}: the isolated frame is not black with the building`).toEqual([0, 0, 0]);
          expect(m.blackFree, `${r} ${where}: the isolated frame is not black without the building`).toEqual([0, 0, 0]);
          // FAILS IF: there is no volume in this ray at all, in which case the
          // ratio below would be a division of two nothings.
          expect(m.occluded, `${r} ${where}: the occluded ray carries no volume at all`).toBeGreaterThan(5);

          // THE ASSERTION. FAILS IF: the renderer accumulates volume BEHIND
          // the opaque building. Removing the building lengthens the ray's
          // volume path to the far wall of the box, so the accumulated
          // contribution must rise; a renderer that ignored opaque depth would
          // return the SAME number in both conditions, i.e. ratio 1.00 exactly.
          // Page 14 stops each ray at a depth texture written by an opaque
          // prepass; vtk.js composites against its own depth buffer inside one
          // pass. Different mechanisms, one comparable outcome.
          // NEGATIVE-CONTROLLED: deleting page 14's `tFar = min(tFar,
          // opaqueViewZ / rayViewZ)` drives every ratio to 1.00 and fails here.
          const ratio = m.free / m.occluded;
          ratios[r].push(ratio);
          expect(ratio, `${r} ${where}: the volume contributes ${m.occluded.toFixed(1)} with the building and `
            + `${m.free.toFixed(1)} without it -- ratio ${ratio.toFixed(2)}, so the building is barely stopping `
            + 'the ray').toBeGreaterThan(OCCLUSION_MIN_RATIO);
        }
        // FAILS IF: the two pickers stop agreeing about where the occluder is,
        // which would mean the two pages are not comparing the same occlusion.
        expect(a[i].distanceM).toBeCloseTo(b[i].distanceM, 2);
      }

      const mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
      for (const r of RENDERERS) {
        // FAILS IF: the effect is only present on one ray. A mean over the
        // four keeps a single lucky ray from carrying the result.
        expect(mean(ratios[r]), `${r}: mean occlusion ratio over ${OCCLUSION_RAYS.length} rays`)
          .toBeGreaterThan(OCCLUSION_MEAN_RATIO);
      }
      // FAILS IF: the two renderers disagree about HOW MUCH the building
      // occludes. The absolute contributions are not compared -- two different
      // compositors with different step phases will not agree on those -- but
      // the outcome must be the same size, not merely the same sign.
      const ra = mean(ratios.vtkjs), rb = mean(ratios.threejs);
      expect(Math.max(ra, rb) / Math.min(ra, rb),
        `vtk.js's mean occlusion ratio is ${ra.toFixed(2)} and Three.js's is ${rb.toFixed(2)}`).toBeLessThan(2);
      console.log(`occlusion ratio (volume without the building / with it), isolated against black: `
        + RENDERERS.map((r, i) => `${r} ${ratios[r].map(x => x.toFixed(2)).join('/')} (mean ${(i === 0 ? ra : rb).toFixed(2)})`).join('; '));
    });
  });

  test('resource behaviour over 100 control cycles differs by renderer, as measured', async ({browser}) => {
    test.setTimeout(600_000);
    await withBothPages(browser, async pages => {
      const report: Record<string, any> = {};
      for (const r of RENDERERS) {
        const page = pages[r].page;
        // One warm cycle first: Three.js uploads a geometry's attribute
        // buffers lazily and page 13's transfer functions allocate on first
        // use, so the baseline is taken AFTER one full cycle, not at ready.
        await runCycles(page, 1, 0);
        const before = await glObjectsOf(page);
        let resizes = 0;
        for (let block = 0; block < CYCLE_BLOCKS; block++) {
          await runCycles(page, CYCLES_PER_BLOCK, block * CYCLES_PER_BLOCK + 1);
          const size = VIEWPORTS[(block + 1) % VIEWPORTS.length];
          const beforeBuffer = (await parityOf(page)).surface.drawingBufferWidth;
          await page.setViewportSize(size);
          await page.waitForFunction(
            w => (window as any).__bench.probe.parity.surface.drawingBufferWidth !== w, beforeBuffer, {timeout: 20_000});
          resizes++;
        }
        const after = await glObjectsOf(page);
        report[r] = {before, after, resizes,
          calls: await page.evaluate(() => Object.values((window as any).__bench.controlCalls as Record<string, number>)
            .reduce((x: number, y: number) => x + y, 0)),
          heap: await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? null)};
      }

      for (const r of RENDERERS) {
        const {before, after, resizes} = report[r];
        // FAILS IF: the cycles drove nothing -- a renamed control id would
        // turn a hundred cycles into a hundred no-ops, and every bound below
        // would then be satisfied by a page that simply sat still. Six
        // controls per cycle over 101 cycles (the warm one included).
        expect(report[r].calls, `${r}: the control cycles fired ${report[r].calls} callbacks`)
          .toBeGreaterThanOrEqual(6 * (CYCLE_BLOCKS * CYCLES_PER_BLOCK + 1));
        // The bound is PER RENDERER, set by what that renderer was measured to
        // do. vtk.js 36.12.1 leaks one texture, one framebuffer AND one
        // renderbuffer per drawing-buffer resize and never deletes them;
        // Three.js 0.185.1 leaks none. THAT DIFFERENCE IS A RESULT, not a bug
        // to normalise away, so it is encoded as two different bounds rather
        // than one loose one -- a single bound of `resizes` would let a future
        // Three.js regression of exactly one object per resize pass.
        const leaky = r === 'vtkjs' ? resizes : 0;
        // FAILS IF: vtk.js's leak stops tracking resizes (it would have to
        // become per-frame or per-control to exceed this), or Three.js starts
        // leaking at all. Read from glObjects, not from probe.resources: the
        // five keys src/lib declares leave out renderbuffers, the type vtk.js
        // was measured to leak alongside the other two.
        for (const key of ['textures', 'renderTargets', 'renderbuffers'] as const) {
          const delta = after[key] - before[key];
          expect(delta, `${r}: ${key} grew by ${delta} over ${CYCLE_BLOCKS * CYCLES_PER_BLOCK} control cycles `
            + `and ${resizes} resizes`).toBeGreaterThanOrEqual(0);
          expect(delta, `${r}: ${key} grew by ${delta} over ${resizes} resizes, past the ${leaky} this renderer `
            + 'was measured to grow by').toBeLessThanOrEqual(leaky);
        }
        // FAILS IF: anything the PAGE owns grows. Neither renderer has an
        // excuse here, so the bound is 0 on both.
        for (const key of ['buffers', 'listeners', 'observers'] as const) {
          expect(after[key], `${r}: page-owned ${key} moved across 100 cycles`).toBe(before[key]);
        }
      }

      // FAILS IF: vtk.js stops leaking per resize. Asserted as a POSITIVE
      // result, not merely bounded: the spike's second headline finding is
      // that these two renderers differ here, and a gate that only bounds the
      // leak would go green if the difference quietly vanished -- leaving
      // Task 8 citing a difference that is no longer there.
      const vtkGrowth = report.vtkjs.after.textures - report.vtkjs.before.textures;
      expect(vtkGrowth, `vtk.js grew ${vtkGrowth} textures over ${report.vtkjs.resizes} resizes; the measured `
        + 'behaviour is one per resize. If this is now 0, vtk.js has been fixed and NOTES.md is out of date.')
        .toBe(report.vtkjs.resizes);
      expect(report.threejs.after.textures - report.threejs.before.textures).toBe(0);

      // Chromium exposes performance.memory; firefox does not. Recorded when
      // present, never a reason to fail a browser.
      for (const r of RENDERERS) {
        console.log(`${r}: glObjects ${JSON.stringify(report[r].before)} -> ${JSON.stringify(report[r].after)} `
          + `over ${CYCLE_BLOCKS * CYCLES_PER_BLOCK} cycles and ${report[r].resizes} resizes; heap `
          + `${report[r].heap === null ? 'not exposed by this browser' : report[r].heap}`);
      }
    });
  });

  test('context loss: both stop measuring, and the two libraries tear down differently', async ({browser}) => {
    test.setTimeout(300_000);
    const after: Record<string, any> = {};
    const interruptible: Record<string, boolean> = {};
    // ONE page at a time, unlike every other test here, and for a measured
    // reason: forcing a real context loss on page 13 while a benchmark was in
    // flight took down the whole browser context, page 14 included, under
    // ANGLE/SwiftShader ("Failed to find context with id"). That is a
    // software-rasteriser property, not a renderer result, but it means the
    // two pages cannot share a browser context for this test.
    for (const r of RENDERERS) {
      const {page} = await openScientific(browser, r);
      try {
        const before = await glObjectsOf(page);
        // Whether a run can be INTERRUPTED at all on this browser, decided by
        // the browser and not by either renderer. createBenchmarkDriver awaits
        // a real macrotask (setTimeout 0, inside the GPU timer's readResult)
        // once per measured frame ONLY when a GpuTimer was supplied. Without
        // one its whole 210-frame loop runs in an unbroken microtask chain,
        // the queued webglcontextlost event is never delivered until the loop
        // ends, and driver.stop() therefore cannot stop anything. Firefox
        // exposes no EXT_disjoint_timer_query_webgl2, so this is not
        // hypothetical -- see the report below.
        interruptible[r] = await page.evaluate(() => {
          const canvas = document.querySelector('#host canvas') as HTMLCanvasElement | null;
          const gl = canvas?.getContext('webgl2') as WebGL2RenderingContext | null;
          return !!gl?.getExtension('EXT_disjoint_timer_query_webgl2');
        });
        // A benchmark is left running so "sampling stopped" is MEASURED rather
        // than assumed: the driver must come back with a short result.
        const result = page.evaluate(() => (window as any).__bench.runBenchmark()
          .then((x: any) => ({frames: x.cpuFrameTimesMs.length}), (e: Error) => ({error: String(e)})));
        // Wait for the run to be MEASURABLY in flight -- past the 30 warmup
        // frames, so a partial result is a non-empty one -- rather than for a
        // fixed number of seconds. Firefox caught the wall-clock version: a
        // whole 210-frame run finishes in about a second on a real GPU, so the
        // assertion below was being made against a benchmark that had already
        // returned all 180 frames, and it passed on chromium only because
        // SwiftShader is slow.
        await page.waitForFunction(
          () => (window as any).__bench.parity.framesRendered() > 40, null, {timeout: 60_000});
        const forced = await page.evaluate(() => {
          const canvas = document.querySelector('#host canvas') as HTMLCanvasElement | null;
          if (!canvas) return 'no-canvas';
          const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
          const ext = gl?.getExtension('WEBGL_lose_context') as {loseContext(): void} | null | undefined;
          if (!ext) {
            // A browser without the extension still has to be tested, not
            // skipped: the page's handler is wired to the event itself, so the
            // event is what gets dispatched.
            canvas.dispatchEvent(new Event('webglcontextlost', {cancelable: true}));
            return 'synthetic';
          }
          ext.loseContext();
          return 'lost';
        });
        expect(['lost', 'synthetic'], 'the page has no canvas to lose a context on').toContain(forced);
        await page.waitForFunction(
          () => (window as any).__bench.probe.scientific?.status === 'context-lost', null, {timeout: 30_000});
        after[r] = {
          route: forced, before,
          gl: await glObjectsOf(page),
          probe: await scientificOf(page),
          run: await result,
          failureVisible: await page.locator('#host > .failure').isVisible(),
          reloadVisible: await page.locator('#host > .failure button').isVisible(),
        };
      } finally {
        await page.close();
      }
    }

    for (const r of RENDERERS) {
      // FAILS IF: a page keeps reporting a valid measurement after its context
      // is gone, or stops showing the operator a way out. Both must do this;
      // the two different teardowns below are where they diverge.
      expect(after[r].probe.status, `${r} did not report context-lost`).toBe('context-lost');
      expect(after[r].probe.measurementValid, `${r} still claims a valid measurement`).toBe(false);
      expect(after[r].failureVisible, `${r} rendered no visible failure`).toBe(true);
      expect(after[r].reloadVisible, `${r} offered no reload control`).toBe(true);
      if (interruptible[r]) {
        // FAILS IF: attachContextLoss stops calling the driver's stop(), so a
        // benchmark keeps running on a dead context and reports a full
        // 180-frame measurement that never happened.
        expect(after[r].run.frames === undefined || after[r].run.frames < 180,
          `${r} completed a full benchmark on a lost context: ${JSON.stringify(after[r].run)}`).toBe(true);
      } else {
        // NOT A RENDERER RESULT, AND NOT SKIPPED EITHER. On a browser with no
        // EXT_disjoint_timer_query_webgl2 the shared BenchmarkDriver never
        // yields to the event loop, so the loss event is delivered only after
        // the run ends and the run therefore completes. Asserted as what it
        // is, rather than hidden behind a condition: the samples exist, and
        // the ONLY thing standing between them and being quoted as a valid
        // measurement is measurementValid, already asserted false above.
        // FAILS IF: this browser starts interrupting the run (then the branch
        // above should be taken) -- and, more usefully, this is the assertion
        // that will fail if src/lib's driver is ever fixed to yield, which is
        // the day this branch should be deleted.
        expect(after[r].run.frames, `${r}: with no GPU timer the driver cannot be interrupted, so the run was `
          + 'expected to complete').toBe(180);
        console.log(`FINDING (src/lib, not a renderer): ${r} could not be interrupted by context loss on this `
          + 'browser. createBenchmarkDriver only awaits a macrotask when a GpuTimer is supplied, so with no '
          + 'EXT_disjoint_timer_query_webgl2 its 210-frame loop never returns to the event loop, the queued '
          + 'webglcontextlost event is starved, and driver.stop() stops nothing. The run returned all 180 frames '
          + 'AFTER the context was lost. measurementValid is false, so the numbers cannot be quoted -- but '
          + '"sampling stopped" is not true here, and src/lib/scientific-probes.ts is where that would be fixed.');
      }
    }

    if (interruptible.vtkjs && interruptible.threejs) {
      // MEASURED RENDERER DIFFERENCE in how an in-flight benchmark ends.
      // Three.js: attachContextLoss calls driver.stop(), the loop exits at the
      // next frame boundary and the driver RESOLVES with the partial samples
      // it had. vtk.js: fs.delete() tears the render window down under the
      // running loop, so the very next renderFrame throws and the run REJECTS.
      // Either way the 180-frame measurement does not happen -- but they are
      // different behaviours and this suite states which is which rather than
      // letting one of them pass an `?? 0`.
      // FAILS IF: either behaviour changes -- in particular if vtk.js's run
      // started resolving with 180 frames, or Three.js's stopped resolving.
      expect(typeof after.threejs.run.frames, 'Three.js used to return the partial samples it had')
        .toBe('number');
      expect(after.threejs.run.frames).toBeLessThan(180);
      expect(after.vtkjs.run.error, 'vtk.js used to abort its in-flight frame loop on the deleted render window')
        .toBeTruthy();
      expect(after.vtkjs.run.frames).toBeUndefined();
    }

    // MEASURED RENDERER DIFFERENCE, asserted as itself and deliberately NOT
    // diffed as a leak: vtk.js's fs.delete() removes the canvas element from
    // the DOM, so page 13 reports 0 canvases; Three.js's renderer.dispose()
    // releases GPU resources and leaves the element, so page 14 reports 1.
    // FAILS IF: either library changes what it tears down.
    expect(after.vtkjs.probe.canvasCount, 'vtk.js used to remove its canvas on teardown').toBe(0);
    expect(after.threejs.probe.canvasCount, 'Three.js used to leave its canvas in the DOM').toBe(1);
    // FAILS IF: Three.js stops releasing its GL objects on dispose(). The
    // second measured teardown difference: renderer.dispose() deletes the
    // buffers it owns, vtk.js's teardown leaves its own allocated. Residual
    // counts after a lost context are bookkeeping, not live leaks, which is
    // why this is asserted as a DIFFERENCE and not as a leak on either side.
    expect(after.threejs.gl.buffers, 'Three.js used to delete every buffer on dispose()')
      .toBeLessThan(after.threejs.before.buffers);
    expect(after.vtkjs.gl.buffers, 'vtk.js used to leave its buffers allocated after teardown')
      .toBe(after.vtkjs.before.buffers);
    console.log('context-loss teardown, GL objects before -> after: '
      + RENDERERS.map(r => `${r} ${JSON.stringify(after[r].before)} -> ${JSON.stringify(after[r].gl)} `
        + `(via ${after[r].route}, benchmark returned ${JSON.stringify(after[r].run)})`).join('; '));
  });

  test('frame times were measured at the pinned 1280x720 surface on both pages', async ({browser}) => {
    test.setTimeout(600_000);
    await withBothPages(browser, async pages => {
      const surfaces: Record<string, any> = {};
      for (const r of RENDERERS) {
        await pages[r].page.evaluate(() => (window as any).__bench.runBenchmark());
        surfaces[r] = await pages[r].page.evaluate(() => ({
          benchmark: (window as any).__bench.probe.renderSurfaceBenchmark,
          interactive: (window as any).__bench.probe.renderSurfaceInteractive,
          probe: (window as any).__bench.probe.scientific,
        }));
      }
      for (const r of RENDERERS) {
        const s = surfaces[r];
        // FAILS IF: a page's benchmark ran at whatever size its header left
        // the canvas. Header text decides canvas height, the two pages' headers
        // are different lengths, and frame time scales with pixels -- so this
        // is ASSERTED rather than trusted, which is only possible because both
        // pages keep the benchmark-phase record instead of letting the
        // interactive one overwrite it.
        expect(s.benchmark.phase).toBe('benchmark');
        expect(s.benchmark.drawingBufferWidth, `${r} did not benchmark at the pinned surface`).toBe(BENCHMARK_SURFACE.width);
        expect(s.benchmark.drawingBufferHeight, `${r} did not benchmark at the pinned surface`).toBe(BENCHMARK_SURFACE.height);
        expect(s.probe.benchmark.forcedFrames).toBe(180);
        expect(s.probe.benchmark.cpuFrameTimesMs.length).toBe(180);
        // FAILS IF: the surface is not restored after a run, which would leave
        // every later interactive measurement at the benchmark size.
        expect(s.interactive.phase).toBe('interactive');
      }
      // FAILS IF: the two pages ask their contexts for different attributes,
      // which would make the one-pixel readback that ends each frame cost
      // different amounts (an MSAA resolve on one and not the other).
      expect(surfaces.vtkjs.benchmark.contextAttributes.antialias)
        .toBe(surfaces.threejs.benchmark.contextAttributes.antialias);
      // NO ASSERTION COMPARES THE FRAME TIMES THEMSELVES, and that is
      // deliberate. Measured p50: Three.js ~151 ms, vtk.js ~153 ms,
      // independently re-measured at 145.6 and 149.1. There is no winner on
      // this scene, and an assertion implying one would be the suite inventing
      // a result. The numbers are logged for Task 8 instead.
      const p50 = (xs: number[]) => [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
      console.log('frame time p50 at 1280x720, NOT A MEASUREMENT OF RECORD -- one run each, taken while the rest '
        + 'of this suite is running on the same machine, so the two are not even isolated from each other. NO '
        + 'WINNER: the isolated measurement of record is in NOTES.md (Three.js ~151 ms, vtk.js ~153 ms, '
        + 'independently re-measured at 145.6 and 149.1). This line exists to show the run happened, not to rank '
        + 'the renderers. '
        + RENDERERS.map(r => `${r} ${p50(surfaces[r].probe.benchmark.cpuFrameTimesMs).toFixed(1)} ms`).join(', '));
    });
  });

  test('the two pages expose the same controls, cases and readouts', async ({browser}) => {
    await withBothPages(browser, async pages => {
      const surface = async (r: Renderer) => pages[r].page.evaluate(() => ({
        controls: [...document.querySelectorAll('.controls [id]')].map(el => el.id).sort(),
        cases: [...document.querySelectorAll('#data-case option')].map(o => (o as HTMLOptionElement).value),
        readouts: [...document.querySelectorAll('.readouts [data-label]')]
          .map(el => (el as HTMLElement).dataset.label).sort(),
        slider: (() => {
          const el = document.querySelector('#slice-z') as HTMLInputElement;
          return {min: el.min, max: el.max, step: el.step, value: el.value};
        })(),
      }));
      const a = await surface('vtkjs'), b = await surface('threejs');
      // PAGE PARITY, NOT RENDERER PARITY -- and it is here rather than in
      // scientificPageChecks because it is a comparison, not a per-page
      // property. FAILS IF: the two pages drift apart on the controls, the
      // case ids (the middle dot included), the readout labels or the slider's
      // own range. Every other comparison in this file joins on these, so a
      // drift here would silently make them compare different things.
      expect(a.controls).toEqual(b.controls);
      expect(a.cases).toEqual(b.cases);
      expect(a.readouts).toEqual(b.readouts);
      expect(a.slider).toEqual(b.slider);
      expect(a.cases.length).toBe(3);

      // FAILS IF: one page's controls stop reaching its scene. Driven through
      // the real DOM on both, and checked against each page's own published
      // state rather than against the other page's.
      for (const r of RENDERERS) {
        const page = pages[r].page;
        await setRange(page, '#slice-z', 24);
        await page.selectOption('#data-case', a.cases[1]);
        const p = await parityOf(page);
        expect(p.sliceRequestedZ, `${r}: the slice control did not move the plane`).toBeCloseTo(24, 6);
        expect(p.caseId, `${r}: the case control did not switch the case`).toBe(a.cases[1]);
      }
      // FAILS IF: the same control sequence leaves the two pages in different
      // states -- the colour range is derived from the active case's own value
      // range, so this compares what each renderer's scene is actually set to.
      expect((await parityOf(pages.vtkjs.page)).colourRange)
        .toEqual((await parityOf(pages.threejs.page)).colourRange);
    });
  });

  test('corrupt and missing artifacts fail visibly on both pages', async ({browser}) => {
    for (const r of RENDERERS) {
      for (const mode of ['missing', 'corrupt'] as const) {
        const page = await browser.newPage({viewport: VIEWPORTS[0]});
        try {
          await page.route('**/scientific.bin', async route => {
            if (mode === 'missing') return route.fulfill({status: 404, body: 'gone'});
            // Valid length, wrong bytes: the manifest's hash must catch it.
            const response = await route.fetch();
            const body = Buffer.from(await response.body());
            body[Math.floor(body.length / 2)] ^= 0xff;
            return route.fulfill({response, body});
          });
          await page.goto(`/${SLUG[r]}/`);
          await page.waitForFunction(() => (window as any).__bench?.ready === true, null, {timeout: 60_000});
          // FAILS IF: a page renders an empty or partial scene instead of
          // saying it could not load the artifact -- or, worse, comes up
          // "ready" on data whose hash does not match the manifest. Both
          // renderers must refuse the same two artifacts the same way.
          const failure = page.locator('#host > .failure');
          await expect(failure, `${r} did not fail visibly on a ${mode} artifact`).toBeVisible();
          await expect(failure.locator('button')).toBeVisible();
          await expect(failure).toContainText(SLUG[r]);
          const probe = await page.evaluate(() => (window as any).__bench.probe.scientific);
          expect(probe, `${r} published a scientific probe from a ${mode} artifact`).toBeFalsy();
        } finally {
          await page.close();
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Resize and device-pixel-ratio. Run at DPR 1 here and again at DPR 2 below.

function resizeSuite(dprLabel: string) {
  test(`resize 1280x800 -> 1600x900 keeps both renderers correct (${dprLabel})`, async ({browser}) => {
    test.setTimeout(300_000);
    await withBothPages(browser, async pages => {
      const readAll = async () => {
        const out: Record<string, any> = {};
        for (const r of RENDERERS) out[r] = await parityOf(pages[r].page);
        return out;
      };
      const ids = async () => {
        const out: Record<string, any> = {};
        for (const r of RENDERERS) {
          out[r] = await pages[r].page.evaluate(() => {
            const b = (window as any).__bench;
            b.selectCell(b.markers.multiSourceCell);
            return b.probe.scientific.selectedObject;
          });
        }
        return out;
      };
      const before = await readAll();
      const idsBefore = await ids();

      for (const r of RENDERERS) await pages[r].page.setViewportSize({width: 1600, height: 900});
      for (const r of RENDERERS) {
        await pages[r].page.waitForFunction(
          w => (window as any).__bench.probe.parity.surface.drawingBufferWidth !== w,
          before[r].surface.drawingBufferWidth, {timeout: 20_000});
      }
      const after = await readAll();
      const idsAfter = await ids();

      for (const r of RENDERERS) {
        const s = after[r].surface;
        // FAILS IF: a renderer stops tracking the device pixel ratio, or
        // resizes its drawing buffer without updating the camera -- which
        // would stretch the scene and leave every ray fraction in this file
        // pointing somewhere else. Both are read back off each renderer's own
        // objects.
        expect(s.drawingBufferWidth, `${r} drawing buffer does not match css * dpr after resize`)
          .toBe(Math.floor(s.cssWidth * s.devicePixelRatio));
        expect(after[r].camera.aspect, `${r} camera aspect does not match its drawing buffer`)
          .toBeCloseTo(s.drawingBufferWidth / s.drawingBufferHeight, 4);
        expect(s.drawingBufferWidth).toBeGreaterThan(before[r].surface.drawingBufferWidth);
        // FAILS IF: an identity readout changes because the window changed
        // size. Nothing about a marker depends on the viewport, which is
        // exactly why a page that rebuilt its lookup on resize would be caught
        // here and nowhere else.
        expect(idsAfter[r]).toEqual(idsBefore[r]);
        // FAILS IF: a numeric probe moves with the window.
        expect(after[r].invariants.fixedGridNode.bits).toBe(before[r].invariants.fixedGridNode.bits);
        expect(after[r].invariants.interpolated.value).toBe(before[r].invariants.interpolated.value);
      }
      // FAILS IF: page 14's depth target stops following the drawing buffer --
      // the volume pass reconstructs opaque depth from it, so a stale size
      // would sample the wrong texels and the occlusion would silently rot.
      // vtk.js owns no such target, which is asserted as null rather than
      // skipped.
      expect(before.vtkjs.depthTarget).toBeNull();
      expect(after.vtkjs.depthTarget).toBeNull();
      expect(after.threejs.depthTarget.width).toBe(after.threejs.surface.drawingBufferWidth);
      expect(after.threejs.depthTarget.height).toBe(after.threejs.surface.drawingBufferHeight);
      // FAILS IF: the two renderers end up with different drawing surfaces for
      // the same viewport, which would make every later comparison apples to
      // oranges.
      expect(after.vtkjs.surface.drawingBufferWidth).toBe(after.threejs.surface.drawingBufferWidth);
      expect(after.vtkjs.surface.devicePixelRatio).toBe(after.threejs.surface.devicePixelRatio);
      console.log(`${dprLabel}: drawing buffer after resize `
        + RENDERERS.map(r => `${r} ${after[r].surface.drawingBufferWidth}x${after[r].surface.drawingBufferHeight}`).join(', '));
    });
  });
}

test.describe('cross-renderer, dpr 1', () => {
  test.slow();
  resizeSuite('dpr 1');
});

test.describe('cross-renderer, dpr 2', () => {
  test.slow();
  test.use({deviceScaleFactor: 2});
  resizeSuite('dpr 2');
});

// ---------------------------------------------------------------------------

/** SLICE_PROBES, passed into the page. Kept as a function so the constant is
 *  declared once above and serialised here. */
function args_probes(): Array<[number, number]> { return SLICE_PROBES; }

/** Sets a range input through the DOM and fires the page's own handler. */
async function setRange(page: Page, selector: string, value: number): Promise<void> {
  await page.locator(selector).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.value = String(v);
    input.dispatchEvent(new Event('input'));
  }, value);
}

/**
 * `count` deterministic control cycles, driven through each page's own control
 * handlers. `seed` makes the sequence a pure function of the cycle index, so
 * the hundredth cycle is the same on both pages and in both browsers.
 */
async function runCycles(page: Page, count: number, seed: number): Promise<void> {
  await page.evaluate(args => {
    const b = (window as any).__bench;
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
    return b.controlCalls;
  }, {count, seed});
}
