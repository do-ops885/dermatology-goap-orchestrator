import { CryptoService } from '../crypto';
import { Logger } from '../logger';

import type { AgentContext, ExecutorResult } from './types';

interface AgentDBPattern {
  taskType: string;
  approach: string;
  successRate: number;
  metadata?: Record<string, unknown>;
}

export const privacyEncryptionExecutor = async ({
  encryptionKey,
  analysisPayload,
  reasoningBank,
}: AgentContext): Promise<ExecutorResult> => {
  if (!encryptionKey) {
    Logger.error('Crypto-Agent', 'Encryption Key Missing');
    return { metadata: { error: 'key_missing' } };
  }

  const encryptionResult = await CryptoService.encryptData(analysisPayload, encryptionKey);
  if (!encryptionResult) {
    Logger.error('Crypto-Agent', 'Encryption failed');
    return { metadata: { error: 'encryption_failed' } };
  }
  const { ciphertext, iv } = encryptionResult;
  const base64Cipher = CryptoService.arrayBufferToBase64(ciphertext);

  Object.assign(analysisPayload, {
    securityContext: {
      encrypted: true,
      algorithm: 'AES-GCM-256',
      timestamp: Date.now(),
      iv: Array.from(iv),
      payloadSize: ciphertext.byteLength,
      ciphertext: base64Cipher,
    },
  });

  const securityPattern: AgentDBPattern = {
    taskType: 'security_event',
    approach: 'AES-GCM Encryption',
    successRate: 1.0,
    metadata: { type: 'payload_encryption', size: ciphertext.byteLength },
  };

  await reasoningBank.storePattern(
    securityPattern as unknown as Parameters<typeof reasoningBank.storePattern>[0],
  );

  return {
    metadata: {
      cipher: 'AES-256-GCM',
      payload_size: `${String(ciphertext.byteLength)} bytes`,
      audit: 'encrypted_in_memory',
    },
  };
};
