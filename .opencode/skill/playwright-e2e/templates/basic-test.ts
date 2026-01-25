// templates/basic-test.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.route('**/api/endpoint/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test('should [action] when [condition]', async ({ page }) => {
    // Arrange
    const testData = { name: 'John Doe', email: 'john@example.com' };

    // Act
    await page.getByLabel('Full Name').fill(testData.name);
    await page.getByLabel('Email').fill(testData.email);
    await page.getByRole('button', { name: /submit/i }).click();

    // Assert
    await expect(page.getByText('Submission successful')).toBeVisible();
    await expect(page).toHaveURL(/\/success/);
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.route('**/api/endpoint/**', async (route) => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Invalid input' }),
      });
    });

    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid input');
  });
});
