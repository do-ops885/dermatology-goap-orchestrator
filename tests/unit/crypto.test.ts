import { describe, it, expect, beforeEach } from 'vitest';

import { CryptoService } from '../../services/crypto';

// Workaround for TypeScript 5.8+ ArrayBufferLike type strictness
declare global {
  interface ArrayBufferTypes {
    ArrayBuffer: ArrayBuffer;
  }
}

/**
 * Tests for CryptoService
 * Validates encryption, hashing, and key generation utilities
 */

describe('CryptoService', () => {
  describe('generateEphemeralKey', () => {
    it('should generate a valid AES-GCM 256-bit key', async () => {
      const key = await CryptoService.generateEphemeralKey();

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
      expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
    });

    it('should generate an extractable key', async () => {
      const key = await CryptoService.generateEphemeralKey();

      expect(key.extractable).toBe(true);
    });

    it('should generate a key with encrypt and decrypt usages', async () => {
      const key = await CryptoService.generateEphemeralKey();

      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    it('should generate different keys on multiple calls', async () => {
      const key1 = await CryptoService.generateEphemeralKey();
      const key2 = await CryptoService.generateEphemeralKey();

      // Export keys to compare as arrays
      const exported1 = await crypto.subtle.exportKey('raw', key1);
      const exported2 = await crypto.subtle.exportKey('raw', key2);

      const array1 = new Uint8Array(exported1);
      const array2 = new Uint8Array(exported2);

      expect(Array.from(array1)).not.toEqual(Array.from(array2));
    });
  });

  describe('encryptData', () => {
    let key: CryptoKey;

    beforeEach(async () => {
      key = await CryptoService.generateEphemeralKey();
    });

    it('should encrypt data and return ciphertext and IV', async () => {
      const testData = { message: 'Hello, World!', timestamp: Date.now() };

      const result = await CryptoService.encryptData(testData, key);

      expect(result).toBeDefined();
      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.byteLength).toBeGreaterThan(0);
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.iv.length).toBe(12); // Standard GCM IV length
    });

    it('should produce different ciphertexts for same data (nonce randomness)', async () => {
      const testData = { message: 'Test' };

      const result1 = await CryptoService.encryptData(testData, key);
      const result2 = await CryptoService.encryptData(testData, key);

      // IVs should be different
      expect(Array.from(result1.iv)).not.toEqual(Array.from(result2.iv));

      // Ciphertexts should be different due to different IVs
      const cipher1 = new Uint8Array(result1.ciphertext);
      const cipher2 = new Uint8Array(result2.ciphertext);
      expect(Array.from(cipher1)).not.toEqual(Array.from(cipher2));
    });

    it('should encrypt complex nested objects', async () => {
      const complexData = {
        patient: {
          id: '12345',
          analysis: {
            lesions: ['melanoma', 'benign'],
            confidence: 0.95,
          },
        },
        metadata: {
          timestamp: Date.now(),
          encrypted: true,
        },
      };

      const result = await CryptoService.encryptData(complexData, key);

      expect(result.ciphertext.byteLength).toBeGreaterThan(0);
      expect(result.iv.length).toBe(12);
    });

    it('should be decryptable with the same key and IV', async () => {
      const originalData = { secret: 'sensitive patient data', value: 42 };

      const result = await CryptoService.encryptData(originalData, key);
      const ciphertext: ArrayBuffer = result.ciphertext;
      const iv: Uint8Array = result.iv;

      // Decrypt to verify
      // @ts-expect-error - TS 5.8 incorrectly infers ArrayBufferLike instead of ArrayBuffer for ciphertext
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      const decryptedData = JSON.parse(decryptedText);

      expect(decryptedData).toEqual(originalData);
    });

    it('should handle empty objects', async () => {
      const emptyData = {};

      const result = await CryptoService.encryptData(emptyData, key);

      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.byteLength).toBeGreaterThan(0);
    });

    it('should handle objects with null and undefined values', async () => {
      const dataWithNulls = {
        value: null,
        missing: undefined,
        present: 'data',
      };

      const result = await CryptoService.encryptData(dataWithNulls, key);

      expect(result.ciphertext).toBeDefined();
      expect(result.iv.length).toBe(12);
    });
  });

  describe('generateHash', () => {
    it('should generate a SHA-256 hash as hex string', async () => {
      const input = 'test data';

      const hash = await CryptoService.generateHash(input);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Only lowercase hex
    });

    it('should generate consistent hashes for same input', async () => {
      const input = 'consistent data';

      const hash1 = await CryptoService.generateHash(input);
      const hash2 = await CryptoService.generateHash(input);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', async () => {
      const input1 = 'data1';
      const input2 = 'data2';

      const hash1 = await CryptoService.generateHash(input1);
      const hash2 = await CryptoService.generateHash(input2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for case-sensitive inputs', async () => {
      const input1 = 'Test';
      const input2 = 'test';

      const hash1 = await CryptoService.generateHash(input1);
      const hash2 = await CryptoService.generateHash(input2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', async () => {
      const hash = await CryptoService.generateHash('');

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      // Known SHA-256 of empty string
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should handle long strings', async () => {
      const longString = 'a'.repeat(10000);

      const hash = await CryptoService.generateHash(longString);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it('should handle Unicode characters', async () => {
      const unicodeString = '🔐 Secure Data 中文 العربية';

      const hash = await CryptoService.generateHash(unicodeString);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate valid audit trail chain hashes', async () => {
      // Simulate audit trail hash chain
      const transaction1 = JSON.stringify({ action: 'analyze', timestamp: 1 });
      const hash1 = await CryptoService.generateHash(transaction1);

      const transaction2 = JSON.stringify({ action: 'encrypt', prevHash: hash1, timestamp: 2 });
      const hash2 = await CryptoService.generateHash(transaction2);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2);

      // Verify hash2 is deterministic given transaction2
      const hash2Verify = await CryptoService.generateHash(transaction2);
      expect(hash2).toBe(hash2Verify);
    });
  });

  describe('arrayBufferToBase64', () => {
    it('should convert ArrayBuffer to Base64 string', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"

      const base64 = CryptoService.arrayBufferToBase64(buffer);

      expect(base64).toBe('SGVsbG8=');
    });

    it('should handle empty ArrayBuffer', () => {
      const buffer = new Uint8Array([]).buffer;

      const base64 = CryptoService.arrayBufferToBase64(buffer);

      expect(base64).toBe('');
    });

    it('should handle binary data', () => {
      const buffer = new Uint8Array([0xff, 0xfe, 0xfd, 0x00, 0x01]).buffer;

      const base64 = CryptoService.arrayBufferToBase64(buffer);

      expect(base64).toBeDefined();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should be reversible with atob', () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const buffer = originalData.buffer;

      const base64 = CryptoService.arrayBufferToBase64(buffer);
      const decoded = atob(base64);

      const decodedArray = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        decodedArray[i] = decoded.charCodeAt(i);
      }

      expect(decodedArray).toEqual(originalData);
    });

    it('should handle large buffers', () => {
      const largeBuffer = new Uint8Array(10000).buffer;

      const base64 = CryptoService.arrayBufferToBase64(largeBuffer);

      expect(base64).toBeDefined();
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Full Encryption Workflow', () => {
    it('should encrypt and decrypt patient data end-to-end', async () => {
      // Generate key
      const key = await CryptoService.generateEphemeralKey();

      // Prepare patient data
      const patientData = {
        id: 'patient-123',
        diagnosis: 'melanoma',
        confidence: 0.87,
        fitzpatrickType: 4,
        timestamp: Date.now(),
      };

      // Encrypt
      const result = await CryptoService.encryptData(patientData, key);
      const ciphertext: ArrayBuffer = result.ciphertext;
      const iv: Uint8Array = result.iv;

      // Convert to Base64 for storage
      const encryptedBase64 = CryptoService.arrayBufferToBase64(ciphertext);
      expect(encryptedBase64).toBeDefined();

      // Generate audit hash
      const auditHash = await CryptoService.generateHash(
        JSON.stringify({ encrypted: true, iv: Array.from(iv), timestamp: Date.now() }),
      );
      expect(auditHash).toMatch(/^[a-f0-9]{64}$/);

      // Verify data is encrypted (not readable as plaintext)
      expect(encryptedBase64).not.toContain('patient-123');
      expect(encryptedBase64).not.toContain('melanoma');

      // Decrypt
      // @ts-expect-error - TS 5.8 incorrectly infers ArrayBufferLike instead of ArrayBuffer for ciphertext
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      const decryptedData = JSON.parse(new TextDecoder().decode(decrypted));

      expect(decryptedData).toEqual(patientData);
    });
  });
});
