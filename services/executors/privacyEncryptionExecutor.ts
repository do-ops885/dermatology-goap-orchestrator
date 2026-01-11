import type { AgentContext, ExecutorResult } from './types';
import { CryptoService } from '../crypto';
import { Logger } from '../logger';

export const privacyEncryptionExecutor = async ({ encryptionKey, analysisPayload, reasoningBank }: AgentContext): Promise<ExecutorResult> => {
  if (!encryptionKey) {
    Logger.error("Crypto-Agent", "Encryption Key Missing");
    return { metadata: { error: 'key_missing' } };
  }

  const { ciphertext, iv } = await CryptoService.encryptData(analysisPayload, encryptionKey);
  const base64Cipher = CryptoService.arrayBufferToBase64(ciphertext);

  Object.assign(analysisPayload, {
    securityContext: {
      encrypted: true,
      algorithm: 'AES-GCM-256',
      timestamp: Date.now(),
      iv: Array.from(iv),
      payloadSize: ciphertext.byteLength,
      ciphertext: base64Cipher
    }
  });
  
  await reasoningBank.storePattern({
    taskType: 'security_event',
    approach: 'AES-GCM Encryption',
    successRate: 1.0,
    metadata: { type: 'payload_encryption', size: ciphertext.byteLength }
  } as any);
  
  return { metadata: { cipher: 'AES-256-GCM', payload_size: `${ciphertext.byteLength} bytes`, audit: 'encrypted_in_memory' } };
};
