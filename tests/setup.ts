// Test setup file for Vitest + jsdom
// - Add testing library matchers
// - Polyfill browser APIs used by the app (crypto.subtle, TextEncoder, ResizeObserver, URL.createObjectURL)

import '@testing-library/jest-dom';

// Ensure global crypto.subtle is available in Node environments
// Prefer the built-in WebCrypto API when available
if (typeof (globalThis as any).crypto === 'undefined' || !(globalThis as any).crypto.subtle) {
  // Node >= 16.0.0 provides webcrypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { webcrypto } = require('node:crypto');
    (globalThis as any).crypto = webcrypto;
  } catch (e) {
    // Last resort: minimal mock for tests relying on digest
    (globalThis as any).crypto = { subtle: { digest: async () => new ArrayBuffer(0) } };
  }
}

// TextEncoder/TextDecoder (should exist in Node >= 11)
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder } = require('util');
  (globalThis as any).TextEncoder = TextEncoder;
}

// Simple ResizeObserver mock for libraries that expect it
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).ResizeObserver = ResizeObserver;
}

// Provide a no-op URL.createObjectURL implementation if not present
if (!globalThis.URL?.createObjectURL) {
  globalThis.URL = Object.assign(globalThis.URL || {}, {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
  });
}
