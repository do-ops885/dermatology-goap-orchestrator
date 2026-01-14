import { test, expect } from '@playwright/test';

import { axe } from './test-utils';

test.describe('Accessibility - Navigation', () => {
  test('Skip to main content link exists', async ({ page }) => {
    await page.goto('/');

    const skipLink = page.locator('a:has-text("Skip to main content")');
    await expect(skipLink).toBeVisible();
  });

  test('Focus order is logical', async ({ page }) => {
    await page.goto('/');

    const focusOrder: string[] = [];

    page.on('focus', (element) => {
      focusOrder.push(element.getAttribute('data-testid') || element.tagName);
    });

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    expect(focusOrder[0]).toBeTruthy();
  });

  test('All interactive elements have focus visible', async ({ page }) => {
    await page.goto('/');

    const results = await axe.evaluate(page, {
      include: 'main',
      runOnly: ['focus-visible'],
    });

    expect(results.violations).toEqual([]);
  });
});
