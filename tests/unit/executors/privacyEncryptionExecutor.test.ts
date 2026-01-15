import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CryptoService } from '../../../services/crypto';
import { privacyEncryptionExecutor } from '../../../services/executors/privacyEncryptionExecutor';

import type { AgentContext } from '../../../services/executors/types';

/**
 * Tests for Privacy Encryption Executor
 * Validates encryption workflow and security context generation
 */

describe('privacyEncryptionExecutor', () => {
  let mockKey: CryptoKey;
  let mockReasoningBank: {
    storePattern: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockKey = await CryptoService.generateEphemeralKey();
    mockReasoningBank = {
      storePattern: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  it('should return error when encryption key is missing', async () => {
    const context = {
      encryptionKey: undefined,
      analysisPayload: { data: 'test' },
      reasoningBank: mockReasoningBank as any,
    } as any;

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.error).toBe('key_missing');
  });

  it('should return error when encryption key is null', async () => {
    const context = {
      encryptionKey: null,
      analysisPayload: { data: 'test' },
      reasoningBank: mockReasoningBank as any,
    } as any;

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.error).toBe('key_missing');
  });

  it('should encrypt data and add security context to payload', async () => {
    const analysisPayload = {
      patientId: '12345',
      diagnosis: 'melanoma',
      confidence: 0.95,
    };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.cipher).toBe('AES-256-GCM');
    expect((analysisPayload as any).securityContext).toBeDefined();
    expect((analysisPayload as any).securityContext.encrypted).toBe(true);
  });

  it('should include required security context fields', async () => {
    const analysisPayload = { data: 'sensitive' };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    await privacyEncryptionExecutor(context);

    const secCtx = (analysisPayload as any).securityContext;
    expect(secCtx.encrypted).toBe(true);
    expect(secCtx.algorithm).toBe('AES-GCM-256');
    expect(secCtx.timestamp).toBeDefined();
    expect(secCtx.iv).toBeDefined();
    expect(secCtx.payloadSize).toBeGreaterThan(0);
    expect(secCtx.ciphertext).toBeDefined();
  });

  it('should generate valid IV in security context', async () => {
    const analysisPayload = { test: 'data' };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    await privacyEncryptionExecutor(context);

    expect((analysisPayload as any).securityContext.iv).toBeInstanceOf(Array);
    expect((analysisPayload as any).securityContext.iv.length).toBe(12); // GCM standard IV length
  });

  it('should store Base64 ciphertext in security context', async () => {
    const analysisPayload = { secret: 'value' };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    await privacyEncryptionExecutor(context);

    expect(typeof (analysisPayload as any).securityContext.ciphertext).toBe('string');
    expect((analysisPayload as any).securityContext.ciphertext.length).toBeGreaterThan(0);
    // Base64 should only contain valid characters
    expect((analysisPayload as any).securityContext.ciphertext).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('should return metadata with payload size', async () => {
    const analysisPayload = { data: 'test' };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.payload_size).toMatch(/\d+ bytes/);
    expect(result.metadata.audit).toBe('encrypted_in_memory');
  });

  it('should store security pattern in reasoning bank', async () => {
    const analysisPayload = { data: 'test' };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    await privacyEncryptionExecutor(context);

    expect(mockReasoningBank.storePattern).toHaveBeenCalledTimes(1);
    const storedPattern = mockReasoningBank.storePattern.mock.calls[0][0];

    expect(storedPattern.taskType).toBe('security_event');
    expect(storedPattern.approach).toBe('AES-GCM Encryption');
    expect(storedPattern.successRate).toBe(1.0);
    expect(storedPattern.metadata.type).toBe('payload_encryption');
  });

  it('should handle large payloads', async () => {
    const largePayload = {
      data: 'x'.repeat(10000),
      metadata: { count: 10000 },
    };

    const context = {
      encryptionKey: mockKey,
      analysisPayload: largePayload,
      reasoningBank: mockReasoningBank as any,
    } as any;

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.cipher).toBe('AES-256-GCM');
    expect(largePayload.securityContext.payloadSize).toBeGreaterThan(10000);
  });

  it('should handle payloads with nested objects', async () => {
    const nestedPayload = {
      patient: {
        id: '123',
        analysis: {
          lesions: [
            { type: 'melanoma', confidence: 0.9 },
            { type: 'benign', confidence: 0.1 },
          ],
        },
      },
    };

    const context = {
      encryptionKey: mockKey,
      analysisPayload: nestedPayload,
      reasoningBank: mockReasoningBank as any,
    } as any;

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.cipher).toBe('AES-256-GCM');
    expect(nestedPayload.securityContext).toBeDefined();
  });

  it('should handle payloads with null values', async () => {
    const payloadWithNulls = {
      value: null,
      data: 'test',
    };

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload: payloadWithNulls,
      reasoningBank: mockReasoningBank as any,
    };

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.cipher).toBe('AES-256-GCM');
  });

  it('should generate different IVs for same payload on multiple calls', async () => {
    const payload1 = { data: 'test' };
    const payload2 = { data: 'test' };

    const context1: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload: payload1,
      reasoningBank: mockReasoningBank as any,
    };

    const context2: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload: payload2,
      reasoningBank: mockReasoningBank as any,
    };

    await privacyEncryptionExecutor(context1);
    await privacyEncryptionExecutor(context2);

    expect(payload1.securityContext.iv).not.toEqual(payload2.securityContext.iv);
    expect(payload1.securityContext.ciphertext).not.toEqual(payload2.securityContext.ciphertext);
  });

  it('should include timestamp in security context', async () => {
    const beforeTimestamp = Date.now();

    const analysisPayload = { data: 'test' };
    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload,
      reasoningBank: mockReasoningBank as any,
    };

    await privacyEncryptionExecutor(context);

    const afterTimestamp = Date.now();

    expect((analysisPayload as any).securityContext.timestamp).toBeGreaterThanOrEqual(
      beforeTimestamp,
    );
    expect((analysisPayload as any).securityContext.timestamp).toBeLessThanOrEqual(afterTimestamp);
  });

  it('should handle empty payload objects', async () => {
    const emptyPayload = {};

    const context: AgentContext = {
      encryptionKey: mockKey,
      analysisPayload: emptyPayload,
      reasoningBank: mockReasoningBank as any,
    };

    const result = await privacyEncryptionExecutor(context);

    expect(result.metadata.cipher).toBe('AES-256-GCM');
    expect(emptyPayload.securityContext).toBeDefined();
  });

  describe('Integration with CryptoService', () => {
    it('should produce decryptable ciphertext', async () => {
      const originalPayload = {
        patientId: 'P-001',
        diagnosis: 'melanoma',
        confidence: 0.87,
      };

      const context: AgentContext = {
        encryptionKey: mockKey,
        analysisPayload: originalPayload,
        reasoningBank: mockReasoningBank as any,
      };

      await privacyEncryptionExecutor(context);

      // Decrypt the ciphertext to verify
      const { ciphertext, iv } = originalPayload.securityContext;

      // Convert Base64 back to ArrayBuffer
      const binaryString = atob(ciphertext);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        mockKey,
        bytes.buffer,
      );

      const decryptedText = new TextDecoder().decode(decrypted);
      const decryptedData = JSON.parse(decryptedText);

      // Should match original data (minus securityContext which was added after)
      expect(decryptedData.patientId).toBe('P-001');
      expect(decryptedData.diagnosis).toBe('melanoma');
      expect(decryptedData.confidence).toBe(0.87);
    });
  });
});
