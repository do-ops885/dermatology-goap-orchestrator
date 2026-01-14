import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { imageVerificationExecutor } from '../../../services/executors/imageVerificationExecutor';

import type { AgentContext } from '../../../services/executors/types';

/**
 * Tests for Image Verification Executor
 * Validates image hash verification and metadata generation
 */

describe('imageVerificationExecutor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return metadata with SHA-256 method', async () => {
    const context: AgentContext = {
      imageHash: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
    };

    const resultPromise = imageVerificationExecutor(context);
    vi.advanceTimersByTime(400);
    const result = await resultPromise;

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.method).toBe('SHA-256 + Ed25519');
  });

  it('should return truncated hash in metadata', async () => {
    const fullHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678';
    const context: AgentContext = {
      imageHash: fullHash
    };

    const resultPromise = imageVerificationExecutor(context);
    vi.advanceTimersByTime(400);
    const result = await resultPromise;

    expect(result.metadata.hash).toContain('...');
    expect(result.metadata.hash).toContain(fullHash.substring(0, 16));
  });

  it('should include first 16 characters of hash', async () => {
    const context: AgentContext = {
      imageHash: '0123456789abcdefghijklmnop'
    };

    const resultPromise = imageVerificationExecutor(context);
    vi.advanceTimersByTime(400);
    const result = await resultPromise;

    expect(result.metadata.hash).toBe('0123456789abcdef...');
  });

  it('should handle short hashes gracefully', async () => {
    const context: AgentContext = {
      imageHash: '12345'
    };

    const resultPromise = imageVerificationExecutor(context);
    vi.advanceTimersByTime(400);
    const result = await resultPromise;

    expect(result.metadata.hash).toBe('12345...');
  });

  it('should complete after 400ms delay', async () => {
    const context: AgentContext = {
      imageHash: 'test123'
    };

    const resultPromise = imageVerificationExecutor(context);
    
    // Should not resolve immediately
    const beforeAdvance = await Promise.race([
      resultPromise.then(() => 'resolved'),
      Promise.resolve('not-resolved')
    ]);
    expect(beforeAdvance).toBe('not-resolved');

    // Should resolve after timer advance
    vi.advanceTimersByTime(400);
    const result = await resultPromise;
    expect(result).toBeDefined();
  });

  it('should handle empty imageHash', async () => {
    const context: AgentContext = {
      imageHash: ''
    };

    const resultPromise = imageVerificationExecutor(context);
    vi.advanceTimersByTime(400);
    const result = await resultPromise;

    expect(result.metadata.hash).toBe('...');
  });

  it('should return consistent format for different hashes', async () => {
    const hashes = [
      'aaaaaaaaaaaaaaaa1111111111111111',
      'bbbbbbbbbbbbbbbb2222222222222222',
      'cccccccccccccccc3333333333333333'
    ];

    for (const hash of hashes) {
      const context: AgentContext = { imageHash: hash };
      const resultPromise = imageVerificationExecutor(context);
      vi.advanceTimersByTime(400);
      const result = await resultPromise;

      expect(result.metadata.method).toBe('SHA-256 + Ed25519');
      expect(result.metadata.hash).toMatch(/^.{16}\.\.\./);
    }
  });

  it('should not modify the input context', async () => {
    const originalHash = 'original_hash_value_1234567890';
    const context: AgentContext = {
      imageHash: originalHash
    };

    const resultPromise = imageVerificationExecutor(context);
    vi.advanceTimersByTime(400);
    await resultPromise;

    expect(context.imageHash).toBe(originalHash);
  });
});
