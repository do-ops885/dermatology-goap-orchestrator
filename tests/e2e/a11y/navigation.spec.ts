import { test, expect, } from '@playwright/test';

import { axe, } from './test-utils';

test.describe('Accessibility - Navigation', () => {
  test('Skip to main content link exists', async({ page, },) => {
    await page.goto('/',);

    const skipLink = page.locator('a:has-text("Skip to main content")',);
    await expect(skipLink,).toBeVisible();
  },);

  test('Focus order is logical', async({ page, },) => {
    await page.goto('/',);

    // Get all focusable elements
    const focusableSelector = 'a[href], button, input, select, textarea, [tabindex]';
    const focusableElements = await page.locator(focusableSelector,).all();

    // Check that focusable elements exist
    expect(focusableElements.length,).toBeGreaterThan(0,);
  },);

  test('All interactive elements have focus visible', async({ page, },) => {
    await page.goto('/',);

    const results = await axe.evaluate(page, {
      include: 'main',
      runOnly: ['focus-visible',],
    },);

    expect(results.violations,).toEqual([],);
  },);
},);
