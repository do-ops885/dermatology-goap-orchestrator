// templates/accessibility.ts
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function runAccessibilityScan(page: Page, pageName: string = 'page') {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, `${pageName} should have no a11y violations`).toEqual([]);
  return results;
}

export async function scanComponent(page: Page, selector: string) {
  const results = await new AxeBuilder({ page }).include(selector).analyze();
  expect(results.violations, `Component "${selector}" should be accessible`).toEqual([]);
  return results;
}

test.describe('Accessibility Compliance', () => {
  test('homepage should pass WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/');
    await runAccessibilityScan(page, 'homepage');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
});
