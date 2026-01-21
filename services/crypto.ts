/**
 * CryptoService provides encryption utilities for client-side data protection.
 * Converted to module export (2025 best practice for static-only utilities).
 */

/**
 * Custom error class for crypto-specific failures
 * Enables structured error handling and graceful degradation
 */
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly _code:
      | 'KEY_INVALID'
      | 'IV_GENERATION_FAILED'
      | 'ENCRYPTION_FAILED'
      | 'API_UNAVAILABLE'
      | 'DECRYPTION_FAILED',
    public readonly _details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

export interface SecureKeyManagerOptions {
  autoCleanupOnUnload?: boolean;
  autoCleanupTimeout?: number; // milliseconds
}

export class SecureKeyManager {
  private key: CryptoKey | null = null;
  private cleanupTimeout: number | null = null;
  private readonly options: SecureKeyManagerOptions;

  constructor(options: SecureKeyManagerOptions = {}) {
    this.options = {
      autoCleanupOnUnload: true,
      autoCleanupTimeout: 5 * 60 * 1000, // 5 minutes default
      ...options,
    };

    if (this.options.autoCleanupOnUnload === true) {
      this.setupAutoCleanup();
    }
  }

  /**
   * Generates a new ephemeral AES-GCM key for client-side encryption.
   */
  async generateKey(): Promise<void> {
    await this.clearKey(); // Clear any existing key first

    this.key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable
      ['encrypt', 'decrypt'],
    );

    // Set up auto cleanup if configured
    if (this.options.autoCleanupTimeout !== undefined && this.options.autoCleanupTimeout > 0) {
      this.scheduleCleanup();
    }
  }

  /**
   * Gets the current key, generating one if it doesn't exist.
   */
  async getOrCreateKey(): Promise<CryptoKey> {
    if (!this.key) {
      await this.generateKey();
    }
    return this.key!;
  }

  /**
   * Safely clears the key from memory and overwrites any cached data.
   */
  async clearKey(): Promise<void> {
    if (this.cleanupTimeout !== null && this.cleanupTimeout !== 0) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    if (this.key) {
      try {
        // Attempt to overwrite the key material in memory
        // Note: JavaScript doesn't guarantee memory overwriting, but we try
        const exported = await crypto.subtle.exportKey('raw', this.key);
        const keyBytes = new Uint8Array(exported);
        keyBytes.fill(0);

        // Clear the original key reference
        this.key = null;
      } catch (error) {
        console.warn('Failed to securely clear encryption key:', error);
        // Still clear the reference even if export fails
        this.key = null;
      }
    }
  }

  /**
   * Checks if a key is currently loaded.
   */
  hasKey(): boolean {
    return this.key !== null;
  }

  /**
   * Gets the key for encryption operations.
   */
  getKey(): CryptoKey | null {
    return this.key;
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimeout !== null) {
      clearTimeout(this.cleanupTimeout);
    }

    this.cleanupTimeout = setTimeout(
      () => {
        void this.clearKey();
      },
      this.options.autoCleanupTimeout ?? 5 * 60 * 1000,
    ) as unknown as number;
  }

  private setupAutoCleanup(): void {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      void this.clearKey();
    });

    // Cleanup on page visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Optional: clear key when tab becomes hidden
        // await this.clearKey();
      }
    });
  }
}

export const CryptoService = {
  /**
   * Generates a 256-bit AES-GCM key for ephemeral client-side encryption.
   * This key exists only in memory and is lost on page reload.
   * @throws {CryptoError} If Web Crypto API is unavailable or key generation fails
   */
  async generateEphemeralKey(): Promise<CryptoKey> {
    if (
      typeof window === 'undefined' ||
      window.crypto?.subtle === undefined ||
      window.crypto?.subtle === null
    ) {
      throw new CryptoError('Web Crypto API is not available', 'API_UNAVAILABLE');
    }

    try {
      return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable
        ['encrypt', 'decrypt'],
      );
    } catch (error) {
      throw new CryptoError('Failed to generate ephemeral key', 'KEY_INVALID', { error });
    }
  },

  /**
   * Encrypts a JSON object using AES-GCM.
   * @param data - Object to encrypt
   * @param key - AES-GCM key with encrypt usage
   * @returns Encrypted data with IV, or null if encryption fails (graceful degradation)
   * @throws {CryptoError} For critical failures (API unavailable, invalid key)
   */
  async encryptData(
    data: Record<string, unknown>,
    key: CryptoKey,
  ): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array } | null> {
    try {
      // Validate key
      if (
        key === null ||
        key === undefined ||
        typeof key !== 'object' ||
        !Array.isArray(key.usages) ||
        !key.usages.includes('encrypt')
      ) {
        throw new CryptoError('Invalid key: must support encryption', 'KEY_INVALID', {
          keyAlgorithm: key?.algorithm,
        });
      }

      // Validate input data
      if (data === null || data === undefined || typeof data !== 'object') {
        throw new CryptoError('Invalid data: must be an object', 'ENCRYPTION_FAILED', {
          dataType: typeof data,
        });
      }

      const encoder = new TextEncoder();
      const encodedData = encoder.encode(JSON.stringify(data));

      // 12 bytes IV is standard for GCM
      let iv: Uint8Array;
      try {
        iv = window.crypto.getRandomValues(new Uint8Array(12));
      } catch (error) {
        throw new CryptoError('Failed to generate IV', 'IV_GENERATION_FAILED', { error });
      }

      // Validate IV (though getRandomValues should never fail silently)
      if (iv === null || iv === undefined || iv.byteLength !== 12) {
        throw new CryptoError('Invalid IV length', 'IV_GENERATION_FAILED', {
          length: iv?.byteLength,
        });
      }

      const ciphertext = (await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
        key,
        encodedData,
      )) as ArrayBuffer;

      // Validate ciphertext
      if (ciphertext === null || ciphertext === undefined || ciphertext.byteLength === 0) {
        throw new CryptoError('Invalid ciphertext', 'ENCRYPTION_FAILED', {
          byteLength: ciphertext?.byteLength,
        });
      }

      return { ciphertext, iv };
    } catch (error) {
      // Re-throw CryptoError, wrap other errors
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError('Encryption failed', 'ENCRYPTION_FAILED', {
        error,
        dataType: typeof data,
      });
    }
  },

  /**
   * Decrypts AES-GCM encrypted data.
   * @param ciphertext - Encrypted data buffer
   * @param iv - Initialization vector (12 bytes)
   * @param key - AES-GCM key with decrypt usage
   * @returns Decrypted object, or null if decryption fails (graceful degradation)
   * @throws {CryptoError} For critical failures (API unavailable, invalid key)
   */
  async decryptData(
    ciphertext: ArrayBuffer,
    iv: Uint8Array,
    key: CryptoKey,
  ): Promise<Record<string, unknown> | null> {
    try {
      // Validate key
      if (
        key === null ||
        key === undefined ||
        typeof key !== 'object' ||
        !Array.isArray(key.usages) ||
        !key.usages.includes('decrypt')
      ) {
        throw new CryptoError('Invalid key: must support decryption', 'KEY_INVALID', {
          keyAlgorithm: key?.algorithm,
        });
      }

      // Validate IV
      if (iv === null || iv === undefined || iv.byteLength !== 12) {
        throw new CryptoError('Invalid IV length: must be 12 bytes', 'DECRYPTION_FAILED', {
          length: iv?.byteLength,
        });
      }

      // Validate ciphertext
      if (ciphertext === null || ciphertext === undefined || ciphertext.byteLength === 0) {
        throw new CryptoError('Invalid ciphertext: empty buffer', 'DECRYPTION_FAILED', {
          byteLength: ciphertext?.byteLength,
        });
      }

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
        key,
        ciphertext,
      );

      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      return JSON.parse(decryptedText);
    } catch (error) {
      // Re-throw CryptoError, wrap other errors
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError('Decryption failed', 'DECRYPTION_FAILED', { error });
    }
  },

  /**
   * Generates a SHA-256 hash of the input string.
   * Used for the immutable audit log chain.
   * @param data - String to hash
   * @returns Hex-encoded SHA-256 hash, or empty string if hashing fails
   */
  async generateHash(data: string): Promise<string> {
    try {
      if (
        typeof window === 'undefined' ||
        window.crypto?.subtle === undefined ||
        window.crypto?.subtle === null
      ) {
        // Fallback to simple hash if crypto API unavailable
        return this.fallbackHash(data);
      }

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('CryptoService: Failed to generate hash, using fallback', error);
      return this.fallbackHash(data);
    }
  },

  /**
   * Fallback hash function for when Web Crypto API is unavailable.
   * Not cryptographically secure, but sufficient for non-security-critical use cases.
   * Note: This is not private because CryptoService is an object literal, not a class
   */
  fallbackHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Pad to 64 characters like SHA-256
    const hashStr = Math.abs(hash).toString(16);
    return hashStr.padEnd(64, '0').slice(0, 64);
  },

  /**
   * Helper to convert ArrayBuffer to Base64 string for storage
   * @param buffer - ArrayBuffer to convert
   * @returns Base64-encoded string, or empty string if conversion fails
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    try {
      if (buffer === null || buffer === undefined || buffer.byteLength === 0) {
        return '';
      }

      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        const byte = bytes[i];
        if (byte !== undefined) {
          binary += String.fromCharCode(byte);
        }
      }
      return btoa(binary);
    } catch (error) {
      console.error('CryptoService: Failed to convert ArrayBuffer to Base64', error);
      return '';
    }
  },
};
