import { describe, it, expect, vi, afterEach } from 'vitest';

import { verifyImage } from '../../../services/executors/image-verification';

describe('Image-Verification-Agent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject non-image files by type', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const result = verifyImage(mockFile as unknown as File);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should reject files with empty type', async () => {
    const mockFile = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'test.jpg', { type: '' });
    const result = verifyImage(mockFile as unknown as File);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should have proper error message structure', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const result = verifyImage(mockFile as unknown as File);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });

  it('should handle files with image/jpeg type', async () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.jpg', { type: 'image/jpeg' });
    const result = verifyImage(mockFile as unknown as File);
    expect(result.hash).toBeDefined();
  });

  it('should handle files with image/png type', async () => {
    const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.png', { type: 'image/png' });
    const result = verifyImage(mockFile as unknown as File);
    expect(result.hash).toBeDefined();
  });

  it('should return consistent structure for all results', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const result = verifyImage(mockFile as unknown as File);
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('hash');
    expect(typeof result.valid).toBe('boolean');
    expect(typeof result.hash).toBe('string');
  });
});
