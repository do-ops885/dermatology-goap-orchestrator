// Test setup file for Vitest + jsdom
// - Add testing library matchers
// - Polyfill browser APIs used by the app (crypto.subtle, TextEncoder, ResizeObserver, URL.createObjectURL)

import '@testing-library/jest-dom';

// Only set up a11y config for E2E tests (Playwright provides setA11yConfig)
try {
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
    ],
  });
} catch {
  // setA11yConfig not available in this environment
}

// Ensure global crypto.subtle is available in Node environments
// Prefer the built-in WebCrypto API when available
if (
  typeof globalThis.crypto === 'undefined' ||
  !(globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle
) {
  // Node >= 16.0.0 provides webcrypto
  try {
    const { webcrypto } = require('node:crypto');
    (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
  } catch {
    // Last resort: minimal mock for tests relying on digest
    (
      globalThis as unknown as { crypto: { subtle: { digest: () => Promise<ArrayBuffer> } } }
    ).crypto = {
      subtle: { digest: async () => new ArrayBuffer(0) },
    };
  }
}

// TextEncoder/TextDecoder (should exist in Node >= 11)
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder } = require('util');
  (globalThis as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}

// Simple ResizeObserver mock for libraries that expect it
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe(_element: Element) {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserver;
}

// Provide a no-op URL.createObjectURL implementation if not present
if (!globalThis.URL?.createObjectURL) {
  globalThis.URL = Object.assign(globalThis.URL || {}, {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {},
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

// Polyfill File.arrayBuffer and Blob.slice().arrayBuffer() for jsdom
if (typeof File !== 'undefined' && typeof Blob !== 'undefined') {
  const OriginalBlob = Blob;

  // Polyfill Blob with proper arrayBuffer support
  class BlobPolyfill extends OriginalBlob {
    private _parts: BlobPart[];

    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts || [], options);
      this._parts = parts || [];
    }

    override slice(start?: number, end?: number, contentType?: string): Blob {
      const s = start || 0;
      const e = end || this.size;

      // Convert all parts to Uint8Array for slicing
      const allBytes: number[] = [];
      for (const part of this._parts) {
        if (part instanceof Uint8Array) {
          allBytes.push(...Array.from(part));
        } else if (typeof part === 'string') {
          const encoded = new TextEncoder().encode(part);
          allBytes.push(...Array.from(encoded));
        } else if (part instanceof ArrayBuffer) {
          allBytes.push(...Array.from(new Uint8Array(part)));
        } else if (part instanceof Blob) {
          // For nested blobs, we'll just skip for simplicity in tests
          continue;
        }
      }

      const slicedBytes = new Uint8Array(allBytes.slice(s, e));
      return new BlobPolyfill([slicedBytes], { type: contentType || this.type });
    }

    override arrayBuffer(): Promise<ArrayBuffer> {
      const allBytes: number[] = [];
      for (const part of this._parts) {
        if (part instanceof Uint8Array) {
          allBytes.push(...Array.from(part));
        } else if (typeof part === 'string') {
          const encoded = new TextEncoder().encode(part);
          allBytes.push(...Array.from(encoded));
        } else if (part instanceof ArrayBuffer) {
          allBytes.push(...Array.from(new Uint8Array(part)));
        }
      }
      const buffer = new Uint8Array(allBytes).buffer;
      return Promise.resolve(buffer);
    }
  }

  // Polyfill File with proper support
  class FilePolyfill extends BlobPolyfill {
    readonly name: string;
    readonly lastModified: number;

    constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
      super(parts, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  }

  (globalThis as unknown as { Blob: typeof BlobPolyfill }).Blob = BlobPolyfill;
  (globalThis as unknown as { File: typeof FilePolyfill }).File = FilePolyfill;
}

// Mock HTMLCanvasElement for jsdom (canvas API not available by default)
if (typeof HTMLCanvasElement !== 'undefined') {
  // @ts-ignore
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillRect: () => {},
      fillStyle: '',
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      arc: () => {},
      fill: () => {},
    };
  };

  // @ts-ignore
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,mockdata';
}

// Ensure AgentDB CLI has executable permissions if it exists (fix for CI/local environments)
try {
  const { existsSync } = await import('fs');
  const { chmodSync } = await import('fs');
  const agentDBCliPath = 'node_modules/agentdb/dist/src/cli/agentdb-cli.js';
  if (existsSync(agentDBCliPath)) {
    try {
      chmodSync(agentDBCliPath, 0o755);
    } catch {
      // Silently ignore permission errors in test environment
    }
  }
} catch {
  // Ignore if fs module not available in all environments
}
