import { describe, it, expect } from 'vitest';

import {
  validateImageSignature,
  isValidFileType,
  isValidFileSize,
} from '../../../services/utils/fileUtils';

describe('validateImageSignature', () => {
  it('should validate JPEG magic bytes', async () => {
    const jpegHeader = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const file = new File([jpegHeader], 'test.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(file);

    expect(result).toBe(true);
  });

  it('should validate PNG magic bytes', async () => {
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const file = new File([pngHeader], 'test.png', { type: 'image/png' });
    const result = await validateImageSignature(file);

    expect(result).toBe(true);
  });

  it('should validate WebP magic bytes', async () => {
    const webpHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0xbc, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const file = new File([webpHeader], 'test.webp', { type: 'image/webp' });
    const result = await validateImageSignature(file);

    expect(result).toBe(true);
  });

  it('should reject invalid file signature', async () => {
    const invalidHeader = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = new File([invalidHeader], 'test.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(file);

    expect(result).toBe(false);
  });

  it('should reject plain text file masquerading as image', async () => {
    const textContent = new TextEncoder().encode('Not an image');
    const file = new File([textContent], 'fake.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(file);

    expect(result).toBe(false);
  });

  it('should handle empty file', async () => {
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(emptyFile);

    expect(result).toBe(false);
  });

  it('should handle file smaller than 12 bytes', async () => {
    const smallHeader = new Uint8Array([0xff, 0xd8]);
    const file = new File([smallHeader], 'small.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(file);
    expect(result).toBe(false);
  });

  it('should validate JPEG with different SOI markers', async () => {
    const jpegHeaderVariant = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    ]);
    const file = new File([jpegHeaderVariant], 'test.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(file);

    expect(result).toBe(true);
  });

  it('should handle file with valid JPEG header but corrupted data', async () => {
    const corruptedJPEG = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);
    const file = new File([corruptedJPEG], 'corrupted.jpg', { type: 'image/jpeg' });
    const result = await validateImageSignature(file);

    expect(result).toBe(true);
  });
});

describe('isValidFileType', () => {
  it('should accept valid JPEG MIME type', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileType(file);

    expect(result).toBe(true);
  });

  it('should accept valid PNG MIME type', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    const result = isValidFileType(file);

    expect(result).toBe(true);
  });

  it('should accept valid WebP MIME type', () => {
    const file = new File([''], 'test.webp', { type: 'image/webp' });
    const result = isValidFileType(file);

    expect(result).toBe(true);
  });

  it('should reject GIF MIME type', () => {
    const file = new File([''], 'test.gif', { type: 'image/gif' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should reject BMP MIME type', () => {
    const file = new File([''], 'test.bmp', { type: 'image/bmp' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should reject SVG MIME type', () => {
    const file = new File([''], 'test.svg', { type: 'image/svg+xml' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should reject TIFF MIME type', () => {
    const file = new File([''], 'test.tiff', { type: 'image/tiff' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should reject text/plain MIME type', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should reject application/pdf MIME type', () => {
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should handle empty MIME type', () => {
    const file = new File([''], 'test', { type: '' });
    const result = isValidFileType(file);

    expect(result).toBe(false);
  });

  it('should handle non-standard case MIME type', () => {
    // Browsers automatically normalize MIME types to lowercase
    const file = new File([''], 'test.jpg', { type: 'IMAGE/JPEG' });
    const result = isValidFileType(file);

    expect(result).toBe(true); // Browser normalizes 'IMAGE/JPEG' to 'image/jpeg'
  });
});

describe('isValidFileSize', () => {
  it('should accept file within default 10MB limit', () => {
    const file = new File([new ArrayBuffer(5 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file);

    expect(result).toBe(true);
  });

  it('should accept file exactly at limit', () => {
    const file = new File([new ArrayBuffer(10 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file);

    expect(result).toBe(true);
  });

  it('should reject file exceeding default 10MB limit', () => {
    const file = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file);

    expect(result).toBe(false);
  });

  it('should accept file within custom 5MB limit', () => {
    const file = new File([new ArrayBuffer(3 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file, 5);

    expect(result).toBe(true);
  });

  it('should reject file exceeding custom 5MB limit', () => {
    const file = new File([new ArrayBuffer(6 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file, 5);

    expect(result).toBe(false);
  });

  it('should accept file exactly at custom limit', () => {
    const file = new File([new ArrayBuffer(5 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file, 5);

    expect(result).toBe(true);
  });

  it('should accept empty file', () => {
    const file = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file);

    expect(result).toBe(true);
  });

  it('should accept very small file (1 byte)', () => {
    const file = new File([new Uint8Array([0x00])], 'small.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file);

    expect(result).toBe(true);
  });

  it('should handle custom limit of 0', () => {
    const file = new File([new Uint8Array([0x00])], 'small.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file, 0);

    expect(result).toBe(false);
  });

  it('should handle very large custom limit (100MB)', () => {
    const file = new File([new ArrayBuffer(50 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file, 100);

    expect(result).toBe(true);
  });

  it('should handle fractional limit', () => {
    const file = new File([new ArrayBuffer(2 * 1024 * 1024)], 'test.jpg', { type: 'image/jpeg' });
    const result = isValidFileSize(file, 2.5);

    expect(result).toBe(true);
  });
});
