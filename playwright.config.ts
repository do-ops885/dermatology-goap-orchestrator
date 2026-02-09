import { defineConfig } from '@playwright/test';

/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : (undefined as unknown as string | number),
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'html',

  use: {
    baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    // CI optimizations: headless mode, no viewport animation
    headless: !!process.env.CI,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000,
    // Faster test execution: reduce animation overhead (CI only)
    ...(process.env.CI && {
      launchOptions: {
        args: [
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-breakpad',
          '--disable-component-extensions-with-background-pages',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-renderer-backgrounding',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--mute-audio',
        ],
      },
    }),
    // CI-optimized viewport
    viewport: { width: 1280, height: 720 },
  },

  expect: {
    timeout: 15000,
  },

  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    // Graceful shutdown for faster cleanup
    gracefulShutdown: {
      signal: 'SIGTERM',
      timeout: 5000,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Use channel chromium if available (faster startup)
        channel: process.env.CI ? undefined : 'chromium',
      },
    },
  ],

  // CI-optimized timeouts: shorter for fast feedback
  timeout: process.env.CI ? 30000 : 60000,

  // Optimize test output
  outputDir: 'test-results/',
});
