import { test, expect } from '@playwright/test';

test('no memory growth after 50 analyses', async ({ page }) => {
  await page.goto('/');

  await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');
  await page.click('button:has-text("Analyze")');

  for (let i = 0; i < 49; i++) {
    await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');
    await page.click('button:has-text("Analyze")');

    await page.waitForFunction(() => {
      const logs = document.querySelectorAll('[data-status]');
      const completed = Array.from(logs).filter(l => l.getAttribute('data-status') === 'completed');
      return completed.length >= 15;
    }, { timeout: 120000 });
  }

  const metrics = await page.evaluate(() => {
    const perf = performance as unknown as { memory?: { totalJSHeapSize?: number; usedJSHeapSize?: number } };
    return {
      totalJSHeapSize: perf.memory?.totalJSHeapSize,
      usedJSHeapSize: perf.memory?.usedJSHeapSize
    };
  });

  expect(metrics.usedJSHeapSize).toBeLessThan(500 * 1024 * 1024);
});

test('should dispose tensors after component unmount', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    const vision = (window as unknown as { visionSpecialist?: { getTensorStats: () => unknown } }).visionSpecialist;
    return vision?.getTensorStats();
  });

  await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');
  await page.click('button:has-text("Analyze")');

  await page.waitForSelector('[data-status="completed"]', { timeout: 60000 });

  const disposeCalled = await page.evaluate(() => {
    return (window as unknown as { disposeCalled?: boolean }).disposeCalled;
  });

  expect(disposeCalled).toBe(true);
});
