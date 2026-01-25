// examples/privacy-encryption.spec.ts
import { test, expect } from '@playwright/test';
import { setupDermatologyMocks } from '../templates/api-mocking';

test.describe('Privacy & Encryption', () => {
  test.beforeEach(async ({ page }) => {
    await setupDermatologyMocks(page, 'success');
    await page.goto('/');
  });

  test('should encrypt with AES-256-GCM', async ({ page }) => {
    await page.getByLabel('Upload Image').setInputFiles('test-fixtures/lesion.jpg');

    const encryptionStatus = page.getByTestId('encryption-status');
    await expect(encryptionStatus).toContainText('AES-256-GCM');

    const auditHash = page.getByTestId('audit-hash');
    await expect(auditHash).toBeVisible();
  });
});
