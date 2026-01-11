# Agent Plan: ML-Edge-Engineer
**Focus:** Offline Inference, Model Optimization, UX Latency, Resource Management

## 1. Local LLM Integration (`services/agentDB.ts`)
**Status:** IMPLEMENTED (WebLLM `SmolLM2-1.7B`)

### 1.1 Optimizations Needed
- [x] **Model Caching:** Configure Service Worker to cache ML weights (`.bin`, `.json`) to prevent re-downloading 1GB+ on every session.
- [x] **Initialization UX:** The `useClinicalAnalysis` hook exposes `warning` for loading state. We need a dedicated progress bar component for model downloading.

### 1.2 2025: WebGPU Memory Pooling
- [ ] **Implement `GPUMemoryPool` class:**
    ```typescript
    // services/gpuMemoryPool.ts
    export class GPUMemoryPool {
      private pools = new Map<string, tf.Tensor[]>();
      async allocate(size: number, key: string): Promise<tf.Tensor> { /* ... */ }
      async release(tensor: tf.Tensor, key: string): void { /* ... */ }
    }
    ```
- [ ] **Prevent Fragmentation:** Use tiered pools (small <1MB, medium 1-16MB, large >16MB)

## 2. Vision Pipeline (`services/vision.ts`)
**Status:** FUNCTIONAL (MobileNetV2 + Deterministic Mapping)

### 2.1 Tasks
- [x] **Backend Selection:** Robust WebGPU -> WebGL -> CPU logic implemented.
- [ ] **Model Artifacts:**
    - Currently fetching from Google Storage.
    - **Goal:** Host quantized models within the app's `public/models/` directory for true offline support.
- [ ] **Orchestration Hook:** Ensure `goap-agent` routes execution to `Safety-Calibration-Agent` when `is_low_confidence` is detected.
- [ ] **Explainability (Grad-CAM):**
    - Implement `tf.grad()` on the last convolutional layer of MobileNet to generate a heatmap.
    - Overlay this heatmap on the user's uploaded image in `AnalysisIntake`.

### 2.2 2025: WebGPU Error Scopes
- [ ] **Add Error Scope Wrapping:**
    ```typescript
    async function withErrorScope<T>(fn: () => Promise<T>): Promise<T> {
      tf.backend().context.device?.pushErrorScope('out-of-memory');
      try {
        return await fn();
      } finally {
        const error = await tf.backend().context.device?.popErrorScope();
        if (error) {
          Logger.error('WebGPU', 'Memory error', { error });
          // Fallback to CPU backend
        }
      }
    }
    ```

### 2.3 2025: Pure GPU Pipeline
- [ ] **Zero-Copy Tensor Transfer:** Use `tensor.dataToGPU()` for direct GPU binding
- [ ] **GPU Texture Lifecycle:** Explicitly dispose textures after rendering
- [ ] **WebGPU Prefetching:** Preload frequently used tensors into GPU memory

## 3. Performance Budget & Monitoring
- **Current Bundle Size:** High (due to `@mlc-ai/web-llm` and `@tensorflow/tfjs`).
- [x] **Action:** Implement dynamic import for `VisionSpecialist` and `LocalLLMService`.

### 3.1 2025: Bundle Analysis
- [ ] **Add `rollup-plugin-visualizer`:**
    ```typescript
    import { visualizer } from 'rollup-plugin-visualizer';
    plugins: [visualizer({ filename: 'dist/stats.html' })]
    ```
- [ ] **Granular Code Splitting:** Split TF.js, WebLLM, and charts into separate chunks

## 4. Resource Management & Memory Safety

### 4.1 TensorFlow.js
- [x] **Strict Tidy:** All inference logic in `classify()` must be wrapped in `tf.tidy(() => { ... })`.
- [x] **Explicit Disposal:** Large input tensors need manual `tensor.dispose()` if not tracked.
- [x] **Backend Cleanup:** If switching backends, call `tf.disposeVariables()`.

### 4.2 2025: Enhanced Memory Management
- [ ] **Automatic Tensor Tracking:**
    ```typescript
    // Track all created tensors for cleanup
    const tensorTracker = new WeakSet<tf.Tensor>();
    const trackedTidy = (fn: () => tf.Tensor) => {
      return tf.tidy(() => {
        const result = fn();
        tensorTracker.add(result);
        return result;
      });
    };
    ```
- [ ] **Memory Leak Detection:** Periodically check for unreleased tensors in dev mode
- [ ] **Memory Pressure Events:** Listen for `memory-warning` events and trigger cleanup

### 4.3 WebLLM
- [x] **Engine Teardown:** When idle for >5 minutes, call `engine.unload()`.
- [x] **Singleton Pattern:** Ensure only one instance exists.

## 5. 2025: Performance Optimizations

### 5.1 Lazy Loading Strategy
- [ ] **Load on Interaction:** Initialize models when user hovers over upload area
- [ ] **Progressive Loading:** Load lighter models first, heavy models on-demand
- [ ] **Worker-Based Inference:** Run heavy computations in Web Workers

### 5.2 Quantization & Optimization
- [ ] **INT8 Quantization:** Convert models to INT8 for faster inference
- [ ] **Model Pruning:** Remove unused layers from MobileNet
- [ ] **Batch Processing:** Process multiple images in single inference call

## 6. Future: TFLite
- [ ] **Investigate `tfjs-tflite`** for potentially faster inference on mobile devices (Android Neural Networks API delegate).
- [ ] **Web Neural Network API:** Evaluate MLGraphBuilder for native browser ML support
