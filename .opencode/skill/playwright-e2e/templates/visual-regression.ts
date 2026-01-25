// templates/visual-regression.ts
import { test, expect } from '@playwright/test';

test('homepage should match visual snapshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('component should match snapshot', async ({ page }) => {
  await page.goto('/');

  const resultCard = page.getByTestId('result-card');
  await expect(resultCard).toBeVisible();
  await expect(resultCard).toHaveScreenshot('result-card.png');
});

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`should match ${viewport.name} snapshot`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`);
  });
}
