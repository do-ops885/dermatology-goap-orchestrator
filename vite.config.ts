import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'services/**/*.ts',
        'hooks/**/*.ts',
        'components/**/*.tsx',
        'services/goap/**/*.ts', // Explicitly include GOAP agent files
      ],
      exclude: ['node_modules/', 'tests/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/mockData.*'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      fs: path.resolve(__dirname, './stubs/fs'),
      path: path.resolve(__dirname, './stubs/path'),
      url: path.resolve(__dirname, './stubs/url'),
      crypto: path.resolve(__dirname, './stubs/crypto'),
      module: path.resolve(__dirname, './stubs/module'),
      os: path.resolve(__dirname, './stubs/os'),
      worker_threads: path.resolve(__dirname, './stubs/worker_threads'),
      child_process: path.resolve(__dirname, './stubs/child_process'),
      'fs/promises': path.resolve(__dirname, './stubs/fs/promises.js'),
    },
  },
  build: {
    rollupOptions: {
      external: [/(.*)\.node$/, /node_modules\/@ruvector/],
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-ai-core': ['@google/genai', 'agentdb', '@xenova/transformers'],
          'vendor-tfjs': ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgpu'],
          'vendor-webllm': ['@mlc-ai/web-llm'],
          'vendor-utils': ['lucide-react', 'buffer', 'process'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
