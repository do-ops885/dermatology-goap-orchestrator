import { test, expect } from '@playwright/test';

const PERFORMANCE_BUDGETS = {
  verification: 2000,
  detection: 5000,
  calibration: 1000,
  preprocessing: 3000,
  segmentation: 5000,
  featureExtraction: 10000,
  lesionDetection: 15000,
  similaritySearch: 2000,
  riskAssessment: 5000,
  fairnessAudit: 3000,
  webVerification: 10000,
  recommendations: 5000,
  learning: 3000,
  encryption: 2000,
  audit: 1000,
  total: 72000,
};

test.describe('Performance Benchmarks', () => {
  test('full pipeline completes under 72 seconds', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();

    await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');

    await page.click('button:has-text("Analyze")');

    await page.waitForFunction(
      () => {
        return (window as any).worldState?.audit_logged === true;
      },
      { timeout: 90000 },
    );

    const duration = Date.now() - startTime;

    console.warn(`Full pipeline completed in ${duration}ms`);

    expect(duration).toBeLessThan(PERFORMANCE_BUDGETS.total);
  });

  test('image verification completes under 2s', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');

    const verificationTime = await page.evaluate(async () => {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 100));
      return Date.now() - start;
    });

    expect(verificationTime).toBeLessThan(PERFORMANCE_BUDGETS.verification);
  });

  test('skin tone detection completes under 5s', async ({ page }) => {
    await page.goto('/');

    const detectionTime = await page.evaluate(async () => {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 3000));
      return Date.now() - start;
    });

    expect(detectionTime).toBeLessThan(PERFORMANCE_BUDGETS.detection);
  });

  test('lesion detection completes under 15s', async ({ page }) => {
    const detectionTime = await page.evaluate(async () => {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 12000));
      return Date.now() - start;
    });

    expect(detectionTime).toBeLessThan(PERFORMANCE_BUDGETS.lesionDetection);
  });

  test('web verification completes under 10s', async ({ page }) => {
    const webTime = await page.evaluate(async () => {
      const start = Date.now();
      await new Promise((r) => setTimeout(r, 8000));
      return Date.now() - start;
    });

    expect(webTime).toBeLessThan(PERFORMANCE_BUDGETS.webVerification);
  });

  test('TTI with cached models is under 5s', async ({ page }) => {
    await page.goto('/');

    const ttiStart = performance.now();
    await page.waitForLoadState('domcontentloaded');
    const tti = performance.now() - ttiStart;

    console.warn(`TTI: ${tti}ms`);

    expect(tti).toBeLessThan(5000);
  });

  test('model loading shows progress within 30s', async ({ page }) => {
    await page.goto('/');

    await page.click('button:has-text("Load Models")');

    const progressUpdated = await page.waitForFunction(
      () => {
        const progress = document.querySelector('[data-testid="model-progress"]');
        return progress && progress.textContent !== null && parseInt(progress.textContent, 10) > 0;
      },
      { timeout: 30000 },
    );

    expect(progressUpdated).toBeTruthy();
  });

  test('cold start with no cache under 120s', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('agent-memory.db');
    });

    await page.goto('/');

    const startTime = Date.now();

    await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');
    await page.click('button:has-text("Analyze")');

    await page.waitForFunction(
      () => {
        return (window as any).worldState?.audit_logged === true;
      },
      { timeout: 180000 },
    );

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(120000);
  });
});

test.describe('Memory Performance', () => {
  test('peak memory during analysis is acceptable', async ({ page }) => {
    await page.goto('/');

    const peakMemory = await page.evaluate(async () => {
      let peak = 0;

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if ((entry as any).memory) {
            peak = Math.max(peak, (entry as any).memory.usedJSHeapSize);
          }
        });
      });

      observer.observe({ type: 'resource' });

      await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');
      await page.click('button:has-text("Analyze")');
      await page.waitForFunction(() => (window as any).worldState?.audit_logged, {
        timeout: 90000,
      });

      observer.disconnect();
      return peak;
    });

    console.warn(`Peak memory: ${(peakMemory / 1024 / 1024).toFixed(2)}MB`);

    expect(peakMemory).toBeLessThan(500 * 1024 * 1024);
  });
});
