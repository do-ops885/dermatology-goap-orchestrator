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
} catch (_error) {
  // setA11yConfig not available in this environment
}

// Ensure global crypto.subtle is available in Node environments
// Prefer the built-in WebCrypto API when available
if (typeof globalThis.crypto === 'undefined' || !(globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle) {
  // Node >= 16.0.0 provides webcrypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { webcrypto } = require('node:crypto');
    (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
  } catch (_error) {
    // Last resort: minimal mock for tests relying on digest
    (globalThis as unknown as { crypto: { subtle: { digest: () => Promise<ArrayBuffer> } } }).crypto = {
      subtle: { digest: async () => new ArrayBuffer(0) }
    };
  }
}

// TextEncoder/TextDecoder (should exist in Node >= 11)
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder } = require('util');
  (globalThis as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}

// Simple ResizeObserver mock for libraries that expect it
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe(_element: Element) {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserver;
}

// Provide a no-op URL.createObjectURL implementation if not present
if (!globalThis.URL?.createObjectURL) {
  globalThis.URL = Object.assign(globalThis.URL || {}, {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
  });
}

// Mock ImageData for jsdom environment
if (typeof globalThis.ImageData === 'undefined') {
  class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;

    constructor(swOrData: number | Uint8ClampedArray, sh?: number) {
      if (typeof swOrData === 'number') {
        this.width = swOrData;
        this.height = sh ?? 0;
        this.data = new Uint8ClampedArray((sh ?? 0) * swOrData * 4);
      } else {
        this.width = sh ?? 0;
        this.height = 0;
        this.data = swOrData;
      }
    }
  }
  (globalThis as { ImageData: typeof ImageData }).ImageData = ImageData;
}

// Polyfill File.arrayBuffer for jsdom
if (typeof File !== 'undefined') {
  const OriginalFile = File;
  (globalThis as { File: typeof OriginalFile }).File = class File extends OriginalFile {
    arrayBuffer(): Promise<ArrayBuffer> {
      // Mock implementation - return empty ArrayBuffer
      return Promise.resolve(new ArrayBuffer(0));
    }
  };
}

// Mock HTMLCanvasElement for jsdom (canvas API not available by default)
if (typeof HTMLCanvasElement !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mockdata';
}
