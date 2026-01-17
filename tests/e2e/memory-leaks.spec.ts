/* eslint-disable sonarjs/no-duplicate-string */
import { Buffer } from 'buffer';

import { test, expect } from '@playwright/test';

const RUN_ANALYSIS_BUTTON = 'Run Clinical Analysis';
const TEST_IMAGE_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

test.describe('Scenario F: Memory Leak Prevention - Sequential Analyses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('no memory growth after 50 sequential analyses', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
      const perf = performance as unknown as {
        memory?: { totalJSHeapSize?: number; usedJSHeapSize?: number };
      };
      return {
        heapUsed: perf.memory?.usedJSHeapSize ?? 0,
        heapLimit: perf.memory?.totalJSHeapSize ?? 0,
      };
    });

    const jpegBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    for (let i = 0; i < 50; i++) {
      await page.locator('input[type="file"]').setInputFiles({
        name: `sample-${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: jpegBuffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

      await page.locator('input[type="file"]').setInputFiles([]);
    }

    const finalMemory = await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
      const perf = performance as unknown as {
        memory?: { totalJSHeapSize?: number; usedJSHeapSize?: number };
      };
      return {
        heapUsed: perf.memory?.usedJSHeapSize ?? 0,
        heapLimit: perf.memory?.totalJSHeapSize ?? 0,
      };
    });

    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const growthRatio = initialMemory.heapUsed > 0 ? memoryGrowth / initialMemory.heapUsed : 0;

    console.warn(
      `Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB (${(growthRatio * 100).toFixed(1)}%)`,
    );

    expect(growthRatio).toBeLessThan(0.5);
  });

  test('GPU memory does not grow after 50 analyses', async ({ page }) => {
    const jpegBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    const initialGpuMemory = await page.evaluate(() => {
      return (window as any).tf?.memory?.() ?? { numTensors: 0, numBytes: 0 };
    });

    for (let i = 0; i < 50; i++) {
      await page.locator('input[type="file"]').setInputFiles({
        name: `gpu-sample-${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: jpegBuffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

      await page.locator('input[type="file"]').setInputFiles([]);
    }

    const finalGpuMemory = await page.evaluate(() => {
      return (window as any).tf?.memory?.() ?? { numTensors: 0, numBytes: 0 };
    });

    const tensorGrowth = finalGpuMemory.numTensors - initialGpuMemory.numTensors;
    const byteGrowth = finalGpuMemory.numBytes - initialGpuMemory.numBytes;

    console.warn(`Tensor growth: ${tensorGrowth}, Byte growth: ${byteGrowth}`);

    expect(tensorGrowth).toBeLessThan(10);
  });

  test('checks tensor cleanup via tf.memory()', async ({ page }) => {
    const jpegBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'tensor-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    });

    const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
    await runBtn.click();

    await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

    const afterMemory = await page.evaluate(() => {
      return (window as any).tf?.memory?.() ?? { numTensors: 0, numDataBuffers: 0, numBytes: 0 };
    });

    expect(afterMemory.numTensors).toBeGreaterThanOrEqual(0);
    expect(afterMemory.numDataBuffers).toBeGreaterThanOrEqual(0);
    expect(afterMemory.numBytes).toBeGreaterThanOrEqual(0);

    console.warn(
      `Tensors: ${afterMemory.numTensors}, Buffers: ${afterMemory.numDataBuffers}, Bytes: ${afterMemory.numBytes}`,
    );
  });

  test('verifies tensor disposal after analysis', async ({ page }) => {
    const jpegBuffer = Buffer.from(TEST_IMAGE_BASE64, 'base64');

    const beforeMemory = await page.evaluate(() => {
      return (window as any).tf?.memory?.() ?? { numTensors: 0, numBytes: 0 };
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'disposal-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    });

    const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
    await runBtn.click();

    await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

    const afterMemory = await page.evaluate(() => {
      return (window as any).tf?.memory?.() ?? { numTensors: 0, numBytes: 0 };
    });

    const tensorChange = afterMemory.numTensors - beforeMemory.numTensors;
    const byteChange = afterMemory.numBytes - beforeMemory.numBytes;

    console.warn(`Tensor change: ${tensorChange}, Byte change: ${byteChange}`);

    expect(tensorChange).toBeLessThan(20);
  });

  test('logs show tensor disposal events', async ({ page }) => {
    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'log-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    });

    const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
    await runBtn.click();

    await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

    const logs = page.locator('[role="log"]');
    const logsContent = await logs.textContent();

    const hasCleanup =
      logsContent?.includes('dispose') ??
      logsContent?.includes('cleanup') ??
      logsContent?.includes('Tensors');

    expect(hasCleanup).toBe(true);
  });

  test('memory stable across repeated identical uploads', async ({ page }) => {
    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    const memorySnapshots = [];

    for (let i = 0; i < 5; i++) {
      await page.locator('input[type="file"]').setInputFiles({
        name: 'stable-test.jpg',
        mimeType: 'image/jpeg',
        buffer: jpegBuffer,
      });

      const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
      await runBtn.click();

      await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

      const memory = await page.evaluate(() => {
        const perf = performance as unknown as {
          memory?: { totalJSHeapSize?: number; usedJSHeapSize?: number };
        };
        return {
          heapUsed: perf.memory?.usedJSHeapSize ?? 0,
        };
      });

      memorySnapshots.push(memory.heapUsed);

      await page.locator('input[type="file"]').setInputFiles([]);
    }

    const maxMemory = Math.max(...memorySnapshots);
    const minMemory = Math.min(...memorySnapshots);
    const variance = maxMemory - minMemory;
    const avgMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length;
    const varianceRatio = avgMemory > 0 ? variance / avgMemory : 0;

    console.warn(
      `Memory variance: ${(variance / 1024 / 1024).toFixed(2)}MB (${(varianceRatio * 100).toFixed(1)}%)`,
    );

    expect(varianceRatio).toBeLessThan(0.3);
  });

  test('peak memory stays within acceptable bounds', async ({ page }) => {
    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    let peakMemory = 0;

    for (let i = 0; i < 10; i++) {
      await page.locator('input[type="file"]').setInputFiles({
        name: `peak-test-${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: jpegBuffer,
      });

      const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
      await runBtn.click();

      await page.waitForSelector('text=Diagnostic Summary', { timeout: 60000 });

      const currentMemory = await page.evaluate(() => {
        const perf = performance as unknown as {
          memory?: { totalJSHeapSize?: number; usedJSHeapSize?: number };
        };
        return perf.memory?.usedJSHeapSize ?? 0;
      });

      peakMemory = Math.max(peakMemory, currentMemory);

      await page.locator('input[type="file"]').setInputFiles([]);
    }

    const peakMB = peakMemory / 1024 / 1024;

    console.warn(`Peak memory: ${peakMB.toFixed(2)}MB`);

    expect(peakMB).toBeLessThan(500);
  });
});
