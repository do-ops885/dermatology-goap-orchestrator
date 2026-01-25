// examples/fairness-audit.spec.ts
import { test, expect } from '@playwright/test';
import { setupDermatologyMocks } from '../templates/api-mocking';

test.describe('Fairness Audit Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupDermatologyMocks(page, 'success');
    await page.goto('/');
  });

  test('should validate TPR/FPR gaps', async ({ page }) => {
    await page.getByLabel('Upload Image').setInputFiles('test-fixtures/lesion.jpg');

    const fairnessResult = page.getByTestId('fairness-audit-result');
    await expect(fairnessResult).toContainText('✓ Passed');

    const tprGap = await page.getByTestId('tpr-gap').textContent();
    expect(parseFloat(tprGap!)).toBeLessThanOrEqual(0.05);
  });
});
