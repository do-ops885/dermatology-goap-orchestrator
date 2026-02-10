import { test, expect } from '@playwright/test';

import { axe } from './test-utils';

import type { AxeResults } from 'axe-core';

test.describe('Accessibility - Forms', () => {
  test('File input has proper label', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="file"]').waitFor({ state: 'attached' });

    const results = await axe.evaluate(page, {
      include: 'input[type="file"]',
    });

    expect(results.violations.filter((v: AxeResults['violations'][0]) => v.id === 'label')).toEqual(
      [],
    );
  });

  test('Feedback form is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Provide Feedback")');

    await page.locator('form').waitFor({ state: 'visible' });

    const results = await axe.evaluate(page, {
      include: 'form',
    });

    expect(results.violations).toEqual([]);
  });

  test('Confidence slider has proper labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Provide Feedback")');

    await page.locator('input[type="range"]').waitFor({ state: 'visible' });

    const results = await axe.evaluate(page, {
      include: 'input[type="range"]',
    });

    expect(
      results.violations.filter((v: AxeResults['violations'][0]) => v.id === 'slider'),
    ).toEqual([]);
  });
});
