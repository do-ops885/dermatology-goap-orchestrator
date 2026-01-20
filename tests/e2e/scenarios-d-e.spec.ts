import { Buffer } from 'buffer';

import { test, expect } from '@playwright/test';

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

test.describe('E2E Scenarios D-E: Offline Mode & Orchestration Trace', () => {
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

  test.describe('SCENARIO D: Offline Mode', () => {
    test('disables network, verifies local inference works, checks fallback to local LLM', async ({
      page,
    }) => {
      await page.route(API_ROUTE_PATTERN, (route) => route.abort('internet'));

      await page.route('**/api/webllm/**', async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'loaded',
            model: 'SmolLM2-360M-Instruct-Local',
            offline: true,
          }),
        });
      });

      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'offline-test-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      await expect(page.locator('text=OFFLINE MODE ACTIVE')).toBeVisible({ timeout: 10000 });

      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Local Inference');
      await expect(logs).toContainText('SmolLM2');

      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 30000,
      });

      const apiCallCheck = await page.evaluate(() => {
        return (window as unknown as { externalApiCalls?: number }).externalApiCalls ?? 0;
      });
      expect(apiCallCheck).toBe(0);
    });
  });

  test.describe('SCENARIO E: Orchestration Trace', () => {
    test('asserts trace contains plan_start, agent_start/agent_end, plan_end events', async ({
      page,
    }) => {
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'trace-test-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 60000,
      });

      const logs = page.locator('[role="log"]');
      const logText = await logs.textContent();

      expect(logText).toContain('plan_start');
      expect(logText).toContain('agent_start');
      expect(logText).toContain('agent_end');
      expect(logText).toContain('plan_end');

      expect(logText).toMatch(/duration|timestamp|ms/);
      expect(logText).toMatch(/run_[a-z0-9]+/);
      expect(logText).toMatch(/state|world|transition/);
      expect(logText).toContain('audit_logged: true');
    });
  });
});
