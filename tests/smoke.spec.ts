import {test, expect, type Page} from '@playwright/test';

type PageSpec = {slug: string; extraChecks?: (page: Page, probe: Record<string, unknown>) => Promise<void>};

// One entry per page. Later tasks append here.
export const PAGES: PageSpec[] = [
  {slug: '00-index'},
  {slug: '01-maplibre-baseline'},
  {slug: '02-deckgl-floats'},
  {slug: '04-values-lost', extraChecks: async (_page, probe) => {
    const sg = probe.scenegraph as any, sm = probe.simpleMesh as any;
    // ScenegraphLayer: value survives to the GPU buffer, fails only at the shader.
    expect(sg).toMatchObject({loaded: true, inBufferLayout: true, inShaderLayout: false});
    // SimpleMeshLayer: stripped by normalizeGeometryAttributes before any buffer exists.
    expect(sm).toMatchObject({loaded: true, inBufferLayout: false, inShaderLayout: false});
  }},
  {slug: '06-fix-a2-predraped'},
  {slug: '08-fix-b2-baked', extraChecks: async (_page, probe) => {
    expect((probe.simpleMesh as any).inBufferLayout).toBe(true);   // colors reach the GPU on the mesh path
  }}
];

for (const spec of PAGES) {
  test(spec.slug, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(`/${spec.slug}/`);
    await page.waitForFunction(() => (window as any).__bench?.ready === true, null, {timeout: 30_000});

    const probe = await page.evaluate(() => (window as any).__bench.probe);
    expect(probe.webgl, 'page reported no WebGL2').not.toBe(false);
    expect(errors, errors.join('\n')).toEqual([]);

    await page.screenshot({path: `screens/${spec.slug}.png`, fullPage: true});
    if (spec.extraChecks) await spec.extraChecks(page, probe);
  });
}
