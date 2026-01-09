export class CryptoService {
  /**
   * Generates a 256-bit AES-GCM key for ephemeral client-side encryption.
   * This key exists only in memory and is lost on page reload.
   */
  static async generateEphemeralKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true, // extractable
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts a JSON object using AES-GCM.
   */
  static async encryptData(data: any, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    // 12 bytes IV is standard for GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    );

    return { ciphertext, iv };
  }

  /**
   * Generates a SHA-256 hash of the input string.
   * Used for the immutable audit log chain.
   */
  static async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Helper to convert ArrayBuffer to Base64 string for storage
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}