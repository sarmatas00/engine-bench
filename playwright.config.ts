import {defineConfig} from '@playwright/test';

/**
 * BROWSER MATRIX: chromium and firefox. WebKit is OUT OF SCOPE, and its
 * absence is recorded here rather than left to be discovered: WebGL2 3D
 * textures under WebKit's software rasterizer are the most likely thing to
 * fail for reasons that have nothing to do with either renderer, and this
 * spike decides vtk.js versus Three.js, not browser support. Firefox covers
 * the Gecko/Blink split, which is where real divergence lives. Task 9's
 * conclusion must therefore be qualified as "chromium and firefox", not
 * "browsers".
 *
 * The full legacy page matrix (smoke.spec.ts: maplibre, deck.gl, cesium,
 * playcanvas, ...) runs ONCE, in chromium. Firefox runs the cross-renderer
 * suite only -- it is here to answer "do vtk.js and Three.js still agree on
 * another engine", not to port eleven older pages.
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: /(smoke|scientific)\.spec\.ts$/,
  timeout: 60_000,
  use: {baseURL: 'http://localhost:4173', viewport: {width: 1280, height: 800}},
  webServer: {command: 'bun run preview', port: 4173, reuseExistingServer: false},
  projects: [
    {name: 'chromium', use: {browserName: 'chromium', launchOptions: {args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}}},
    {
      name: 'firefox',
      testMatch: /scientific\.spec\.ts$/,
      use: {
        browserName: 'firefox',
        launchOptions: {
          firefoxUserPrefs: {
            // Headless firefox otherwise refuses WebGL on a machine with no
            // GPU process it trusts. A page that cannot get WebGL2 renders a
            // visible error and the suite reports it as a finding rather than
            // skipping silently, but these let the real comparison run.
            'webgl.force-enabled': true,
            'webgl.disabled': false,
            'webgl.out-of-process': false,
            'gfx.webrender.software': true,
          },
        },
      },
    },
  ],
});
