// helpers/utilities.ts
import { Page, expect } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function uploadFile(page: Page, labelText: string, filePath: string) {
  await page.getByLabel(labelText).setInputFiles(filePath);
  await expect(page.getByText(/uploaded|complete/i)).toBeVisible({ timeout: 30000 });
}

export async function waitForLoadingToComplete(page: Page) {
  await expect(page.getByText(/loading|processing/i)).not.toBeVisible({ timeout: 60000 });
  await page.waitForLoadState('networkidle');
}

export async function getText(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  return (await element.textContent()) || '';
}

export async function setMobileViewport(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 });
}

export async function setDesktopViewport(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
}
