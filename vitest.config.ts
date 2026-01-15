import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

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
});
