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
    expect(sg).toMatchObject({loaded: true, inBufferLayout: true, inShaderLayout: false, inVsSource: false});
    // SimpleMeshLayer: stripped by normalizeGeometryAttributes before any buffer exists.
    expect(sm).toMatchObject({loaded: true, inBufferLayout: false, inShaderLayout: false, inVsSource: false});
  }},
  {slug: '06-fix-a2-predraped'},
  {slug: '07-fix-b1-shader', extraChecks: async (page, probe) => {
    // The subclass declares _TEMPERATURE in its own shader, so it now binds and colours.
    expect(probe.scenegraph).toMatchObject({loaded: true, inBufferLayout: true, inShaderLayout: true, inVsSource: true});

    // Colour-pixel assertion: the rendered surface must actually be coloured, not grey/white/black.
    // Try live gl.readPixels first, then a toDataURL/getImageData fallback, then the page's own
    // centerPixel probe (captured inside deck.gl's onAfterRender, while the WebGL context is live —
    // see pages/07-fix-b1-shader/main.ts) if the drawing buffer wasn't preserved for either read.
    const sampled = await page.evaluate(async () => {
      const canvas = document.querySelector('#host canvas.maplibregl-canvas') as HTMLCanvasElement | null;
      if (!canvas) return {route: 'no-canvas', rgb: [0, 0, 0]};
      const cx = Math.floor(canvas.width / 2);
      const cy = Math.floor(canvas.height / 2);

      const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
      if (gl) {
        const px = new Uint8Array(4);
        gl.readPixels(cx, gl.drawingBufferHeight - cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (Math.max(px[0], px[1], px[2]) - Math.min(px[0], px[1], px[2]) > 40) {
          return {route: 'gl.readPixels', rgb: [px[0], px[1], px[2]]};
        }
      }

      try {
        const dataUrl = canvas.toDataURL();
        const img = new Image();
        const loaded = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
        img.src = dataUrl;
        await loaded;
        const c2 = document.createElement('canvas');
        c2.width = canvas.width; c2.height = canvas.height;
        const ctx = c2.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(cx, cy, 1, 1).data;
        if (Math.max(data[0], data[1], data[2]) - Math.min(data[0], data[1], data[2]) > 40) {
          return {route: 'toDataURL', rgb: [data[0], data[1], data[2]]};
        }
      } catch { /* fall through to the page-provided sample */ }

      return {route: 'zero', rgb: [0, 0, 0]};
    });

    let route = sampled.route, rgb = sampled.rgb;
    if (route === 'zero' || route === 'no-canvas') {
      const centerPixel = await page.evaluate(() => (window as any).__bench.probe.centerPixel as number[] | undefined);
      if (centerPixel) { route = 'page.centerPixel'; rgb = centerPixel; }
    }

    console.log(`page 07 colour-pixel route: ${route}, rgb=${JSON.stringify(rgb)}`);
    expect(Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]), `route=${route} rgb=${JSON.stringify(rgb)}`).toBeGreaterThan(40);
  }},
  {slug: '08-fix-b2-baked', extraChecks: async (_page, probe) => {
    expect((probe.simpleMesh as any).inBufferLayout).toBe(true);   // colors reach the GPU on the mesh path
  }},
  {slug: '05-fix-a1-deck-terrain'},
  {slug: '03-threejs-floats'},
  {slug: '09-cesium-terrain'},
  {slug: '10-cesium-voxels'},
  {slug: '11-vtkjs-grid'},
  {slug: '12-playcanvas'}
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
