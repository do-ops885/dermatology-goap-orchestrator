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

const mockGroundingResponse = (text: string, sources: Array<{ title: string; uri: string }>) => ({
  candidates: [
    {
      content: {
        parts: [{ text }],
      },
      groundingMetadata: {
        groundingChunks: sources.map((s) => ({ web: s })),
      },
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleRoute = async (route: any) => {
  const requestBody = JSON.parse(route.request().postData() ?? '{}');
  const promptText =
    requestBody.contents?.[0]?.parts?.find((p: { text?: string }) => p.text)?.text ?? '';

  if (promptText.includes('clinical classification')) {
    return route.fulfill({
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
  }
  if (promptText.includes('Extract skin features')) {
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        mockGeminiResponse({
          bias_score: 0.05,
          disentanglement_index: 0.92,
          fairness_validated: true,
        }),
      ),
    });
  }
  if (promptText.includes('clinical guidelines')) {
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        mockGroundingResponse('Based on recent guidelines...', [
          { title: 'DermNet NZ', uri: 'https://dermnetnz.org' },
        ]),
      ),
    });
  }
  return route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(mockGeminiResponse({ status: 'ok' })),
  });
};

test.describe('E2E Scenarios A-B: Complete Pipeline & Safety Routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(API_ROUTE_PATTERN, (route) => handleRoute(route));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('SCENARIO A: Happy Path - Full 16-Agent Pipeline', () => {
    test('executes complete pipeline with valid JPEG, verifies audit_logged: true', async ({
      page,
    }) => {
      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'skin-sample-high-quality.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      await expect(page.locator('img[alt="Preview"]')).toBeVisible();
      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await expect(runBtn).toBeEnabled();

      const startTime = Date.now();
      await runBtn.click();

      await expect(runBtn).toHaveText(/Orchestrating Agents/);

      const logs = page.locator('[role="log"]');

      const expectedAgents = [
        'Image-Verification-Agent',
        'Skin-Tone-Detection-Agent',
        'Standard-Calibration-Agent',
        'Image-Preprocessing-Agent',
        'Segmentation-Agent',
        'Feature-Extraction-Agent',
        'Lesion-Detection-Agent',
        'Similarity-Search-Agent',
        'Risk-Assessment-Agent',
        'Fairness-Audit-Agent',
        'Web-Verification-Agent',
        'Recommendation-Agent',
        'Learning-Agent',
        'Privacy-Encryption-Agent',
        'Audit-Trail-Agent',
      ];

      await expect(page.locator('h2', { hasText: DIAGNOSTIC_SUMMARY })).toBeVisible({
        timeout: 90000,
      });

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      expect(totalDuration).toBeLessThan(72000);
      console.log(`Full pipeline completed in ${totalDuration}ms`);

      const logText = (await logs.textContent()) || '';
      expectedAgents.forEach((agent) => {
        expect(logText).toContain(agent);
      });

      await expect(page.locator('text=Fairness Guard')).toBeVisible();
      await expect(page.locator('text=Type III')).toBeVisible();

      const worldStateCheck = await page.evaluate(() => {
        return (
          (window as unknown as { worldState?: { audit_logged: boolean } }).worldState
            ?.audit_logged === true
        );
      });
      expect(worldStateCheck).toBeTruthy();
    });
  });

  test.describe('SCENARIO B: Safety Interception - Low Confidence Routing', () => {
    test('simulates low confidence (<0.65), verifies GOAP routes to Safety-Calibration-Agent', async ({
      page,
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.route(API_ROUTE_PATTERN, (route: any) => {
        void (async () => {
          const requestBody = JSON.parse(route.request().postData() ?? '{}');
          const promptText =
            requestBody.contents?.[0]?.parts?.find((p: { text?: string }) => p.text)?.text ?? '';

          if (promptText.includes('clinical classification')) {
            await route.fulfill({
              contentType: 'application/json',
              body: JSON.stringify(
                mockGeminiResponse({
                  fitzpatrick_type: 'II',
                  monk_scale: 'F2',
                  ita_estimate: 20,
                  skin_tone_confidence: 0.45,
                  reasoning: 'Poor lighting conditions detected',
                }),
              ),
            });
          } else {
            await route.continue();
          }
        })();
      });

      const buffer = Buffer.from(JPEG_BASE64, 'base64');
      await page.locator('input[type="file"]').setInputFiles({
        name: 'poor-quality-sample.jpg',
        mimeType: 'image/jpeg',
        buffer,
      });

      const runBtn = page.locator('button', { hasText: RUN_ANALYSIS_BUTTON });
      await runBtn.click();

      await expect(page.locator('text=Low detection confidence (45%)')).toBeVisible({
        timeout: 10000,
      });

      const logs = page.locator('[role="log"]');
      await expect(logs).toContainText('Safety-Calibration-Agent', { timeout: 15000 });

      const logText = await logs.textContent();
      expect(logText).not.toContain('Standard-Calibration-Agent');

      await expect(page.locator('text=SAFETY_CALIBRATION_ACTIVE')).toBeVisible();

      const safetyStateCheck = await page.evaluate(() => {
        return (
          (window as unknown as { worldState?: { safety_calibrated: boolean } }).worldState
            ?.safety_calibrated === true
        );
      });
      expect(safetyStateCheck).toBeTruthy();
    });
  });
});
