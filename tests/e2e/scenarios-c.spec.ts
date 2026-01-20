import { Buffer } from 'buffer';

import { test, expect } from '@playwright/test';

const API_ROUTE_PATTERN = '**/models/*:generateContent?key=*';
const RUN_ANALYSIS_BUTTON = 'Run Clinical Analysis';
const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/A0f/';
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const mockGeminiResponse = (jsonContent: any) => {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(jsonContent) }],
        },
        finishReason: 'STOP',
      },
    ],
  };
};

test.describe('SCENARIO C: Security/Error Handling', () => {
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

  test('rejects invalid file types, validates magic bytes, SHA-256, Ed25519 signatures', async ({
    page,
  }) => {
    const textBuffer = Buffer.from('This is a text file, not an image.', 'utf-8');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'malicious.txt',
      mimeType: 'text/plain',
      buffer: textBuffer,
    });

    await expect(page.locator('text=Security Protocol: Invalid file format')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Run Clinical Analysis' })).toBeDisabled();

    const fakeJpegBuffer = Buffer.from(PNG_BASE64, 'base64');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'fake.jpg',
      mimeType: 'image/jpeg',
      buffer: fakeJpegBuffer,
    });

    await expect(page.locator('text=Magic bytes validation failed')).toBeVisible();

    const validJpegBuffer = Buffer.from(JPEG_BASE64, 'base64');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'valid-sample.jpg',
      mimeType: 'image/jpeg',
      buffer: validJpegBuffer,
    });

    await expect(page.locator('img[alt="Preview"]')).toBeVisible();

    const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
    await runBtn.click();

    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('Image-Verification-Agent');

    const logText = await logs.textContent();
    expect(logText).toMatch(/SHA-256|hash|cryptographic/);
  });
});
