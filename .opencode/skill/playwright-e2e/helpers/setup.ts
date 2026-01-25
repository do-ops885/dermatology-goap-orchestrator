// helpers/setup.ts
import { Page } from '@playwright/test';

export async function globalSetup() {
  console.log('🎭 Setting up Playwright tests...');
}

export async function globalTeardown() {
  console.log('🎭 Tearing down Playwright tests...');
}

export async function setupTest(page: Page) {
  page.setDefaultTimeout(30000);

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Browser error:', msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.error('Page error:', error.message);
  });
}
