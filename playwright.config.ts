import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for e2e tests and screenshots
 *
 * Usage:
 *   npm run e2e              # Run e2e tests against local dev server
 *   npm run e2e:screenshots  # Capture screenshots locally
 *   npm run e2e:ci           # Run in CI (no local server)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // No retries for screenshot tests - timing-sensitive
  retries: 0,

  // Run viewports in parallel (3 workers = 3 viewports)
  workers: 3,

  // Reporter
  reporter: process.env.CI ? 'github' : 'list',

  // Timeout for each test
  timeout: 60_000,

  // Shared settings for all projects
  use: {
    // Base URL - can be overridden with PLAYWRIGHT_BASE_URL env var
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (CI only)
    video: process.env.CI ? 'on-first-retry' : 'off',
  },

  // Configure projects - all use Chromium with different viewports
  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader'],
        },
      },
    },
    {
      name: 'tablet',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader'],
        },
      },
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        launchOptions: {
          args: ['--use-gl=angle', '--use-angle=swiftshader'],
        },
      },
    },
  ],

  // Run local dev server before tests (unless PLAYWRIGHT_BASE_URL is set)
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
