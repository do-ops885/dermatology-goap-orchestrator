// examples/lesion-analysis.spec.ts
import { test, expect } from '@playwright/test';
import { setupDermatologyMocks } from '../templates/api-mocking';

test.describe('Lesion Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupDermatologyMocks(page, 'success');
    await page.goto('/');
  });

  test('should complete full analysis for Type IV skin', async ({ page }) => {
    const fileInput = page.getByLabel('Upload Skin Lesion Image');
    await fileInput.setInputFiles('test-fixtures/lesion-type-iv.jpg');

    await expect(page.getByText('Verifying image...')).toBeVisible();
    await expect(page.getByTestId('skin-tone-result')).toContainText('Type IV');
    await expect(page.getByTestId('lesion-classification')).toContainText(/melanoma|bcc/i);

    const riskScore = page.getByTestId('risk-score');
    await expect(riskScore).toBeVisible();
    const scoreText = await riskScore.textContent();
    expect(parseFloat(scoreText!)).toBeGreaterThan(0);
  });

  test('should handle low-confidence detection', async ({ page }) => {
    await setupDermatologyMocks(page, 'low-confidence');

    await page
      .getByLabel('Upload Skin Lesion Image')
      .setInputFiles('test-fixtures/unclear-lesion.jpg');

    await expect(page.getByRole('alert')).toContainText(/low confidence/i);
    await expect(page.getByText(/consult.*specialist/i)).toBeVisible();
  });
});
