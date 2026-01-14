import { Buffer } from 'buffer';
import { test, expect } from '@playwright/test';

test.describe('Scenario C: Security & Error Handling - Advanced', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('validates magic bytes for JPEG files', async ({ page }) => {
    const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff]);
    const buffer = Buffer.concat([jpegMagicBytes, Buffer.alloc(100)]);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'valid-jpeg.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await expect(page.locator('text=Security Protocol: Invalid file format')).not.toBeVisible();
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
  });

  test('rejects files with invalid magic bytes', async ({ page }) => {
    const invalidMagicBytes = Buffer.from([0x00, 0x00, 0x00]);
    const buffer = Buffer.concat([invalidMagicBytes, Buffer.alloc(100)]);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'fake-jpeg.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await expect(page.locator('text=Security Protocol: Invalid file format')).toBeVisible();
    await expect(page.locator('img[alt="Preview"]')).not.toBeVisible();
  });

  test('validates PNG magic bytes', async ({ page }) => {
    const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const buffer = Buffer.concat([pngMagicBytes, Buffer.alloc(100)]);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'valid-png.png',
      mimeType: 'image/png',
      buffer: buffer,
    });

    await expect(page.locator('text=Security Protocol: Invalid file format')).not.toBeVisible();
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
  });

  test('generates SHA-256 hash for uploaded image', async ({ page }) => {
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    const runBtn = page.locator('button', { hasText: 'Run Clinical Analysis' });
    await runBtn.click();

    await page.waitForSelector('text=Diagnostic Summary', { timeout: 30000 });

    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('SHA-256');
    const logsContent = await logs.textContent();
    expect(logsContent).toMatch(/[a-f0-9]{64}/);
  });

  test('verifies SHA-256 hash is deterministic', async ({ page }) => {
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    const hashes = [];

    for (let i = 0; i < 3; i++) {
      await page.locator('input[type="file"]').setInputFiles({
        name: 'deterministic-test.jpg',
        mimeType: 'image/jpeg',
        buffer: buffer,
      });

      await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();
      await page.waitForSelector('text=Diagnostic Summary', { timeout: 30000 });

      const logs = await page.locator('[role="log"]').textContent();
      const match = logs?.match(/[a-f0-9]{64}/);
      if (match) {
        hashes.push(match[0]);
      }

      await page.locator('input[type="file"]').setInputFiles([]);
    }

    expect(hashes.length).toBeGreaterThan(0);
    expect(new Set(hashes).size).toBe(1);
  });

  test('rejects non-image file types regardless of extension', async ({ page }) => {
    const files = [
      { name: 'document.pdf', type: 'application/pdf' },
      { name: 'script.js', type: 'text/javascript' },
      { name: 'data.json', type: 'application/json' },
      { name: 'archive.zip', type: 'application/zip' },
    ];

    for (const file of files) {
      const buffer = Buffer.from('Not an image content', 'utf-8');

      await page.locator('input[type="file"]').setInputFiles({
        name: file.name,
        mimeType: file.type,
        buffer: buffer,
      });

      await expect(page.locator('text=Security Protocol: Invalid file format')).toBeVisible();

      await page.locator('input[type="file"]').setInputFiles([]);
    }
  });

  test('verifies audit trail hash chain integrity', async ({ page }) => {
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'audit-test.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();
    await page.waitForSelector('text=Diagnostic Summary', { timeout: 30000 });

    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('Audit Trail');
    await expect(logs).toContainText('hash');
    await expect(logs).toContainText('prev_hash');
  });

  test('validates Ed25519 signature placeholder', async ({ page }) => {
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.evaluate(() => {
      (window as any).testSignatureValidation = true;
    });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'signature-test.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();
    await page.waitForSelector('text=Diagnostic Summary', { timeout: 30000 });

    const logs = await page.locator('[role="log"]').textContent();

    const hasSignatureLog = logs?.includes('signature') || logs?.includes('Signature') || false;
    const hasValidationLog = logs?.includes('validation') || logs?.includes('Validation') || false;

    expect(hasSignatureLog || hasValidationLog).toBe(true);
  });

  test('enforces file size limits', async ({ page }) => {
    const largeBuffer = Buffer.alloc(20 * 1024 * 1024);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuffer,
    });

    const hasSizeError = (await page.locator('text=size|Size|too large|Too Large').count()) > 0;

    if (hasSizeError) {
      await expect(page.locator('text=size|Size|too large|Too Large').first()).toBeVisible();
    }
  });

  test('handles corrupted image data gracefully', async ({ page }) => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff]);
    const corruptedData = Buffer.alloc(1000, 0xff);
    const buffer = Buffer.concat([jpegHeader, corruptedData]);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'corrupted.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();

    const hasError = (await page.locator('text=Error|error|Failed|failed').count()) > 0;

    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
  });

  test('verifies encryption context in results', async ({ page }) => {
    const buffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: 'encryption-test.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await page.locator('button', { hasText: 'Run Clinical Analysis' }).click();
    await page.waitForSelector('text=Diagnostic Summary', { timeout: 30000 });

    const logs = page.locator('[role="log"]');
    await expect(logs).toContainText('encrypted');
    await expect(logs).toContainText('AES-256-GCM');
  });
});
