import { describe, it, expect } from 'vitest';

import { ValidationService } from '../../services/validation';

describe('ValidationService', () => {
  describe('validateFileUpload', () => {
    it('should validate a correct file upload object', () => {
      const validFile = {
        name: 'test-image.jpg',
        type: 'image/jpeg' as const,
        size: 1024 * 1024,
        lastModified: Date.now(),
      };

      const result = ValidationService.validateFileUpload(validFile);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('test-image.jpg');
        expect(result.data.type).toBe('image/jpeg');
        expect(result.data.size).toBe(1024 * 1024);
      }
    });

    it('should validate PNG files', () => {
      const validFile = {
        name: 'test-image.png',
        type: 'image/png' as const,
        size: 2 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(validFile);

      expect(result.success).toBe(true);
    });

    it('should validate WebP files', () => {
      const validFile = {
        name: 'test-image.webp',
        type: 'image/webp' as const,
        size: 3 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(validFile);

      expect(result.success).toBe(true);
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        name: 'test-image.gif',
        type: 'image/gif' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('type: Only JPEG, PNG, and WebP images are supported');
      }
    });

    it('should reject files exceeding 10MB limit', () => {
      const invalidFile = {
        name: 'large-image.jpg',
        type: 'image/jpeg' as const,
        size: 11 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('size: File size exceeds 10MB limit');
      }
    });

    it('should reject files with names exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const invalidFile = {
        name: `${longName}.jpg`,
        type: 'image/jpeg' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('name: File name too long');
      }
    });

    it('should reject files with invalid characters in name', () => {
      const invalidFile = {
        name: 'test/image.jpg',
        type: 'image/jpeg' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('name: Invalid file name format');
      }
    });

    it('should accept lastModified as optional', () => {
      const fileWithoutTimestamp = {
        name: 'test.jpg',
        type: 'image/jpeg' as const,
        size: 1024,
      };

      const result = ValidationService.validateFileUpload(fileWithoutTimestamp);

      expect(result.success).toBe(true);
    });

    it('should return multiple errors for multiple validation failures', () => {
      const invalidFile = {
        name: 'a'.repeat(256),
        type: 'image/gif' as const,
        size: 15 * 1024 * 1024,
      };

      const result = ValidationService.validateFileUpload(invalidFile);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
