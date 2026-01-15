import { Buffer, } from 'buffer';

import { test, expect, } from '@playwright/test';

test.describe('Scenario D: Offline Mode - Local Inference Fallback', () => {
  test.beforeEach(async({ page, },) => {
    await page.goto('/',);
    await page.waitForLoadState('networkidle',);
  },);

  test('disables network requests and falls back to local inference', async({ page, },) => {
    await page.route('**/models/*:generateContent?key=*', (route,) => route.abort('failed',),);

    await page.route('**/api/webllm/**', async(route,) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'loaded',
          model: 'SmolLM2-360M-Instruct-Local',
        },),
      },);
    },);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'offline-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    await expect(page.locator('text=OFFLINE MODE ACTIVE',),).toBeVisible({ timeout: 10000, },);

    const logs = page.locator('[role="log"]',);
    await expect(logs,).toContainText('Local Inference',);
    await expect(logs,).toContainText('SmolLM2',);

    await expect(page.locator('text=Diagnostic Summary',),).toBeVisible({ timeout: 30000, },);
  },);

  test('local LLM provides fallback for agent reasoning', async({ page, },) => {
    await page.route('**/models/*:generateContent?key=*', (route,) => route.abort('failed',),);

    await page.route('**/api/webllm/**', async(route,) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'loaded',
          model: 'SmolLM2-360M-Instruct-Local',
          response: JSON.stringify({
            fitzpatrick_type: 'III',
            monk_scale: 'F4',
            ita_estimate: 45,
            skin_tone_confidence: 0.85,
          },),
        },),
      },);
    },);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'local-llm-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    const logs = page.locator('[role="log"]',);
    await expect(logs,).toContainText('Local Inference', { timeout: 10000, },);
    await expect(logs,).toContainText('SmolLM2', { timeout: 10000, },);

    await expect(page.locator('text=Diagnostic Summary',),).toBeVisible({ timeout: 30000, },);
  },);

  test('analysis completes successfully without network access', async({ page, },) => {
    await page.route('**/*', async(route,) => {
      const requestUrl = route.request().url();

      if (requestUrl.includes('localhost',) || requestUrl.includes('127.0.0.1',)) {
        await route.continue();
      } else if (requestUrl.includes('/models/',) || requestUrl.includes('/api/',)) {
        await route.abort('failed',);
      } else {
        await route.continue();
      }
    },);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'no-network-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    await expect(page.locator('text=Diagnostic Summary',),).toBeVisible({ timeout: 60000, },);
  },);

  test('displays offline mode indicator to user', async({ page, },) => {
    await page.route('**/models/*:generateContent?key=*', (route,) => route.abort('failed',),);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'indicator-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    const offlineIndicator = page.locator('text=OFFLINE|Offline|offline',);

    await expect(offlineIndicator.first(),).toBeVisible({ timeout: 15000, },);
  },);

  test('local model loading shows progress in offline mode', async({ page, },) => {
    await page.route('**/models/*:generateContent?key=*', (route,) => route.abort('failed',),);

    let progressValue = 0;
    await page.route('**/api/webllm/**', async(route,) => {
      progressValue += 25;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: progressValue < 100 ? 'loading' : 'loaded',
          model: 'SmolLM2-360M-Instruct-Local',
          progress: progressValue,
        },),
      },);
    },);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'progress-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    const progressText = page.locator('text=Loading|loading|Progress|progress',);
    await expect(progressText.first(),).toBeVisible({ timeout: 5000, },);
  },);

  test('cached models work in offline mode', async({ page, },) => {
    await page.evaluate(() => {
      localStorage.setItem('model_cached', 'true',);
      localStorage.setItem('model_version', 'v1.0.0',);
    },);

    await page.route('**/models/*:generateContent?key=*', (route,) => route.abort('failed',),);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'cached-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    const cachedText = page.locator('text=Cached|cached|cache|Cache',);
    await expect(cachedText.first(),).toBeVisible({ timeout: 20000, },);

    await expect(page.locator('text=Diagnostic Summary',),).toBeVisible({ timeout: 30000, },);
  },);

  test('gracefully handles offline mode activation mid-analysis', async({ page, },) => {
    let blockNetwork = false;

    await page.route('**/models/*:generateContent?key=*', async(route,) => {
      if (blockNetwork) {
        await route.abort('failed',);
      } else {
        await route.continue();
      }
    },);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'mid-analysis-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    await page.waitForTimeout(1000,);

    blockNetwork = true;

    await expect(page.locator('text=Diagnostic Summary',),).toBeVisible({ timeout: 60000, },);

    const logs = page.locator('[role="log"]',);
    const logsContent = await logs.textContent();

    const hasOfflineIndication =
      logsContent?.includes('offline',) ||
      logsContent?.includes('Offline',) ||
      logsContent?.includes('OFFLINE',) ||
      logsContent?.includes('Local Inference',);

    expect(hasOfflineIndication,).toBe(true,);
  },);

  test('offline mode preserves data encryption', async({ page, },) => {
    await page.route('**/models/*:generateContent?key=*', (route,) => route.abort('failed',),);

    const jpegBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]',).setInputFiles({
      name: 'encryption-test.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    },);

    await page.locator('button', { hasText: 'Run Clinical Analysis', },).click();

    await expect(page.locator('text=Diagnostic Summary',),).toBeVisible({ timeout: 30000, },);

    const logs = page.locator('[role="log"]',);
    await expect(logs,).toContainText('encrypted',);
    await expect(logs,).toContainText('AES-256-GCM',);
  },);
},);
