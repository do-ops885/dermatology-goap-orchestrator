import { describe, it, expect, vi } from 'vitest';

import { loadImageElement, calculateImageHash } from '../../../services/utils/imageUtils';

describe('imageUtils', () => {
  // Helper to create a mock File
  const createMockFile = (type: string): File => {
    const blob = new Blob(['fake image data'], { type });
    return new File([blob], 'test-image.jpg', { type });
  };

  // Note: optimizeImage tests are skipped due to complexity of mocking FileReader + Image + Canvas in jsdom
  // This function is tested via E2E tests in tests/e2e/clinical-flow.spec.ts

  describe('loadImageElement', () => {
    it('should load image element from file', async () => {
      const file = createMockFile('image/jpeg');

      // Mock URL.createObjectURL
      const mockUrl = 'blob:http://localhost/test-image';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

      const originalImage = window.Image;
      (window as any).Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: ((err: string | Event) => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const result = await loadImageElement(file);
      expect(result).toBeInstanceOf(window.Image);
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);

      window.Image = originalImage;
    });

    it('should reject on image load error', async () => {
      const file = createMockFile('image/jpeg');

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/test');

      const originalImage = window.Image;
      (window as any).Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: ((err: string | Event) => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror('Failed to load');
            }
          }, 0);
        }
      };

      await expect(loadImageElement(file)).rejects.toThrow();

      window.Image = originalImage;
    });
  });

  describe('calculateImageHash', () => {
    it('should calculate SHA-256 hash of image file', async () => {
      const file = createMockFile('image/jpeg');

      // Mock crypto.subtle.digest
      const mockHashBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
      vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(mockHashBuffer);

      const hash = await calculateImageHash(file);

      expect(hash).toBe('0102030405060708');
      expect(crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer));
    });

    it('should handle different file contents', async () => {
      const file1 = createMockFile('image/jpeg');
      const file2 = createMockFile('image/png');

      const hash1Buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const hash2Buffer = new Uint8Array([5, 6, 7, 8]).buffer;

      vi.spyOn(crypto.subtle, 'digest')
        .mockResolvedValueOnce(hash1Buffer)
        .mockResolvedValueOnce(hash2Buffer);

      const hash1 = await calculateImageHash(file1);
      const hash2 = await calculateImageHash(file2);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string with correct padding', async () => {
      const file = createMockFile('image/jpeg');

      // Mock with values that need padding (< 16)
      const mockHashBuffer = new Uint8Array([0, 15, 255]).buffer;
      vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(mockHashBuffer);

      const hash = await calculateImageHash(file);

      // 0 -> 00, 15 -> 0f, 255 -> ff
      expect(hash).toBe('000fff');
    });
  });
});
