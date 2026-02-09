import { Buffer } from 'buffer';

import { test, expect } from '@playwright/test';

// Reduce iterations for CI to balance thoroughness with speed
const ITERATIONS = process.env.CI ? 10 : 50;

const API_ROUTE_PATTERN = '**/models/*:generateContent?key=*';
const RUN_ANALYSIS_BUTTON = 'Run Clinical Analysis';
const DIAGNOSTIC_SUMMARY = 'Diagnostic Summary';
const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/A0f/';

const mockGeminiResponse = (jsonContent: unknown) => ({
  candidates: [
    {
      content: {
        parts: [{ text: JSON.stringify(jsonContent) }],
      },
      finishReason: 'STOP' as const,
    },
  ],
});

test.describe('E2E Scenarios F-G: Performance & Memory', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(API_ROUTE_PATTERN, async (route) => {
      const requestBody = JSON.parse(route.request().postData() ?? '{}');
      const promptText =
        requestBody.contents?.[0]?.parts?.find((p: { text?: string }) => p.text)?.text ?? '';

      if (promptText.includes('clinical classification')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              fitzpatrick_type: 'III',
              monk_scale: 'F4',
              ita_estimate: 45,
              skin_tone_confidence: 0.95,
              reasoning: 'Clear visualization of epidermis',
            }),
          ),
        });
      } else if (promptText.includes('Extract skin features')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              bias_score: 0.05,
              disentanglement_index: 0.92,
              fairness_validated: true,
            }),
          ),
        });
      } else if (promptText.includes('clinical guidelines')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(
            mockGeminiResponse({
              grounded_info: 'Based on recent guidelines...',
              sources: [{ title: 'DermNet NZ', uri: 'https://dermnetnz.org' }],
            }),
          ),
        });
      } else {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockGeminiResponse({ status: 'ok' })),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('SCENARIO F: Memory Leaks @slow', () => {
    test(`runs ${ITERATIONS} analyses, verifies GPU memory doesn't grow, checks tensor cleanup`, async ({
      page,
    }) => {
      const initialMemoryCheck = await page.evaluate(() => {
        if ('gc' in window) {
          (window as { gc?: () => void }).gc?.();
        }

        const tfMemory = (
          window as unknown as { tf?: { memory: () => { numTensors: number; numBytes: number } } }
        ).tf?.memory();
        const performanceMemory = (
          performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
        ).memory;

        return {
          tfTensors: tfMemory?.numTensors ?? 0,
          tfBytes: tfMemory?.numBytes ?? 0,
          heapUsed: performanceMemory?.usedJSHeapSize ?? 0,
          heapTotal: performanceMemory?.totalJSHeapSize ?? 0,
          timestamp: Date.now(),
        };
      });

      console.log('Initial memory state:', initialMemoryCheck);

      for (let i = 0; i < ITERATIONS; i++) {
        const buffer = Buffer.from(JPEG_BASE64, 'base64');
        await page.locator('input[type="file"]').setInputFiles({
          name: `memory-test-${i}.jpg`,
          mimeType: 'image/jpeg',
          buffer,
        });

        const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
        await runBtn.click();

        await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
          timeout: 30000,
        });

        await page.locator('input[type="file"]').setInputFiles([]);

        if ((i + 1) % Math.max(2, Math.floor(ITERATIONS / 5)) === 0) {
          const memoryCheck = await page.evaluate(() => {
            if ('gc' in window) {
              (window as { gc?: () => void }).gc?.();
            }

            const tfMemory = (
              window as unknown as {
                tf?: { memory: () => { numTensors: number; numBytes: number } };
              }
            ).tf?.memory();
            const performanceMemory = (
              performance as unknown as {
                memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
              }
            ).memory;

            return {
              tfTensors: tfMemory?.numTensors ?? 0,
              tfBytes: tfMemory?.numBytes ?? 0,
              heapUsed: performanceMemory?.usedJSHeapSize ?? 0,
              heapTotal: performanceMemory?.totalJSHeapSize ?? 0,
              iteration: (window as unknown as { currentIteration?: number }).currentIteration ?? 0,
            };
          });

          console.log(`Memory after ${i + 1} analyses:`, memoryCheck);
        }
      }

      const finalMemoryCheck = await page.evaluate(() => {
        if ('gc' in window) {
          (window as { gc?: () => void }).gc?.();
        }

        const tfMemory = (
          window as unknown as { tf?: { memory: () => { numTensors: number; numBytes: number } } }
        ).tf?.memory();
        const performanceMemory = (
          performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
        ).memory;

        return {
          tfTensors: tfMemory?.numTensors ?? 0,
          tfBytes: tfMemory?.numBytes ?? 0,
          heapUsed: performanceMemory?.usedJSHeapSize ?? 0,
          heapTotal: performanceMemory?.totalJSHeapSize ?? 0,
          timestamp: Date.now(),
        };
      });

      console.log('Final memory state:', finalMemoryCheck);

      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Tensors disposed');

      const tfGrowthRatio =
        initialMemoryCheck.tfBytes > 0
          ? (finalMemoryCheck.tfBytes - initialMemoryCheck.tfBytes) / initialMemoryCheck.tfBytes
          : 0;
      const heapGrowthRatio =
        initialMemoryCheck.heapUsed > 0
          ? (finalMemoryCheck.heapUsed - initialMemoryCheck.heapUsed) / initialMemoryCheck.heapUsed
          : 0;

      console.log(`TF.js bytes growth: ${(tfGrowthRatio * 100).toFixed(2)}%`);
      console.log(`Heap growth: ${(heapGrowthRatio * 100).toFixed(2)}%`);

      expect(tfGrowthRatio).toBeLessThan(0.5);
      expect(heapGrowthRatio).toBeLessThan(0.5);
    });
  });

  test.describe('SCENARIO G: Performance Benchmarks @slow', () => {
    test('measures TTI with heavy models, times agents, asserts <72s total pipeline', async ({
      page,
    }) => {
      const ttiStart = performance.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const tti = performance.now() - ttiStart;

      console.log(`TTI: ${tti}ms`);
      expect(tti).toBeLessThan(5000);

      const pipelineStart = Date.now();

      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'performance-test-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      await page.locator('button', { hasText: RUN_ANALYSIS_BUTTON }).click();

      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 60000,
      });

      const pipelineDuration = Date.now() - pipelineStart;
      console.log(`Total pipeline duration: ${pipelineDuration}ms`);

      expect(pipelineDuration).toBeLessThan(72000);

      const logs = page.locator('[role="log"]');
      const logText = await logs.textContent();

      expect(logText).toMatch(/\d+ms|\d+s/);

      const agentTimings = logText?.match(/(\w+-Agent).*?(\d+)ms/g);
      if (agentTimings) {
        console.log('Agent timings:', agentTimings);

        const lesionDetectionTiming = agentTimings.find((timing) =>
          timing.includes('Lesion-Detection-Agent'),
        );
        if (lesionDetectionTiming) {
          const timing = parseInt(lesionDetectionTiming.match(/(\d+)ms/)?.[1] ?? '0');
          expect(timing).toBeLessThan(15000);
        }
      }
    });
  });
});
