import { test, expect } from '@playwright/test';
import { axe } from './test-utils';

test.describe('Accessibility - Forms', () => {
  
  test('File input has proper label', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('input[type="file"]');
    
    const results = await axe.evaluate(page, {
      include: 'input[type="file"]'
    });
    
    expect(results.violations.filter(v => v.id === 'label')).toEqual([]);
  });

  test('Feedback form is accessible', async ({ page }) => {
    await page.click('button:has-text("Provide Feedback")');
    
    await page.locator('form');
    
    const results = await axe.evaluate(page, {
      include: 'form'
    });
    
    expect(results.violations).toEqual([]);
  });

  test('Confidence slider has proper labels', async ({ page }) => {
    await page.click('button:has-text("Provide Feedback")');
    
    await page.locator('input[type="range"]');
    
    const results = await axe.evaluate(page, {
      include: 'input[type="range"]'
    });
    
    expect(results.violations.filter(v => v.id === 'slider')).toEqual([]);
  });
});
