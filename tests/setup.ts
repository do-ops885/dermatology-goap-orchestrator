// Test setup file for Vitest + jsdom
// - Add testing library matchers
// - Polyfill browser APIs used by the app (crypto.subtle, TextEncoder, ResizeObserver, URL.createObjectURL)

import '@testing-library/jest-dom';

// Only set up a11y config for E2E tests (Playwright provides setA11yConfig)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { setA11yConfig } = require('@axe-core/playwright');
  setA11yConfig({
    rules: [
      { id: 'color-contrast', enabled: true },
      { id: 'keyboard', enabled: true },
      { id: 'label', enabled: true },
      { id: 'image-alt', enabled: true },
      { id: 'button-name', enabled: true },
      { id: 'focus-visible', enabled: true },
      { id: 'aria-required-attr', enabled: true },
      { id: 'aria-valid-attr-value', enabled: true },
    ]
  });
} catch (e) {
  // setA11yConfig not available in this environment
}

// Ensure global crypto.subtle is available in Node environments
// Prefer the built-in WebCrypto API when available
if (typeof (globalThis as any).crypto === 'undefined' || !(globalThis as any).crypto.subtle) {
  // Node >= 16.0.0 provides webcrypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require('node:crypto');
    (globalThis as any).crypto = webcrypto;
  } catch (e) {
    // Last resort: minimal mock for tests relying on digest
    (globalThis as any).crypto = { subtle: { digest: async () => new ArrayBuffer(0) } };
  }
}

// TextEncoder/TextDecoder (should exist in Node >= 11)
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

// Mock ImageData for jsdom environment
if (typeof (globalThis as any).ImageData === 'undefined') {
  class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  }
  (globalThis as any).ImageData = ImageData;
}

// Polyfill File.arrayBuffer for jsdom
if (typeof File !== 'undefined') {
  const OriginalFile = File;
  (globalThis as any).File = class File extends OriginalFile {
    arrayBuffer(): Promise<ArrayBuffer> {
      return Promise.resolve(this.buffer);
    }
  };
}

// Mock HTMLCanvasElement for jsdom (canvas API not available by default)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function() {
    return {
      fillRect: () => {},
      fillStyle: '',
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      arc: () => {},
      fill: () => {}
    };
  };
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mockdata';
}
