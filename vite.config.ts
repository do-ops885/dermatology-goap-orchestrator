import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**']
  }
});