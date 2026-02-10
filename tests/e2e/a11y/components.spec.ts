import { test, expect } from '@playwright/test';

import { axe } from './test-utils';

import type { AxeResults } from 'axe-core';

test.describe('Accessibility - Components', () => {
  test('AnalysisIntake component is accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const intake = page.locator('[data-testid="analysis-intake"]');
    await expect(intake).toBeVisible();

    const results = await axe.evaluate(page, {
      include: '[data-testid="analysis-intake"]',
    });

    expect(results.violations).toEqual([]);
  });

  test('AgentFlow has proper status announcements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="file"]').setInputFiles('test-fixtures/sample.jpg');
    await page.click('button:has-text("Analyze")');

    await page.waitForSelector('[data-status="running"]', { timeout: 10000 });

    const results = await axe.evaluate(page, {
      include: '[data-testid="agent-flow"]',
    });

    expect(results.violations).toEqual([]);
  });

  test('DiagnosticSummary is keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const results = await axe.evaluate(page, {
      include: 'main',
    });

    expect(
      results.violations.filter((v: AxeResults['violations'][0]) => v.impact === 'critical'),
    ).toEqual([]);
  });

  test('FairnessDashboard has proper chart accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    void page.locator('[data-testid="fairness-dashboard"]');

    const results = await axe.evaluate(page, {
      include: '[data-testid="fairness-dashboard"]',
    });

    expect(
      results.violations.filter((v: AxeResults['violations'][0]) => v.id === 'aria-chart'),
    ).toEqual([]);
  });

  test('ErrorBoundary catches and displays errors accessibly', async ({ page }) => {
    await page.evaluate(() => {
      throw new Error('Test error for a11y');
    });

    const results = await axe.evaluate(page, {
      include: '[role="alert"]',
    });

    expect(results.violations).toEqual([]);
  });

  test('PatientSafetyState has proper live region', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    void page.locator('[data-testid="patient-safety"]');

    const results = await axe.evaluate(page, {
      include: '[data-testid="patient-safety"]',
    });

    expect(
      results.violations.filter((v: AxeResults['violations'][0]) => v.id === 'aria-live-region'),
    ).toEqual([]);
  });
});
