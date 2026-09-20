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
 *      CORRECTED AT REVIEW: this said "genuinely different mechanisms". It is
 *      the SAME mechanism on both — opaque geometry into a depth texture, the
 *      volume ray clamped against it. vtk.js does it inside the library
 *      (vtkOpenGLVolumeMapper's //VTK::ZBuffer::Impl substitution,
 *      `dists.y = min(zdepth,dists.y)`); page 14 does it by hand with an
 *      offscreen target and a reconstructed view distance. What differs is
 *      VENDORED versus HAND-WRITTEN, which is a maintenance-burden fact and
 *      not an architectural one. Task 9 must not claim vtk.js needs no depth
 *      prepass.
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
 * page for it. Offsets are fractions of the ACTIVE case's own x/y span, taken
 * from that case's published volumeBounds.
 *
 * Run over ALL THREE CASES, which is not decoration. smoke.speed is
 * BIT-IDENTICALLY Z-INVARIANT on this tile -- moving a sample 1.29 m in z
 * changes it by 8.9e-16 and the drawn colour by 0 of 255 -- so a comparison
 * that only ever ran on it had no power whatever over the z axis, the exact
 * axis Task 5's review singled out ("cross-check on PRESSURE, never speed").
 * The same 1.29 m moves pressure by 1-2 and heat by 9, both outside the 2/255
 * tolerance below. The heat case also puts the real dtcc-sim grid -- different
 * dims, origin, spacing and a separate upload -- under the pixel comparison,
 * which the brief named and the first version of this suite never reached.
 *
 * The offsets were chosen by measurement so that EVERY probe can see the
 * colour-window defect this comparison found, on every case. The centre of the
 * grid cannot: smoke.speed reads 0.249 there against a 0.18..11.21 range, so
 * the correct ramp position (0.006) and the defect's (0.001) round to the same
 * colour, and a probe there passed with the fix reverted.
 */
const SLICE_PROBES: Array<[number, number]> = [[-0.4, -0.1], [0.25, -0.2], [-0.3, 0.3]];
/**
 * Colour-range fractions the comparison runs at. The default window plus a
 * narrowed one, because the colour-window defect was found and fixed at the
 * DEFAULT range only -- a re-break confined to non-default windows would have
 * passed a regression test that never moved the sliders.
 */
const SLICE_WINDOWS: Array<[number, number]> = [[0, 1], [0.2, 0.8]];
const SLICE_POSE = {radius: 420, elevationDeg: 75, azimuthDeg: 35};

/**
 * The occlusion pose and rays. Every ray was selected by measurement against
 * three stated criteria, not by looking for ones that pass:
 *   (a) both pages' pickers report a building hit at the same distance;
 *   (b) with the buildings hidden the pixel is the CLEAR BACKGROUND on both
 *       pages -- so the building is the ray's only opaque occluder, and hiding
 *       it lengthens the volume path all the way to the far wall of the box;
 *   (c) the lit building face is not near-black, because an earlier version of
 *       this measure was a colour difference and a near-black background
 *       inflates one.
 * Two adjacent rays -- one hitting a building, one missing it -- were tried
 * first and rejected by measurement: in a dense city the neighbouring ray hits
 * terrain at almost the same depth, and the two gave IDENTICAL deltas.
 *
 * `expected` is each ray's MEASURED ratio, pinned rather than floored, and the
 * reason is the most important thing in this file. A floor of 1.15 with a mean
 * floor of 1.3 and a cross-page bound of 2x PASSED a break of the very
 * mechanism it exists to test: with page 14's ray allowed to overshoot the
 * opaque depth by 8 m -- eight metres of volume rendered THROUGH a solid
 * building on every ray -- the ratios fell to 1.85/1.22/1.32/1.54 and every
 * one of those gates was still satisfied. WORSE, THE CROSS-PAGE BOUND IMPROVED
 * UNDER THE REGRESSION (1.01 against the healthy 1.20): a floor-and-bound gate
 * REWARDED the break. Bracketed: +15 m was caught by exactly one ray, and only
 * a 1.5x overshoot or outright deletion (ratio 1.00) failed loudly, so the old
 * gate's detection threshold sat somewhere between 8 and 15 m of depth error
 * on a 500x500x80 m scene.
 *
 * Pinning is defensible here because these ratios are DETERMINISTIC, which is
 * a measurement and not a hope: identical to two decimal places across
 * chromium/SwiftShader and firefox on an Apple GPU, and across four
 * independent sessions (two of mine, two of the reviewer's). +/-10% is wide
 * enough to absorb a different rasteriser and tight enough that the 8 m break
 * (-17%, -15%, -11%, -16%) fails on every ray.
 *
 * If a legitimate change moves these: RE-MEASURE AND RE-PIN, and say in the
 * commit which renderer moved and why. Do not widen the tolerance.
 */
const OCCLUSION_POSE = {target: [0, 0, 40] as [number, number, number], radius: 520, elevationDeg: 12, azimuthDeg: 20};
const OCCLUSION_RAYS: Array<{u: number; v: number; expected: Record<Renderer, number>}> = [
  {u: 0.11, v: 0.84, expected: {vtkjs: 1.66, threejs: 2.22}},
  {u: 0.14, v: 0.90, expected: {vtkjs: 1.31, threejs: 1.43}},
  {u: 0.17, v: 0.86, expected: {vtkjs: 1.31, threejs: 1.49}},
  {u: 0.32, v: 0.90, expected: {vtkjs: 1.55, threejs: 1.84}},
];
/** Mean over the four rays, pinned the same way. */
const OCCLUSION_MEAN: Record<Renderer, number> = {vtkjs: 1.46, threejs: 1.75};
/** How far the two renderers' mean occlusion ratios sit apart, pinned because
 *  the old "within 2x" bound was satisfied MORE comfortably by the broken
 *  build (1.01) than by the healthy one (1.20). */
const OCCLUSION_CROSS_PAGE = 1.20;
const OCCLUSION_TOLERANCE = 0.10;

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

      // FAILS IF: vtk.js grows a page-OWNED depth target, or page 14 stops
      // using a depth prepass.
      // This asymmetry is about OWNERSHIP, not mechanism. Both renderers clamp
      // the volume ray against an opaque-depth texture: vtk.js does it inside
      // vtkOpenGLVolumeMapper, which substitutes //VTK::ZBuffer::Impl with a
      // zBufferTexture read and `dists.y = min(zdepth,dists.y)`, and page 14
      // does the same thing by hand. So the null here means "no target THIS
      // PAGE owns", never "no depth prepass". An earlier version of this
      // comment said vtk.js composites in one pass and Three.js needs a depth
      // texture "to do the same thing" -- that reading would have become a
      // maintenance-burden conclusion in Task 9, and it is wrong.
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

      // PAGE-DRIFT GUARD, NOT RENDERER EVIDENCE -- reclassified at review, and
      // the old comment here claimed more than the code does. FAILS IF: a page
      // stops consuming poseToEye's result and derives its own eye instead.
      // That is all. Both pages assign the SHARED poseToEye(pose) value
      // straight into their camera (13:applyPose, 14:applyPose) and the parity
      // probe reads those same numbers back out, so eye/target/up/fovDeg
      // cannot differ for any RENDERER reason -- only a page edit moves them.
      // THE ACTUAL CAMERA EVIDENCE IS THE PICKING SWEEP BELOW: a camera that
      // orbited y instead of z would move every one of its twenty rays, and
      // that control reproduces. Task 8 should cite the picking sweep, not
      // these four lines, as proof the two paths share a camera.
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
    test.setTimeout(300_000);
    await withBothPages(browser, async pages => {
      const measure = async (r: Renderer) => pages[r].page.evaluate(args => {
        const b = (window as any).__bench;
        const fire = (id: string, value: string, event: string) => {
          const el = document.querySelector(id) as HTMLInputElement | HTMLSelectElement;
          (el as HTMLInputElement).value = value;
          el.dispatchEvent(new Event(event));
        };
        const cases = [...document.querySelectorAll('#data-case option')].map(o => (o as HTMLOptionElement).value);
        const out: any[] = [];
        for (const caseId of cases) {
          fire('#data-case', caseId, 'change');
          for (const [lo, hi] of args.windows as Array<[number, number]>) {
            fire('#range-low', String(lo), 'input');
            fire('#range-high', String(hi), 'input');
            // Read the ACTIVE case's own extent: the heat grid has different
            // dims, origin and spacing from the smoke grid, so a probe offset
            // is only the same world point on both pages if each page resolves
            // it against the case it is actually showing.
            const p = b.probe.parity;
            const cx = (p.volumeBounds.max[0] + p.volumeBounds.min[0]) / 2;
            const cy = (p.volumeBounds.max[1] + p.volumeBounds.min[1]) / 2;
            const spanX = p.volumeBounds.max[0] - p.volumeBounds.min[0];
            const spanY = p.volumeBounds.max[1] - p.volumeBounds.min[1];
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
              out.push({caseId, window: [lo, hi], offset: [fx, fy], target,
                gpu: b.parity.pixelAt(0.5, 0.5), cpu: b.parity.sampleCpu(target)});
            }
          }
        }
        b.parity.end();
        return out;
      }, {probes: SLICE_PROBES, windows: SLICE_WINDOWS, pose: SLICE_POSE});

      const a = await measure('vtkjs');
      const b = await measure('threejs');
      expect(a.length).toBe(3 * SLICE_WINDOWS.length * SLICE_PROBES.length);
      expect(b.length).toBe(a.length);

      const valuesByCase: Record<string, number[]> = {};
      for (let i = 0; i < a.length; i++) {
        const where = `${a[i].caseId} window ${JSON.stringify(a[i].window)} probe ${JSON.stringify(a[i].offset)}`;
        // FAILS IF: the two pages resolved the same offset to different world
        // points -- which is what would happen if one of them read the wrong
        // case's extent after a switch.
        expect(a[i].target, `${where}: the two pages probed different world points`).toEqual(b[i].target);
        // INVARIANT, not parity evidence: both sides are sampleGridTrilinear over
        // the same Float32Array at a point the line above already asserted equal,
        // so this can only fail if src/lib is edited. Kept because it is free.
        expect(a[i].cpu.value, `${where}: INVARIANT -- the shared sampler disagrees between the pages`).toBe(b[i].cpu.value);
        (valuesByCase[a[i].caseId] ??= []).push(a[i].cpu.value);
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
        // world point on the same plane. Measured on chromium and firefox:
        // every channel within 1 of 255, most bit-identical.
        for (const c of [0, 1, 2]) {
          expect(Math.abs(a[i].gpu[c] - b[i].gpu[c]),
            `${where}: vtk.js drew ${a[i].gpu.slice(0, 3)}, Three.js drew ${b[i].gpu.slice(0, 3)}`)
            .toBeLessThanOrEqual(2);
        }
      }
      // FAILS IF: a case's probes stop spanning its range, which would let
      // three identical colours satisfy every comparison above for no reason.
      for (const [caseId, values] of Object.entries(valuesByCase)) {
        const spread = Math.max(...values) - Math.min(...values);
        expect(spread, `${caseId}: the probes sample nearly the same value -- the comparison is vacuous there`)
          .toBeGreaterThan(1);
      }
      console.log('GPU-sampled slice colour, worst channel delta against the shared colormap over '
        + `${a.length} probes (3 cases x ${SLICE_WINDOWS.length} colour windows x ${SLICE_PROBES.length} points): `
        + RENDERERS.map((r, k) => `${r} ${Math.max(...(k === 0 ? a : b).map((m: any) =>
          Math.max(...[0, 1, 2].map(c => Math.abs(m.gpu[c] - m.cpu.rgb[c])))))}`).join(', '));
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
      }, {pose: OCCLUSION_POSE, rays: OCCLUSION_RAYS.map(r => [r.u, r.v] as [number, number])});

      const a = await measure('vtkjs');
      const b = await measure('threejs');
      const ratios: Record<string, number[]> = {vtkjs: [], threejs: []};

      for (let i = 0; i < OCCLUSION_RAYS.length; i++) {
        const where = `ray (${OCCLUSION_RAYS[i].u}, ${OCCLUSION_RAYS[i].v})`;
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
          // Both renderers clamp the ray against an opaque depth texture --
          // page 14 in its own GLSL, vtk.js in vtkOpenGLVolumeMapper's
          // //VTK::ZBuffer::Impl substitution. Same mechanism, one vendored
          // and one hand-written; this compares the outcome.
          // NEGATIVE-CONTROLLED ON BOTH SIDES, symmetrically: deleting page
          // 14's `tFar = min(tFar, opaqueViewZ / rayViewZ)` drives its ratios
          // to 1.00, and neutralising vtk.js's own `dists.y = min(zdepth,
          // dists.y)` in the built chunk drives page 13's to 1.00 (105.7 with
          // the building, 105.7 without).
          const ratio = m.free / m.occluded;
          ratios[r].push(ratio);
          const want = OCCLUSION_RAYS[i].expected[r];
          const detail = `${r} ${where}: the volume contributes ${m.occluded.toFixed(1)} with the building and `
            + `${m.free.toFixed(1)} without it -- ratio ${ratio.toFixed(2)} against the measured ${want.toFixed(2)}`;
          expect(ratio, `${detail}. BELOW the pin: the building is stopping the ray LESS than it was measured to. `
            + 'A ray that overshoots the opaque depth lands here -- 8 m of overshoot on a 500x500x80 m scene moves '
            + 'these ratios 11-17% down, which is exactly what this tolerance exists to catch.')
            .toBeGreaterThan(want * (1 - OCCLUSION_TOLERANCE));
          expect(ratio, `${detail}. ABOVE the pin. Not automatically a defect -- a tighter depth stop would land `
            + 'here too -- but it is a change in a measured renderer property, so RE-MEASURE AND RE-PIN rather '
            + 'than widening the tolerance.')
            .toBeLessThan(want * (1 + OCCLUSION_TOLERANCE));
        }
        // FAILS IF: the two pickers stop agreeing about where the occluder is,
        // which would mean the two pages are not comparing the same occlusion.
        expect(a[i].distanceM).toBeCloseTo(b[i].distanceM, 2);
      }

      const mean = (xs: number[]) => xs.reduce((x, y) => x + y, 0) / xs.length;
      for (const r of RENDERERS) {
        // FAILS IF: the effect drifts on the whole set rather than on one ray.
        expect(mean(ratios[r]), `${r}: mean occlusion ratio over ${OCCLUSION_RAYS.length} rays is `
          + `${mean(ratios[r]).toFixed(2)} against the measured ${OCCLUSION_MEAN[r].toFixed(2)}`)
          .toBeGreaterThan(OCCLUSION_MEAN[r] * (1 - OCCLUSION_TOLERANCE));
        expect(mean(ratios[r])).toBeLessThan(OCCLUSION_MEAN[r] * (1 + OCCLUSION_TOLERANCE));
      }
      // FAILS IF: the two renderers stop occluding by the same relative
      // amount. PINNED, not bounded: the old "within 2x" bound was satisfied
      // MORE comfortably by an 8 m depth overshoot (1.01) than by the healthy
      // build (1.20), so it rewarded the regression it existed to catch.
      const ra = mean(ratios.vtkjs), rb = mean(ratios.threejs);
      const across = Math.max(ra, rb) / Math.min(ra, rb);
      expect(across, `vtk.js's mean occlusion ratio is ${ra.toFixed(2)} and Three.js's is ${rb.toFixed(2)}, `
        + `which puts them ${across.toFixed(2)}x apart against the measured ${OCCLUSION_CROSS_PAGE.toFixed(2)}x`)
        .toBeGreaterThan(OCCLUSION_CROSS_PAGE * (1 - OCCLUSION_TOLERANCE));
      expect(across).toBeLessThan(OCCLUSION_CROSS_PAGE * (1 + OCCLUSION_TOLERANCE));
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
        report[r] = {before, after, resizes, parity: await parityOf(page),
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
        // FAILS IF: a control's callback runs but never reaches the scene.
        // controlCalls above counts CALLBACKS; these are the scene states the
        // last cycle should have left behind, read back off each renderer's
        // own actor, mesh and uniform. Without them a page whose opacity and
        // streamline handlers were wired to nothing would satisfy every bound
        // in this test. Recomputed from the same formula runCycles uses.
        const last = CYCLE_BLOCKS * CYCLES_PER_BLOCK;
        expect(report[r].parity.opacityScale, `${r}: the opacity control did not reach the scene`)
          .toBeCloseTo(((last * 11) % 100) / 100, 6);
        expect(report[r].parity.streamlinesVisible, `${r}: the streamline toggle did not reach the scene`)
          .toBe(last % 2 === 0);
        // Weaker than the two above ON PURPOSE, and labelled so: sliceRequestedZ
        // is the REQUESTED height on both pages, so this proves the handler ran
        // and stored the value, not that the drawn plane moved. The rendered-z
        // witness is sliceGeometry() in scientificPageChecks, which asserts
        // renderedZ === requestedZ against the page's own lattice.
        expect(report[r].parity.sliceRequestedZ, `${r}: the slice control did not store the requested height`)
          .toBeCloseTo(4 + (last * 7) % 72, 6);
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
    const hasGpuTimer: Record<string, boolean> = {};
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
        // Recorded, not branched on any more. This used to decide whether a
        // run could be interrupted at all: createBenchmarkDriver's only
        // macrotask was the setTimeout(0) inside the GPU timer's readResult,
        // so on a browser with no EXT_disjoint_timer_query_webgl2 the whole
        // 210-frame loop ran in one unbroken microtask chain, the queued
        // webglcontextlost event was starved and driver.stop() stopped
        // nothing. MEASURED ON FIREFOX: both pages returned all 180 frames
        // after the context was lost. src/lib/scientific-probes.ts now awaits
        // one real macrotask per frame, outside the timing window, so the
        // assertion below holds on BOTH browsers and this flag is only
        // reported.
        hasGpuTimer[r] = await page.evaluate(() => {
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
      // FAILS IF: attachContextLoss stops calling the driver's stop(), or the
      // driver stops yielding to the event loop -- either way a benchmark
      // keeps running on a dead context and reports a full 180-frame
      // measurement that never happened. UNCONDITIONAL now: it used to be
      // branched on whether this browser exposes a GPU timer, because without
      // one the driver could not be interrupted at all. That was a real defect
      // in src/lib and it has been FIXED rather than documented, so firefox is
      // now held to the same assertion as chromium.
      expect(after[r].run.frames === undefined || after[r].run.frames < 180,
        `${r} completed a full benchmark on a lost context: ${JSON.stringify(after[r].run)} `
        + `(this browser ${hasGpuTimer[r] ? 'has' : 'has no'} EXT_disjoint_timer_query_webgl2)`).toBe(true);
    }

    {
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
      // SECOND p50 DEFINITION IN THIS REPO, cross-referenced so the two cannot
      // drift apart unnoticed. This is the UPPER median (index 90 of 180);
      // scripts/measure-scientific.ts's `percentile` is nearest-rank (index
      // 89) and is the one the measurement document quotes. Measured delta on
      // real runs: 0.0-0.2 ms. They are not merged into src/lib because that
      // file is frozen for Task 8, and because this number is a console log
      // that is explicitly NOT a measurement of record while that one is. If
      // you change either, change the comment in the other.
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
      // Non-vacuity: two empty lists are equal. FAILS IF: the selectors stop
      // matching anything, which would turn all four comparisons above into
      // assertions about nothing.
      expect(a.cases.length).toBe(3);
      expect(a.controls.length, 'no controls matched the selector').toBeGreaterThanOrEqual(7);
      expect(a.readouts.length, 'no readout rows matched the selector').toBeGreaterThanOrEqual(9);

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
      // INVARIANT, relabelled at review: activeColourRange() is a pure
      // function of the manifest's value range and two control values, written
      // identically in both pages, so this compares that function with itself
      // and can only fail if one page's copy is edited. It is a useful drift
      // guard on that copy -- both pages derive the range the same way -- and
      // it is NOT evidence that the two renderers are in the same state. The
      // pixel comparison in the GPU-value test is what shows that.
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
        // Width only, and exactly, because the css WIDTH is integral here; the
        // height relation is asserted below with the one-pixel slack the two
        // pages' different rounding points require.
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
      // THE TWO PAGES DO NOT GET THE SAME DRAWING SURFACE, and saying so is
      // the honest version of an assertion that used to compare only the axis
      // that cannot differ. Measured: 1600x612 against 1600x592 at a 1600x900
      // viewport, and 3200x1224 against 3200x1184 at DPR 2. The widths match
      // because the host fills the viewport; the HEIGHTS differ because the
      // two pages' headers are different lengths and reflow differently
      // (page 13's host is 287.7 css px shorter here, page 14's 307.3).
      //
      // The option NOT taken: equalising the two headers so the assertion
      // could be `toBe`. The header carries this page's findings, its
      // correction to the briefing and its divergence ledger -- trimming
      // evidence text so a test can use a tighter operator is the wrong trade,
      // and it would also make the suite depend on two prose blocks staying
      // the same length forever.
      expect(after.vtkjs.surface.devicePixelRatio).toBe(after.threejs.surface.devicePixelRatio);
      expect(after.vtkjs.surface.drawingBufferWidth).toBe(after.threejs.surface.drawingBufferWidth);
      // FAILS IF: the height difference is anything but the layout difference.
      // This is the assertion the width comparison was pretending to be: the
      // two buffers may differ, but ONLY by what the two CSS boxes differ by.
      // A renderer that sized its buffer wrong lands here.
      const dpr = after.vtkjs.surface.devicePixelRatio;
      const layoutGap = (after.vtkjs.surface.cssHeight - after.threejs.surface.cssHeight) * dpr;
      const bufferGap = after.vtkjs.surface.drawingBufferHeight - after.threejs.surface.drawingBufferHeight;
      // Slack scales with dpr, because what it absorbs is each page's own
      // flooring of css*dpr and that error grows with dpr. A flat 2 px was
      // fine at the dpr 1 and 2 measured here (0.8 px at dpr 2) and would be
      // too tight at dpr 3.
      expect(Math.abs(bufferGap - layoutGap),
        `the two drawing buffers differ by ${bufferGap} px in height where their css boxes differ by `
        + `${layoutGap.toFixed(1)} px -- the gap is not explained by layout`).toBeLessThanOrEqual(2 * dpr);
      // FAILS IF: a page stops tracking its own css box. Held to one css pixel
      // scaled by dpr, not to equality, because THE TWO PAGES ROUND
      // DIFFERENTLY and that is measurable: page 13 floors width*dpr, page 14
      // floors width and then multiplies. At a 1280x800 viewport the host is
      // 492.67 css px tall, so the exact relation `buffer === css * dpr` is
      // false on the height axis on both pages and was only ever true on the
      // width axis because css width is integral.
      for (const r of RENDERERS) {
        const s2 = after[r].surface;
        expect(Math.abs(s2.drawingBufferHeight - s2.cssHeight * s2.devicePixelRatio),
          `${r} buffer height ${s2.drawingBufferHeight} against css ${s2.cssHeight} * dpr ${s2.devicePixelRatio}`)
          .toBeLessThanOrEqual(s2.devicePixelRatio);
      }
      console.log(`${dprLabel}: drawing buffer after resize `
        + RENDERERS.map(r => `${r} ${after[r].surface.drawingBufferWidth}x${after[r].surface.drawingBufferHeight} `
          + `(css ${after[r].surface.cssWidth.toFixed(1)}x${after[r].surface.cssHeight.toFixed(1)})`).join(', ')
        + ' -- heights differ by header length, which is why every measurement pins PARITY_SURFACE');
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
