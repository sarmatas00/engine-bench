import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: 'smoke.spec.ts',
  timeout: 60_000,
  use: {baseURL: 'http://localhost:4173', viewport: {width: 1280, height: 800}},
  webServer: {command: 'bun run preview', port: 4173, reuseExistingServer: false},
  projects: [{name: 'chromium', use: {browserName: 'chromium', launchOptions: {args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}}}]
});
