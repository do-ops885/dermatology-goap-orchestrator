import { defineConfig } from '@playwright/test';

/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : (undefined as unknown as string | number),
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - TypeScript doesn't recognize Playwright's WebSource type
      },
    },
  ],

  timeout: 60000,
});
