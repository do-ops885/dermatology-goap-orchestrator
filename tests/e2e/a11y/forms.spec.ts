import { test, expect } from '@playwright/test';

import { axe } from './test-utils';

test.describe('Accessibility - Forms', () => {
  test('File input has proper label', async ({ page }) => {
    await page.goto('/');

    page.locator('input[type="file"]');

    const results = await axe.evaluate(page, {
      include: 'input[type="file"]',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(results.violations.filter((v: any) => v.id === 'label')).toEqual([]);
  });

  test('Feedback form is accessible', async ({ page }) => {
    await page.click('button:has-text("Provide Feedback")');

    page.locator('form');

    const results = await axe.evaluate(page, {
      include: 'form',
    });

    expect(results.violations).toEqual([]);
  });

  test('Confidence slider has proper labels', async ({ page }) => {
    await page.click('button:has-text("Provide Feedback")');

    page.locator('input[type="range"]');

    const results = await axe.evaluate(page, {
      include: 'input[type="range"]',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(results.violations.filter((v: any) => v.id === 'slider')).toEqual([]);
  });
});
