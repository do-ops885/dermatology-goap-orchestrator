import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'fs': path.resolve(__dirname, './node-stubs.js'),
      'path': path.resolve(__dirname, './node-stubs.js'),
      'url': path.resolve(__dirname, './node-stubs.js'),
      'crypto': path.resolve(__dirname, './node-stubs.js'),
      'module': path.resolve(__dirname, './node-stubs.js'),
      'os': path.resolve(__dirname, './node-stubs.js'),
      'worker_threads': path.resolve(__dirname, './node-stubs.js'),
      'child_process': path.resolve(__dirname, './node-stubs.js'),
      'fs/promises': path.resolve(__dirname, './node-stubs.js'),
    }
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
          'vendor-utils': ['lucide-react', 'buffer', 'process']
        }
      }
    },
    chunkSizeWarningLimit: 800
  }
});