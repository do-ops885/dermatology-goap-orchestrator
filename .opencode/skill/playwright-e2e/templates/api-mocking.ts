// templates/api-mocking.ts
import { Page } from '@playwright/test';

export async function mockSuccessResponse(page: Page, endpoint: string, data: any) {
  await page.route(endpoint, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

export async function mockErrorResponse(
  page: Page,
  endpoint: string,
  statusCode: number,
  error: string,
) {
  await page.route(endpoint, async (route) => {
    await route.fulfill({
      status: statusCode,
      body: JSON.stringify({ error }),
    });
  });
}

export async function mockGeminiSkinToneDetection(page: Page) {
  await page.route('**/api/gemini/skin-tone', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        skinTone: 'Type IV',
        confidence: 0.89,
        fitzpatrickScale: 4,
      }),
    });
  });
}

export async function setupDermatologyMocks(
  page: Page,
  scenario: 'success' | 'error' | 'low-confidence' = 'success',
) {
  await page.route('**/api/verify-image', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ valid: true, fileType: 'image/jpeg' }),
    });
  });

  await mockGeminiSkinToneDetection(page);

  await page.route('**/api/lesion/detect', async (route) => {
    if (scenario === 'success') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ classification: 'Melanoma', confidence: 0.87 }),
      });
    } else if (scenario === 'low-confidence') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ classification: 'Uncertain', confidence: 0.42 }),
      });
    } else {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Model inference failed' }),
      });
    }
  });

  await page.route('**/api/fairness/audit', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ tprGap: 0.03, fprGap: 0.02, passed: true }),
    });
  });
}
