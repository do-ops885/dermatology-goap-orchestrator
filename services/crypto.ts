/**
 * CryptoService provides encryption utilities for client-side data protection.
 * Converted to module export (2025 best practice for static-only utilities).
 */

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
   */
  async generateEphemeralKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable
      ['encrypt', 'decrypt'],
    );
  },

  /**
   * Encrypts a JSON object using AES-GCM.
   */
  async encryptData(
    data: Record<string, unknown>,
    key: CryptoKey,
  ): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    // 12 bytes IV is standard for GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    if (iv === null) {
      throw new Error('Failed to generate IV');
    }

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData,
    );

    return { ciphertext, iv };
  },

  /**
   * Generates a SHA-256 hash of the input string.
   * Used for the immutable audit log chain.
   */
  async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Helper to convert ArrayBuffer to Base64 string for storage
   */
  arrayBufferToBase64(buffer: ArrayBuffer): string {
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
  },
};
